const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const { join, delimiter } = require('node:path');
const { access, mkdir, writeFile } = require('node:fs/promises');

app.setName('SAC Studio');
app.setPath('userData', join(app.getPath('appData'), 'SAC Studio'));

let studio;
let setup;
let origin;
let stopServer;

const root = () => app.getAppPath();
const manifest = () => app.isPackaged
  ? join(process.resourcesPath, 'figma-plugin', 'manifest.json')
  : join(root(), 'plugin', 'manifest.json');
const setupFile = () => join(app.getPath('userData'), 'setup-complete.json');
const exists = path => access(path).then(() => true, () => false);

function secureWindow(options) {
  const window = new BrowserWindow({
    ...options,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      ...(options.webPreferences || {}),
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  return window;
}

function openStudio() {
  if (studio && !studio.isDestroyed()) return studio.focus();
  studio = secureWindow({ width: 1440, height: 950, minWidth: 960, minHeight: 700,
    title: 'SAC Studio', backgroundColor: '#f6f5f1' });
  studio.webContents.on('will-navigate', (event, target) => {
    if (!target.startsWith(origin + '/')) event.preventDefault();
  });
  studio.loadURL(origin);
}

function openSetup() {
  if (setup && !setup.isDestroyed()) return setup.focus();
  setup = secureWindow({ width: 680, height: 680, minWidth: 560, minHeight: 600,
    title: 'Set up SAC Studio', backgroundColor: '#f7f7f4',
    webPreferences: { preload: join(__dirname, 'preload.cjs') } });
  setup.webContents.on('will-navigate', event => event.preventDefault());
  setup.loadFile(join(__dirname, 'setup.html'));
}

app.whenReady().then(async () => {
  process.env.PATH = [join(app.getPath('home'), '.local', 'bin'), process.env.PATH || '']
    .join(delimiter);
  process.env.SAC_STUDIO_DESKTOP = '1';
  // Visible, user-owned storage rather than buried in Application Support --
  // a campaign is a thing a designer copies, backs up or mails to someone,
  // not app-internal state. app.getPath('documents') resolves the real,
  // localized Documents folder on whatever OS and account this runs under.
  process.env.SAC_STUDIO_DATA_DIR = join(app.getPath('documents'), 'SAC_Studio');
  process.env.SAC_AI_PORT = '0';
  const backend = await import(join(root(), 'dist-desktop', 'server.mjs'));
  const port = await backend.ready;
  origin = `http://127.0.0.1:${port}`;
  stopServer = backend.close;

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'SAC Studio', submenu: [
      { label: 'Open Studio', click: openStudio },
      { label: 'Setup and Figma Plugin', click: openSetup },
      { label: 'Open Campaign Data', click: () => shell.openPath(process.env.SAC_STUDIO_DATA_DIR) },
      { role: 'quit' },
    ] },
    { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' },
  ]));

  ipcMain.handle('setup:status', async () => {
    const health = await fetch(`${origin}/ai/health`).then(r => r.json()).catch(() => ({}));
    return { claude: health.claude || null, chrome: health.chrome || null,
      plugin: await exists(manifest()) };
  });
  ipcMain.handle('setup:plugin', () => shell.showItemInFolder(manifest()));
  ipcMain.handle('setup:claude', () => shell.openExternal('https://code.claude.com/docs/en/setup'));
  ipcMain.handle('setup:figma', () => shell.openExternal(
    'https://help.figma.com/hc/en-us/articles/360042786733-Create-a-plugin-for-development'));
  ipcMain.handle('setup:continue', async () => {
    await mkdir(app.getPath('userData'), { recursive: true });
    await writeFile(setupFile(), JSON.stringify({ completedAt: new Date().toISOString() }));
    setup?.close();
    openStudio();
  });

  if (await exists(setupFile())) openStudio();
  else openSetup();
});

app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { if (stopServer) void stopServer(); });
