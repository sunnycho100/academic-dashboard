import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/great-vibes'
import { ThemeProvider } from '@/components/theme/theme-provider'
import App from './app'
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <div className="mesh-gradient min-h-screen">
        <App />
      </div>
    </ThemeProvider>
  </StrictMode>,
)
