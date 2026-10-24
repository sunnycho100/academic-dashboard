// electron-builder afterPack hook: builds the macOS widget (native/widget) and puts it in the app.
// The widget goes in Contents/PlugIns and its reload module (native/widget/Addon) in Resources,
// then both and the app are signed locally (no Apple ID needed). Skipped, with a note, when Xcode or
// XcodeGen is missing, so packaging still works without them.
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

exports.default = async function embedWidget(context) {
  if (context.electronPlatformName !== 'darwin') return
  const dir = path.join(__dirname, '..', 'native', 'widget')
  const run = (cmd, args) => execFileSync(cmd, args, { cwd: dir, stdio: 'inherit' })
  try {
    run('xcodegen', ['generate', '--quiet'])
    run('xcodebuild', ['-project', 'AcademicWidget.xcodeproj', '-scheme', 'AcademicWidget', '-configuration', 'Release', '-derivedDataPath', 'build', '-quiet'])
    // A Node-API module, so the app's own process asks macOS to redraw (a helper is ignored)
    run('xcrun', ['clang', '-c', 'Addon/addon.c', '-o', 'build/addon.o', '-mmacosx-version-min=14.0', '-arch', 'arm64'])
    run('xcrun', ['swiftc', '-emit-library', 'Addon/reload.swift', 'build/addon.o', '-o', 'build/widget_reload.node', '-target', 'arm64-apple-macos14.0', '-Xlinker', '-undefined', '-Xlinker', 'dynamic_lookup', '-framework', 'WidgetKit'])
  } catch (e) {
    console.warn('  • macOS widget not built (needs Xcode and XcodeGen):', e.message)
    return
  }
  const built = path.join(dir, 'build', 'Build', 'Products', 'Release')
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  const plugins = path.join(app, 'Contents', 'PlugIns')
  fs.mkdirSync(plugins, { recursive: true })
  fs.cpSync(path.join(built, 'AcademicWidget.appex'), path.join(plugins, 'AcademicWidget.appex'), { recursive: true })
  const addon = path.join(app, 'Contents', 'Resources', 'widget_reload.node')
  fs.copyFileSync(path.join(dir, 'build', 'widget_reload.node'), addon)

  // Sign everything inside (Electron's frameworks come unsigned), then the widget again with its
  // sandbox entitlements (--deep drops them), then the app around it so its seal is current
  const sign = (args) => execFileSync('codesign', ['--force', '--sign', '-', ...args], { stdio: 'inherit' })
  sign(['--deep', app])
  sign([addon])
  sign(['--entitlements', path.join(dir, 'Widget', 'Widget.entitlements'), path.join(plugins, 'AcademicWidget.appex')])
  sign([app])
  console.log('  • macOS widget embedded')
}
