import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { api, errorMessage } from '../../lib/api'
import type { Client, ClientUpsert } from '../../lib/types'
import { invalidateClientData } from '../../lib/invalidate'
import { amcTone, clampPage, fmtDate } from '../../lib/format'
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, Modal, PageHeader, Pagination, Select, Skeleton, Table } from '../../components/ui'
import { SearchBox } from '../../components/SearchBox'
import { ClientForm } from './ClientForm'

export default function ClientsPage() {
  const [sp, setSp] = useSearchParams()
  const page = clampPage(sp.get('page')); const search = sp.get('q') ?? ''; const sort = sp.get('sort') ?? 'name'
  const active = sp.get('active') ?? 'true'          // 'true' | 'false' | 'all'
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); if (k !== 'page') n.delete('page'); setSp(n) }
  const qc = useQueryClient(); const nav = useNavigate()
  const list = useQuery({ queryKey: ['clients', { page, search, active, sort }], queryFn: () => api.clients.list({ page, pageSize: 25, search, active: active === 'all' ? undefined : active === 'true', sort }) })
  const [creating, setCreating] = useState(false)
  const [toggle, setToggle] = useState<Client | null>(null)
  const create = useMutation({ mutationFn: (d: ClientUpsert) => api.clients.create(d), onSuccess: c => { invalidateClientData(qc, c.id); setCreating(false); nav(`/clients/${c.id}`) } })
  const setActive = useMutation({ mutationFn: (c: Client) => api.clients.setActive(c.id, !c.isActive), onSuccess: c => { invalidateClientData(qc, c.id); setToggle(null) } })
  const openCreate = () => { create.reset(); setCreating(true) }
  const openToggle = (c: Client) => { setActive.reset(); setToggle(c) }

  return <>
    <PageHeader title="Clients" subtitle="Solar installations under maintenance" actions={<Button onClick={openCreate}><Plus className="h-4 w-4" aria-hidden />New client</Button>} />
    <div className="mb-3 flex flex-wrap gap-2">
      <SearchBox value={search} onSearch={v => set('q', v)} placeholder="Search name, site, contact" label="Search clients" className="min-w-60 flex-1" />
      <Select aria-label="Active filter" value={active} onChange={e => set('active', e.target.value === 'true' ? '' : e.target.value)} className="w-40"><option value="true">Active</option><option value="false">Inactive</option><option value="all">All</option></Select>
      <Select aria-label="Sort" value={sort} onChange={e => set('sort', e.target.value === 'name' ? '' : e.target.value)} className="w-44"><option value="name">Name A–Z</option><option value="name_desc">Name Z–A</option><option value="next_due">Next due</option><option value="amc_expiry">AMC expiry</option><option value="created_desc">Newest</option></Select>
    </div>
    {list.isLoading ? <Skeleton /> : list.isError ? <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} /> : list.data!.items.length === 0 ? <EmptyState text="No clients match." /> : <>
      <Table rows={list.data!.items} keyOf={c => c.id} onRow={c => nav(`/clients/${c.id}`)} rowLabel={c => `Open client ${c.name}`} cols={[
        { h: 'Name', cell: c => <span className="font-medium">{c.name}</span> }, { h: 'Site', cell: c => c.siteLocation ?? '—' }, { h: 'Capacity', cell: c => c.solarCapacityKwp != null ? `${c.solarCapacityKwp} kWp` : '—' },
        { h: 'AMC', cell: c => <Badge tone={amcTone(c.amcStatus)}>{c.amcStatus}</Badge> }, { h: 'AMC expiry', cell: c => fmtDate(c.amcExpiryDate) }, { h: 'Next due', cell: c => fmtDate(c.nextDueDate) },
        { h: 'Status', cell: c => <Badge tone={c.isActive ? 'green' : 'slate'}>{c.isActive ? 'Active' : 'Inactive'}</Badge> },
        { h: '', cell: c => <Button variant="ghost" onClick={e => { e.stopPropagation(); openToggle(c) }} onKeyDown={e => e.stopPropagation()} aria-label={`${c.isActive ? 'Deactivate' : 'Activate'} ${c.name}`}>{c.isActive ? 'Deactivate' : 'Activate'}</Button> }]} />
      <Pagination page={page} pageSize={25} total={list.data!.total} onPage={p => set('page', String(p))} /></>}
    <Modal open={creating} title="New client" onClose={() => setCreating(false)} wide closeOnBackdrop={false}>
      <ClientForm onSubmit={d => create.mutate(d)} busy={create.isPending} onCancel={() => setCreating(false)} error={create.error ? errorMessage(create.error) : null} /></Modal>
    <ConfirmDialog open={!!toggle} title={toggle?.isActive ? 'Deactivate client' : 'Activate client'} danger={!!toggle?.isActive} loading={setActive.isPending} error={setActive.error ? errorMessage(setActive.error) : null}
      body={<>{toggle?.isActive ? 'Engineers will no longer see ' : 'Engineers will be able to select '}<b>{toggle?.name}</b>. Existing reports are kept.</>} onConfirm={() => setActive.mutate(toggle!)} onClose={() => setToggle(null)} />
  </>
}
