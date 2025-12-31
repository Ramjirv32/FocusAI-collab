
const { contextBridge, ipcRenderer } = require('electron');



contextBridge.exposeInMainWorld('electronAPI', {
  getTabs: () => ipcRenderer.invoke('get-tabs'),
  
});
