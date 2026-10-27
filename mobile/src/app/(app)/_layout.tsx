import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { colors } from '../../theme'

const icon = (glyph: string) => ({ color }: { color: import('react-native').ColorValue }) => <Text style={{ fontSize: 22, color }}>{glyph}</Text>

export default function AppTabs() {
  return <Tabs screenOptions={{ tabBarActiveTintColor: colors.primaryDark, tabBarInactiveTintColor: colors.muted, tabBarLabelStyle: { fontSize: 12, fontWeight: '600' }, tabBarStyle: { height: 64, paddingBottom: 8, paddingTop: 6 }, headerStyle: { backgroundColor: colors.bg }, headerTitleStyle: { fontWeight: '700' } }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('⌂') }} />
    <Tabs.Screen name="drafts" options={{ title: 'Drafts', tabBarIcon: icon('✎') }} />
    <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: icon('≣') }} />
    <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('⚉') }} />
    <Tabs.Screen name="clients" options={{ href: null, headerShown: false }} />
    <Tabs.Screen name="reports" options={{ href: null, headerShown: false, tabBarStyle: { display: 'none' } }} />
  </Tabs>
}
