import { app, BrowserWindow, net, protocol, shell } from 'electron'
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

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'Academic Dashboard',
    backgroundColor: '#f7f5ef',
    // Native traffic lights inset into the sidebar; the header row is the drag area.
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 20, y: 28 }, // vertically centred in the 72px title-bar row
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
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(async () => {
    if (hidden) app.dock?.hide()
    await registerAppProtocol()
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  // Standard macOS behavior: closing the window keeps the app in the Dock.
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
