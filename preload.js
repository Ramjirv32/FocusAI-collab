const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  testGroqConnection: (apiKey) => ipcRenderer.invoke('test-groq-connection', apiKey),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  getConfigPath: () => ipcRenderer.invoke('get-config-path')
});