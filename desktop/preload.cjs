const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('setup', Object.freeze({
  status: () => ipcRenderer.invoke('setup:status'),
  plugin: () => ipcRenderer.invoke('setup:plugin'),
  claude: () => ipcRenderer.invoke('setup:claude'),
  figma: () => ipcRenderer.invoke('setup:figma'),
  continue: () => ipcRenderer.invoke('setup:continue'),
}));
