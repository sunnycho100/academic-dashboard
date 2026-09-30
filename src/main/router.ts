type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>
type RouteModule = Partial<Record<string, Handler>>

interface Route {
  pattern: RegExp
  keys: string[]
  dynamic: number
  mod: RouteModule
}

/**
 * Next.js-style file router for the API handlers under src/main/api.
 * `modules` maps file paths like './api/tasks/[id]/route.ts' to their exports.
 */
export function createRouter(modules: Record<string, RouteModule>) {
  const routes: Route[] = Object.entries(modules).map(([file, mod]) => {
    const segments = file.replace(/^.*?\/api\//, '').replace(/\/?route\.ts$/, '').split('/').filter(Boolean)
    const keys: string[] = []
    const source = segments
      .map((s) => {
        const m = s.match(/^\[(\w+)\]$/)
        if (!m) return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        keys.push(m[1])
        return '([^/]+)'
      })
      .join('/')
    return { pattern: new RegExp(`^/api/${source}/?$`), keys, dynamic: keys.length, mod }
  })
  // Static segments win over [param] ones, e.g. /completed-tasks/cleanup vs /completed-tasks/[id]
  routes.sort((a, b) => a.dynamic - b.dynamic)

  return async function handle(req: Request): Promise<Response> {
    const { pathname } = new URL(req.url)
    for (const route of routes) {
      const m = pathname.match(route.pattern)
      if (!m) continue
      const handler = route.mod[req.method]
      if (!handler) return Response.json({ error: 'Method not allowed' }, { status: 405 })
      const params = Object.fromEntries(route.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]))
      return handler(req, { params: Promise.resolve(params) })
    }
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
}
