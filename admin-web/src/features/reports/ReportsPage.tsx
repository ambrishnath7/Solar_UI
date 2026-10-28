import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { AMC_STATUSES } from '../../lib/types'
import { amcTone, clampPage, fmtDate, fmtDateTime, statusTone } from '../../lib/format'
import { Badge, Button, EmptyState, ErrorState, Input, PageHeader, Pagination, Select, Skeleton, Table } from '../../components/ui'
import { SearchBox } from '../../components/SearchBox'

export default function ReportsPage() {
  const [sp, setSp] = useSearchParams(); const nav = useNavigate()
  const g = (k: string) => sp.get(k) ?? ''
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); if (k !== 'page') n.delete('page'); setSp(n) }
  const page = clampPage(sp.get('page'))
  const params = { search: g('q'), engineerId: g('engineer'), from: g('from'), to: g('to'), status: g('status'), amcStatus: g('amc'), sort: g('sort') || 'visit_desc', page, pageSize: 25 }
  const list = useQuery({ queryKey: ['reports', params], queryFn: () => api.reports.list(params) })
  const engineers = useQuery({ queryKey: ['engineers', 'all'], queryFn: () => api.engineers.list() })
  const filtered = !!(g('q') || g('engineer') || g('status') || g('amc') || g('from') || g('to'))

  return <>
    <PageHeader title="Maintenance reports" subtitle="Search, filter and open PMC reports" />
    <div className="mb-3 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
      <SearchBox value={g('q')} onSearch={v => set('q', v)} placeholder="Client name or report ref" label="Search reports" className="md:col-span-2" />
      <Select aria-label="Engineer" value={g('engineer')} onChange={e => set('engineer', e.target.value)}><option value="">All engineers</option>{engineers.data?.map(e => <option key={e.id} value={e.id}>{e.name}{e.isActive ? '' : ' (inactive)'}</option>)}</Select>
      <Select aria-label="Status" value={g('status')} onChange={e => set('status', e.target.value)}><option value="">All statuses</option><option value="draft">Draft</option><option value="submitted">Submitted</option><option value="corrected">Corrected</option></Select>
      <Select aria-label="AMC status" value={g('amc')} onChange={e => set('amc', e.target.value)}><option value="">All AMC</option>{AMC_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</Select>
      <Select aria-label="Sort" value={g('sort') || 'visit_desc'} onChange={e => set('sort', e.target.value === 'visit_desc' ? '' : e.target.value)}><option value="visit_desc">Newest visit</option><option value="visit_asc">Oldest visit</option><option value="client">Client</option><option value="defects_desc">Most defects</option><option value="updated_desc">Recently updated</option></Select>
      <Input type="date" value={g('from')} max={g('to') || undefined} onChange={e => set('from', e.target.value)} aria-label="Visit date from" />
      <Input type="date" value={g('to')} min={g('from') || undefined} onChange={e => set('to', e.target.value)} aria-label="Visit date to" />
      {filtered && <Button variant="ghost" onClick={() => setSp(new URLSearchParams())}>Clear filters</Button>}
    </div>
    {list.isLoading ? <Skeleton rows={8} /> : list.isError ? <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} /> : list.data!.items.length === 0 ? <EmptyState text={filtered ? 'No reports match these filters.' : 'No reports yet.'} /> : <>
      <Table rows={list.data!.items} keyOf={r => r.id} onRow={r => nav(`/reports/${r.id}`)} rowLabel={r => `Open report ${r.reportRef ?? 'draft'} for ${r.clientName}`} cols={[
        { h: 'Ref', cell: r => r.reportRef ? <span className="font-mono font-medium">{r.reportRef}</span> : <span className="text-slate-400">draft</span> },
        { h: 'Client', cell: r => r.clientName }, { h: 'Engineer', cell: r => r.engineerName }, { h: 'Visit', cell: r => fmtDate(r.visitDate) },
        { h: 'Status', cell: r => <Badge tone={statusTone(r.status)}>{r.status}</Badge> }, { h: 'AMC', cell: r => <Badge tone={amcTone(r.clientAmcStatus)}>{r.clientAmcStatus}</Badge> },
        { h: 'Defects', cell: r => r.defectCount ? <span className="font-semibold text-red-700">{r.defectCount}</span> : '—', className: 'text-right' }, { h: 'Next visit', cell: r => fmtDate(r.nextVisitDate) }, { h: 'Updated', cell: r => fmtDateTime(r.updatedAt) }]} />
      <Pagination page={page} pageSize={25} total={list.data!.total} onPage={p => set('page', String(p))} /></>}
  </>
}
