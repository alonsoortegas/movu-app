import { describe, expect, it } from 'vitest'
import { MOVU_THEME_STORAGE_KEY, getThemeInitScript } from './theme'

describe('getThemeInitScript', () => {
  it('uses the Movu storage key and system preference fallback', () => {
    const script = getThemeInitScript()

    expect(MOVU_THEME_STORAGE_KEY).toBe('movu-theme')
    expect(script).toContain("localStorage.getItem('movu-theme')")
    expect(script).toContain('prefers-color-scheme: light')
  })

  it('sets a light class before paint without throwing when storage is unavailable', () => {
    const script = getThemeInitScript()

    expect(script).toContain("classList.toggle('light'")
    expect(script).toContain('try{')
    expect(script).toContain('catch')
  })
})
