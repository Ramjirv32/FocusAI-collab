interface ElectronAPI {
  getTabs: () => Promise<any[]>;
}

interface Window {
  electronAPI?: ElectronAPI;
}