import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/renderer/**/*.{ts,tsx,html}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        sidebar: 'hsl(var(--sidebar))',
        today: {
          DEFAULT: 'hsl(var(--today))',
          foreground: 'hsl(var(--today-foreground))',
          muted: 'hsl(var(--today-muted))',
        },
        coral: 'hsl(var(--coral))',
        'ring-track': 'hsl(var(--ring-track))',
      },
      fontFamily: {
        // Iowan Old Style ships with macOS; used for titles, group headings, stat numbers.
        serif: ['"Iowan Old Style"', 'Charter', 'Georgia', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'status-pulse': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 currentColor' },
          '50%': { opacity: '0.85', boxShadow: '0 0 8px 2px currentColor' },
        },
        'message-enter': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'glass-glow': {
          '0%, 100%': { boxShadow: '0 0 12px rgba(99, 102, 241, 0.08)' },
          '50%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.15)' },
        },
        'blur-in': {
          from: { opacity: '0', filter: 'blur(8px)', transform: 'scale(0.96)' },
          to: { opacity: '1', filter: 'blur(0)', transform: 'scale(1)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        shimmer: 'shimmer 1.8s ease-in-out infinite',
        'status-pulse': 'status-pulse 2s ease-in-out infinite',
        'message-enter': 'message-enter 0.3s ease-out both',
        'glass-glow': 'glass-glow 3s ease-in-out infinite',
        'blur-in': 'blur-in 0.4s cubic-bezier(0.23, 1, 0.32, 1) both',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
