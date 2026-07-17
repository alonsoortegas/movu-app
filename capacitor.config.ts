import type { CapacitorConfig } from '@capacitor/cli'

const devUrl = process.env.CAP_SERVER_URL
const prodUrl = process.env.APP_URL ?? 'https://movu-pi.vercel.app'

const config: CapacitorConfig = {
  appId: 'app.movu.ios',
  appName: 'Movu',
  webDir: 'capacitor/www',
  server: devUrl
    ? { url: devUrl, cleartext: true }
    : { url: prodUrl, cleartext: false },
  ios: { contentInset: 'automatic' },
}

export default config
