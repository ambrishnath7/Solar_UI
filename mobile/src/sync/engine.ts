import NetInfo from '@react-native-community/netinfo'
import { AppState } from 'react-native'
import { api, errorMessage, isNetworkError, problemOf, statusOf } from '../lib/api'
import { syncStore } from '../lib/store'
import { clientsCache, drafts, type Draft } from '../db'

/**
 * Sync engine. Works through drafts that need server work, in creation order:
 *   create (POST, idempotent on localId) → update (PUT with version) → signatures → submit.
 * 409 → conflict (engineer decides), 423 → already submitted elsewhere, network error → retry with backoff.
 * A draft is never deleted by the engine.
 */
let running = false
let queued = false
let timer: ReturnType<typeof setTimeout> | null = null
const MAX_ATTEMPTS = 8
const backoff = (n: number) => Math.min(10 * 60_000, 5000 * 2 ** Math.max(0, n - 1))

export function startSyncEngine() {
  const unsubNet = NetInfo.addEventListener(s => {
    const online = !!s.isConnected && s.isInternetReachable === true
    syncStore.set({ net: online ? 'online' : 'offline' })
    if (online) void runSync()
  })
  const sub = AppState.addEventListener('change', st => { if (st === 'active') void runSync() })
  void runSync()
  return () => { unsubNet(); sub.remove(); if (timer) clearTimeout(timer) }
}

export function scheduleSync(ms = 1500) { if (timer) clearTimeout(timer); timer = setTimeout(() => void runSync(), ms) }

export async function runSync(): Promise<void> {
  if (running) {
    queued = true
    return
  }
  if (syncStore.get().net === 'offline') return
  running = true
  syncStore.set({ syncing: true })
  try {
    do {
      queued = false
      const now = Date.now()
      for (const d of await drafts.pending()) {
        if (d.nextAttemptAt && new Date(d.nextAttemptAt).getTime() > now) continue
        await syncOne(d)
      }
      try { await clientsCache.put(await api.clients()) } catch { /* offline; cached list stays */ }
      const failed = (await drafts.all()).filter(x => x.syncState === 'failed').length
      syncStore.set({ failed, lastSyncAt: new Date().toISOString() })
    } while (queued && syncStore.get().net !== 'offline')
  } finally {
    running = false
    syncStore.set(s => ({ syncing: false, tick: s.tick + 1 }))
  }
}

async function syncOne(d: Draft): Promise<void> {
  try {
    const freshDraft = await drafts.get(d.localId)
    if (!freshDraft) return
    d = freshDraft

    await drafts.patch(d.localId, { syncState: d.submitRequested ? 'submitting' : 'syncing', lastError: null })
    let serverId = d.serverId; let version = d.version

    if (!serverId) {
      const r = await api.reports.create(d.localId, d.clientId, d.fields)   // 201 new or 200 existing (idempotent)
      serverId = r.id; version = r.version
      if (r.status !== 'draft') { await markSubmittedElsewhere(d, r.reportRef, r.fields.nextVisitDate ?? null, serverId, version); return }
      await drafts.patch(d.localId, { serverId, version, dirty: 0 })
    } else if (d.dirty) {
      const r = await api.reports.update(serverId, version, d.fields)
      version = r.version
      await drafts.patch(d.localId, { version, dirty: 0 })
    }

    const fresh = (await drafts.get(d.localId))!
    if (fresh.engineerSigPending && fresh.engineerSigUri) { const r = await api.reports.signature(serverId, 'engineer', fresh.engineerSigUri); version = r.version; await drafts.patch(d.localId, { engineerSigPending: 0, version }) }
    if (fresh.clientSigPending && fresh.clientSigUri) { const r = await api.reports.signature(serverId, 'client', fresh.clientSigUri); version = r.version; await drafts.patch(d.localId, { clientSigPending: 0, version }) }

    if (fresh.submitRequested) {
      const res = await api.reports.submit(serverId, version, fresh.fields.nextVisitDate ?? null)
      await drafts.patch(d.localId, { syncState: 'submitted', reportRef: res.reportRef, nextVisitDate: res.nextVisitDate, version: res.version, submitRequested: 0, dirty: 0, attempts: 0, nextAttemptAt: null })
      return
    }
    await drafts.patch(d.localId, { syncState: 'synced', attempts: 0, nextAttemptAt: null })
  } catch (e) {
    const status = statusOf(e)
    if (status === 409) {
      const p = problemOf(e)
      await drafts.patch(d.localId, { syncState: 'conflict', conflictJson: p.current ? JSON.stringify(p.current) : null, lastError: p.detail ?? 'Modified on another device' })
    } else if (status === 423) {
      try { const r = await api.reports.get(d.serverId!); await markSubmittedElsewhere(d, r.reportRef, r.fields.nextVisitDate ?? null, r.id, r.version) } catch { await drafts.patch(d.localId, { syncState: 'submitted', submitRequested: 0, lastError: 'Submitted on another device' }) }
    } else if (status === 400 && d.submitRequested) {
      // server-side validation on submit: keep the draft editable, show the missing fields
      await drafts.patch(d.localId, { syncState: 'local', submitRequested: 0, lastError: errorMessage(e) })
    } else if (isNetworkError(e) || (status && status >= 500) || status === 429) {
      const attempts = d.attempts + 1
      const failed = attempts >= MAX_ATTEMPTS
      await drafts.patch(d.localId, { attempts, nextAttemptAt: new Date(Date.now() + backoff(attempts)).toISOString(), syncState: failed ? 'failed' : 'local', lastError: errorMessage(e) })
      if (isNetworkError(e)) syncStore.set({ net: 'reconnecting' })
    } else {
      await drafts.patch(d.localId, { syncState: 'failed', lastError: errorMessage(e) })
    }
  }
}

async function markSubmittedElsewhere(d: Draft, ref: string | null | undefined, next: string | null, serverId: string, version: number) {
  await drafts.patch(d.localId, { serverId, version, syncState: 'submitted', reportRef: ref ?? null, nextVisitDate: next, submitRequested: 0, dirty: 0, lastError: 'Already submitted' })
}

/** Conflict resolution chosen by the engineer. */
export async function resolveConflict(localId: string, choice: 'mine' | 'server') {
  const d = await drafts.get(localId); if (!d) return
  const server = d.conflictJson ? (JSON.parse(d.conflictJson) as { version: number; fields: Draft['fields']; status: string; reportRef?: string | null }) : null
  if (!server) { await drafts.patch(localId, { syncState: 'local', conflictJson: null }); scheduleSync(0); return }
  if (server.status !== 'draft') { await drafts.patch(localId, { syncState: 'submitted', reportRef: server.reportRef ?? null, version: server.version, conflictJson: null, submitRequested: 0 }); return }
  if (choice === 'server') await drafts.patch(localId, { fields: server.fields, version: server.version, dirty: 0, syncState: 'synced', conflictJson: null, lastError: null })
  else await drafts.patch(localId, { version: server.version, dirty: 1, syncState: 'local', conflictJson: null, lastError: null })   // re-send mine on top of the server version
  scheduleSync(0)
}
