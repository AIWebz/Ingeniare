// Ingeniare desktop shell (Electron). Serves the app from a privileged
// app:// protocol so ES modules and the 3D engine load from inside the package.
const { app, BrowserWindow, protocol, shell, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1480, height: 920, minWidth: 1000, minHeight: 640, backgroundColor: '#0b0f17', title: 'Ingeniare',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.loadURL('app://ingeniare/src/index.html');
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

app.whenReady().then(() => {
  protocol.handle('app', async (req) => {
    const rel = decodeURIComponent(new URL(req.url).pathname);
    const file = path.normalize(path.join(ROOT, rel));
    if (!file.startsWith(ROOT)) return new Response('Forbidden', { status: 403 });
    try {
      const body = await fs.readFile(file);
      return new Response(body, { headers: { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' } });
    } catch { return new Response('Not found', { status: 404 }); }
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    { role: 'fileMenu' }, { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' },
    { role: 'help', submenu: [{ label: 'Project on GitHub', click: () => shell.openExternal('https://github.com/aiwebz/ingeniare') }] },
  ]));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
