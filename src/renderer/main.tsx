import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/great-vibes'
import { ThemeProvider } from '@/components/theme/theme-provider'
import App from './app'
import './globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <div className="mesh-gradient min-h-screen">
        <App />
      </div>
    </ThemeProvider>
  </StrictMode>,
)
