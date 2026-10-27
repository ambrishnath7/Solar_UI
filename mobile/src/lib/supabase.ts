import { createClient } from '@supabase/supabase-js'
import AsyncStorage from 'expo-sqlite/kv-store'
import { config } from './config'

// Session persisted in expo-sqlite's key-value store (AsyncStorage-compatible, survives app restarts).
export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
})

export async function accessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}
