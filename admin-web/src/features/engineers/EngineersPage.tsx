import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { api, errorMessage } from '../../lib/api'
import type { Engineer } from '../../lib/types'
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, Skeleton, Table, fmtDate } from '../../components/ui'

const optStr = z.string().trim().optional().or(z.literal('')).transform(v => (v ? v : null))
const createSchema = z.object({ name: z.string().trim().min(1, 'Name is required'), email: z.string().trim().email('Invalid email'), phone: optStr, employeeCode: optStr, password: z.string().min(8, 'At least 8 characters') })
const updateSchema = createSchema.pick({ name: true, phone: true, employeeCode: true })

export default function EngineersPage() {
  const qc = useQueryClient()
  const [active, setActive] = useState('true')
  const list = useQuery({ queryKey: ['engineers', active], queryFn: () => api.engineers.list(active === '' ? undefined : active === 'true') })
  const [creating, setCreating] = useState(false); const [editing, setEditing] = useState<Engineer | null>(null); const [toggle, setToggle] = useState<Engineer | null>(null); const [err, setErr] = useState<string | null>(null)
  const done = () => { qc.invalidateQueries({ queryKey: ['engineers'] }); setCreating(false); setEditing(null); setToggle(null); setErr(null) }
  const create = useMutation({ mutationFn: api.engineers.create, onSuccess: done, onError: e => setErr(errorMessage(e)) })
  const update = useMutation({ mutationFn: (d: z.infer<typeof updateSchema>) => api.engineers.update(editing!.id, d), onSuccess: done, onError: e => setErr(errorMessage(e)) })
  const setActiveM = useMutation({ mutationFn: (e: Engineer) => api.engineers.setActive(e.id, !e.isActive), onSuccess: done, onError: e => setErr(errorMessage(e)) })

  return <>
    <PageHeader title="Engineers" subtitle="Field engineer accounts for the mobile app" actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />New engineer</Button>} />
    <Select value={active} onChange={e => setActive(e.target.value)} className="mb-3 w-40"><option value="true">Active</option><option value="false">Inactive</option><option value="">All</option></Select>
    {err && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
    {list.isLoading ? <Skeleton /> : list.isError ? <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} /> : list.data!.length === 0 ? <EmptyState text="No engineers." /> :
      <Table rows={list.data!} keyOf={e => e.id} cols={[
        { h: 'Name', cell: e => <span className="font-medium">{e.name}</span> }, { h: 'Code', cell: e => e.employeeCode ?? '—' }, { h: 'Phone', cell: e => e.phone ?? '—' }, { h: 'Email', cell: e => e.email },
        { h: 'Login', cell: e => e.userId ? <Badge tone="green">linked</Badge> : <Badge tone="red">no login</Badge> }, { h: 'Since', cell: e => fmtDate(e.createdAt) },
        { h: '', cell: e => <div className="flex gap-1"><Button variant="ghost" onClick={() => setEditing(e)}>Edit</Button><Button variant="ghost" onClick={() => setToggle(e)}>{e.isActive ? 'Deactivate' : 'Activate'}</Button></div> }]} />}
    <Modal open={creating} title="New engineer" onClose={() => setCreating(false)}><EngineerForm mode="create" onSubmit={d => create.mutate(d as z.infer<typeof createSchema>)} busy={create.isPending} onCancel={() => setCreating(false)} /></Modal>
    <Modal open={!!editing} title={`Edit ${editing?.name ?? ''}`} onClose={() => setEditing(null)}>{editing && <EngineerForm mode="edit" initial={editing} onSubmit={d => update.mutate(d)} busy={update.isPending} onCancel={() => setEditing(null)} />}</Modal>
    <ConfirmDialog open={!!toggle} title={toggle?.isActive ? 'Deactivate engineer' : 'Activate engineer'} danger={!!toggle?.isActive} loading={setActiveM.isPending}
      body={toggle?.isActive ? <><b>{toggle.name}</b> will be signed out and unable to log in. Reports are kept.</> : <><b>{toggle?.name}</b> will be able to log in again.</>} onConfirm={() => setActiveM.mutate(toggle!)} onClose={() => setToggle(null)} />
  </>
}

function EngineerForm({ mode, initial, onSubmit, busy, onCancel }: { mode: 'create' | 'edit'; initial?: Engineer; onSubmit: (d: z.infer<typeof createSchema> | z.infer<typeof updateSchema>) => void; busy: boolean; onCancel: () => void }) {
  type CreateForm = z.infer<typeof createSchema>
  const resolver = (mode === 'create' ? zodResolver(createSchema) : zodResolver(updateSchema)) as Resolver<CreateForm>
  const { register, handleSubmit, formState: { errors } } = useForm<CreateForm>({ resolver, defaultValues: initial ? { name: initial.name, phone: initial.phone ?? '', employeeCode: initial.employeeCode ?? '' } : {} })
  return <form onSubmit={handleSubmit(d => onSubmit(d))} className="space-y-3">
    <Field label="Name *" error={errors.name?.message}><Input {...register('name')} /></Field>
    {mode === 'create' && <Field label="Email (login) *" error={errors.email?.message}><Input type="email" {...register('email')} /></Field>}
    <Field label="Phone"><Input {...register('phone')} /></Field>
    <Field label="Employee code"><Input {...register('employeeCode')} /></Field>
    {mode === 'create' && <Field label="Initial password *" error={errors.password?.message}><Input type="text" autoComplete="off" {...register('password')} /></Field>}
    {mode === 'create' && <p className="text-xs text-slate-500">Share the password with the engineer privately. They can change it from the app profile.</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit" loading={busy}>{mode === 'create' ? 'Create login' : 'Save'}</Button></div>
  </form>
}
