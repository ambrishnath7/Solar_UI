import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { api, errorMessage } from '../../lib/api'
import type { Client, ClientUpsert } from '../../lib/types'
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, Input, Modal, PageHeader, Pagination, Select, Skeleton, Table, amcTone, fmtDate } from '../../components/ui'
import { ClientForm } from './ClientForm'

export default function ClientsPage() {
  const [sp, setSp] = useSearchParams()
  const page = Number(sp.get('page') ?? 1); const search = sp.get('q') ?? ''; const active = sp.get('active') ?? 'true'; const sort = sp.get('sort') ?? 'name'
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); if (k !== 'page') n.delete('page'); setSp(n) }
  const qc = useQueryClient(); const nav = useNavigate()
  const list = useQuery({ queryKey: ['clients', { page, search, active, sort }], queryFn: () => api.clients.list({ page, pageSize: 25, search, active: active === '' ? undefined : active === 'true', sort }) })
  const [creating, setCreating] = useState(false)
  const [toggle, setToggle] = useState<Client | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const create = useMutation({ mutationFn: (d: ClientUpsert) => api.clients.create(d), onSuccess: c => { qc.invalidateQueries({ queryKey: ['clients'] }); setCreating(false); nav(`/clients/${c.id}`) }, onError: e => setErr(errorMessage(e)) })
  const setActive = useMutation({ mutationFn: (c: Client) => api.clients.setActive(c.id, !c.isActive), onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); setToggle(null) }, onError: e => setErr(errorMessage(e)) })

  return <>
    <PageHeader title="Clients" subtitle="Solar installations under maintenance" actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />New client</Button>} />
    <div className="mb-3 flex flex-wrap gap-2">
      <div className="relative min-w-60 flex-1"><Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-slate-400" /><Input placeholder="Search name, site, contact" defaultValue={search} onKeyDown={e => e.key === 'Enter' && set('q', (e.target as HTMLInputElement).value)} className="pl-8" /></div>
      <Select value={active} onChange={e => set('active', e.target.value)} className="w-40"><option value="true">Active</option><option value="false">Inactive</option><option value="">All</option></Select>
      <Select value={sort} onChange={e => set('sort', e.target.value)} className="w-44"><option value="name">Name A–Z</option><option value="name_desc">Name Z–A</option><option value="next_due">Next due</option><option value="amc_expiry">AMC expiry</option><option value="created_desc">Newest</option></Select>
    </div>
    {err && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
    {list.isLoading ? <Skeleton /> : list.isError ? <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} /> : list.data!.items.length === 0 ? <EmptyState text="No clients match." /> : <>
      <Table rows={list.data!.items} keyOf={c => c.id} onRow={c => nav(`/clients/${c.id}`)} cols={[
        { h: 'Name', cell: c => <span className="font-medium">{c.name}</span> }, { h: 'Site', cell: c => c.siteLocation ?? '—' }, { h: 'Capacity', cell: c => c.solarCapacityKwp ? `${c.solarCapacityKwp} kWp` : '—' },
        { h: 'AMC', cell: c => <Badge tone={amcTone(c.amcStatus)}>{c.amcStatus}</Badge> }, { h: 'AMC expiry', cell: c => fmtDate(c.amcExpiryDate) }, { h: 'Next due', cell: c => fmtDate(c.nextDueDate) },
        { h: '', cell: c => <Button variant="ghost" onClick={e => { e.stopPropagation(); setToggle(c) }}>{c.isActive ? 'Deactivate' : 'Activate'}</Button> }]} />
      <Pagination page={page} pageSize={25} total={list.data!.total} onPage={p => set('page', String(p))} /></>}
    <Modal open={creating} title="New client" onClose={() => setCreating(false)} wide><ClientForm onSubmit={d => create.mutate(d)} busy={create.isPending} onCancel={() => setCreating(false)} /></Modal>
    <ConfirmDialog open={!!toggle} title={toggle?.isActive ? 'Deactivate client' : 'Activate client'} danger={!!toggle?.isActive} loading={setActive.isPending}
      body={<>{toggle?.isActive ? 'Engineers will no longer see ' : 'Engineers will be able to select '}<b>{toggle?.name}</b>. Existing reports are kept.</>} onConfirm={() => setActive.mutate(toggle!)} onClose={() => setToggle(null)} />
  </>
}
