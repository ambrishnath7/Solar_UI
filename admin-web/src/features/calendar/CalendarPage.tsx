import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { api, errorMessage } from '../../lib/api'
import type { Appointment, ScheduleItem } from '../../lib/types'
import { cx, localIso } from '../../lib/format'
import { Button, ErrorState, PageHeader, Select, Skeleton } from '../../components/ui'
import { AppointmentModal, type AppointmentDraft } from './AppointmentModal'

const firstOfThisMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) }
const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '')

export default function CalendarPage() {
  const [cur, setCur] = useState(firstOfThisMonth)
  const [todayIso] = useState(() => localIso())
  const [engineer, setEngineer] = useState('')
  const [showDone, setShowDone] = useState(true)
  const [draft, setDraft] = useState<AppointmentDraft | null>(null)
  const first = new Date(cur.getFullYear(), cur.getMonth(), 1); const last = new Date(cur.getFullYear(), cur.getMonth() + 1, 0)
  const from = localIso(first), to = localIso(last)
  const due = useQuery({ queryKey: ['schedule', from, to], queryFn: () => api.schedule.range(from, to) })
  const appts = useQuery({ queryKey: ['appointments', { from, to, engineer }], queryFn: () => api.appointments.list({ from, to, engineerId: engineer || undefined }) })
  const engineers = useQuery({ queryKey: ['engineers', true], queryFn: () => api.engineers.list(true), staleTime: 60_000 })

  const cells: (Date | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: last.getDate() }, (_, i) => new Date(cur.getFullYear(), cur.getMonth(), i + 1))]
  const visible = (appts.data ?? []).filter(a => a.status === 'scheduled' || (showDone && a.status === 'completed'))
  const apptByDay = new Map<string, Appointment[]>(); visible.forEach(a => apptByDay.set(a.scheduledDate, [...(apptByDay.get(a.scheduledDate) ?? []), a]))
  // a due client that already has an open visit that day is shown once, as the visit
  const booked = new Set((appts.data ?? []).filter(a => a.status === 'scheduled').map(a => `${a.clientId}|${a.scheduledDate}`))
  const dueByDay = new Map<string, ScheduleItem[]>()
  due.data?.forEach(s => { if (!s.nextDueDate || booked.has(`${s.clientId}|${s.nextDueDate}`)) return; dueByDay.set(s.nextDueDate, [...(dueByDay.get(s.nextDueDate) ?? []), s]) })
  const monthName = cur.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const loading = due.isLoading || appts.isLoading; const error = due.error ?? appts.error

  return <>
    <PageHeader title="Maintenance calendar" subtitle="Assigned visits and due dates. Click a day to assign a visit." actions={<>
      <Button onClick={() => setDraft({ date: todayIso >= from && todayIso <= to ? todayIso : from, engineerId: engineer || undefined })}><Plus className="h-4 w-4" aria-hidden />Assign visit</Button>
      <Button variant="secondary" aria-label="Previous month" onClick={() => setCur(new Date(cur.getFullYear(), cur.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
      <span className="self-center px-2 font-medium" aria-live="polite">{monthName}</span>
      <Button variant="secondary" aria-label="Next month" onClick={() => setCur(new Date(cur.getFullYear(), cur.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
      <Button variant="ghost" onClick={() => setCur(firstOfThisMonth())}>Today</Button></>} />

    <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
      <div className="w-56"><Select aria-label="Engineer filter" value={engineer} onChange={e => setEngineer(e.target.value)}>
        <option value="">All engineers</option>{engineers.data?.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</Select></div>
      <label className="flex items-center gap-2"><input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} />Show completed</label>
      <span className="flex flex-wrap items-center gap-3 text-xs text-slate-600" aria-label="Legend">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-sky-600" />Assigned visit</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-emerald-600" />Completed</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded border border-amber-500 bg-amber-50" />Due, not assigned</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded border border-red-500 bg-red-50" />Overdue</span>
      </span>
    </div>

    {loading ? <Skeleton rows={6} /> : error ? <ErrorState message={errorMessage(error)} onRetry={() => { void due.refetch(); void appts.refetch() }} /> :
      <div className="overflow-x-auto"><div role="grid" aria-label={`Visits in ${monthName}`} className="grid min-w-[760px] grid-cols-7 gap-px rounded-lg border border-slate-200 bg-slate-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} role="columnheader" className="bg-slate-50 px-2 py-1 text-center text-xs font-medium text-slate-500">{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} role="gridcell" className="min-h-28 bg-slate-50" />
          const k = localIso(d); const visits = apptByDay.get(k) ?? []; const dues = dueByDay.get(k) ?? []
          const past = k < todayIso
          return <div key={i} role="gridcell" aria-label={`${d.getDate()} ${monthName}: ${visits.length} visits, ${dues.length} due`}
            className={cx('group min-h-28 bg-white p-1', k === todayIso && 'ring-2 ring-inset ring-sky-400', past && 'bg-slate-50/60')}>
            <div className="mb-1 flex items-center justify-between">
              <span className={cx('text-xs', k === todayIso ? 'font-bold text-sky-700' : 'text-slate-500')}>{d.getDate()}</span>
              {!past && <button type="button" onClick={() => setDraft({ date: k, engineerId: engineer || undefined })} aria-label={`Assign a visit on ${d.getDate()} ${monthName}`}
                className="rounded p-0.5 text-slate-400 opacity-0 hover:bg-sky-50 hover:text-sky-700 focus:opacity-100 group-hover:opacity-100"><Plus className="h-3.5 w-3.5" /></button>}
            </div>
            {visits.map(a => <button key={a.id} type="button" onClick={() => setDraft({ appointment: a })}
              title={`${a.clientName}${a.siteLocation ? ' — ' + a.siteLocation : ''}\n${a.engineerName}${a.scheduledTime ? ' at ' + hhmm(a.scheduledTime) : ''}${a.notes ? '\n' + a.notes : ''}`}
              className={cx('mb-1 block w-full rounded px-1 py-0.5 text-left text-xs text-white', a.status === 'completed' ? 'bg-emerald-600' : 'bg-sky-600 hover:bg-sky-700')}>
              <span className="block truncate font-medium">{a.status === 'completed' ? '✓ ' : ''}{hhmm(a.scheduledTime) && `${hhmm(a.scheduledTime)} `}{a.clientName}</span>
              <span className="block truncate opacity-90">{a.engineerName}</span>
            </button>)}
            {dues.map(s => <button key={s.clientId} type="button" onClick={() => setDraft({ clientId: s.clientId, date: k, engineerId: engineer || undefined })}
              title={`${s.clientName} is due${s.isOverdue ? ' (overdue)' : ''}. Click to assign an engineer.`}
              className={cx('mb-1 block w-full truncate rounded border px-1 py-0.5 text-left text-xs', s.isOverdue ? 'border-red-400 bg-red-50 text-red-800' : 'border-amber-400 bg-amber-50 text-amber-900')}>
              Due: {s.clientName}</button>)}
          </div>
        })}
      </div></div>}
    <AppointmentModal draft={draft} onClose={() => setDraft(null)} />
  </>
}
