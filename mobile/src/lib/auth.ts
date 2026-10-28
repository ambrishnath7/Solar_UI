import AsyncStorage from 'expo-sqlite/kv-store'
import { createStore } from './store'
import { supabase } from './supabase'

// Developer sign-in for local testing. The API serves /dev/* only in its Development environment and
// rejects dev tokens anywhere else, so a production build talking to a production API cannot use it.
export const DEV_LOGIN_ENABLED = process.env.EXPO_PUBLIC_DEV_LOGIN === 'true'

const KEY = 'solar_dev_session'
export type DevUser = { userId: string; role: 'admin' | 'engineer'; email?: string | null; engineerId?: string | null; engineerName?: string | null }
export type DevSession = { accessToken: string; expiresAt: string; user: DevUser }

export type AuthState = { status: 'loading' | 'in' | 'out'; dev: boolean; userId: string | null }
export const authStore = createStore<AuthState>({ status: 'loading', dev: false, userId: null })

/** Id of the signed-in user (dev or Supabase); drafts are owned by it. */
export const currentUserId = () => authStore.get().userId

export function getDevSession(): DevSession | null {
  if (!DEV_LOGIN_ENABLED) return null
  try {
    const raw = AsyncStorage.getItemSync(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as DevSession
    if (!s.accessToken || new Date(s.expiresAt).getTime() <= Date.now() + 30_000) { AsyncStorage.removeItemSync(KEY); return null }
    return s
  } catch { return null }
}

export async function setDevSession(s: DevSession) {
  // Store the dev session first: the Supabase sign-out below fires an auth event whose handler must already see it.
  await AsyncStorage.setItem(KEY, JSON.stringify(s))
  authStore.set({ status: 'in', dev: true, userId: s.user.userId })
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
}

/** Current bearer token: dev session (local testing) or the Supabase session. */
export async function accessToken(): Promise<string | null> {
  const dev = getDevSession()
  if (dev) return dev.accessToken
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

/** Signs out of both. Local drafts are kept on the device. */
export async function signOut() {
  await AsyncStorage.removeItem(KEY).catch(() => {})
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
  authStore.set({ status: 'out', dev: false, userId: null })
}

/** Starts tracking auth state; call once from the root layout. */
export function initAuth(): () => void {
  const refresh = async () => {
    const dev = getDevSession()
    if (dev) { authStore.set({ status: 'in', dev: true, userId: dev.user.userId }); return }
    const { data } = await supabase.auth.getSession()
    const devNow = getDevSession()          // re-check after the await: a dev sign-in may have completed meanwhile
    if (devNow) { authStore.set({ status: 'in', dev: true, userId: devNow.user.userId }); return }
    authStore.set({ status: data.session ? 'in' : 'out', dev: false, userId: data.session?.user.id ?? null })
  }
  void refresh()
  const { data } = supabase.auth.onAuthStateChange(() => { void refresh() })
  return () => data.subscription.unsubscribe()
}
