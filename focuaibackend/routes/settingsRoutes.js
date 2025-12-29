const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const CONFIG_PATH = path.join(os.homedir(), '.focusia', 'config.json');


const auth = require('../middleware/auth');


const ProductivitySummary = require('../models/ProductivitySummary');
const AppUsage = require('../models/AppUsage');
const TabUsage = require('../models/TabUsage');
const ChatHistory = require('../models/ChatHistory');
const Alert = require('../models/Alert');
const Todo = require('../models/Todo');
const Gamification = require('../models/Gamification');
const UserProfile = require('../models/UserProfile');
const Notification = require('../models/Notification');
const FocusSession = require('../models/FocusSession');
const FocusResult = require('../models/FocusResult');



router.get('/ai-config', auth, async (req, res) => {
  try {
    let config = {};
    try {
      const configData = await fs.readFile(CONFIG_PATH, 'utf8');
      config = JSON.parse(configData);
    } catch (error) {
      
    }

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

          let found = false;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith(`${key}=`)) {
              lines[i] = `${key}=${valToSet}`;
              found = true;
              break;
            }
            if (envFile.includes('Frontend') && lines[i].startsWith(`VITE_${key}=`)) {
              lines[i] = `VITE_${key}=${valToSet}`;
            }
          }
          if (!found) {
            lines.push(`${key}=${valToSet}`);
            if (envFile.includes('Frontend')) {
              lines.push(`VITE_${key}=${valToSet}`);
            }
          }
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
        const aiPath = path.join(__dirname, '../../ai');

        exec(`cd "${backendPath}" && start /B node server.js`, (err) => {
          if (err) console.error('Restart failed:', err);
        });

        autoRestarted = true;
        message += ' Services restarting automatically.';
      } catch (e) {
        message += ' Please restart services manually.';
      }
    } else {
      message += ' Please restart services manually to apply changes.';
    }

    res.json({
      success: true,
      message,
      autoRestarted
    });

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
    console.error('Error listing Ollama models:', error);
    res.status(500).json({ error: 'Failed to fetch Ollama models' });
  }
});

router.get('/groq-api-key', auth, async (req, res) => {
  try {
    
    try {
      const configData = await fs.readFile(CONFIG_PATH, 'utf8');
      const config = JSON.parse(configData);

      res.json({
        apiKey: config.GROQ_API_KEY || process.env.GROQ_API_KEY || ''
      });
    } catch (error) {
      
      res.json({
        apiKey: process.env.GROQ_API_KEY || ''
      });
    }
  } catch (error) {
    console.error('Error fetching API key:', error);
    res.status(500).json({ error: 'Failed to fetch API key' });
  }
});


router.post('/test-groq-api-key', auth, async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    
    const Groq = require('groq-sdk');
    const groq = new Groq({ apiKey });

    try {
      
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: 'test' }],
        model: 'llama-3.3-70b-versatile',
        max_tokens: 5
      });

      if (chatCompletion && chatCompletion.choices) {
        res.json({
          success: true,
          message: 'API key is valid and working'
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid API key response'
        });
      }
    } catch (apiError) {
      console.error('Groq API test error:', apiError);
      res.status(400).json({
        success: false,
        error: apiError.message || 'API key test failed'
      });
    }
  } catch (error) {
    console.error('Error testing API key:', error);
    res.status(500).json({ error: 'Failed to test API key' });
  }
});


router.put('/groq-api-key', auth, async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    
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
    } catch (error) {
      
    }

    
    config.GROQ_API_KEY = apiKey;

    
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');

    
    process.env.GROQ_API_KEY = apiKey;
    process.env.VITE_GROQ_API_KEY = apiKey;

    
    const envFiles = [
      path.join(__dirname, '../.env'),
      path.join(__dirname, '../../Frontend/.env'),
      path.join(__dirname, '../../ai/.env')
    ];

    for (const envFile of envFiles) {
      try {
        let envContent = '';
        try {
          envContent = await fs.readFile(envFile, 'utf8');
        } catch {
          
        }

        
        const lines = envContent.split('\n');
        let foundGroq = false;
        let foundVite = false;

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('GROQ_API_KEY=')) {
            lines[i] = `GROQ_API_KEY=${apiKey}`;
            foundGroq = true;
          } else if (lines[i].startsWith('VITE_GROQ_API_KEY=')) {
            lines[i] = `VITE_GROQ_API_KEY=${apiKey}`;
            foundVite = true;
          }
        }

        if (!foundGroq) {
          lines.push(`GROQ_API_KEY=${apiKey}`);
        }
        if (!foundVite && envFile.includes('Frontend')) {
          lines.push(`VITE_GROQ_API_KEY=${apiKey}`);
        }

        await fs.writeFile(envFile, lines.join('\n'), 'utf8');
      } catch (error) {
        console.warn(`Warning: Could not update ${envFile}:`, error.message);
      }
    }

    
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    const os = require('os');

    let restartMessage = '';
    const platform = os.platform();

    try {
      if (platform === 'win32') {
        
        console.log('Windows detected - attempting automatic restart...');

        try {
          
          await execPromise('taskkill /F /IM node.exe /T').catch(() => { });
          await execPromise('taskkill /F /IM python.exe /T').catch(() => { });

          
          await new Promise(resolve => setTimeout(resolve, 2000));

          
          const backendPath = path.join(__dirname, '..');
          const aiPath = path.join(__dirname, '../../ai');

          
          exec(`cd "${backendPath}" && start /B node server.js`, (error) => {
            if (error) console.error('Error starting backend:', error);
          });

          
          exec(`cd "${aiPath}" && start /B venv\\Scripts\\activate && python main.py`, (error) => {
            if (error) console.error('Error starting AI:', error);
          });

          restartMessage = 'API key updated and services restarted automatically!';
          console.log('✅ Services restarted automatically on Windows');
        } catch (winError) {
          console.error('Windows restart error:', winError);
          restartMessage = 'API key updated! Please restart FocusAI manually.';
        }
      } else {
        
        try {
          await execPromise('systemctl is-active focusai-backend.service').catch(() => null);
          
          restartMessage = 'API key updated! Please restart services: sudo systemctl restart focusai-backend focusai-ai';
          console.log('Linux/systemd detected - manual restart required');
        } catch {
          
          restartMessage = 'API key updated! Please restart the backend and AI services manually.';
          console.log('Development mode detected - manual restart required');
        }
      }
    } catch (error) {
      console.log('Error during restart attempt:', error);
      restartMessage = 'API key updated! Please restart services manually.';
    }

    res.json({
      success: true,
      message: restartMessage,
      platform: platform,
      autoRestarted: platform === 'win32'
    });
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
});


router.get('/export-data', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(`Starting data export for user: ${userId}`);

    
    const summaries = await ProductivitySummary.find({ userId: userId }).lean();

    if (!summaries || summaries.length === 0) {
      return res.status(200).json([]); 
    }

    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=productivity-summaries-${new Date().toISOString().split('T')[0]}.json`);

    res.json(summaries);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data: ' + error.message });
  }
});


router.post('/reset-data', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const email = req.user.email;
    const { type } = req.body;

    console.log(`Purging all activity data for user: ${email} (${userId}), type: ${type}`);

    
    const results = await Promise.all([
      AppUsage.deleteMany({ userId }),
      TabUsage.deleteMany({ userId }),
      ProductivitySummary.deleteMany({ userId }),
      ChatHistory.deleteMany({ userId }),
      Alert.deleteMany({ userId }),
      Todo.deleteMany({ userId }),
      Gamification.deleteMany({ userId }),
      Notification.deleteMany({ userId }),
      FocusSession.deleteMany({ userId }),
      FocusResult.deleteMany({ userId })
    ]);

    
    await UserProfile.findOneAndUpdate(
      { userId },
      {
        $set: {
          'stats.totalFocusTime': 0,
          'stats.totalProductiveTime': 0,
          'stats.averageFocusScore': 0,
          'stats.currentStreak': 0,
          'stats.longestStreak': 0,
          'stats.totalSessions': 0,
          'level.totalPoints': 0,
          'level.currentLevel': 1,
          'achievements': []
        }
      }
    );

    const totalDeleted = results.reduce((acc, curr) => acc + (curr.deletedCount || 0), 0);

    console.log(`✅ Data purge complete for ${email}. Total records deleted: ${totalDeleted}`);

    res.json({
      success: true,
      message: 'All activity data has been permanently deleted.',
      deletedCount: totalDeleted
    });
  } catch (error) {
    console.error('Error purging data:', error);
    res.status(500).json({ error: 'Failed to purge data: ' + error.message });
  }
});


router.get('/export-data', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    
    const [
      productivitySummaries,
      appUsage,
      tabUsage,
      focusSessions,
      todos,
      gamification,
      userProfile,
      notifications,
      alerts
    ] = await Promise.all([
      ProductivitySummary.find({ userId }),
      AppUsage.find({ userId }),
      TabUsage.find({ userId }),
      FocusSession.find({ userId }),
      Todo.find({ userId }),
      Gamification.findOne({ userId }),
      UserProfile.findOne({ userId }),
      Notification.find({ userId }),
      Alert.find({ userId })
    ]);

    
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: userId,
        email: req.user.email,
        name: req.user.name
      },
      data: {
        productivitySummaries: productivitySummaries || [],
        appUsage: appUsage || [],
        tabUsage: tabUsage || [],
        focusSessions: focusSessions || [],
        todos: todos || [],
        gamification: gamification || {},
        userProfile: userProfile || {},
        notifications: notifications || [],
        alerts: alerts || []
      },
      statistics: {
        totalProductivityRecords: productivitySummaries?.length || 0,
        totalAppUsageRecords: appUsage?.length || 0,
        totalTabUsageRecords: tabUsage?.length || 0,
        totalFocusSessions: focusSessions?.length || 0,
        totalTodos: todos?.length || 0,
        totalNotifications: notifications?.length || 0,
        totalAlerts: alerts?.length || 0
      }
    };

    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="focusai-export-${new Date().toISOString().split('T')[0]}.json"`);
    res.send(JSON.stringify(exportData, null, 2));

  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data: ' + error.message });
  }
});


router.post('/reset-data', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { type } = req.body;

    if (type === 'usage') {
      
      const results = await Promise.all([
        AppUsage.deleteMany({ userId }),
        TabUsage.deleteMany({ userId }),
        FocusSession.deleteMany({ userId })
      ]);

      const totalDeleted = results.reduce((acc, curr) => acc + (curr.deletedCount || 0), 0);
      res.json({
        success: true,
        message: 'Usage data has been deleted.',
        deletedCount: totalDeleted
      });
    } else if (type === 'productivity') {
      
      const result = await ProductivitySummary.deleteMany({ userId });
      res.json({
        success: true,
        message: 'Productivity data has been deleted.',
        deletedCount: result.deletedCount
      });
    } else if (type === 'all') {
      
      const results = await Promise.all([
        AppUsage.deleteMany({ userId }),
        TabUsage.deleteMany({ userId }),
        ProductivitySummary.deleteMany({ userId }),
        ChatHistory.deleteMany({ userId }),
        Alert.deleteMany({ userId }),
        Todo.deleteMany({ userId }),
        Notification.deleteMany({ userId }),
        FocusSession.deleteMany({ userId }),
        FocusResult.deleteMany({ userId })
      ]);

      const totalDeleted = results.reduce((acc, curr) => acc + (curr.deletedCount || 0), 0);
      res.json({
        success: true,
        message: 'All activity data has been deleted.',
        deletedCount: totalDeleted
      });
    } else {
      res.status(400).json({ error: 'Invalid reset type' });
    }
  } catch (error) {
    console.error('Error resetting data:', error);
    res.status(500).json({ error: 'Failed to reset data: ' + error.message });
  }
});

module.exports = router;
