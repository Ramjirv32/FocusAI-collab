const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the React app to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getTabs: () => ipcRenderer.invoke('get-tabs')
});

console.log('Preload script executed, API methods exposed');