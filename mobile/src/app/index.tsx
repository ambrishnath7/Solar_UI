import { ActivityIndicator, Text, View } from 'react-native'
import { Redirect } from 'expo-router'
import { authStore } from '../lib/auth'
import { colors } from '../theme'

/** Splash: shown while the session is restored, then redirects to the app or the login screen. */
export default function Splash() {
  const status = authStore.use(s => s.status)
  if (status === 'in') return <Redirect href="/(app)" />
  if (status === 'out') return <Redirect href="/(auth)/login" />
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, gap: 16 }}>
    <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff' }}>Solar Maintenance</Text>
    <Text style={{ color: '#E0F2FE' }}>Shree Abhi Electricals & Engineering</Text>
    <ActivityIndicator color="#fff" />
  </View>
}
