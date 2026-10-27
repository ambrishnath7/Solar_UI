import { type ReactNode, useEffect } from 'react'
import { AlertCircle, Inbox, Loader2, X } from 'lucide-react'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export function Button({ variant = 'primary', className, loading, children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; loading?: boolean }) {
  const v = { primary: 'bg-amber-500 hover:bg-amber-600 text-white', secondary: 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-800', danger: 'bg-red-600 hover:bg-red-700 text-white', ghost: 'hover:bg-slate-100 text-slate-700' }[variant]
  return <button {...p} disabled={p.disabled || loading} className={cx('inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition', v, className)}>
    {loading && <Loader2 className="h-4 w-4 animate-spin" />}{children}</button>
}

export function Field({ label, error, children, className }: { label: string; error?: string; children: ReactNode; className?: string }) {
  return <label className={cx('block text-sm', className)}><span className="mb-1 block font-medium text-slate-700">{label}</span>{children}{error && <span className="mt-1 block text-xs text-red-600">{error}</span>}</label>
}
export const inputCls = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:bg-slate-100'
export function Input(p: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...p} className={cx(inputCls, p.className)} /> }
export function Select(p: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select {...p} className={cx(inputCls, p.className)} /> }
export function Textarea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...p} className={cx(inputCls, 'min-h-20', p.className)} /> }

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold text-slate-900">{title}</h1>{subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}</div>{actions && <div className="flex gap-2">{actions}</div>}</div>
}

export function Card({ children, className }: { children: ReactNode; className?: string }) { return <div className={cx('rounded-lg border border-slate-200 bg-white p-4 shadow-sm', className)}>{children}</div> }

export function StatCard({ label, value, tone = 'default', onClick }: { label: string; value: number | string; tone?: 'default' | 'warn' | 'danger' | 'ok'; onClick?: () => void }) {
  const t = { default: 'text-slate-900', warn: 'text-amber-600', danger: 'text-red-600', ok: 'text-emerald-600' }[tone]
  return <button onClick={onClick} className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-amber-400"><div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div><div className={cx('mt-1 text-3xl font-semibold', t)}>{value}</div></button>
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'red' | 'amber' | 'blue' }) {
  const t = { slate: 'bg-slate-100 text-slate-700', green: 'bg-emerald-100 text-emerald-800', red: 'bg-red-100 text-red-800', amber: 'bg-amber-100 text-amber-800', blue: 'bg-sky-100 text-sky-800' }[tone]
  return <span className={cx('inline-block rounded-full px-2 py-0.5 text-xs font-medium', t)}>{children}</span>
}
export const statusTone = (s: string) => (s === 'submitted' ? 'green' : s === 'corrected' ? 'blue' : 'amber') as 'green' | 'blue' | 'amber'
export const amcTone = (s: string) => (s === 'AMC' ? 'green' : s === 'FREE_YEAR1' ? 'blue' : s === 'EXPIRED' ? 'red' : 'slate') as 'green' | 'blue' | 'red' | 'slate'

export function Skeleton({ rows = 5 }: { rows?: number }) { return <div className="space-y-2">{Array.from({ length: rows }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />)}</div> }
export function EmptyState({ text = 'Nothing here yet.' }: { text?: string }) { return <div className="flex flex-col items-center gap-2 py-12 text-slate-500"><Inbox className="h-8 w-8" /><p className="text-sm">{text}</p></div> }
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="flex flex-col items-center gap-2 py-10 text-red-700"><AlertCircle className="h-8 w-8" /><p className="text-sm">{message}</p>{onRetry && <Button variant="secondary" onClick={onRetry}>Retry</Button>}</div>
}

export function Table<T>({ cols, rows, keyOf, onRow }: { cols: { h: string; cell: (r: T) => ReactNode; className?: string }[]; rows: T[]; keyOf: (r: T) => string; onRow?: (r: T) => void }) {
  return <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr>{cols.map(c => <th key={c.h} className={cx('px-3 py-2 font-medium', c.className)}>{c.h}</th>)}</tr></thead>
    <tbody>{rows.map(r => <tr key={keyOf(r)} onClick={onRow ? () => onRow(r) : undefined} className={cx('border-t border-slate-100', onRow && 'cursor-pointer hover:bg-amber-50')}>{cols.map(c => <td key={c.h} className={cx('px-3 py-2', c.className)}>{c.cell(r)}</td>)}</tr>)}</tbody></table></div>
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return <div className="mt-3 flex items-center justify-between text-sm text-slate-600"><span>{total} result{total === 1 ? '' : 's'}</span><div className="flex items-center gap-2"><Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button><span>Page {page} of {pages}</span><Button variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button></div></div>
}

export function Modal({ open, title, onClose, children, wide }: { open: boolean; title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => { if (!open) return; const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [open, onClose])
  if (!open) return null
  return <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
    <div className={cx('mt-8 w-full rounded-lg bg-white shadow-xl', wide ? 'max-w-3xl' : 'max-w-lg')} onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h2 className="font-semibold">{title}</h2><button onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      <div className="p-4">{children}</div></div></div>
}

export function ConfirmDialog({ open, title, body, confirmText = 'Confirm', danger, loading, onConfirm, onClose }: { open: boolean; title: string; body: ReactNode; confirmText?: string; danger?: boolean; loading?: boolean; onConfirm: () => void; onClose: () => void }) {
  return <Modal open={open} title={title} onClose={onClose}><div className="text-sm text-slate-700">{body}</div><div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmText}</Button></div></Modal>
}

export const fmtDate = (d?: string | null) => (d ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
export const fmtDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')
export const today = () => new Date().toISOString().slice(0, 10)
