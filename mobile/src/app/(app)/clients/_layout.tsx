import { Stack } from 'expo-router'
import { colors } from '../../../theme'
export default function ClientsLayout() {
  return <Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text, headerTitleStyle: { fontWeight: '700' } }}>
    <Stack.Screen name="index" options={{ title: 'Select client' }} />
    <Stack.Screen name="[id]" options={{ title: 'Client details' }} />
  </Stack>
}
