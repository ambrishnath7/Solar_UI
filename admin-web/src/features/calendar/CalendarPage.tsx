import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { api, errorMessage } from '../../lib/api'
import type { ScheduleItem } from '../../lib/types'
import { cx, localIso } from '../../lib/format'
import { Button, ErrorState, PageHeader, Skeleton } from '../../components/ui'

const firstOfThisMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) }

export default function CalendarPage() {
  const [cur, setCur] = useState(firstOfThisMonth)
  const [todayIso] = useState(() => localIso())
  const nav = useNavigate()
  const first = new Date(cur.getFullYear(), cur.getMonth(), 1); const last = new Date(cur.getFullYear(), cur.getMonth() + 1, 0)
  const q = useQuery({ queryKey: ['schedule', localIso(first), localIso(last)], queryFn: () => api.schedule.range(localIso(first), localIso(last)) })
  const cells: (Date | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: last.getDate() }, (_, i) => new Date(cur.getFullYear(), cur.getMonth(), i + 1))]
  const byDay = new Map<string, ScheduleItem[]>(); q.data?.forEach(s => { if (!s.nextDueDate) return; byDay.set(s.nextDueDate, [...(byDay.get(s.nextDueDate) ?? []), s]) })
  const monthName = cur.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  return <>
    <PageHeader title="Maintenance calendar" subtitle="Next due dates per client" actions={<>
      <Button variant="secondary" aria-label="Previous month" onClick={() => setCur(new Date(cur.getFullYear(), cur.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
      <span className="self-center px-2 font-medium" aria-live="polite">{monthName}</span>
      <Button variant="secondary" aria-label="Next month" onClick={() => setCur(new Date(cur.getFullYear(), cur.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
      <Button variant="ghost" onClick={() => setCur(firstOfThisMonth())}>Today</Button></>} />
    {q.isLoading ? <Skeleton rows={6} /> : q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} /> :
      <div className="overflow-x-auto"><div role="grid" aria-label={`Due dates in ${monthName}`} className="grid min-w-[700px] grid-cols-7 gap-px rounded-lg border border-slate-200 bg-slate-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} role="columnheader" className="bg-slate-50 px-2 py-1 text-center text-xs font-medium text-slate-500">{d}</div>)}
        {cells.map((d, i) => { const k = d ? localIso(d) : ''; const items = d ? byDay.get(k) ?? [] : []; return <div key={i} role="gridcell" aria-label={d ? `${d.getDate()} ${monthName}: ${items.length} due` : undefined} className={cx('min-h-24 bg-white p-1', !d && 'bg-slate-50', k === todayIso && 'ring-2 ring-inset ring-amber-400')}>
          {d && <div className="mb-1 text-xs text-slate-500">{d.getDate()}</div>}
          {items.map(s => <button key={s.clientId} type="button" onClick={() => nav(`/clients/${s.clientId}`)} className={cx('mb-1 block w-full truncate rounded px-1 py-0.5 text-left text-xs', s.isOverdue ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900')} title={`${s.clientName} — ${s.siteLocation ?? ''}`}>{s.clientName}</button>)}
        </div> })}
      </div></div>}
  </>
}
