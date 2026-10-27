import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Sun } from 'lucide-react'
import { supabase } from '../../lib/api'
import { Button, Field, Input } from '../../components/ui'

const schema = z.object({ email: z.string().email('Enter a valid email'), password: z.string().min(1, 'Password is required') })
type Form = z.infer<typeof schema>

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) })
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const navigate = useNavigate()

  const onSubmit = async (f: Form) => {
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password })
    if (error) { setError(error.message); return }
    navigate('/', { replace: true })
  }
  const forgot = async (email: string) => {
    if (!email) { setError('Enter your email first, then click Forgot password'); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
    if (error) setError(error.message); else setResetSent(true)
  }

  return <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-slate-100 p-4">
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-md">
      <div className="mb-6 flex items-center gap-3"><div className="rounded-full bg-amber-100 p-2"><Sun className="h-6 w-6 text-amber-600" /></div><div><h1 className="text-lg font-semibold">Solar Maintenance</h1><p className="text-sm text-slate-500">Administrator sign in</p></div></div>
      <div className="space-y-3">
        <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="username" {...register('email')} /></Field>
        <Field label="Password" error={errors.password?.message}><Input type="password" autoComplete="current-password" {...register('password')} /></Field>
      </div>
      {error && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      {resetSent && <p className="mt-3 rounded bg-emerald-50 p-2 text-sm text-emerald-700">Password reset email sent.</p>}
      <Button type="submit" loading={isSubmitting} className="mt-5 w-full justify-center">Sign in</Button>
      <button type="button" onClick={() => forgot((document.querySelector('input[type=email]') as HTMLInputElement)?.value)} className="mt-3 w-full text-center text-sm text-slate-500 hover:text-slate-800">Forgot password?</button>
    </form>
  </div>
}
