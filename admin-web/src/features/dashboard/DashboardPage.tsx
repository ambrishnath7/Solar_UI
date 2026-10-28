import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { addDaysIso, amcTone, fmtDate, monthStartIso, statusTone, today } from '../../lib/format'
import { Badge, Card, EmptyState, ErrorState, PageHeader, Skeleton, StatCard, Table } from '../../components/ui'

export default function DashboardPage() {
  const nav = useNavigate()
  const t = today(); const in14 = addDaysIso(14); const monthStart = monthStartIso()
  const summary = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard.summary })
  const recent = useQuery({ queryKey: ['reports', { recent: true }], queryFn: () => api.reports.list({ pageSize: 8, sort: 'updated_desc' }) })
  const upcoming = useQuery({ queryKey: ['schedule', t, in14], queryFn: () => api.schedule.range(t, in14) })
  const month = new Date(`${monthStart}T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  // Each card links to the list that produces the same number.
  return <>
    <PageHeader title="Dashboard" subtitle={month} />
    {summary.isLoading ? <Skeleton rows={2} /> : summary.isError ? <ErrorState message={errorMessage(summary.error)} onRetry={() => summary.refetch()} /> :
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <StatCard label="Visits this month" value={summary.data!.visitsThisMonth} onClick={() => nav(`/reports?from=${monthStart}&to=${t}`)} />
        <StatCard label="Submitted reports" value={summary.data!.submittedReports} tone="ok" onClick={() => nav('/reports')} />
        <StatCard label="Pending drafts" value={summary.data!.pendingDrafts} tone="warn" onClick={() => nav('/reports?status=draft')} />
        <StatCard label="Defects this month" value={summary.data!.defectsIdentified} tone={summary.data!.defectsIdentified ? 'danger' : 'default'} onClick={() => nav(`/defects?from=${monthStart}&to=${t}`)} />
        <StatCard label="Upcoming (14 d)" value={summary.data!.upcomingVisits} onClick={() => nav('/schedule?days=14')} />
        <StatCard label="Overdue visits" value={summary.data!.overdueVisits} tone={summary.data!.overdueVisits ? 'danger' : 'default'} onClick={() => nav('/schedule?tab=overdue')} />
        <StatCard label="AMC expiring (30 d)" value={summary.data!.amcExpiringSoon} tone={summary.data!.amcExpiringSoon ? 'warn' : 'default'} onClick={() => nav('/amc?expiring=30')} />
      </div>}
    <div className="mt-6 grid gap-6 xl:grid-cols-3">
      <Card className="min-w-0 xl:col-span-2"><h2 className="mb-3 font-semibold">Recent reports</h2>
        {recent.isLoading ? <Skeleton /> : recent.isError ? <ErrorState message={errorMessage(recent.error)} onRetry={() => recent.refetch()} /> : recent.data!.items.length === 0 ? <EmptyState text="No reports yet." /> :
          <Table rows={recent.data!.items} keyOf={r => r.id} onRow={r => nav(`/reports/${r.id}`)} rowLabel={r => `Open report ${r.reportRef ?? 'draft'} for ${r.clientName}`} cols={[
            { h: 'Ref', cell: r => r.reportRef ?? <span className="text-slate-400">draft</span> }, { h: 'Client', cell: r => <span className="block max-w-[12rem] truncate" title={r.clientName}>{r.clientName}</span> }, { h: 'Visit', cell: r => fmtDate(r.visitDate) },
            { h: 'Status', cell: r => <Badge tone={statusTone(r.status)}>{r.status}</Badge> }, { h: 'Defects', cell: r => r.defectCount || '—', className: 'text-right' }]} />}</Card>
      <Card className="min-w-0"><h2 className="mb-3 font-semibold">Upcoming visits (next 14 days)</h2>
        {upcoming.isLoading ? <Skeleton /> : upcoming.isError ? <ErrorState message={errorMessage(upcoming.error)} onRetry={() => upcoming.refetch()} /> : upcoming.data!.length === 0 ? <EmptyState text="No visits due in the next 14 days." /> :
          <Table rows={upcoming.data!} keyOf={r => r.clientId} onRow={r => nav(`/clients/${r.clientId}`)} rowLabel={r => `Open client ${r.clientName}`} cols={[
            { h: 'Client', cell: r => <span className="block max-w-[12rem] truncate" title={r.clientName}>{r.clientName}</span> }, { h: 'Site', cell: r => r.siteLocation ?? '—' }, { h: 'Due', cell: r => fmtDate(r.nextDueDate) }, { h: 'AMC', cell: r => <Badge tone={amcTone(r.amcStatus)}>{r.amcStatus}</Badge> }]} />}</Card>
    </div>
  </>
}
