import { Tabs } from 'expo-router'
import { Text, type ColorValue } from 'react-native'
import { colors } from '../../../theme'

const icon = (glyph: string) => ({ color }: { color: ColorValue }) => <Text style={{ fontSize: 24, color }}>{glyph}</Text>

/** The four bottom tabs. Client selection and report screens are stack screens above the tabs (see ../_layout.tsx). */
export default function AppTabs() {
  return <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarLabelStyle: { fontSize: 14, fontWeight: '700' }, tabBarStyle: { height: 68, paddingBottom: 8, paddingTop: 6 }, headerStyle: { backgroundColor: colors.bg }, headerTitleStyle: { fontWeight: '800' } }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('⌂') }} />
    <Tabs.Screen name="drafts" options={{ title: 'Drafts', tabBarIcon: icon('✎') }} />
    <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: icon('≣') }} />
    <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('⚉') }} />
  </Tabs>
}
