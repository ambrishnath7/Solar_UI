import { ActivityIndicator, Text, View } from 'react-native'
import { colors } from '../theme'

/** Splash: the root layout redirects to login or the app once the session is known. */
export default function Splash() {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, gap: 16 }}>
    <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff' }}>Solar Maintenance</Text>
    <Text style={{ color: '#FFF7E6' }}>Shree Abhi Electricals & Engineering</Text>
    <ActivityIndicator color="#fff" />
  </View>
}
