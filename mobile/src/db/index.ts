import * as SQLite from 'expo-sqlite'
import type { Client, ReportFields } from '../lib/types'

export type DraftSyncState = 'local' | 'syncing' | 'synced' | 'submitting' | 'submitted' | 'failed' | 'conflict'

export type Draft = {
  localId: string
  serverId: string | null
  clientId: string
  clientName: string
  fields: ReportFields
  version: number                 // last server version seen (0 = never synced)
  dirty: number                   // 1 = local changes not yet on server
  syncState: DraftSyncState
  engineerSigUri: string | null; engineerSigPending: number
  clientSigUri: string | null; clientSigPending: number
  submitRequested: number
  reportRef: string | null
  nextVisitDate: string | null
  lastError: string | null
  attempts: number
  nextAttemptAt: string | null
  conflictJson: string | null     // server copy when a 409 was received
  localUpdatedAt: string
  createdAt: string
}

type Row = Omit<Draft, 'fields'> & { fields: string }

let _db: SQLite.SQLiteDatabase | null = null
export async function db(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db
  _db = await SQLite.openDatabaseAsync('solar-maintenance.db')
  await _db.execAsync(`
    pragma journal_mode = wal;
    create table if not exists drafts (
      localId text primary key, serverId text, clientId text not null, clientName text not null, fields text not null,
      version integer not null default 0, dirty integer not null default 1, syncState text not null default 'local',
      engineerSigUri text, engineerSigPending integer not null default 0, clientSigUri text, clientSigPending integer not null default 0,
      submitRequested integer not null default 0, reportRef text, nextVisitDate text, lastError text, attempts integer not null default 0,
      nextAttemptAt text, conflictJson text, localUpdatedAt text not null, createdAt text not null);
    create table if not exists clients_cache (id text primary key, json text not null, cachedAt text not null);
  `)
  return _db
}

const parse = (r: Row): Draft => ({ ...r, fields: JSON.parse(r.fields) as ReportFields })

export const drafts = {
  async all(): Promise<Draft[]> { const rows = await (await db()).getAllAsync<Row>('select * from drafts order by localUpdatedAt desc'); return rows.map(parse) },
  async get(localId: string): Promise<Draft | null> { const r = await (await db()).getFirstAsync<Row>('select * from drafts where localId = ?', localId); return r ? parse(r) : null },
  async byServerId(serverId: string): Promise<Draft | null> { const r = await (await db()).getFirstAsync<Row>('select * from drafts where serverId = ?', serverId); return r ? parse(r) : null },
  async create(d: Pick<Draft, 'localId' | 'clientId' | 'clientName' | 'fields'>): Promise<Draft> {
    const now = new Date().toISOString()
    await (await db()).runAsync('insert into drafts (localId, clientId, clientName, fields, localUpdatedAt, createdAt) values (?,?,?,?,?,?)', d.localId, d.clientId, d.clientName, JSON.stringify(d.fields), now, now)
    return (await this.get(d.localId))!
  },
  /** Autosave: stores fields, marks dirty. Never touches sync bookkeeping other than dirty/syncState. */
  async saveFields(localId: string, fields: ReportFields) {
    await (await db()).runAsync(`update drafts set fields = ?, dirty = 1, localUpdatedAt = ?, syncState = case when syncState in ('submitted','submitting','conflict') then syncState else 'local' end where localId = ?`,
      JSON.stringify(fields), new Date().toISOString(), localId)
  },
  async patch(localId: string, p: Partial<Omit<Draft, 'fields'>> & { fields?: ReportFields }) {
    const cols: string[] = []; const vals: SQLite.SQLiteBindValue[] = []
    for (const [k, v] of Object.entries(p)) { cols.push(`${k} = ?`); vals.push(k === 'fields' ? JSON.stringify(v) : (v as SQLite.SQLiteBindValue)) }
    if (!cols.length) return
    vals.push(localId)
    await (await db()).runAsync(`update drafts set ${cols.join(', ')} where localId = ?`, ...vals)
  },
  async setSignature(localId: string, kind: 'engineer' | 'client', uri: string) {
    const col = kind === 'engineer' ? 'engineerSig' : 'clientSig'
    await (await db()).runAsync(`update drafts set ${col}Uri = ?, ${col}Pending = 1, localUpdatedAt = ?, syncState = case when syncState = 'synced' then 'local' else syncState end where localId = ?`, uri, new Date().toISOString(), localId)
  },
  async remove(localId: string) { await (await db()).runAsync('delete from drafts where localId = ?', localId) },
  async pending(): Promise<Draft[]> {
    const rows = await (await db()).getAllAsync<Row>(`select * from drafts where syncState not in ('submitted','conflict') and (serverId is null or dirty = 1 or engineerSigPending = 1 or clientSigPending = 1 or submitRequested = 1) and syncState <> 'failed' order by createdAt`)
    return rows.map(parse)
  },
  async retryFailed() { await (await db()).runAsync(`update drafts set syncState = 'local', attempts = 0, nextAttemptAt = null, lastError = null where syncState = 'failed'`) },
}

export const clientsCache = {
  async put(list: Client[]) {
    const d = await db(); const now = new Date().toISOString()
    await d.withTransactionAsync(async () => { for (const c of list) await d.runAsync('insert or replace into clients_cache (id, json, cachedAt) values (?,?,?)', c.id, JSON.stringify(c), now) })
  },
  async all(): Promise<Client[]> { const rows = await (await db()).getAllAsync<{ json: string }>('select json from clients_cache'); return rows.map(r => JSON.parse(r.json) as Client).sort((a, b) => a.name.localeCompare(b.name)) },
  async get(id: string): Promise<Client | null> { const r = await (await db()).getFirstAsync<{ json: string }>('select json from clients_cache where id = ?', id); return r ? (JSON.parse(r.json) as Client) : null },
}
