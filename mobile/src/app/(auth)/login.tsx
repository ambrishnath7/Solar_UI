import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../lib/supabase'
import { DEV_LOGIN_ENABLED, setDevSession, type DevUser } from '../../lib/auth'
import { api, errorMessage } from '../../lib/api'
import { API_URL_EDITABLE, config, setApiUrl } from '../../lib/config'
import { Button, ConnectionBanner, Field, Input } from '../../components/ui'
import { colors, font, space } from '../../theme'

const schema = z.object({ email: z.string().trim().email('Enter a valid email'), password: z.string().min(1, 'Enter your password') })
type Form = z.infer<typeof schema>

export default function Login() {
  const { control, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })
  const [msg, setMsg] = useState<string | null>(null)
  const submit = async (f: Form) => {
    setMsg(null)
    const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password })
    if (error) setMsg(/invalid/i.test(error.message) ? 'Email or password is incorrect' : error.message)
  }
  const forgot = async () => {
    const email = getValues('email').trim(); if (!email) return setMsg('Enter your email first')
    const { error } = await supabase.auth.resetPasswordForEmail(email); setMsg(error ? error.message : 'Password reset email sent. Open the link on a computer to set a new password.')
  }

  return <View style={{ flex: 1, backgroundColor: colors.bg }}><ConnectionBanner />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: space.lg }} keyboardShouldPersistTaps="handled">
        <View style={{ marginBottom: space.xl }}><Text style={{ fontSize: 30, fontWeight: '800', color: colors.primaryDark }}>Engineer login</Text><Text style={{ color: colors.muted, fontSize: font.base }}>Solar Maintenance Management</Text></View>
        <Controller control={control} name="email" render={({ field }) => <Field label="Email" error={errors.email?.message}><Input value={field.value} onChangeText={field.onChange} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="username" /></Field>} />
        <Controller control={control} name="password" render={({ field }) => <Field label="Password" error={errors.password?.message}><Input value={field.value} onChangeText={field.onChange} secureTextEntry autoComplete="password" textContentType="password" onSubmitEditing={() => void handleSubmit(submit)()} /></Field>} />
        {msg && <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: font.small, marginBottom: space.md, fontWeight: '600' }}>{msg}</Text>}
        <Button title="Sign in" onPress={handleSubmit(submit)} loading={isSubmitting} />
        <Button title="Forgot password?" variant="ghost" onPress={forgot} style={{ marginTop: space.sm }} />
        {DEV_LOGIN_ENABLED && <DevLogin onError={setMsg} />}
      </ScrollView>
    </KeyboardAvoidingView></View>
}

function DevLogin({ onError }: { onError: (m: string | null) => void }) {
  const [users, setUsers] = useState<DevUser[] | null>(null); const [state, setState] = useState<'loading' | 'ok' | 'unavailable'>('loading'); const [busy, setBusy] = useState<string | null>(null)
  const load = () => { setState('loading'); api.dev.users().then(u => { setUsers(u); setState('ok') }).catch(() => setState('unavailable')) }
  useEffect(load, [])
  const login = async (u: DevUser) => {
    onError(null); setBusy(u.userId)
    try { await setDevSession(await api.dev.login(u.userId)) } catch (e) { onError(`Dev login failed: ${errorMessage(e)}`) } finally { setBusy(null) }
  }
  const [server, setServer] = useState(config.apiUrl)
  const saveServer = () => { setServer(setApiUrl(server)); load() }
  return <View style={{ marginTop: space.xl, padding: space.md, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.warn, borderRadius: 12, backgroundColor: colors.warnSoft }}>
    <Text style={{ fontWeight: '800', color: colors.warn, marginBottom: space.sm }}>⚡ Developer sign-in (local API only)</Text>
    {API_URL_EDITABLE && <Field label="Server address" hint={`Your PC's address and port, e.g. 192.168.1.53:5000. Leave empty for ${config.builtApiUrl}.`}>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Input value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={{ flex: 1 }} onSubmitEditing={saveServer} accessibilityLabel="Server address" />
        <Button title="Use" variant="secondary" onPress={saveServer} style={{ minWidth: 76 }} />
      </View></Field>}
    {state === 'loading' && <Text style={{ color: colors.muted }}>Loading engineers from {config.apiUrl}…</Text>}
    {state === 'unavailable' && <><Text style={{ color: colors.muted, marginBottom: space.sm }}>Not available. The API at {config.apiUrl} must run in Development with DevAuth enabled, and this phone must reach it.</Text><Button title="Retry" variant="secondary" onPress={load} /></>}
    {state === 'ok' && (users?.length ? users.map(u => <Button key={u.userId} title={`Sign in as ${u.engineerName ?? u.email ?? 'engineer'}`} variant="secondary" loading={busy === u.userId} onPress={() => login(u)} style={{ marginBottom: space.sm }} />)
      : <Text style={{ color: colors.muted }}>No active engineers in the database.</Text>)}
  </View>
}
