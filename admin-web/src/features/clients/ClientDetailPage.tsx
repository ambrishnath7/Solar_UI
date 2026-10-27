import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { api, errorMessage } from '../../lib/api'
import type { ClientUpsert } from '../../lib/types'
import { Badge, Button, Card, ErrorState, Modal, PageHeader, Skeleton, Table, amcTone, fmtDate, statusTone } from '../../components/ui'
import { ClientForm } from './ClientForm'

export default function ClientDetailPage() {
  const { id = '' } = useParams(); const qc = useQueryClient(); const nav = useNavigate()
  const client = useQuery({ queryKey: ['client', id], queryFn: () => api.clients.get(id) })
  const reports = useQuery({ queryKey: ['reports', { clientId: id }], queryFn: () => api.reports.list({ clientId: id, pageSize: 50 }) })
  const [editing, setEditing] = useState(false); const [err, setErr] = useState<string | null>(null)
  const update = useMutation({ mutationFn: (d: ClientUpsert) => api.clients.update(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['client', id] }); qc.invalidateQueries({ queryKey: ['clients'] }); setEditing(false) }, onError: e => setErr(errorMessage(e)) })
  if (client.isLoading) return <Skeleton />
  if (client.isError) return <ErrorState message={errorMessage(client.error)} onRetry={() => client.refetch()} />
  const c = client.data!
  const row = (k: string, v: React.ReactNode) => <div className="flex justify-between gap-4 border-b border-slate-100 py-1.5 text-sm"><span className="text-slate-500">{k}</span><span className="text-right">{v ?? '—'}</span></div>
  return <>
    <PageHeader title={c.name} subtitle={c.siteLocation ?? c.address ?? undefined} actions={<><Badge tone={c.isActive ? 'green' : 'red'}>{c.isActive ? 'Active' : 'Inactive'}</Badge><Button variant="secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Edit</Button></>} />
    {err && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
    <div className="grid gap-4 lg:grid-cols-3">
      <Card><h2 className="mb-2 font-semibold">Contact</h2>{row('Contact person', c.contactPerson)}{row('Phone', c.phone)}{row('Email', c.email)}{row('Address', c.address)}</Card>
      <Card><h2 className="mb-2 font-semibold">Installation</h2>{row('Capacity', c.solarCapacityKwp ? `${c.solarCapacityKwp} kWp` : null)}{row('Modules', [c.moduleMake, c.moduleModel, c.moduleCount ? `${c.moduleCount} nos` : null, c.moduleWattage ? `${c.moduleWattage} W` : null].filter(Boolean).join(', ') || null)}
        {row('Inverter', [c.inverterMake, c.inverterModel, c.inverterCapacityKw ? `${c.inverterCapacityKw} kW` : null].filter(Boolean).join(', ') || null)}{row('Installed', fmtDate(c.installationDate))}</Card>
      <Card><h2 className="mb-2 font-semibold">Maintenance and AMC</h2>{row('Previous maintenance', fmtDate(c.previousMaintenanceDate))}{row('Next due', fmtDate(c.nextDueDate))}{row('AMC status', <Badge tone={amcTone(c.amcStatus)}>{c.amcStatus}</Badge>)}{row('AMC period', `${fmtDate(c.amcStartDate)} → ${fmtDate(c.amcExpiryDate)}`)}
        <Link to={`/amc?client=${c.id}`} className="mt-2 inline-block text-sm text-amber-700 hover:underline">Manage AMC</Link></Card>
    </div>
    <Card className="mt-4"><h2 className="mb-3 font-semibold">Maintenance history</h2>
      {reports.isLoading ? <Skeleton /> : reports.isError ? <ErrorState message={errorMessage(reports.error)} /> : reports.data!.items.length === 0 ? <p className="text-sm text-slate-500">No reports yet.</p> :
        <Table rows={reports.data!.items} keyOf={r => r.id} onRow={r => nav(`/reports/${r.id}`)} cols={[
          { h: 'Ref', cell: r => r.reportRef ?? <span className="text-slate-400">draft</span> }, { h: 'Visit', cell: r => fmtDate(r.visitDate) }, { h: 'Engineer', cell: r => r.engineerName },
          { h: 'Status', cell: r => <Badge tone={statusTone(r.status)}>{r.status}</Badge> }, { h: 'Defects', cell: r => r.defectCount || '—' }, { h: 'Next visit', cell: r => fmtDate(r.nextVisitDate) }]} />}</Card>
    <Modal open={editing} title="Edit client" onClose={() => setEditing(false)} wide><ClientForm initial={c} onSubmit={d => update.mutate(d)} busy={update.isPending} onCancel={() => setEditing(false)} /></Modal>
  </>
}
