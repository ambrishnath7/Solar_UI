import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Download, Mail, MessageCircle, Link2, Pencil } from 'lucide-react'
import { api, errorMessage } from '../../lib/api'
import { SECTIONS, type Report, type ReportFields } from '../../lib/types'
import { Badge, Button, Card, ErrorState, Field, Input, Modal, PageHeader, Select, Skeleton, Textarea, cx, fmtDate, fmtDateTime, statusTone } from '../../components/ui'

export default function ReportDetailPage() {
  const { id = '' } = useParams(); const qc = useQueryClient()
  const q = useQuery({ queryKey: ['report', id], queryFn: () => api.reports.get(id) })
  const [correcting, setCorrecting] = useState(false); const [msg, setMsg] = useState<string | null>(null); const [pdfKey, setPdfKey] = useState(0)
  const share = useMutation({ mutationFn: () => api.reports.shareLink(id) })
  if (q.isLoading) return <Skeleton rows={10} />
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
  const r = q.data!; const f = r.fields; const locked = r.status !== 'draft'

  const download = async () => {
    const blob = await api.reports.pdfBlob(id); const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${r.reportRef ?? 'draft-' + r.id}.pdf`; a.click(); URL.revokeObjectURL(url)
  }
  const withLink = async (fn: (url: string) => void) => { try { const s = await share.mutateAsync(); fn(s.url); setMsg(`Share link valid until ${fmtDateTime(s.expiresAt)}`) } catch (e) { setMsg(errorMessage(e)) } }
  const text = (url: string) => encodeURIComponent(`Solar maintenance report ${r.reportRef} for ${r.clientName} (visit ${fmtDate(f.visitDate)}). PDF: ${url}`)

  return <>
    <PageHeader title={r.reportRef ?? 'Draft report'} subtitle={`${r.clientName} · ${r.engineerName}`} actions={<>
      <Badge tone={statusTone(r.status)}>{r.status}</Badge>
      <Button variant="secondary" onClick={download}><Download className="h-4 w-4" />PDF</Button>
      {locked && <><Button variant="secondary" onClick={() => withLink(u => navigator.clipboard.writeText(u))}><Link2 className="h-4 w-4" />Copy link</Button>
        <Button variant="secondary" onClick={() => withLink(u => window.open(`https://wa.me/?text=${text(u)}`, '_blank'))}><MessageCircle className="h-4 w-4" />WhatsApp</Button>
        <Button variant="secondary" onClick={() => withLink(u => (window.location.href = `mailto:?subject=${encodeURIComponent(`Maintenance report ${r.reportRef}`)}&body=${text(u)}`))}><Mail className="h-4 w-4" />Email</Button>
        <Button onClick={() => setCorrecting(true)}><Pencil className="h-4 w-4" />Correct</Button></>}</>} />
    {msg && <p className="mb-3 rounded bg-amber-50 p-2 text-sm text-amber-800">{msg}. WhatsApp and email open with the link prefilled; attach the downloaded PDF if the recipient needs the file itself.</p>}

    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <Card><div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm md:grid-cols-3">
          {[['Client', <Link to={`/clients/${r.clientId}`} className="text-amber-700 hover:underline">{r.clientName}</Link>], ['Engineer', r.engineerName], ['Visit date', fmtDate(f.visitDate)], ['Previous maintenance', fmtDate(f.previousMaintenanceDate)], ['Next visit date', fmtDate(f.nextVisitDate)], ['Technicians', f.technicianCount ?? '—'], ['Submitted', fmtDateTime(r.submittedAt)], ['Defects', r.defectCount], ['Signatures', `${r.hasEngineerSignature ? 'engineer ✓' : 'engineer ✗'}, ${r.hasClientSignature ? 'client ✓' : 'client ✗'}${f.clientRepName ? ` (${f.clientRepName})` : ''}`]]
            .map(([k, v]) => <div key={k as string} className="border-b border-slate-100 py-1"><div className="text-xs text-slate-500">{k}</div><div>{v}</div></div>)}</div></Card>
        {SECTIONS.map(s => <Card key={s.title}><h2 className="mb-2 font-semibold">{s.title}</h2>
          <table className="w-full text-sm">{s.rows.map(row => { const v = f[row.key] as string | number | null | undefined; return <tr key={row.key} className="border-b border-slate-100"><td className="py-1.5 text-slate-700">{row.label}</td><td className="py-1.5 text-right">
            {row.type === 'num' ? (v ?? '—') : v ? <Badge tone={v === 'DEFECT' ? 'red' : v === 'GOOD' ? 'green' : 'slate'}>{v}</Badge> : <span className="text-slate-400">—</span>}</td></tr> })}</table>
          <p className="mt-2 text-sm text-slate-600"><span className="text-slate-400">Remarks: </span>{(f[s.remarks] as string) || '—'}</p></Card>)}
        <Card><h2 className="mb-2 font-semibold">8. Observations and Issues</h2><div className="space-y-2 text-sm"><p><span className="text-slate-400">General observations: </span>{f.s8GeneralObservations || '—'}</p><p><span className="text-slate-400">Action required: </span>{f.s8ActionRequired || '—'}</p><p><span className="text-slate-400">Next visit date: </span>{fmtDate(f.nextVisitDate)}</p></div></Card>
      </div>
      <Card className="xl:sticky xl:top-4 xl:self-start"><h2 className="mb-2 font-semibold">PDF preview</h2><PdfFrame id={id} key={pdfKey} /><Button variant="ghost" className="mt-2" onClick={() => setPdfKey(k => k + 1)}>Reload preview</Button></Card>
    </div>
    <Modal open={correcting} title="Admin correction" onClose={() => setCorrecting(false)} wide>
      <CorrectionForm report={r} onDone={() => { setCorrecting(false); qc.invalidateQueries({ queryKey: ['report', id] }); qc.invalidateQueries({ queryKey: ['reports'] }); setPdfKey(k => k + 1) }} onCancel={() => setCorrecting(false)} /></Modal>
  </>
}

function PdfFrame({ id }: { id: string }) {
  const q = useQuery({ queryKey: ['pdf', id], queryFn: () => api.reports.pdfBlob(id).then(b => URL.createObjectURL(b)), staleTime: 0, gcTime: 0 })
  if (q.isLoading) return <div className="h-[70vh] animate-pulse rounded bg-slate-100" />
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
  return <iframe title="Report PDF" src={q.data} className="h-[70vh] w-full rounded border border-slate-200" />
}

function CorrectionForm({ report, onDone, onCancel }: { report: Report; onDone: () => void; onCancel: () => void }) {
  const { register, handleSubmit } = useForm<ReportFields & { reason: string }>({ defaultValues: { ...report.fields, reason: '' } })
  const [err, setErr] = useState<string | null>(null)
  const m = useMutation({ mutationFn: (d: ReportFields & { reason: string }) => { const { reason, ...fields } = d; return api.reports.correct(report.id, { version: report.version, reason, fields: clean(fields) }) }, onSuccess: onDone, onError: e => setErr(errorMessage(e)) })
  return <form onSubmit={handleSubmit(d => m.mutate(d))} className="space-y-3">
    <p className="text-sm text-slate-600">Corrections are recorded in the audit log with your user id and reason. The report status becomes <b>corrected</b> and the PDF is regenerated.</p>
    <Field label="Reason for correction *"><Textarea {...register('reason', { required: true })} placeholder="e.g. Fan status was recorded incorrectly" /></Field>
    <div className="grid gap-2 md:grid-cols-3"><Field label="Visit date"><Input type="date" {...register('visitDate')} /></Field><Field label="Technicians"><Input type="number" {...register('technicianCount')} /></Field><Field label="Next visit date"><Input type="date" {...register('nextVisitDate')} /></Field></div>
    <div className="max-h-[50vh] space-y-3 overflow-y-auto rounded border border-slate-200 p-3">
      {SECTIONS.map(s => <div key={s.title}><h3 className="mb-1 text-sm font-semibold">{s.title}</h3><div className="grid gap-2 md:grid-cols-2">
        {s.rows.map(row => <Field key={row.key} label={row.label}>{row.type === 'num' ? <Input type="number" step="0.01" {...register(row.key)} /> : <Select {...register(row.key)}><option value="">—</option>{(row.type === 'yn' ? ['YES', 'NO'] : ['GOOD', 'DEFECT']).map(o => <option key={o} value={o}>{o}</option>)}</Select>}</Field>)}
        <Field label="Remarks" className="md:col-span-2"><Input {...register(s.remarks)} /></Field></div></div>)}
      <h3 className="text-sm font-semibold">8. Observations and Issues</h3>
      <Field label="General observations"><Textarea {...register('s8GeneralObservations')} /></Field><Field label="Action required"><Textarea {...register('s8ActionRequired')} /></Field>
    </div>
    {err && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
    <div className={cx('flex justify-end gap-2')}><Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit" loading={m.isPending}>Save correction</Button></div>
  </form>
}

function clean(f: ReportFields): ReportFields {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(f)) out[k] = v === '' ? null : typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) && /Kwh|Units|technicianCount/.test(k) ? Number(v) : v
  if (typeof out.technicianCount === 'string') out.technicianCount = Number(out.technicianCount)
  return out as ReportFields
}
