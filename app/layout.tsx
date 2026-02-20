import type { Metadata } from 'next'
import { Geist, Geist_Mono, Great_Vibes } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'

import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
const greatVibes = Great_Vibes({
  subsets: ['latin'],
  variable: '--font-cursive',
  weight: '400',
})

export const metadata: Metadata = {
  title: 'Academic Dashboard - Class Catch-up',
  description: 'A personal academic task management dashboard to track lectures, assignments, labs, and exams.',
  keywords: ['academic', 'task management', 'student', 'dashboard', 'productivity'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} ${greatVibes.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="mesh-gradient min-h-screen">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
