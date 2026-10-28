// Developer sign-in for local testing. The API only serves /dev/* in its Development environment,
// and dev tokens are rejected by any non-Development API, so this is inert against production.
export const DEV_LOGIN_ENABLED = import.meta.env.VITE_DEV_LOGIN === 'true'

const KEY = 'solar_dev_session'
export type DevUser = { userId: string; role: 'admin' | 'engineer'; email?: string | null; engineerId?: string | null; engineerName?: string | null }
export type DevSession = { accessToken: string; expiresAt: string; user: DevUser }

export function getDevSession(): DevSession | null {
  if (!DEV_LOGIN_ENABLED) return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as DevSession
    if (!s.accessToken || new Date(s.expiresAt).getTime() <= Date.now() + 30_000) { localStorage.removeItem(KEY); return null }
    return s
  } catch { localStorage.removeItem(KEY); return null }
}
export function setDevSession(s: DevSession) { localStorage.setItem(KEY, JSON.stringify(s)); window.dispatchEvent(new Event('solar-auth')) }
export function clearDevSession() { localStorage.removeItem(KEY); localStorage.removeItem('solar_dev_token'); window.dispatchEvent(new Event('solar-auth')) }
