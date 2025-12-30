const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  testGroqConnection: (apiKey) => ipcRenderer.invoke('test-groq-connection', apiKey),
  testOllamaConnection: (url, model) => ipcRenderer.invoke('test-ollama-connection', url, model),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  getConfigPath: () => ipcRenderer.invoke('get-config-path')
});