import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Sun, Zap } from 'lucide-react'
import { api, errorMessage, resetLocalState, supabase } from '../../lib/api'
import { DEV_LOGIN_ENABLED, setDevSession } from '../../lib/devAuth'
import { queryClient } from '../../lib/queryClient'
import { Button, Field, Input, Notice } from '../../components/ui'

const schema = z.object({ email: z.email('Enter a valid email'), password: z.string().min(1, 'Password is required') })
type Form = z.infer<typeof schema>

/** Only allow same-site relative redirects after login. */
const safeFrom = (v: string | null) => (v && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/login') ? v : '/')

export default function LoginPage() {
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) })
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [devBusy, setDevBusy] = useState<string | null>(null)
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  const from = safeFrom(sp.get('from'))

  const onSubmit = async (f: Form) => {
    setError(null)
    resetLocalState()                                 // drop any dev session and cached data from a previous user (other devices stay signed in)
    const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password })
    if (error) { setError(error.message); return }
    navigate(from, { replace: true })
  }
  const forgot = async () => {
    const email = getValues('email')?.trim()
    if (!email) { setError('Enter your email first, then click Forgot password'); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
    if (error) setError(error.message); else setResetSent(true)
  }

  const devUsers = useQuery({ queryKey: ['dev-users'], queryFn: () => api.dev.users('admin'), enabled: DEV_LOGIN_ENABLED, retry: false, staleTime: 0 })
  const devLogin = async (userId: string) => {
    setError(null); setDevBusy(userId)
    try {
      resetLocalState()
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
      setDevSession(await api.dev.login(userId))
      await queryClient.invalidateQueries()
      navigate(from, { replace: true })
    } catch (e) { setError(`Dev login failed: ${errorMessage(e)}`) } finally { setDevBusy(null) }
  }

  return <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-slate-100 p-4">
    <div className="w-full max-w-sm">
      <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-slate-200 bg-white p-6 shadow-md" noValidate>
        <div className="mb-6 flex items-center gap-3"><div className="rounded-full bg-amber-100 p-2"><Sun className="h-6 w-6 text-amber-600" /></div><div><h1 className="text-lg font-semibold">Solar Maintenance</h1><p className="text-sm text-slate-500">Administrator sign in</p></div></div>
        <div className="space-y-3">
          <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="username" {...register('email')} /></Field>
          <Field label="Password" error={errors.password?.message}><Input type="password" autoComplete="current-password" {...register('password')} /></Field>
        </div>
        {error && <Notice className="mt-3">{error}</Notice>}
        {resetSent && <Notice tone="success" className="mt-3">Password reset email sent.</Notice>}
        <Button type="submit" loading={isSubmitting} className="mt-5 w-full justify-center">Sign in</Button>
        <button type="button" onClick={forgot} className="mt-3 w-full text-center text-sm text-slate-500 hover:text-slate-800">Forgot password?</button>
      </form>

      {DEV_LOGIN_ENABLED && <div className="mt-4 rounded-xl border border-dashed border-amber-400 bg-amber-50 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900"><Zap className="h-4 w-4" />Developer sign-in (local API only)</div>
        {devUsers.isLoading ? <p className="text-sm text-amber-800">Loading users…</p>
          : devUsers.isError ? <p className="text-sm text-amber-800">Not available: the API is not running in Development with DevAuth enabled.</p>
          : !devUsers.data?.length ? <p className="text-sm text-amber-800">No active admin users in the database.</p>
          : <div className="space-y-2">{devUsers.data.map(u => <Button key={u.userId} type="button" variant="secondary" loading={devBusy === u.userId} onClick={() => devLogin(u.userId)} className="w-full justify-center">
              Sign in as {u.email ?? u.userId.slice(0, 8)}</Button>)}</div>}
      </div>}
    </div>
  </div>
}
