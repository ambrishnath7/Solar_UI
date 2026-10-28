import { Suspense, useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, BarChart3, CalendarDays, FileText, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Users, Wrench, X } from 'lucide-react'
import { errorMessage, signOut, statusOf, supabase } from '../lib/api'
import { getDevSession } from '../lib/devAuth'
import { useMe } from '../lib/useMe'
import { cx } from '../lib/format'
import { Button, Skeleton } from '../components/ui'

/** 'loading' until the first check; then 'in' when a dev session or Supabase session exists. Reacts to sign-in/out anywhere. */
function useAuthState(): 'loading' | 'in' | 'out' {
  const [state, setState] = useState<'loading' | 'in' | 'out'>('loading')
  useEffect(() => {
    let alive = true
    const check = async () => {
      if (getDevSession()) { if (alive) setState('in'); return }
      const { data } = await supabase.auth.getSession()
      if (alive) setState(data.session ? 'in' : 'out')
    }
    void check()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { void check() })
    window.addEventListener('solar-auth', check)
    return () => { alive = false; subscription.unsubscribe(); window.removeEventListener('solar-auth', check) }
  }, [])
  return state
}

const Splash = () => <div className="flex min-h-screen items-center justify-center text-slate-500" role="status">Loading…</div>

export function AdminGuard() {
  const auth = useAuthState()
  const navigate = useNavigate()
  const location = useLocation()
  const me = useMe(auth === 'in')

  if (auth === 'loading') return <Splash />
  if (auth === 'out') return <Navigate to={`/login?from=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (me.isLoading) return <Splash />
  if (me.isError || me.data?.role !== 'admin') {
    const s = statusOf(me.error)
    const unreachable = me.isError && (s === undefined || s >= 500)
    return <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <ShieldCheck className="h-10 w-10 text-red-600" aria-hidden />
      <h1 className="text-lg font-semibold">{unreachable ? 'API unreachable' : me.isError ? 'Sign-in not accepted' : 'This account is not an administrator'}</h1>
      <p className="max-w-md text-sm text-slate-600">{me.isError ? errorMessage(me.error) || 'The API rejected this login. The user may not be registered in the Solar system.' : 'Engineer accounts use the mobile app.'}</p>
      <div className="flex gap-2">
        {me.isError && <Button onClick={() => void me.refetch()} loading={me.isFetching}>Retry</Button>}
        <Button variant="secondary" onClick={async () => { await signOut(); navigate('/login') }}>Sign out</Button>
      </div></div>
  }
  return <Shell />
}

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/engineers', label: 'Engineers', icon: Wrench },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/schedule', label: 'Upcoming & Overdue', icon: AlertTriangle },
  { to: '/amc', label: 'AMC', icon: ShieldCheck },
  { to: '/defects', label: 'Defect Summary', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function Shell() {
  const [open, setOpen] = useState(false)
  const me = useMe()
  const navigate = useNavigate()
  const doSignOut = async () => { await signOut(); navigate('/login') }
  const dev = getDevSession()
  const links = nav.map(n => <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)}
    className={({ isActive }) => cx('flex items-center gap-3 rounded-md px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400', isActive ? 'bg-amber-100 font-medium text-amber-900' : 'text-slate-700 hover:bg-slate-100')}><n.icon className="h-4 w-4" aria-hidden />{n.label}</NavLink>)
  const devBadge = dev && <div className="mx-3 mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">dev login</div>
  return <div className="flex min-h-screen">
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-3 md:flex">
      <div className="mb-4 px-3 py-2"><div className="text-xs font-semibold uppercase tracking-wider text-amber-700">Solar Maintenance</div><div className="text-sm text-slate-500">Admin</div></div>
      <nav aria-label="Main" className="flex flex-1 flex-col gap-1">{links}</nav>
      <div className="border-t border-slate-200 pt-3 text-xs text-slate-500"><div className="truncate px-3">{me.data?.email}</div>{devBadge}<button type="button" onClick={doSignOut} className="mt-1 flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"><LogOut className="h-4 w-4" aria-hidden />Sign out</button></div>
    </aside>
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden"><div className="font-semibold text-amber-700">Solar Maintenance</div>
        <button type="button" onClick={() => setOpen(o => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-nav" className="rounded p-1 hover:bg-slate-100">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button></header>
      {open && <nav id="mobile-nav" aria-label="Main" className="flex flex-col gap-1 border-b border-slate-200 bg-white p-3 md:hidden">{links}<div className="px-3 text-xs text-slate-500">{me.data?.email}</div>{devBadge}<button type="button" onClick={doSignOut} className="flex items-center gap-2 rounded px-3 py-2 text-sm text-slate-700"><LogOut className="h-4 w-4" aria-hidden />Sign out</button></nav>}
      <main className="min-w-0 flex-1 p-4 md:p-6"><Suspense fallback={<Skeleton rows={6} />}><Outlet /></Suspense></main>
    </div>
  </div>
}
