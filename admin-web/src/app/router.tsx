import { createBrowserRouter, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, BarChart3, CalendarDays, FileText, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Users, Wrench } from 'lucide-react'
import { useState } from 'react'
import { api, supabase } from '../lib/api'
import { Button, cx } from '../components/ui'
import LoginPage from '../features/auth/LoginPage'
import ResetPasswordPage from '../features/auth/ResetPasswordPage'
import DashboardPage from '../features/dashboard/DashboardPage'
import ClientsPage from '../features/clients/ClientsPage'
import ClientDetailPage from '../features/clients/ClientDetailPage'
import EngineersPage from '../features/engineers/EngineersPage'
import ReportsPage from '../features/reports/ReportsPage'
import ReportDetailPage from '../features/reports/ReportDetailPage'
import CalendarPage from '../features/calendar/CalendarPage'
import UpcomingOverduePage from '../features/calendar/UpcomingOverduePage'
import AmcPage from '../features/amc/AmcPage'
import DefectSummaryPage from '../features/defects/DefectSummaryPage'
import SettingsPage from '../features/settings/SettingsPage'

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: api.me, retry: false, staleTime: 5 * 60_000 })
}

function AdminGuard() {
  const [session, setSession] = useState<boolean | null>(null)
  const me = useMe()
  const navigate = useNavigate()
  if (session === null) supabase.auth.getSession().then(({ data }) => setSession(!!data.session))
  if (session === null) return <Splash />
  if (!session) return <Navigate to="/login" replace />
  if (me.isLoading) return <Splash />
  if (me.isError || me.data?.role !== 'admin') {
    return <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <ShieldCheck className="h-10 w-10 text-red-600" /><h1 className="text-lg font-semibold">This account is not an administrator</h1>
      <p className="max-w-md text-sm text-slate-600">{me.isError ? 'The API rejected this login. The user may not be registered in the Solar system.' : 'Engineer accounts use the mobile app.'}</p>
      <Button variant="secondary" onClick={async () => { await supabase.auth.signOut(); navigate('/login') }}>Sign out</Button></div>
  }
  return <Shell />
}

const Splash = () => <div className="flex min-h-screen items-center justify-center text-slate-500">Loading…</div>

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
  const signOut = async () => { await supabase.auth.signOut(); navigate('/login') }
  const links = nav.map(n => <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)}
    className={({ isActive }) => cx('flex items-center gap-3 rounded-md px-3 py-2 text-sm', isActive ? 'bg-amber-100 font-medium text-amber-900' : 'text-slate-700 hover:bg-slate-100')}><n.icon className="h-4 w-4" />{n.label}</NavLink>)
  return <div className="flex min-h-screen">
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-3 md:flex">
      <div className="mb-4 px-3 py-2"><div className="text-xs font-semibold uppercase tracking-wider text-amber-600">Solar Maintenance</div><div className="text-sm text-slate-500">Admin</div></div>
      <nav className="flex flex-1 flex-col gap-1">{links}</nav>
      <div className="border-t border-slate-200 pt-3 text-xs text-slate-500"><div className="truncate px-3">{me.data?.email}</div><button onClick={signOut} className="mt-1 flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"><LogOut className="h-4 w-4" />Sign out</button></div>
    </aside>
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden"><div className="font-semibold text-amber-700">Solar Maintenance</div><button onClick={() => setOpen(o => !o)} aria-label="Menu" className="rounded p-1 hover:bg-slate-100"><Menu className="h-5 w-5" /></button></header>
      {open && <nav className="flex flex-col gap-1 border-b border-slate-200 bg-white p-3 md:hidden">{links}<button onClick={signOut} className="flex items-center gap-2 rounded px-3 py-2 text-sm text-slate-700"><LogOut className="h-4 w-4" />Sign out</button></nav>}
      <main className="flex-1 p-4 md:p-6"><Outlet /></main>
    </div>
  </div>
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    path: '/', element: <AdminGuard />, children: [
      { index: true, element: <DashboardPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'reports/:id', element: <ReportDetailPage /> },
      { path: 'clients', element: <ClientsPage /> },
      { path: 'clients/:id', element: <ClientDetailPage /> },
      { path: 'engineers', element: <EngineersPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'schedule', element: <UpcomingOverduePage /> },
      { path: 'amc', element: <AmcPage /> },
      { path: 'defects', element: <DefectSummaryPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
