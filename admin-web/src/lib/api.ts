import axios, { AxiosError } from 'axios'
import { createClient } from '@supabase/supabase-js'
import { clearDevSession, getDevSession, type DevSession, type DevUser } from './devAuth'
import { queryClient } from './queryClient'
import { SECTIONS } from './types'
import type { Client, ClientUpsert, Company, DashboardSummary, DefectSummaryItem, Engineer, Me, Paged, Report, ReportFields, ReportListItem, ScheduleItem, ShareLink } from './types'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

export const API_URL: string = import.meta.env.VITE_API_URL

export const http = axios.create({ baseURL: API_URL, timeout: 30_000 })

/** Current bearer token: a dev-login session (local testing only) or the Supabase session. */
export async function accessToken(): Promise<string | null> {
  const dev = getDevSession()
  if (dev) return dev.accessToken
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

/** Forgets any dev session and all cached server data (e.g. before a different user signs in). */
export function resetLocalState() {
  clearDevSession()
  queryClient.clear()
}

/** Signs out on THIS browser only (scope 'local' keeps the admin's other devices signed in). */
export async function signOut() {
  resetLocalState()
  try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* already signed out */ }
}

const toLogin = () => {
  if (window.location.pathname === '/login') return
  window.location.assign(`/login?from=${encodeURIComponent(window.location.pathname + window.location.search)}`)
}

http.interceptors.request.use(async (config) => {
  const t = await accessToken()
  if (t) config.headers.Authorization = `Bearer ${t}`
  return config
})
http.interceptors.response.use(undefined, async (error: AxiosError) => {
  const cfg = error.config as (typeof error.config & { _retried?: boolean }) | undefined
  if (error.response?.status !== 401 || !cfg || cfg._retried) return Promise.reject(error)
  if (getDevSession()) { await signOut(); toLogin(); return Promise.reject(error) }   // dev token expired or API restarted without dev login
  try {
    const { data } = await supabase.auth.refreshSession()
    if (data.session) { cfg._retried = true; cfg.headers.Authorization = `Bearer ${data.session.access_token}`; return http(cfg) }
  } catch { /* refresh failed */ }
  await signOut(); toLogin()
  return Promise.reject(error)
})

export type Problem = { title?: string; detail?: string; status?: number; errors?: Record<string, string[]>; current?: unknown }
export const statusOf = (e: unknown) => (axios.isAxiosError(e) ? e.response?.status : undefined)
export function problemOf(e: unknown): Problem {
  const ax = e as AxiosError<Problem>
  const data = ax?.response?.data
  if (data && typeof data === 'object' && !(data instanceof Blob)) return data
  return { title: ax?.message ?? 'Request failed', status: ax?.response?.status }
}

// Human labels for validation keys such as "Fields.S3InverterWorking", "s6TotalGenerationKwh", "engineerSignature".
const LABELS: Record<string, string> = Object.fromEntries([
  ...SECTIONS.flatMap(s => [...s.rows.map(r => [r.key.toLowerCase(), r.label] as const), [String(s.remarks).toLowerCase(), `${s.title} remarks`] as const]),
  ['visitdate', 'Visit date'], ['nextvisitdate', 'Next visit date'], ['previousmaintenancedate', 'Previous maintenance date'], ['techniciancount', 'Number of technicians'],
  ['engineersignature', 'Engineer signature'], ['clientsignature', 'Client signature'], ['reason', 'Reason'], ['clientrepname', 'Client representative name'],
])
export const fieldLabel = (key: string) => { const k = key.split('.').pop()!.replace(/^\$/, ''); return LABELS[k.toLowerCase()] ?? k }

export function errorMessage(e: unknown): string {
  if (axios.isAxiosError(e) && !e.response) return e.code === 'ECONNABORTED' ? 'The API did not respond in time. Try again.' : `Cannot reach the API at ${API_URL}. Check that it is running.`
  const p = problemOf(e)
  const fieldErrors = p.errors ? Object.entries(p.errors).map(([k, v]) => `${fieldLabel(k)}: ${v.join(', ')}`).join('; ') : ''
  return [p.detail ?? p.title, fieldErrors].filter(Boolean).join(' — ')
}

/** Blob requests return error bodies as Blobs; turn a JSON ProblemDetails blob back into an object so errorMessage works. */
async function unblobError(e: unknown): Promise<never> {
  if (axios.isAxiosError(e) && e.response?.data instanceof Blob) {
    try { e.response.data = JSON.parse(await e.response.data.text()) } catch { /* not JSON */ }
  }
  throw e
}

const q = (params: Record<string, unknown>) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))

export const api = {
  me: () => http.get<Me>('/me').then(r => r.data),
  dev: {
    users: (role?: string) => axios.get<DevUser[]>(`${API_URL}/dev/users`, { params: q({ role }), timeout: 10_000 }).then(r => r.data),
    login: (userId: string) => axios.post<DevSession>(`${API_URL}/dev/login`, { userId }, { timeout: 10_000 }).then(r => r.data),
  },
  clients: {
    list: (p: { search?: string; active?: boolean; page?: number; pageSize?: number; sort?: string }) => http.get<Paged<Client>>('/clients', { params: q(p) }).then(r => r.data),
    get: (id: string) => http.get<Client>(`/clients/${id}`).then(r => r.data),
    create: (d: ClientUpsert) => http.post<Client>('/clients', d).then(r => r.data),
    update: (id: string, d: ClientUpsert) => http.put<Client>(`/clients/${id}`, d).then(r => r.data),
    setActive: (id: string, active: boolean) => http.post<Client>(`/clients/${id}/${active ? 'activate' : 'deactivate'}`).then(r => r.data),
    updateAmc: (id: string, d: { amcStatus: string; amcStartDate?: string | null; amcExpiryDate?: string | null }) => http.put<Client>(`/clients/${id}/amc`, d).then(r => r.data),
  },
  engineers: {
    list: (active?: boolean) => http.get<Engineer[]>('/engineers', { params: q({ active }) }).then(r => r.data),
    create: (d: { name: string; phone?: string | null; email: string; employeeCode?: string | null; password: string }) => http.post<Engineer>('/engineers', d).then(r => r.data),
    update: (id: string, d: { name: string; phone?: string | null; employeeCode?: string | null }) => http.put<Engineer>(`/engineers/${id}`, d).then(r => r.data),
    setActive: (id: string, active: boolean) => http.post<Engineer>(`/engineers/${id}/${active ? 'activate' : 'deactivate'}`).then(r => r.data),
  },
  reports: {
    list: (p: { search?: string; engineerId?: string; clientId?: string; from?: string; to?: string; status?: string; amcStatus?: string; page?: number; pageSize?: number; sort?: string }) =>
      http.get<Paged<ReportListItem>>('/reports', { params: q(p) }).then(r => r.data),
    get: (id: string) => http.get<Report>(`/reports/${id}`).then(r => r.data),
    correct: (id: string, d: { version: number; reason: string; fields: ReportFields }) => http.post<Report>(`/reports/${id}/corrections`, d).then(r => r.data),
    pdfUrl: (id: string, download = false) => `${API_URL}/reports/${id}/pdf${download ? '?download=true' : ''}`,
    pdfBlob: (id: string) => http.get(`/reports/${id}/pdf`, { responseType: 'blob', timeout: 90_000 }).then(r => r.data as Blob, unblobError),
    shareLink: (id: string) => http.post<ShareLink>(`/reports/${id}/share-link`).then(r => r.data),
  },
  dashboard: { summary: () => http.get<DashboardSummary>('/dashboard/summary').then(r => r.data) },
  schedule: {
    range: (from?: string, to?: string) => http.get<ScheduleItem[]>('/schedule', { params: q({ from, to }) }).then(r => r.data),
    overdue: () => http.get<ScheduleItem[]>('/schedule/overdue').then(r => r.data),
  },
  amc: (p: { status?: string; expiringWithinDays?: number }) => http.get<Client[]>('/amc', { params: q(p) }).then(r => r.data),
  defects: (from?: string, to?: string) => http.get<DefectSummaryItem[]>('/defects/summary', { params: q({ from, to }) }).then(r => r.data),
  company: {
    get: () => http.get<Company>('/company').then(r => r.data),
    update: (d: Omit<Company, 'logoUrl' | 'updatedAt'>) => http.put<Company>('/company', d).then(r => r.data),
    logo: (file: File) => { const f = new FormData(); f.append('file', file); return http.post<Company>('/company/logo', f).then(r => r.data) },
  },
}
