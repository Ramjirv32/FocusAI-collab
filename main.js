const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fetch = require('node-fetch');

let backendProcess = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // For development - load from Vite dev server
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'Frontend', 'dist', 'index.html'));
  }
  
  console.log('Main window created');
}

function startBackendServer() {
  console.log('Starting backend server...');
  
  // Use absolute path to server.js
  const serverPath = path.join(__dirname, 'focuaibackend', 'server.js');
  
  backendProcess = spawn('node', [serverPath], {
    stdio: 'pipe',
    shell: true
  });
  
  backendProcess.stdout.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`);
  });
  
  backendProcess.stderr.on('data', (data) => {
    console.error(`[Backend Error] ${data.toString().trim()}`);
  });
  
  backendProcess.on('error', (err) => {
    console.error('Failed to start backend process:', err);
  });
}

// Handle IPC calls from the renderer process
ipcMain.handle('get-tabs', async () => {
  try {
    console.log('IPC: Fetching tabs from backend');
    const response = await fetch('http://localhost:5000/tabs');
    const data = await response.json();
    console.log(`IPC: Received ${data.length} tabs from backend`);
    return data;
  } catch (err) {
    console.error('Error fetching tabs:', err);
    return [];
  }
});

app.whenReady().then(() => {
  // Start the backend first
  startBackendServer();
  
  // Wait a moment to let backend initialize
  setTimeout(() => {
    createWindow();
  }, 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (backendProcess) {
    console.log('Killing backend process...');
    backendProcess.kill();
  }
});
