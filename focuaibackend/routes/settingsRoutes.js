const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const CONFIG_PATH = path.join(os.homedir(), '.focusia', 'config.json');

// Middleware to check authentication
const auth = require('../middleware/auth');

// Get current Groq API key
router.get('/groq-api-key', auth, async (req, res) => {
  try {
    // Try to read from config file
    try {
      const configData = await fs.readFile(CONFIG_PATH, 'utf8');
      const config = JSON.parse(configData);

      res.json({
        apiKey: config.GROQ_API_KEY || process.env.GROQ_API_KEY || ''
      });
    } catch (error) {
      // If config file doesn't exist, return from env
      res.json({
        apiKey: process.env.GROQ_API_KEY || ''
      });
    }
  } catch (error) {
    console.error('Error fetching API key:', error);
    res.status(500).json({ error: 'Failed to fetch API key' });
  }
});

// Test Groq API key
router.post('/test-groq-api-key', auth, async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    // Test the API key by making a simple request to Groq
    const Groq = require('groq-sdk');
    const groq = new Groq({ apiKey });

    try {
      // Make a minimal test request
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

// Update Groq API key
router.put('/groq-api-key', auth, async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    // Ensure config directory exists
    const configDir = path.dirname(CONFIG_PATH);
    try {
      await fs.access(configDir);
    } catch {
      await fs.mkdir(configDir, { recursive: true });
    }

    // Read existing config or create new one
    let config = {};
    try {
      const configData = await fs.readFile(CONFIG_PATH, 'utf8');
      config = JSON.parse(configData);
    } catch (error) {
      // Config file doesn't exist, will create new one
    }

    // Update API key
    config.GROQ_API_KEY = apiKey;

    // Write config file
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');

    // Update environment variable for current process
    process.env.GROQ_API_KEY = apiKey;

    // Update .env files
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
          // File doesn't exist, will create new one
        }

        // Update or add GROQ_API_KEY
        const lines = envContent.split('\n');
        let found = false;

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('GROQ_API_KEY=') || lines[i].startsWith('VITE_GROQ_API_KEY=')) {
            if (lines[i].startsWith('GROQ_API_KEY=')) {
              lines[i] = `GROQ_API_KEY=${apiKey}`;
              found = true;
            } else if (lines[i].startsWith('VITE_GROQ_API_KEY=')) {
              lines[i] = `VITE_GROQ_API_KEY=${apiKey}`;
            }
          }
        }

        if (!found) {
          lines.push(`GROQ_API_KEY=${apiKey}`);
        }

        await fs.writeFile(envFile, lines.join('\n'), 'utf8');
      } catch (error) {
        console.warn(`Warning: Could not update ${envFile}:`, error.message);
      }
    }

    res.json({
      success: true,
      message: 'API key updated successfully'
    });
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

module.exports = router;
