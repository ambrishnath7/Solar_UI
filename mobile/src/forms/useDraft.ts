import { useCallback, useEffect, useRef, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { drafts, type Draft } from '../db'
import type { ReportFields } from '../lib/types'
import { scheduleSync } from '../sync/engine'

/** Loads a local draft and autosaves field changes to SQLite (debounced), then nudges the sync engine. */
export function useDraft(localId: string) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [loading, setLoading] = useState(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<ReportFields | null>(null)

  const reload = useCallback(async () => { setDraft(await drafts.get(localId)); setLoading(false) }, [localId])
  useFocusEffect(useCallback(() => { void reload() }, [reload]))

  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    if (pending.current) { const f = pending.current; pending.current = null; await drafts.saveFields(localId, f); scheduleSync(2000) }
  }, [localId])
  useEffect(() => () => { void flush() }, [flush])

  const setFields = useCallback((patch: Partial<ReportFields>) => {
    setDraft(d => {
      if (!d) return d
      const fields = { ...d.fields, ...patch }
      pending.current = fields
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), 1200)
      return { ...d, fields, dirty: 1, syncState: d.syncState === 'synced' ? 'local' : d.syncState }
    })
  }, [flush])

  return { draft, loading, fields: draft?.fields, setFields, flush, reload }
}
