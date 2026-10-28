import type { ConfigContext, ExpoConfig } from 'expo/config'

// Extends app.json. Cleartext HTTP is allowed only when the build talks to a plain-http API (local/LAN testing);
// a production build pointed at an https API keeps Android's default (cleartext blocked).
export default ({ config }: ConfigContext): ExpoConfig => {
  const httpApi = (process.env.EXPO_PUBLIC_API_URL ?? '').startsWith('http://')
  return {
    ...(config as ExpoConfig),
    plugins: [...(config.plugins ?? []), ['expo-build-properties', { android: { usesCleartextTraffic: httpApi } }]],
  }
}
