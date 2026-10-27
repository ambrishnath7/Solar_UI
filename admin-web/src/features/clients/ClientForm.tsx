import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { AMC_STATUSES, type Client, type ClientUpsert } from '../../lib/types'
import { Button, Field, Input, Select, Textarea } from '../../components/ui'

const opt = z.string().trim().optional().or(z.literal('')).transform(v => (v ? v : null))
const num = z.union([z.coerce.number().nonnegative(), z.literal('')]).optional().transform(v => (v === '' || v === undefined ? null : v))
const date = z.string().optional().transform(v => (v ? v : null))
export const clientSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'), contactPerson: opt, phone: opt, email: z.string().trim().email('Invalid email').optional().or(z.literal('')).transform(v => v || null),
  address: opt, siteLocation: opt, solarCapacityKwp: num, moduleMake: opt, moduleModel: opt, moduleCount: num, moduleWattage: num,
  inverterMake: opt, inverterModel: opt, inverterCapacityKw: num, installationDate: date, previousMaintenanceDate: date, nextDueDate: date,
  amcStatus: z.enum(['FREE_YEAR1', 'AMC', 'EXPIRED', 'NONE']), amcStartDate: date, amcExpiryDate: date,
}).refine(v => !v.amcStartDate || !v.amcExpiryDate || v.amcExpiryDate >= v.amcStartDate, { message: 'AMC expiry must be on or after AMC start', path: ['amcExpiryDate'] })
type FormIn = z.input<typeof clientSchema>
type FormOut = z.output<typeof clientSchema>

export function ClientForm({ initial, onSubmit, busy, onCancel }: { initial?: Client; onSubmit: (d: ClientUpsert) => void; busy?: boolean; onCancel: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(clientSchema),
    defaultValues: initial ? { ...initial, amcStatus: initial.amcStatus } as unknown as FormIn : { amcStatus: 'FREE_YEAR1' },
  })
  const e = (k: keyof FormIn) => errors[k]?.message as string | undefined
  return <form onSubmit={handleSubmit(v => onSubmit(v as ClientUpsert))} className="grid gap-3 md:grid-cols-2">
    <Field label="Client name *" error={e('name')} className="md:col-span-2"><Input {...register('name')} /></Field>
    <Field label="Contact person"><Input {...register('contactPerson')} /></Field>
    <Field label="Phone"><Input {...register('phone')} /></Field>
    <Field label="Email" error={e('email')}><Input {...register('email')} /></Field>
    <Field label="Site location"><Input {...register('siteLocation')} placeholder="e.g. Rooftop, Block A" /></Field>
    <Field label="Address" className="md:col-span-2"><Textarea {...register('address')} /></Field>
    <h3 className="mt-2 text-sm font-semibold text-slate-600 md:col-span-2">Solar installation</h3>
    <Field label="Solar capacity (kWp)" error={e('solarCapacityKwp')}><Input type="number" step="0.01" {...register('solarCapacityKwp')} /></Field>
    <Field label="Installation date"><Input type="date" {...register('installationDate')} /></Field>
    <Field label="Module make"><Input {...register('moduleMake')} /></Field>
    <Field label="Module model"><Input {...register('moduleModel')} /></Field>
    <Field label="Module count" error={e('moduleCount')}><Input type="number" {...register('moduleCount')} /></Field>
    <Field label="Module wattage (W)" error={e('moduleWattage')}><Input type="number" step="0.1" {...register('moduleWattage')} /></Field>
    <Field label="Inverter make"><Input {...register('inverterMake')} /></Field>
    <Field label="Inverter model"><Input {...register('inverterModel')} /></Field>
    <Field label="Inverter capacity (kW)" error={e('inverterCapacityKw')}><Input type="number" step="0.01" {...register('inverterCapacityKw')} /></Field>
    <h3 className="mt-2 text-sm font-semibold text-slate-600 md:col-span-2">Maintenance and AMC</h3>
    <Field label="Previous maintenance date"><Input type="date" {...register('previousMaintenanceDate')} /></Field>
    <Field label="Next due date"><Input type="date" {...register('nextDueDate')} /></Field>
    <Field label="AMC status"><Select {...register('amcStatus')}>{AMC_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</Select></Field>
    <div />
    <Field label="AMC start date"><Input type="date" {...register('amcStartDate')} /></Field>
    <Field label="AMC expiry date" error={e('amcExpiryDate')}><Input type="date" {...register('amcExpiryDate')} /></Field>
    <div className="mt-2 flex justify-end gap-2 md:col-span-2"><Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit" loading={busy}>{initial ? 'Save changes' : 'Create client'}</Button></div>
  </form>
}
