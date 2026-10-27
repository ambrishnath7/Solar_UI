import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { api, errorMessage } from '../../lib/api'
import { Button, ErrorState, PageHeader, Skeleton, cx } from '../../components/ui'

export default function CalendarPage() {
  const [cur, setCur] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const nav = useNavigate()
  const first = new Date(cur.getFullYear(), cur.getMonth(), 1); const last = new Date(cur.getFullYear(), cur.getMonth() + 1, 0)
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const q = useQuery({ queryKey: ['schedule', iso(first), iso(last)], queryFn: () => api.schedule.range(iso(first), iso(last)) })
  const todayIso = iso(new Date())
  const cells: (Date | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: last.getDate() }, (_, i) => new Date(cur.getFullYear(), cur.getMonth(), i + 1))]
  const byDay = new Map<string, typeof q.data>(); q.data?.forEach(s => { const k = s.nextDueDate!; byDay.set(k, [...(byDay.get(k) ?? []), s]) })

  return <>
    <PageHeader title="Maintenance calendar" subtitle="Next due dates per client" actions={<>
      <Button variant="secondary" onClick={() => setCur(new Date(cur.getFullYear(), cur.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
      <span className="self-center px-2 font-medium">{cur.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
      <Button variant="secondary" onClick={() => setCur(new Date(cur.getFullYear(), cur.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button></>} />
    {q.isLoading ? <Skeleton rows={6} /> : q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} /> :
      <div className="overflow-x-auto"><div className="grid min-w-[700px] grid-cols-7 gap-px rounded-lg border border-slate-200 bg-slate-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="bg-slate-50 px-2 py-1 text-center text-xs font-medium text-slate-500">{d}</div>)}
        {cells.map((d, i) => { const k = d ? iso(d) : ''; const items = d ? byDay.get(k) ?? [] : []; return <div key={i} className={cx('min-h-24 bg-white p-1', !d && 'bg-slate-50', k === todayIso && 'ring-2 ring-inset ring-amber-400')}>
          {d && <div className="mb-1 text-xs text-slate-500">{d.getDate()}</div>}
          {items.map(s => <button key={s.clientId} onClick={() => nav(`/clients/${s.clientId}`)} className={cx('mb-1 block w-full truncate rounded px-1 py-0.5 text-left text-xs', s.isOverdue ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900')} title={`${s.clientName} — ${s.siteLocation ?? ''}`}>{s.clientName}</button>)}
        </div> })}
      </div></div>}
  </>
}
