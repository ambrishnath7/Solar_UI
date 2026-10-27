import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/api'
import { Button, Field, Input } from '../../components/ui'

export default function ResetPasswordPage() {
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState(''); const [msg, setMsg] = useState<string | null>(null); const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null)
    if (pw.length < 8) return setMsg('Password must be at least 8 characters')
    if (pw !== pw2) return setMsg('Passwords do not match')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return setMsg(error.message)
    navigate('/', { replace: true })
  }
  return <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
    <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-md">
      <h1 className="text-lg font-semibold">Set a new password</h1>
      <Field label="New password"><Input type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" /></Field>
      <Field label="Confirm password"><Input type="password" value={pw2} onChange={e => setPw2(e.target.value)} autoComplete="new-password" /></Field>
      {msg && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{msg}</p>}
      <Button type="submit" loading={busy} className="w-full justify-center">Save password</Button>
    </form></div>
}
