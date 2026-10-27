import axios, { AxiosError } from 'axios'
import { File, Paths } from 'expo-file-system'
import { config } from './config'
import { accessToken, supabase } from './supabase'
import type { Client, EngineerDashboard, Me, Paged, Report, ReportFields, ReportListItem, SubmitResult } from './types'

export const http = axios.create({ baseURL: config.apiUrl, timeout: 20_000 })
http.interceptors.request.use(async (c) => { const t = await accessToken(); if (t) c.headers.Authorization = `Bearer ${t}`; return c })
http.interceptors.response.use(undefined, async (error: AxiosError) => {
  const cfg = error.config as (typeof error.config & { _retried?: boolean }) | undefined
  if (error.response?.status === 401 && cfg && !cfg._retried) {
    const { data } = await supabase.auth.refreshSession()
    if (data.session) { cfg._retried = true; return http(cfg) }
  }
  return Promise.reject(error)
})

export type Problem = { title?: string; detail?: string; status?: number; errors?: Record<string, string[]>; current?: Report }
export const isNetworkError = (e: unknown) => axios.isAxiosError(e) && !e.response
export const statusOf = (e: unknown) => (axios.isAxiosError(e) ? e.response?.status : undefined)
export function problemOf(e: unknown): Problem { const ax = e as AxiosError<Problem>; return ax?.response?.data && typeof ax.response.data === 'object' ? ax.response.data : { title: ax?.message ?? 'Request failed' } }
export function errorMessage(e: unknown): string {
  if (isNetworkError(e)) return 'No connection to the server'
  const p = problemOf(e); const f = p.errors ? Object.keys(p.errors).join(', ') : ''
  return [p.detail ?? p.title, f && `Missing: ${f}`].filter(Boolean).join(' — ')
}

export const api = {
  me: () => http.get<Me>('/me').then(r => r.data),
  clients: (search?: string) => http.get<Paged<Client>>('/clients', { params: { search, pageSize: 100, sort: 'name' } }).then(r => r.data.items),
  client: (id: string) => http.get<Client>(`/clients/${id}`).then(r => r.data),
  dashboard: () => http.get<EngineerDashboard>('/dashboard/engineer').then(r => r.data),
  reports: {
    list: (status?: string) => http.get<Paged<ReportListItem>>('/reports', { params: { status, pageSize: 100, sort: 'updated_desc' } }).then(r => r.data.items),
    get: (id: string) => http.get<Report>(`/reports/${id}`).then(r => r.data),
    create: (clientLocalId: string, clientId: string, fields: ReportFields) => http.post<Report>('/reports', { clientLocalId, clientId, fields }).then(r => r.data),
    update: (id: string, version: number, fields: ReportFields) => http.put<Report>(`/reports/${id}`, { version, fields }).then(r => r.data),
    signature: async (id: string, kind: 'engineer' | 'client', fileUri: string) => {
      const form = new FormData()
      form.append('file', { uri: fileUri, name: `${kind}.png`, type: 'image/png' } as unknown as Blob)
      return http.post<Report>(`/reports/${id}/signatures/${kind}`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
    },
    submit: (id: string, version: number, nextVisitDate?: string | null) => http.post<SubmitResult>(`/reports/${id}/submit`, { version, nextVisitDate }).then(r => r.data),
    /** Downloads the PDF to the cache directory and returns the local file. */
    downloadPdf: async (id: string, fileName: string): Promise<File> => {
      const dest = new File(Paths.cache, fileName)
      if (dest.exists) dest.delete()
      const token = await accessToken()
      return File.downloadFileAsync(`${config.apiUrl}/reports/${id}/pdf?download=true`, dest, { headers: { Authorization: `Bearer ${token}` } })
    },
  },
}
