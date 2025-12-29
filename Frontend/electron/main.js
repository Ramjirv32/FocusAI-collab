const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fetch = require('node-fetch');


let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  
  
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
    
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}


app.whenReady().then(() => {
  
  const backendProcess = spawn('node', ['backend/server.js'], {
    cwd: __dirname,
    shell: true,
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`[Backend] ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`[Backend Error] ${data}`);
  });

  createWindow();

  app.on('activate', function () {
    
    
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});


app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});


ipcMain.handle('get-tabs', async () => {
  try {
    
    const response = await fetch('http://localhost:5000/tabs');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching tabs:', error);
    return [];
  }
});


