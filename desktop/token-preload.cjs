const { contextBridge, ipcRenderer } = require('electron');

// The token goes in, never back out: status reports only whether one is
// saved and its last four characters.
contextBridge.exposeInMainWorld('figmaToken', Object.freeze({
  status: () => ipcRenderer.invoke('token:status'),
  save: value => ipcRenderer.invoke('token:save', String(value)),
  remove: () => ipcRenderer.invoke('token:remove'),
  help: () => ipcRenderer.invoke('token:help'),
}));
