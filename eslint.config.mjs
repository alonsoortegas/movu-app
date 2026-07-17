import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      // Existing client initialization effects intentionally mirror native/browser state.
      'react-hooks/set-state-in-effect': 'off',
      // Server components use request-time timestamps for rolling data windows.
      'react-hooks/purity': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'ios/**',
    'android/**',
  ]),
])
