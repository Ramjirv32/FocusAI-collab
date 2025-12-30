const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const auth = require('../middleware/auth');
const settingsController = require('../controller/settingsController');

const CONFIG_PATH = path.join(os.homedir(), '.focusia', 'config.json');

// Standard user settings routes
router.get('/', auth, settingsController.getSettings);
router.put('/', auth, settingsController.updateSettings);

// AI Configuration routes
router.get('/ai-config', auth, async (req, res) => {
  try {
    let config = {};
    try {
      const configData = await fs.readFile(CONFIG_PATH, 'utf8');
      config = JSON.parse(configData);
    } catch (error) { }

    res.json({
      provider: config.AI_PROVIDER || process.env.AI_PROVIDER || 'groq',
      groqKey: config.GROQ_API_KEY || process.env.GROQ_API_KEY || '',
      ollamaModel: config.OLLAMA_MODEL || process.env.OLLAMA_MODEL || 'llama3:latest',
      ollamaUrl: config.OLLAMA_URL || process.env.OLLAMA_URL || 'http://localhost:11434'
    });
  } catch (error) {
    console.error('Error fetching AI config:', error);
    res.status(500).json({ error: 'Failed to fetch AI configuration' });
  }
});

router.put('/ai-config', auth, async (req, res) => {
  try {
    const { provider, groqKey, ollamaModel, ollamaUrl } = req.body;
    const configDir = path.dirname(CONFIG_PATH);
    try {
      await fs.access(configDir);
    } catch {
      await fs.mkdir(configDir, { recursive: true });
    }

    let config = {};
    try {
      const configData = await fs.readFile(CONFIG_PATH, 'utf8');
      config = JSON.parse(configData);
    } catch (error) { }

    if (provider) config.AI_PROVIDER = provider;
    if (groqKey) {
      config.GROQ_API_KEY = groqKey;
      process.env.GROQ_API_KEY = groqKey;
    }
    if (ollamaModel) config.OLLAMA_MODEL = ollamaModel;
    if (ollamaUrl) config.OLLAMA_URL = ollamaUrl;

    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');

    const envFiles = [
      path.join(__dirname, '../.env'),
      path.join(__dirname, '../../Frontend/.env'),
      path.join(__dirname, '../../ai/.env')
    ];

    const updates = {
      AI_PROVIDER: config.AI_PROVIDER,
      GROQ_API_KEY: config.GROQ_API_KEY,
      OLLAMA_MODEL: config.OLLAMA_MODEL,
      OLLAMA_URL: config.OLLAMA_URL
    };

    for (const envFile of envFiles) {
      try {
        let envContent = '';
        try {
          envContent = await fs.readFile(envFile, 'utf8');
        } catch { }

        const lines = envContent.split('\n');
        for (const [key, value] of Object.entries(updates)) {
          const valToSet = value === undefined || value === null ? '' : value;
          const isFrontend = envFile.includes('Frontend');
          const targetKey = isFrontend ? `VITE_${key}` : key;

          let found = false;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith(`${targetKey}=`)) {
              lines[i] = `${targetKey}=${valToSet}`;
              found = true;
              break;
            }
          }
          if (!found) lines.push(`${targetKey}=${valToSet}`);
        }
        await fs.writeFile(envFile, lines.join('\n'), 'utf8');
      } catch (error) {
        console.warn(`Warning: Could not update ${envFile}:`, error.message);
      }
    }

    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    const platform = os.platform();
    let autoRestarted = false;
    let message = 'AI configuration updated!';

    if (platform === 'win32') {
      try {
        await execPromise('taskkill /F /IM node.exe /T').catch(() => { });
        await execPromise('taskkill /F /IM python.exe /T').catch(() => { });
        const backendPath = path.join(__dirname, '..');
        exec(`cd "${backendPath}" && start /B node server.js`, (err) => {
          if (err) console.error('Restart failed:', err);
        });
        autoRestarted = true;
        message += ' Services restarting automatically.';
      } catch (e) {
        message += ' Please restart manually.';
      }
    } else {
      message += ' Please restart services manually.';
    }

    res.json({ success: true, message, autoRestarted });
  } catch (error) {
    console.error('Error updating AI config:', error);
    res.status(500).json({ error: 'Failed to update AI configuration' });
  }
});

router.get('/ollama-models', auth, async (req, res) => {
  try {
    const aiProvider = require('../utils/aiProvider');
    const models = await aiProvider.getAvailableOllamaModels();
    res.json({ success: true, models });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.get('/groq-api-key', auth, async (req, res) => {
  try {
    try {
      const configData = await fs.readFile(CONFIG_PATH, 'utf8');
      const config = JSON.parse(configData);
      res.json({ apiKey: config.GROQ_API_KEY || process.env.GROQ_API_KEY || '' });
    } catch (error) {
      res.json({ apiKey: process.env.GROQ_API_KEY || '' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/test-groq-api-key', auth, async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ error: 'API key required' });
    const Groq = require('groq-sdk');
    const groq = new Groq({ apiKey });
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: 'test' }],
        model: 'llama-3.3-70b-versatile',
        max_tokens: 5
      });
      if (chatCompletion && chatCompletion.choices) {
        res.json({ success: true, message: 'Valid key' });
      } else {
        res.status(400).json({ success: false, error: 'Invalid response' });
      }
    } catch (apiError) {
      res.status(400).json({ success: false, error: apiError.message });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.put('/groq-api-key', auth, async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ error: 'API key required' });
    const configDir = path.dirname(CONFIG_PATH);
    try { await fs.access(configDir); } catch { await fs.mkdir(configDir, { recursive: true }); }
    let config = {};
    try { const configData = await fs.readFile(CONFIG_PATH, 'utf8'); config = JSON.parse(configData); } catch (error) { }
    config.GROQ_API_KEY = apiKey;
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    process.env.GROQ_API_KEY = apiKey;
    const envFiles = [path.join(__dirname, '../.env'), path.join(__dirname, '../../Frontend/.env'), path.join(__dirname, '../../ai/.env')];
    for (const envFile of envFiles) {
      try {
        let envContent = '';
        try { envContent = await fs.readFile(envFile, 'utf8'); } catch { }
        const lines = envContent.split('\n');
        const isFrontend = envFile.includes('Frontend');
        const targetKey = isFrontend ? 'VITE_GROQ_API_KEY' : 'GROQ_API_KEY';
        let found = false;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith(`${targetKey}=`)) { lines[i] = `${targetKey}=${apiKey}`; found = true; break; }
        }
        if (!found) lines.push(`${targetKey}=${apiKey}`);
        await fs.writeFile(envFile, lines.join('\n'), 'utf8');
      } catch (error) { }
    }
    res.json({ success: true, message: 'API key updated!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Data management routes
router.get('/export-data', auth, settingsController.exportData);
router.post('/reset-data', auth, settingsController.resetData);

module.exports = router;
