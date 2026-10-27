import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { api, errorMessage, supabase } from '../../lib/api'
import type { Company } from '../../lib/types'
import { useMe } from '../../app/router'
import { Button, Card, ErrorState, Field, Input, PageHeader, Skeleton, Textarea, fmtDateTime } from '../../components/ui'

type CompanyForm = Omit<Company, 'logoUrl' | 'updatedAt'>

export default function SettingsPage() {
  const qc = useQueryClient(); const me = useMe()
  const q = useQuery({ queryKey: ['company'], queryFn: api.company.get })
  const { register, handleSubmit, reset } = useForm<CompanyForm>()
  useEffect(() => { if (q.data) reset(q.data) }, [q.data, reset])
  const [msg, setMsg] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null)
  const save = useMutation({ mutationFn: (d: CompanyForm) => api.company.update(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['company'] }); setMsg('Company settings saved. New PDFs use these details.'); setErr(null) }, onError: e => setErr(errorMessage(e)) })
  const logo = useMutation({ mutationFn: (f: File) => api.company.logo(f), onSuccess: () => { qc.invalidateQueries({ queryKey: ['company'] }); setMsg('Logo updated.') }, onError: e => setErr(errorMessage(e)) })
  const [pw, setPw] = useState(''); const [pwMsg, setPwMsg] = useState<string | null>(null)
  const changePw = async () => { if (pw.length < 8) return setPwMsg('At least 8 characters'); const { error } = await supabase.auth.updateUser({ password: pw }); setPwMsg(error ? error.message : 'Password changed.'); if (!error) setPw('') }

  return <>
    <PageHeader title="Settings" />
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2"><h2 className="mb-1 font-semibold">Company settings</h2><p className="mb-3 text-sm text-slate-500">Used in the PDF header and footer and for alert emails.</p>
        {q.isLoading ? <Skeleton /> : q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} /> :
          <form onSubmit={handleSubmit(d => save.mutate(d))} className="grid gap-3 md:grid-cols-2">
            <Field label="Company name *" className="md:col-span-2"><Input {...register('companyName', { required: true })} /></Field>
            <Field label="Address line 1"><Input {...register('addressLine1')} /></Field><Field label="Address line 2"><Input {...register('addressLine2')} /></Field>
            <Field label="City"><Input {...register('city')} /></Field><Field label="State"><Input {...register('state')} /></Field><Field label="Pincode"><Input {...register('pincode')} /></Field>
            <Field label="Phone"><Input {...register('phone')} /></Field><Field label="Email"><Input type="email" {...register('email')} /></Field><Field label="Website"><Input {...register('website')} /></Field>
            <Field label="GST number"><Input {...register('gstNumber')} /></Field>
            <Field label="Admin alert email (reminders go here)"><Input type="email" {...register('adminAlertEmail')} /></Field>
            <Field label="PDF footer text" className="md:col-span-2"><Textarea {...register('pdfFooterText')} /></Field>
            <div className="flex items-center justify-between md:col-span-2"><span className="text-xs text-slate-500">Last updated {fmtDateTime(q.data!.updatedAt)}</span><Button type="submit" loading={save.isPending}>Save</Button></div>
          </form>}
        {msg && <p className="mt-3 rounded bg-emerald-50 p-2 text-sm text-emerald-700">{msg}</p>}{err && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
      </Card>
      <div className="space-y-4">
        <Card><h2 className="mb-2 font-semibold">Company logo</h2>
          {q.data?.logoUrl ? <img src={q.data.logoUrl} alt="Company logo" className="mb-2 max-h-24 rounded border border-slate-200 bg-white p-1" /> : <p className="mb-2 text-sm text-slate-500">No logo uploaded.</p>}
          <input type="file" accept="image/png,image/jpeg" onChange={e => e.target.files?.[0] && logo.mutate(e.target.files[0])} className="text-sm" /><p className="mt-1 text-xs text-slate-500">PNG or JPEG, up to 1 MB. Appears on every PDF.</p></Card>
        <Card><h2 className="mb-2 font-semibold">Your account</h2><p className="text-sm text-slate-600">{me.data?.email}</p><p className="mb-3 text-xs text-slate-500">Role: {me.data?.role}</p>
          <Field label="New password"><Input type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" /></Field>
          <Button variant="secondary" className="mt-2" onClick={changePw}>Change password</Button>{pwMsg && <p className="mt-2 text-sm text-slate-600">{pwMsg}</p>}</Card>
      </div>
    </div>
  </>
}
