import { app, BrowserWindow, net, powerMonitor, protocol, screen, shell } from 'electron'
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// The renderer is served from app://local/, so its existing fetch('/api/...')
// calls land here and are answered by the handlers in ./api, no HTTP server.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
])

// Tests point this at a temp folder so every run starts with an empty database.
if (process.env.ACADEMIC_DASHBOARD_USER_DATA) app.setPath('userData', process.env.ACADEMIC_DASHBOARD_USER_DATA)

// Tests run the app without a visible window or Dock icon so they don't take over the screen.
const hidden = process.env.ACADEMIC_DASHBOARD_HIDDEN === '1'

const devServerUrl = process.env.ELECTRON_RENDERER_URL
const rendererDir = path.join(__dirname, '../renderer')

async function registerAppProtocol() {
  const { dbPath, handleApi } = await import('./routes')
  console.log(`[db] ${dbPath}`)

  protocol.handle('app', async (req) => {
    const { pathname, search } = new URL(req.url)
    if (pathname === '/api/widget') return widgetRoute(req)
    if (pathname === '/api/widget-status') return widgetStatusRoute(req)
    if (pathname.startsWith('/api/')) {
      try {
        return await handleApi(req)
      } catch (error) {
        console.error('[api]', pathname, error)
        return Response.json({ error: 'Internal error' }, { status: 500 })
      }
    }
    if (devServerUrl) return net.fetch(devServerUrl + pathname + search)
    // Only serve files inside the built renderer folder; anything else gets the SPA shell.
    const file = path.normalize(path.join(rendererDir, pathname))
    const inside = file.startsWith(rendererDir + path.sep) && path.extname(file) !== ''
    return net.fetch(pathToFileURL(inside ? file : path.join(rendererDir, 'index.html')).toString())
  })
}

// ── Desktop widget ──────────────────────────────────────────────
// A small frameless window that sits with the desktop (behind other windows, on every Space)
// and shows the running timer. It loads the same app://local page with #widget, so it reads
// the same localStorage timers and /api routes as the main window.

const WIDGET_SIZE = 350 // three desktop icon cells: 64px icons with 54px grid spacing
const widgetFile = () => path.join(app.getPath('userData'), 'widget.json')
let widget: BrowserWindow | null = null
let mainWin: BrowserWindow | null = null

type WidgetState = { open: boolean; x?: number; y?: number }
function readWidgetState(): WidgetState {
  try {
    return JSON.parse(fs.readFileSync(widgetFile(), 'utf8'))
  } catch {
    return { open: false }
  }
}
function saveWidgetState(patch: Partial<WidgetState>) {
  fs.writeFileSync(widgetFile(), JSON.stringify({ ...readWidgetState(), ...patch }))
}

function openWidget() {
  if (widget && !widget.isDestroyed()) return
  const { x, y } = readWidgetState()
  const area = screen.getPrimaryDisplay().workArea
  widget = new BrowserWindow({
    width: WIDGET_SIZE,
    height: WIDGET_SIZE,
    x: x ?? area.x + area.width - WIDGET_SIZE - 24,
    y: y ?? area.y + 24,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    minimizable: false,
    hasShadow: false,
    skipTaskbar: true,
    title: 'Timer widget',
    show: false,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: !hidden },
  })
  widget.setVisibleOnAllWorkspaces(true)
  if (!hidden) widget.once('ready-to-show', () => widget?.showInactive())
  widget.on('moved', () => {
    if (!widget) return
    const [wx, wy] = widget.getPosition()
    saveWidgetState({ x: wx, y: wy })
  })
  widget.on('closed', () => (widget = null))
  widget.loadURL('app://local/#widget')
}

// ── macOS widget (WidgetKit, native/widget) ─────────────────────
// The window posts what the widget should show; it is written next to the database, where the
// widget reads it, and the bundled widget-reload helper asks macOS to redraw. In dev and tests
// the helper is not there, so only the file is written.
async function widgetStatusRoute(req: Request): Promise<Response> {
  const status = await req.text()
  fs.writeFileSync(path.join(app.getPath('userData'), 'widget-status.json'), status)
  const helper = path.join(path.dirname(process.execPath), 'widget-reload')
  if (fs.existsSync(helper)) execFile(helper, () => {})
  return Response.json({ ok: true })
}

async function widgetRoute(req: Request): Promise<Response> {
  if (req.method === 'POST') {
    const { open } = (await req.json()) as { open: boolean }
    saveWidgetState({ open })
    if (open) openWidget()
    else widget?.close()
  }
  return Response.json({ open: readWidgetState().open })
}

function createWindow() {
  const win = new BrowserWindow({
    // Opens at the minimum size; the layout wraps to fit, and the window can grow from there
    width: 1024,
    height: 680,
    minWidth: 1024,
    minHeight: 680,
    title: 'Academic Dashboard',
    backgroundColor: '#f7f5ef',
    // Native traffic lights inset into the sidebar; the header row is the drag area.
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 }, // vertically centred in the 52px title-bar row
    show: false,
    // A hidden window must keep rendering at full speed for tests to drive it.
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: !hidden },
  })
  if (!hidden) win.once('ready-to-show', () => win.show())
  // External links open in the default browser, never inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('app://')) e.preventDefault()
  })
  win.loadURL('app://local/')
  mainWin = win
  win.on('closed', () => (mainWin = null))
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = mainWin
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(async () => {
    if (hidden) app.dock?.hide()
    await registerAppProtocol()
    createWindow()
    if (readWidgetState().open) openWidget()
    // The widget is a window too, so check for the main window itself
    app.on('activate', () => {
      if (!mainWin) createWindow()
    })
    // Timers in a sleeping Mac don't fire on time, so on wake or unlock ask the page to
    // run its day check now (it listens for focus and reloads if the day has changed).
    const checkDay = () => {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.executeJavaScript("window.dispatchEvent(new Event('focus'))").catch(() => {})
      }
    }
    powerMonitor.on('resume', checkDay)
    powerMonitor.on('unlock-screen', checkDay)
  })

  // Standard macOS behavior: closing the window keeps the app in the Dock.
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
