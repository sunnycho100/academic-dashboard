import { defineConfig } from 'prisma/config'

// Dev-only database for `pnpm db:migrate`. The app itself stores data in
// ~/Library/Application Support/Academic Dashboard/academic-dashboard.db.
export default defineConfig({
  schema: '../prisma/schema.prisma',
  migrations: { path: '../prisma/migrations' },
  datasource: { url: 'file:./prisma/dev.db' },
})
