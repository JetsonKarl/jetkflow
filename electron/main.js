import { app, BrowserWindow, Menu, Tray, nativeImage, shell } from 'electron'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))

let mainWindow = null
let tray = null
let trayIcon = null
let quitting = false
let balloonShown = false

function showWindow() {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function createWindow() {
  const window = new BrowserWindow({
    title: 'JetKFlow',
    width: 1280,
    height: 820,
    minWidth: 390,
    minHeight: 620,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f1f1f4',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#f7f7f9',
      symbolColor: '#55555a',
      height: 40,
    },
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // 点关闭 = 隐藏到托盘继续驻留，真正退出只能走托盘菜单。
  window.on('close', event => {
    if (quitting) return
    event.preventDefault()
    window.hide()
    if (tray && !balloonShown) {
      balloonShown = true
      tray.displayBalloon({
        icon: trayIcon,
        title: 'JetKFlow 仍在运行',
        content: '窗口已最小化到系统托盘。单击托盘图标可重新打开，右键可选择退出。',
      })
    }
  })

  window.loadFile(join(currentDir, '..', 'dist', 'index.html'), {
    query: { desktop: '1' },
  })
  window.once('ready-to-show', () => window.show())
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow = window
}

function createTray() {
  trayIcon = nativeImage.createFromPath(join(currentDir, 'tray.png'))
  tray = new Tray(trayIcon)
  tray.setToolTip('JetKFlow · 单击打开主窗口')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示主窗口', click: showWindow },
    { type: 'separator' },
    { label: '退出 JetKFlow', click: () => { quitting = true; app.quit() } },
  ]))
  tray.on('click', showWindow)
  tray.on('double-click', showWindow)
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  // 已有实例在托盘驻留时，再次双击 exe 只唤起旧窗口。
  app.quit()
} else {
  app.on('second-instance', showWindow)

  app.setName('JetKFlow')
  app.setAppUserModelId('com.jetkflow.desktop')

  app.whenReady().then(() => {
    createWindow()
    createTray()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
      else showWindow()
    })
  })

  app.on('before-quit', () => { quitting = true })
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
