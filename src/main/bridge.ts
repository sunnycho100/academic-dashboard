import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { app, type BrowserWindow } from 'electron'

/**
 * A local bridge for the Claude connector (mcp/server.mjs). It listens on 127.0.0.1 only, on a
 * port the system picks, and every request must carry the secret written to bridge.json in the
 * app's folder (readable only by this user). Requests to /api/* go to the same handlers the
 * window uses; after a change the window reloads its data so it shows at once.
 */
export function startBridge(handleApi: (req: Request) => Promise<Response>, window: () => BrowserWindow | null) {
  const token = crypto.randomBytes(24).toString('hex')
  // Runs in the window: the Today plan and display settings live in its localStorage
  const inWindow = <T>(js: string): Promise<T | null> => {
    const win = window()
    return win ? win.webContents.executeJavaScript(js) : Promise.resolve(null)
  }

  const server = http.createServer(async (req, res) => {
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(typeof body === 'string' ? body : JSON.stringify(body))
    }
    if (req.headers.authorization !== `Bearer ${token}`) return send(401, { error: 'Unauthorized' })
    try {
      const chunks: Buffer[] = []
      for await (const chunk of req) chunks.push(chunk as Buffer)
      const body = Buffer.concat(chunks).toString()
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')

      // The window's own state: the Today plan, the day boundaries and the hourly value
      if (url.pathname === '/bridge/state') {
        const state = await inWindow<string>(`JSON.stringify({
          today: JSON.parse(localStorage.getItem('class-catchup-today-local') || '[]'),
          dayBoundaries: JSON.parse(localStorage.getItem('timeRecords-dayBoundaries') || 'null'),
          hourlyRate: Number(localStorage.getItem('hourly-rate') ?? 20),
        })`)
        return state ? send(200, state) : send(503, { error: 'Open Academic Dashboard first' })
      }
      if (url.pathname === '/bridge/today' && req.method === 'POST') {
        const { taskId } = JSON.parse(body) as { taskId: string }
        const ok = await inWindow(`window.dispatchEvent(new CustomEvent('bridge-add-today', { detail: ${JSON.stringify(taskId)} })), true`)
        return ok ? send(200, { ok: true }) : send(503, { error: 'Open Academic Dashboard first' })
      }

      if (!url.pathname.startsWith('/api/')) return send(404, { error: 'Not found' })
      const method = req.method ?? 'GET'
      const apiRes = await handleApi(
        new Request(`app://local${url.pathname}${url.search}`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: method === 'GET' || method === 'HEAD' ? undefined : body,
        }),
      )
      send(apiRes.status, await apiRes.text())
      if (method !== 'GET') inWindow(`window.dispatchEvent(new Event('bridge-changed')), true`).catch(() => {})
    } catch (error) {
      console.error('[bridge]', error)
      send(500, { error: 'Internal error' })
    }
  })

  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address() as { port: number }
    fs.writeFileSync(path.join(app.getPath('userData'), 'bridge.json'), JSON.stringify({ port, token }), { mode: 0o600 })
  })
  app.on('will-quit', () => {
    server.close()
    fs.rmSync(path.join(app.getPath('userData'), 'bridge.json'), { force: true })
  })
}
