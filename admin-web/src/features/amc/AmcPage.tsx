import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'
import { api, errorMessage } from '../../lib/api'
import { AMC_STATUSES, type Client } from '../../lib/types'
import { invalidateClientData } from '../../lib/invalidate'
import { amcTone, cx, daysUntil, fmtDate } from '../../lib/format'
import { Badge, Button, EmptyState, ErrorState, Field, Input, Modal, Notice, PageHeader, Select, Skeleton, Table } from '../../components/ui'

export default function AmcPage() {
  const [sp, setSp] = useSearchParams(); const qc = useQueryClient()
  const status = sp.get('status') ?? ''; const expiring = sp.get('expiring') ?? ''; const clientParam = sp.get('client') ?? ''
  const setParam = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: k === 'client' }) }
  // expiring=N → server returns today ≤ expiry ≤ today+N and status not EXPIRED. "Already expired" uses status=EXPIRED.
  const q = useQuery({ queryKey: ['amc', status, expiring], queryFn: () => api.amc({ status: status || undefined, expiringWithinDays: expiring ? Number(expiring) : undefined }) })
  const [edit, setEdit] = useState<Client | null>(null); const [form, setForm] = useState({ amcStatus: 'AMC', amcStartDate: '', amcExpiryDate: '' })
  const [openedFor, setOpenedFor] = useState<string | null>(null)

  const m = useMutation({ mutationFn: () => api.clients.updateAmc(edit!.id, { amcStatus: form.amcStatus, amcStartDate: form.amcStartDate || null, amcExpiryDate: form.amcExpiryDate || null }),
    onSuccess: c => { invalidateClientData(qc, c.id); setEdit(null) } })
  const open = (c: Client) => { m.reset(); setEdit(c); setForm({ amcStatus: c.amcStatus, amcStartDate: c.amcStartDate ?? '', amcExpiryDate: c.amcExpiryDate ?? '' }) }

  // Deep link from client detail (?client=<id>): open its editor exactly once, then forget the param.
  const target = clientParam ? q.data?.find(c => c.id === clientParam) : undefined
  if (clientParam && target && openedFor !== clientParam) { setOpenedFor(clientParam); open(target) }
  // Strip ?client= after opening so saving/closing does not re-open the editor or keep the list filtered.
  useEffect(() => { if (openedFor && clientParam === openedFor) setParam('client', '') })
  const notFound = clientParam && q.data && !target
  const dateError = form.amcStartDate && form.amcExpiryDate && form.amcExpiryDate < form.amcStartDate ? 'Expiry must be on or after the start date' : undefined
  const soon = (d?: string | null) => !!d && daysUntil(d) >= 0 && daysUntil(d) <= 30

  return <>
    <PageHeader title="AMC management" subtitle="Annual maintenance contracts and free first-year cover" />
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <Select aria-label="AMC status" value={status} onChange={e => setParam('status', e.target.value)} className="w-44"><option value="">All statuses</option>{AMC_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</Select>
      <Select aria-label="Expiry window" value={expiring} onChange={e => setParam('expiring', e.target.value)} className="w-52"><option value="">Any expiry</option><option value="30">Expiring within 30 days</option><option value="60">Expiring within 60 days</option></Select>
      {(status || expiring) && <Button variant="ghost" onClick={() => setSp(new URLSearchParams())}><X className="h-4 w-4" aria-hidden />Show all</Button>}
    </div>
    {notFound && <Notice tone="info" className="mb-3">That client is not in this list (only active clients are shown here). Edit its AMC from the client page after reactivating it.</Notice>}
    {q.isLoading ? <Skeleton /> : q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} /> : !q.data?.length ? <EmptyState text="No clients match." /> :
      <Table rows={q.data} keyOf={c => c.id} cols={[
        { h: 'Client', cell: c => <span className="font-medium">{c.name}</span> }, { h: 'Site', cell: c => c.siteLocation ?? '—' }, { h: 'Status', cell: c => <Badge tone={amcTone(c.amcStatus)}>{c.amcStatus}</Badge> },
        { h: 'Start', cell: c => fmtDate(c.amcStartDate) }, { h: 'Expiry', cell: c => <span className={cx(soon(c.amcExpiryDate) && 'font-semibold text-amber-700')}>{fmtDate(c.amcExpiryDate)}</span> },
        { h: '', cell: c => <Button variant="ghost" onClick={() => open(c)} aria-label={`Edit AMC for ${c.name}`}>Edit AMC</Button> }]} />}
    <Modal open={!!edit} title={`AMC — ${edit?.name ?? ''}`} onClose={() => setEdit(null)} closeOnBackdrop={false}>
      <div className="space-y-3">
        <Field label="Status"><Select value={form.amcStatus} onChange={e => setForm({ ...form, amcStatus: e.target.value })}>{AMC_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</Select></Field>
        <Field label="Start date"><Input type="date" value={form.amcStartDate} onChange={e => setForm({ ...form, amcStartDate: e.target.value })} /></Field>
        <Field label="Expiry date" error={dateError}><Input type="date" value={form.amcExpiryDate} onChange={e => setForm({ ...form, amcExpiryDate: e.target.value })} /></Field>
        {m.error && <Notice>{errorMessage(m.error)}</Notice>}
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button loading={m.isPending} disabled={!!dateError} onClick={() => m.mutate()}>Save</Button></div>
      </div></Modal>
  </>
}
