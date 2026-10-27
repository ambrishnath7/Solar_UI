import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../lib/supabase'
import { Button, Field, Input, Screen } from '../../components/ui'
import { colors, font, space } from '../../theme'

const schema = z.object({ email: z.string().email('Enter a valid email'), password: z.string().min(1, 'Enter your password') })
type Form = z.infer<typeof schema>

export default function Login() {
  const { control, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })
  const [msg, setMsg] = useState<string | null>(null)
  const submit = async (f: Form) => {
    setMsg(null)
    const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password })
    if (error) setMsg(error.message.includes('Invalid') ? 'Email or password is incorrect' : error.message)
  }
  const forgot = async () => {
    const email = getValues('email').trim(); if (!email) return setMsg('Enter your email first')
    const { error } = await supabase.auth.resetPasswordForEmail(email); setMsg(error ? error.message : 'Password reset email sent. Open the link on a computer to set a new password.')
  }
  return <Screen scroll={false}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center' }}>
    <View style={{ marginBottom: space.xl }}><Text style={{ fontSize: 30, fontWeight: '800', color: colors.primaryDark }}>Engineer login</Text><Text style={{ color: colors.muted, fontSize: font.base }}>Solar Maintenance Management</Text></View>
    <Controller control={control} name="email" render={({ field }) => <Field label="Email" error={errors.email?.message}><Input value={field.value} onChangeText={field.onChange} autoCapitalize="none" keyboardType="email-address" autoComplete="email" /></Field>} />
    <Controller control={control} name="password" render={({ field }) => <Field label="Password" error={errors.password?.message}><Input value={field.value} onChangeText={field.onChange} secureTextEntry autoComplete="password" /></Field>} />
    {msg && <Text style={{ color: colors.danger, fontSize: font.small, marginBottom: space.md, fontWeight: '600' }}>{msg}</Text>}
    <Button title="Sign in" onPress={handleSubmit(submit)} loading={isSubmitting} />
    <Button title="Forgot password?" variant="ghost" onPress={forgot} style={{ marginTop: space.sm }} />
  </KeyboardAvoidingView></Screen>
}
