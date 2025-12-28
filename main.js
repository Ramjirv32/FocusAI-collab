const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const configManager = require('./src/config/configManager');

let mainWindow;
let settingsWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  // Load the Vite dev server or production build
  const startUrl = process.env.ELECTRON_START_URL || `http://localhost:8080`;
  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.reload();
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Docker',
      submenu: [
        {
          label: 'View Logs',
          click: () => {
            const { shell } = require('electron');
            // Open terminal with docker logs
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Docker Logs',
              message: 'Run this command in terminal:',
              detail: 'docker-compose logs -f',
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Restart Services',
          click: async () => {
            const { exec } = require('child_process');
            exec('docker-compose restart', (error, stdout, stderr) => {
              if (error) {
                dialog.showErrorBox('Error', `Failed to restart: ${error.message}`);
              } else {
                dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: 'Success',
                  message: 'Docker services restarted successfully!',
                  buttons: ['OK']
                });
              }
            });
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => {
            const { shell } = require('electron');
            shell.openExternal('https://github.com/Ramjirv32/FocusAI-collab#readme');
          }
        },
        { type: 'separator' },
        {
          label: 'About Focusia',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Focusia',
              message: 'Focusia v1.0.0',
              detail: 'AI-powered productivity and focus management platform\n\nMade with ❤️ by Ramji',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 600,
    height: 500,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Focusia Settings'
  });

  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('get-config', async () => {
  return configManager.loadConfig();
});

ipcMain.handle('save-config', async (event, config) => {
  const result = configManager.saveConfig(config);

  // Show success/error dialog
  if (result.success) {
    dialog.showMessageBox(settingsWindow || mainWindow, {
      type: 'info',
      title: 'Success',
      message: 'Configuration saved successfully!',
      detail: `Config saved to: ${result.path}\n\nPlease restart the backend and AI services for changes to take effect.`,
      buttons: ['OK']
    });
  } else {
    dialog.showMessageBox(settingsWindow || mainWindow, {
      type: 'error',
      title: 'Error',
      message: 'Failed to save configuration',
      detail: result.error,
      buttons: ['OK']
    });
  }

  return result;
});

ipcMain.handle('test-groq-connection', async (event, apiKey) => {
  try {
    const axios = require('axios');
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    return { success: true, message: 'Connection successful!' };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.error?.message || error.message
    };
  }
});

ipcMain.handle('open-settings', () => {
  createSettingsWindow();
});

ipcMain.handle('get-config-path', () => {
  return configManager.getConfigPath();
});

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});
