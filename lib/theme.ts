export const MOVU_THEME_STORAGE_KEY = 'movu-theme'

export function getThemeInitScript(): string {
  return `(function(){try{var t=localStorage.getItem('${MOVU_THEME_STORAGE_KEY}');var l=t==='light'||(t!=='dark'&&window.matchMedia('(prefers-color-scheme: light)').matches);document.documentElement.classList.toggle('light',l)}catch(e){}})()`
}
