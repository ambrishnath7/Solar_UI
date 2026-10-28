import axios, { AxiosError } from 'axios'
import { createClient } from '@supabase/supabase-js'
import type { Client, ClientUpsert, Company, DashboardSummary, DefectSummaryItem, Engineer, Me, Paged, Report, ReportFields, ReportListItem, ScheduleItem, ShareLink } from './types'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

export const API_URL: string = import.meta.env.VITE_API_URL

export const http = axios.create({ baseURL: API_URL })
http.interceptors.request.use(async (config) => {
  const devToken = localStorage.getItem('solar_dev_token')
  if (devToken) {
    config.headers.Authorization = `Bearer ${devToken}`
    return config
  }
  const { data } = await supabase.auth.getSession()
  if (data.session?.access_token) config.headers.Authorization = `Bearer ${data.session.access_token}`
  return config
})
http.interceptors.response.use(undefined, async (error: AxiosError) => {
  if (error.response?.status === 401 && !(error.config as { _retried?: boolean })._retried) {
    if (localStorage.getItem('solar_dev_token')) {
      localStorage.removeItem('solar_dev_token')
      window.location.href = '/login'
      return Promise.reject(error)
    }
    try {
      const { data } = await supabase.auth.refreshSession()
      if (data.session) {
        (error.config as { _retried?: boolean })._retried = true
        error.config!.headers.Authorization = `Bearer ${data.session.access_token}`
        return http(error.config!)
      }
    } catch {
      // refresh failed
    }
    await supabase.auth.signOut()
    if (window.location.pathname !== '/login') {
      window.location.href = `/login?from=${encodeURIComponent(window.location.pathname + window.location.search)}`
    }
  }
  return Promise.reject(error)
})

export type Problem = { title?: string; detail?: string; status?: number; errors?: Record<string, string[]>; current?: unknown }
export function problemOf(e: unknown): Problem {
  const ax = e as AxiosError<Problem>
  if (ax?.response?.data && typeof ax.response.data === 'object') return ax.response.data
  return { title: ax?.message ?? 'Request failed' }
}
export function errorMessage(e: unknown): string {
  const p = problemOf(e)
  const fieldErrors = p.errors ? Object.entries(p.errors).map(([k, v]) => `${k}: ${v.join(', ')}`).join('; ') : ''
  return [p.detail ?? p.title, fieldErrors].filter(Boolean).join(' — ')
}

const q = (params: Record<string, unknown>) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))

export const api = {
  me: () => http.get<Me>('/me').then(r => r.data),
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
    pdfBlob: (id: string) => http.get(`/reports/${id}/pdf`, { responseType: 'blob' }).then(r => r.data as Blob),
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
