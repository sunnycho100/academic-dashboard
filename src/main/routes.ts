import { createRouter } from './router'

// Loaded with a dynamic import once the app is ready, so the database (which the
// route handlers import) opens only after the userData folder is final.
export { dbPath } from './lib/db'
export const handleApi = createRouter(import.meta.glob('./api/**/route.ts', { eager: true }))
