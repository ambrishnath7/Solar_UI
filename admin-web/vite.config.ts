import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  // A production build must talk to the deployed HTTPS API and must not ship the developer sign-in.
  if (command === 'build' && mode === 'production') {
    const url = env.VITE_API_URL ?? ''
    if (!/^https:\/\//.test(url) || url.includes('example.com'))
      throw new Error(`VITE_API_URL must be the deployed HTTPS API for a production build (got "${url}"). Set it in Cloudflare Pages or .env.production.`)
    if (env.VITE_DEV_LOGIN === 'true') throw new Error('VITE_DEV_LOGIN must be false for a production build.')
  }
  return {
    plugins: [react(), tailwindcss()],
    server: { port: 3000, host: true },   // host: true also serves on the LAN address for testing from another device
  }
})
