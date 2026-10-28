import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Sun, Zap } from 'lucide-react'
import { api, errorMessage, startSession, statusOf } from '../../lib/api'
import { DEV_LOGIN_ENABLED } from '../../lib/devAuth'
import { Button, Field, Input, Notice } from '../../components/ui'

// Same rule as the API's accounts (any address with an @), so e.g. admin@local can sign in during development.
const schema = z.object({ email: z.string().trim().regex(/^[^\s@]+@[^\s@]+$/, 'Enter a valid email'), password: z.string().min(1, 'Password is required') })
type Form = z.infer<typeof schema>

/** Only allow same-site relative redirects after login. */
const safeFrom = (v: string | null) => (v && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/login') ? v : '/')

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) })
  const [error, setError] = useState<string | null>(null)
  const [showForgot, setShowForgot] = useState(false)
  const [devBusy, setDevBusy] = useState<string | null>(null)
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  const from = safeFrom(sp.get('from'))

  const onSubmit = async (f: Form) => {
    setError(null)
    try {
      startSession(await api.auth.login(f.email.trim(), f.password))   // replaces any previous user's session and cached data
      navigate(from, { replace: true })
    } catch (e) {
      const s = statusOf(e)
      setError(s === 401 ? 'Invalid email or password.' : s === 429 ? 'Too many sign-in attempts. Wait a minute and try again.' : errorMessage(e))
    }
  }

  const devUsers = useQuery({ queryKey: ['dev-users'], queryFn: () => api.dev.users('admin'), enabled: DEV_LOGIN_ENABLED, retry: false, staleTime: 0 })
  const devLogin = async (userId: string) => {
    setError(null); setDevBusy(userId)
    try {
      startSession(await api.dev.login(userId), true)
      navigate(from, { replace: true })
    } catch (e) { setError(`Dev login failed: ${errorMessage(e)}`) } finally { setDevBusy(null) }
  }

  return <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-100 via-sky-50 to-slate-100 p-4">
    <div className="w-full max-w-sm">
      <div className="mb-4 flex items-center gap-3 rounded-xl bg-gradient-to-br from-sky-600 to-sky-800 p-5 text-white shadow-md">
        <div className="rounded-full bg-white/20 p-2"><Sun className="h-7 w-7" /></div>
        <div><h1 className="text-xl font-semibold">Solar Maintenance</h1><p className="text-sm text-sky-100">Shree Abhi Electricals · Administrator</p></div>
      </div>
      {DEV_LOGIN_ENABLED && <div className="mb-4 rounded-xl border-2 border-sky-600 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-sky-900"><Zap className="h-4 w-4" />Quick sign-in (local test setup)</div>
        {devUsers.isLoading ? <p className="text-sm text-sky-800">Loading users…</p>
          : devUsers.isError ? <p className="text-sm text-sky-800">Not available: the API is not running in Development with DevAuth enabled.</p>
          : !devUsers.data?.length ? <p className="text-sm text-sky-800">No active admin users in the database.</p>
          : <div className="space-y-2">{devUsers.data.map(u => <Button key={u.userId} type="button" variant="primary" loading={devBusy === u.userId} onClick={() => devLogin(u.userId)} className="w-full justify-center">
              Sign in as {u.email ?? u.userId.slice(0, 8)}</Button>)}</div>}
      </div>}
      <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-slate-200 bg-white p-6 shadow-md" noValidate>
        {DEV_LOGIN_ENABLED && <p className="mb-4 text-center text-xs uppercase tracking-wide text-slate-400">or sign in with email and password</p>}
        <div className="space-y-3">
          <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="username" {...register('email')} /></Field>
          <Field label="Password" error={errors.password?.message}><Input type="password" autoComplete="current-password" {...register('password')} /></Field>
        </div>
        {error && <Notice className="mt-3">{error}</Notice>}
        <Button type="submit" loading={isSubmitting} className="mt-5 w-full justify-center">Sign in</Button>
        <button type="button" onClick={() => setShowForgot(v => !v)} className="mt-3 w-full text-center text-sm text-slate-500 hover:text-slate-800">Forgot password?</button>
        {showForgot && <Notice tone="info" className="mt-2">Administrator passwords are reset by whoever runs the server, with the API's create-admin command. Engineers: ask an administrator to reset yours.</Notice>}
      </form>
    </div>
  </div>
}
