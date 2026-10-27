import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { Badge, Card, ErrorState, PageHeader, Skeleton, StatCard, Table, amcTone, fmtDate, statusTone } from '../../components/ui'

export default function DashboardPage() {
  const nav = useNavigate()
  const summary = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard.summary })
  const recent = useQuery({ queryKey: ['reports', { recent: true }], queryFn: () => api.reports.list({ pageSize: 8, sort: 'updated_desc' }) })
  const upcoming = useQuery({ queryKey: ['schedule', 'next14'], queryFn: () => api.schedule.range(new Date().toISOString().slice(0, 10), new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10)) })
  const month = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  return <>
    <PageHeader title="Dashboard" subtitle={month} />
    {summary.isLoading ? <Skeleton rows={2} /> : summary.isError ? <ErrorState message={errorMessage(summary.error)} onRetry={() => summary.refetch()} /> :
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <StatCard label="Visits this month" value={summary.data!.visitsThisMonth} onClick={() => nav('/reports')} />
        <StatCard label="Submitted reports" value={summary.data!.submittedReports} tone="ok" onClick={() => nav('/reports?status=submitted')} />
        <StatCard label="Pending drafts" value={summary.data!.pendingDrafts} tone="warn" onClick={() => nav('/reports?status=draft')} />
        <StatCard label="Defects this month" value={summary.data!.defectsIdentified} tone={summary.data!.defectsIdentified ? 'danger' : 'default'} onClick={() => nav('/defects')} />
        <StatCard label="Upcoming (14 d)" value={summary.data!.upcomingVisits} onClick={() => nav('/schedule')} />
        <StatCard label="Overdue visits" value={summary.data!.overdueVisits} tone={summary.data!.overdueVisits ? 'danger' : 'default'} onClick={() => nav('/schedule?tab=overdue')} />
        <StatCard label="AMC expiring (30 d)" value={summary.data!.amcExpiringSoon} tone={summary.data!.amcExpiringSoon ? 'warn' : 'default'} onClick={() => nav('/amc?expiring=30')} />
      </div>}
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <Card><h2 className="mb-3 font-semibold">Recent reports</h2>
        {recent.isLoading ? <Skeleton /> : recent.isError ? <ErrorState message={errorMessage(recent.error)} /> :
          <Table rows={recent.data!.items} keyOf={r => r.id} onRow={r => nav(`/reports/${r.id}`)} cols={[
            { h: 'Ref', cell: r => r.reportRef ?? <span className="text-slate-400">draft</span> }, { h: 'Client', cell: r => r.clientName }, { h: 'Visit', cell: r => fmtDate(r.visitDate) },
            { h: 'Status', cell: r => <Badge tone={statusTone(r.status)}>{r.status}</Badge> }, { h: 'Defects', cell: r => r.defectCount || '—', className: 'text-right' }]} />}</Card>
      <Card><h2 className="mb-3 font-semibold">Upcoming visits (next 14 days)</h2>
        {upcoming.isLoading ? <Skeleton /> : upcoming.isError ? <ErrorState message={errorMessage(upcoming.error)} /> :
          <Table rows={upcoming.data!} keyOf={r => r.clientId} onRow={r => nav(`/clients/${r.clientId}`)} cols={[
            { h: 'Client', cell: r => r.clientName }, { h: 'Site', cell: r => r.siteLocation ?? '—' }, { h: 'Due', cell: r => fmtDate(r.nextDueDate) }, { h: 'AMC', cell: r => <Badge tone={amcTone(r.amcStatus)}>{r.amcStatus}</Badge> }]} />}</Card>
    </div>
  </>
}
