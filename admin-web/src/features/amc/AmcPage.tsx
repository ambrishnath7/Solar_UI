import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { AMC_STATUSES, type Client } from '../../lib/types'
import { Badge, Button, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, Skeleton, Table, amcTone, cx, fmtDate } from '../../components/ui'

export default function AmcPage() {
  const [sp, setSp] = useSearchParams(); const qc = useQueryClient()
  const status = sp.get('status') ?? ''; const expiring = sp.get('expiring') ?? ''
  const q = useQuery({ queryKey: ['amc', status, expiring], queryFn: () => api.amc({ status: status || undefined, expiringWithinDays: expiring ? Number(expiring) : undefined }) })
  const [edit, setEdit] = useState<Client | null>(null); const [form, setForm] = useState({ amcStatus: 'AMC', amcStartDate: '', amcExpiryDate: '' }); const [err, setErr] = useState<string | null>(null)
  const open = (c: Client) => { setEdit(c); setForm({ amcStatus: c.amcStatus, amcStartDate: c.amcStartDate ?? '', amcExpiryDate: c.amcExpiryDate ?? '' }); setErr(null) }
  const m = useMutation({ mutationFn: () => api.clients.updateAmc(edit!.id, { amcStatus: form.amcStatus, amcStartDate: form.amcStartDate || null, amcExpiryDate: form.amcExpiryDate || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['amc'] }); qc.invalidateQueries({ queryKey: ['clients'] }); qc.invalidateQueries({ queryKey: ['client', edit!.id] }); setEdit(null) }, onError: e => setErr(errorMessage(e)) })
  const soon = (d?: string | null) => d && (new Date(d).getTime() - Date.now()) / 864e5 <= 30
  return <>
    <PageHeader title="AMC management" subtitle="Annual maintenance contracts and free first-year cover" />
    <div className="mb-3 flex flex-wrap gap-2">
      <Select value={status} onChange={e => setSp({ status: e.target.value, expiring })} className="w-44"><option value="">All statuses</option>{AMC_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</Select>
      <Select value={expiring} onChange={e => setSp({ status, expiring: e.target.value })} className="w-52"><option value="">Any expiry</option><option value="30">Expiring within 30 days</option><option value="60">Expiring within 60 days</option><option value="0">Already expired</option></Select>
    </div>
    {q.isLoading ? <Skeleton /> : q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} /> : !q.data?.length ? <EmptyState text="No clients match." /> :
      <Table rows={q.data} keyOf={c => c.id} cols={[
        { h: 'Client', cell: c => <span className="font-medium">{c.name}</span> }, { h: 'Site', cell: c => c.siteLocation ?? '—' }, { h: 'Status', cell: c => <Badge tone={amcTone(c.amcStatus)}>{c.amcStatus}</Badge> },
        { h: 'Start', cell: c => fmtDate(c.amcStartDate) }, { h: 'Expiry', cell: c => <span className={cx(soon(c.amcExpiryDate) && 'font-semibold text-amber-700')}>{fmtDate(c.amcExpiryDate)}</span> },
        { h: '', cell: c => <Button variant="ghost" onClick={() => open(c)}>Edit AMC</Button> }]} />}
    <Modal open={!!edit} title={`AMC — ${edit?.name ?? ''}`} onClose={() => setEdit(null)}>
      <div className="space-y-3">
        <Field label="Status"><Select value={form.amcStatus} onChange={e => setForm({ ...form, amcStatus: e.target.value })}>{AMC_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</Select></Field>
        <Field label="Start date"><Input type="date" value={form.amcStartDate} onChange={e => setForm({ ...form, amcStartDate: e.target.value })} /></Field>
        <Field label="Expiry date"><Input type="date" value={form.amcExpiryDate} onChange={e => setForm({ ...form, amcExpiryDate: e.target.value })} /></Field>
        {err && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button loading={m.isPending} onClick={() => m.mutate()}>Save</Button></div>
      </div></Modal>
  </>
}
