import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'

export default defineConfig({
  main: {
    resolve: { alias: { '@main': resolve('src/main') } },
  },
  renderer: {
    root: 'src/renderer',
    // The page runs on app://local, so point the HMR socket at the dev server itself.
    server: { port: 5173, strictPort: true, hmr: { host: 'localhost', clientPort: 5173 } },
    build: { rollupOptions: { input: resolve('src/renderer/index.html') } },
    resolve: { alias: { '@': resolve('src/renderer') } },
    css: { postcss: { plugins: [tailwindcss({ config: resolve('src/renderer/tailwind.config.ts') })] } },
    plugins: [react()],
  },
})
