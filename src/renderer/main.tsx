import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/great-vibes'
import { ThemeProvider } from '@/components/theme/theme-provider'
import App from './app'
import { DesktopWidget } from '@/components/widget/desktop-widget'
import { WidgetFeed } from '@/components/widget/widget-feed'
import { applyTheme } from '@/lib/themes'
import { palette } from '@/lib/prefs'
import './globals.css'

// Every write to /api/time-records (timers, Personal dev, Time Records edits) announces
// itself, so the timeline and today's total refresh at once instead of on their next poll.
const originalFetch = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const res = await originalFetch(input, init)
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (init?.method && init.method !== 'GET' && url.includes('/api/time-records')) {
    window.dispatchEvent(new Event('time-records-changed'))
  }
  return res
}

// The desktop widget window loads this same page with #widget
const isWidget = location.hash === '#widget'
if (isWidget) document.documentElement.classList.add('widget')
else {
  // The chosen color theme, kept in step with Settings, Edit display and the other window
  const syncTheme = () => applyTheme(palette())
  syncTheme()
  window.addEventListener('prefs-changed', syncTheme)
  window.addEventListener('storage', syncTheme)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      {isWidget ? (
        <DesktopWidget />
      ) : (
        <div className="mesh-gradient min-h-screen">
          <App />
          <WidgetFeed />
        </div>
      )}
    </ThemeProvider>
  </StrictMode>,
)
