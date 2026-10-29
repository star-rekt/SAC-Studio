const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const { join, delimiter } = require('node:path');
const { access, mkdir, writeFile, readFile, rm } = require('node:fs/promises');
const fs = require('node:fs');
const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');

app.setName('SAC Studio');
app.setPath('userData', join(app.getPath('appData'), 'SAC Studio'));

let studio;
let setup;
let tokenWindow;
let origin;
let stopServer;

// Bumped only when a content update needs shell changes this build can't
// run (new IPC, new native resource) -- see applyContentUpdate().
const SHELL_VERSION = 1;
const CONTENT_BRANCH = 'main';
const MIRROR_URL = 'https://github.com/star-rekt/SAC-Studio.git';

const root = () => app.getAppPath();
// Packaged builds read templates/server/plugin code from a writable git
// clone instead of the asar, so a template or server fix is `git push` to
// the mirror, not a new installer. Unpackaged (dev) runs read straight from
// the source tree as before.
const contentRoot = () => app.isPackaged ? join(app.getPath('userData'), 'content') : root();
const manifest = () => join(contentRoot(), 'plugin', 'manifest.json');
const setupFile = () => join(app.getPath('userData'), 'setup-complete.json');
// The designer's own Figma token, in SAC Studio's settings folder: outside
// the content clone (which updates replace) and never in any repo. The
// server reads it from here (SAC_STUDIO_ENV); without it the studio still
// runs on the default library and local uploads.
const envFile = () => join(app.getPath('userData'), '.env');
const exists = path => access(path).then(() => true, () => false);

// Seeds the content directory by cloning the mirror repo, which gives us a
// real git repo with origin configured so applyContentUpdate() can fetch later.
// Falls back to the bundled content-seed (no .git) when offline so the app
// still launches — updates won't work until the next launch with connectivity.
// Seeds the content directory by cloning the mirror repo, which gives us a
// real git repo with origin configured so applyContentUpdate() can fetch later.
// Falls back to the bundled content-seed (no .git) when offline so the app
// still launches — updates won't work until the next launch with connectivity.
async function seedContentIfMissing() {
  const dir = contentRoot();
  if (await exists(join(dir, '.git'))) return;
  // Remove any partial/stale content so git.clone gets an empty target.
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  try {
    await git.clone({ fs, http, dir, url: MIRROR_URL, ref: CONTENT_BRANCH,
      singleBranch: true, depth: 1 });
  } catch (_cloneErr) {
    // Offline or mirror unreachable — copy bundled files as fallback.
    // Next launch with connectivity will retry the clone.
    const { cp } = await import('node:fs/promises');
    await cp(join(process.resourcesPath, 'content-seed'), dir, { recursive: true });
  }
}

// Fetches and fast-forwards the content clone against the mirror repo.
// Never rebases/merges -- a diverged local clone (shouldn't happen; nothing
// writes to it besides this function) is left alone rather than risk
// clobbering it. Network/auth failures are swallowed by the caller so a
// designer without connectivity can still launch on whatever is on disk.
async function applyContentUpdate() {
  const dir = contentRoot();
  const before = await git.resolveRef({ fs, dir, ref: 'HEAD' }).catch(() => null);
  await git.fastForward({ fs, http, dir, ref: CONTENT_BRANCH, remote: 'origin', singleBranch: true });
  const after = await git.resolveRef({ fs, dir, ref: 'HEAD' });
  if (before === after) return { updated: false };
  const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
  const required = pkg.minShellVersion ?? 1;
  return { updated: true, incompatible: required > SHELL_VERSION };
}

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

function openToken() {
  if (tokenWindow && !tokenWindow.isDestroyed()) return tokenWindow.focus();
  tokenWindow = secureWindow({ width: 560, height: 430, minWidth: 460, minHeight: 400,
    title: 'Figma Token', backgroundColor: '#f7f7f4',
    webPreferences: { preload: join(__dirname, 'token-preload.cjs') } });
  tokenWindow.webContents.on('will-navigate', event => event.preventDefault());
  tokenWindow.loadFile(join(__dirname, 'token.html'));
}

// Saves the token to the .env (FIGMA_TOKEN=…, owner-only), puts it in this
// process's environment so the gallery uses it at once (the server runs in
// this process), and asks Figma whose it is -- a wrong token is still saved,
// but the designer is told.
async function saveToken(value) {
  const token = value.trim();
  if (!/^[\w-]{20,}$/.test(token)) return { saved: false, message: 'That doesn\u2019t look like a Figma token (figd_…).' };
  await mkdir(app.getPath('userData'), { recursive: true });
  await writeFile(envFile(), `FIGMA_TOKEN=${token}\n`, { mode: 0o600 });
  process.env.FIGMA_TOKEN = token;
  const me = await fetch('https://api.figma.com/v1/me', { headers: { 'X-Figma-Token': token } })
    .then(r => r.ok ? r.json() : null, () => undefined);
  if (me === undefined) return { saved: true, valid: null, message: 'Saved. Figma couldn\u2019t be reached to check it; it\u2019ll be used when you\u2019re online.' };
  if (!me) return { saved: true, valid: false, message: 'Saved, but Figma rejected it. Check the token and save again.' };
  return { saved: true, valid: true, message: `Saved: connected to Figma as ${me.handle || me.email}. The gallery is ready.` };
}

function openSetup() {
  if (setup && !setup.isDestroyed()) return setup.focus();
  setup = secureWindow({ width: 680, height: 680, minWidth: 560, minHeight: 600,
    title: 'Set up SAC Studio', backgroundColor: '#f7f7f4',
    webPreferences: { preload: join(__dirname, 'preload.cjs') } });
  setup.webContents.on('will-navigate', event => event.preventDefault());
  setup.loadFile(join(__dirname, 'setup.html'));
}

async function checkForUpdates() {
  if (!app.isPackaged) {
    dialog.showMessageBox({ message: 'Content updates only apply to packaged builds.' });
    return;
  }
  try {
    const result = await applyContentUpdate();
    if (!result.updated) {
      dialog.showMessageBox({ message: 'SAC Studio is already up to date.' });
      return;
    }
    if (result.incompatible) {
      dialog.showMessageBox({ type: 'warning', message: 'An update was applied, but it '
        + 'needs a newer version of SAC Studio itself. Please reinstall from the latest package.' });
      return;
    }
    const { response } = await dialog.showMessageBox({ type: 'info', buttons: ['Restart Now', 'Later'],
      message: 'An update was applied. Restart SAC Studio to use it?' });
    if (response === 0) { app.relaunch(); app.exit(); }
  } catch (error) {
    dialog.showMessageBox({ type: 'error', message: `Could not check for updates: ${error.message}` });
  }
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
  process.env.SAC_STUDIO_ENV = envFile();

  if (app.isPackaged) {
    await seedContentIfMissing();
    // Best-effort: a designer with no network, or the mirror unreachable,
    // still launches on whatever content is already on disk.
    await applyContentUpdate().catch(() => ({ updated: false }));
  }

  const backend = await import(join(contentRoot(), 'dist-desktop', 'server.mjs'));
  const port = await backend.ready;
  origin = `http://127.0.0.1:${port}`;
  stopServer = backend.close;

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'SAC Studio', submenu: [
      { label: 'Open Studio', click: openStudio },
      { label: 'Setup and Figma Plugin', click: openSetup },
      { label: 'Figma Token\u2026', click: openToken },
      { label: 'Open Campaign Data', click: () => shell.openPath(process.env.SAC_STUDIO_DATA_DIR) },
      { label: 'Check for Updates', click: checkForUpdates },
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
  ipcMain.handle('token:status', () => {
    const token = process.env.FIGMA_TOKEN?.trim();
    return { saved: !!token, tail: token ? token.slice(-4) : '' };
  });
  ipcMain.handle('token:save', (_event, value) => saveToken(String(value)));
  ipcMain.handle('token:remove', async () => {
    await rm(envFile(), { force: true });
    delete process.env.FIGMA_TOKEN;
  });
  ipcMain.handle('token:help', () => shell.openExternal(
    'https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens'));
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
