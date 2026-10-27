import { useState } from 'react'
import { Alert, Text } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import Constants from 'expo-constants'
import { api } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { config } from '../../lib/config'
import { syncStore } from '../../lib/store'
import { drafts } from '../../db'
import { Button, Card, Field, Input, Row, Screen, Title } from '../../components/ui'
import { colors, font, space } from '../../theme'

export default function Profile() {
  const me = useQuery({ queryKey: ['me'], queryFn: api.me })
  const lastSync = syncStore.use(s => s.lastSyncAt); const net = syncStore.use(s => s.net)
  const [pw, setPw] = useState(''); const [msg, setMsg] = useState<string | null>(null)
  const changePw = async () => { if (pw.length < 8) return setMsg('At least 8 characters'); const { error } = await supabase.auth.updateUser({ password: pw }); setMsg(error ? error.message : 'Password changed'); if (!error) setPw('') }
  const logout = async () => {
    const open = (await drafts.all()).filter(d => d.syncState !== 'submitted' && d.syncState !== 'synced').length
    Alert.alert('Sign out?', open ? `${open} draft(s) are not fully synced. They stay on this device and sync after you sign in again.` : 'Drafts stay on this device.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: () => void supabase.auth.signOut() }])
  }
  return <Screen>
    <Title sub={me.data?.email ?? ''}>{me.data?.engineerName ?? 'Engineer'}</Title>
    <Card><Row k="Role" v={me.data?.role} /><Row k="Connection" v={net} /><Row k="Last sync" v={lastSync ? new Date(lastSync).toLocaleTimeString('en-IN') : '—'} /><Row k="App version" v={Constants.expoConfig?.version} /><Row k="API" v={config.apiUrl.replace(/^https?:\/\//, '')} /></Card>
    <Card><Text style={{ fontWeight: '700', fontSize: font.large, marginBottom: space.sm }}>Change password</Text>
      <Field label="New password"><Input value={pw} onChangeText={setPw} secureTextEntry /></Field>
      {msg && <Text style={{ color: colors.muted, marginBottom: space.sm }}>{msg}</Text>}<Button title="Update password" variant="secondary" onPress={changePw} /></Card>
    <Button title="Sign out" variant="danger" onPress={logout} />
  </Screen>
}
