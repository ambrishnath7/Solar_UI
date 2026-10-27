import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { api, errorMessage } from '../../lib/api'
import type { ScheduleItem } from '../../lib/types'
import { Badge, Button, EmptyState, ErrorState, PageHeader, Skeleton, Table, amcTone, cx, fmtDate, today } from '../../components/ui'

export default function UpcomingOverduePage() {
  const [sp, setSp] = useSearchParams(); const tab = sp.get('tab') === 'overdue' ? 'overdue' : 'upcoming'; const nav = useNavigate()
  const upcoming = useQuery({ queryKey: ['schedule', 'upcoming60'], queryFn: () => api.schedule.range(today(), new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10)), enabled: tab === 'upcoming' })
  const overdue = useQuery({ queryKey: ['schedule', 'overdue'], queryFn: api.schedule.overdue, enabled: tab === 'overdue' })
  const q = tab === 'upcoming' ? upcoming : overdue
  const csv = (rows: ScheduleItem[]) => {
    const lines = [['Client', 'Site', 'Next due', 'Previous maintenance', 'AMC'].join(','), ...rows.map(r => [r.clientName, r.siteLocation ?? '', r.nextDueDate ?? '', r.previousMaintenanceDate ?? '', r.amcStatus].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))]
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' })); a.download = `${tab}-visits.csv`; a.click()
  }
  return <>
    <PageHeader title="Upcoming and overdue visits" actions={q.data && <Button variant="secondary" onClick={() => csv(q.data!)}><Download className="h-4 w-4" />CSV</Button>} />
    <div className="mb-3 flex gap-1 rounded-md bg-slate-100 p-1 text-sm">{(['upcoming', 'overdue'] as const).map(t => <button key={t} onClick={() => setSp({ tab: t })} className={cx('rounded px-3 py-1.5 capitalize', tab === t ? 'bg-white font-medium shadow-sm' : 'text-slate-600')}>{t === 'upcoming' ? 'Upcoming (60 days)' : 'Overdue'}</button>)}</div>
    {q.isLoading ? <Skeleton /> : q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} /> : !q.data?.length ? <EmptyState text={tab === 'overdue' ? 'No overdue visits. 🎉' : 'No visits due in the next 60 days.'} /> :
      <Table rows={q.data} keyOf={r => r.clientId} onRow={r => nav(`/clients/${r.clientId}`)} cols={[
        { h: 'Client', cell: r => <span className="font-medium">{r.clientName}</span> }, { h: 'Site', cell: r => r.siteLocation ?? '—' },
        { h: 'Due', cell: r => <span className={r.isOverdue ? 'font-semibold text-red-700' : ''}>{fmtDate(r.nextDueDate)}</span> }, { h: 'Days', cell: r => { const d = Math.round((new Date(r.nextDueDate!).getTime() - Date.now()) / 864e5); return d < 0 ? `${-d} overdue` : `in ${d}` } },
        { h: 'Previous', cell: r => fmtDate(r.previousMaintenanceDate) }, { h: 'AMC', cell: r => <Badge tone={amcTone(r.amcStatus)}>{r.amcStatus}</Badge> }]} />}
  </>
}
