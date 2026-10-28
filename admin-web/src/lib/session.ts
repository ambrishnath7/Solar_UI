// Sign-in session issued by the Solar API (/auth/login, /auth/refresh, /dev/login).
// The short-lived access token goes on every request; the refresh token is rotated by the API on each use.
// Kept in localStorage so a reload or a new tab stays signed in; refreshes are serialised across tabs
// (Web Locks) because the API treats a re-used refresh token as theft and signs that user out everywhere.
import axios from 'axios'
import type { Me } from './types'

export type AuthResponse = { accessToken: string; accessTokenExpiresAt: string; refreshToken: string; refreshTokenExpiresAt: string; user: Me }
export type Session = AuthResponse & { dev?: boolean }

const KEY = 'solar_session'
const SKEW_MS = 30_000
export const API_URL: string = import.meta.env.VITE_API_URL

const notify = () => window.dispatchEvent(new Event('solar-auth'))
window.addEventListener('storage', e => { if (e.key === KEY) notify() })   // sign-in / sign-out in another tab

function read(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Session
    if (!s.refreshToken || new Date(s.refreshTokenExpiresAt).getTime() <= Date.now() + SKEW_MS) { localStorage.removeItem(KEY); return null }
    if (s.dev && import.meta.env.VITE_DEV_LOGIN !== 'true') { localStorage.removeItem(KEY); return null }   // never honour a dev session in a production build
    return s
  } catch { localStorage.removeItem(KEY); return null }
}

/** The stored session, or null when signed out (or the refresh token has expired). */
export const getSession = read

export function setSession(s: Session) {
  localStorage.setItem(KEY, JSON.stringify(s))
  localStorage.removeItem('solar_dev_session'); localStorage.removeItem('solar_dev_token')   // pre-migration keys
  notify()
}

export function clearSession() { localStorage.removeItem(KEY); notify() }

const fresh = (s: Session) => new Date(s.accessTokenExpiresAt).getTime() > Date.now() + SKEW_MS

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = (navigator as Navigator & { locks?: { request: (name: string, cb: () => Promise<T>) => Promise<T> } }).locks
  return locks ? locks.request('solar-refresh', fn) : fn()
}

let inFlight: Promise<string | null> | null = null

/** Exchanges the refresh token for new tokens. Returns the new access token, or null (and signs out) if the API refuses. */
export function refresh(): Promise<string | null> {
  inFlight ??= withLock(async () => {
    const s = read()
    if (!s) return null
    // another tab may have refreshed while we waited for the lock; only refresh if our token is still the current one
    const before = s.refreshToken
    try {
      const r = await axios.post<AuthResponse>(`${API_URL}/auth/refresh`, { refreshToken: before }, { timeout: 30_000 })
      setSession({ ...r.data, dev: s.dev })
      return r.data.accessToken
    } catch (e) {
      if (axios.isAxiosError(e) && (e.response?.status === 401 || e.response?.status === 400)) {
        if (read()?.refreshToken === before) clearSession()
        return null
      }
      throw e                                                           // network error: keep the session, the caller shows "API unreachable"
    }
  }).finally(() => { inFlight = null })
  return inFlight
}

/** A valid access token, refreshing first if the current one is about to expire. Null when signed out. */
export async function accessToken(): Promise<string | null> {
  const s = read()
  if (!s) return null
  if (fresh(s)) return s.accessToken
  return refresh()
}

export async function logout() {
  const s = read()
  clearSession()
  if (s) await axios.post(`${API_URL}/auth/logout`, { refreshToken: s.refreshToken }, { timeout: 10_000 }).catch(() => { /* token simply expires */ })
}
