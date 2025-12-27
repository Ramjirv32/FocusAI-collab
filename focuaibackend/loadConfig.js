const fs = require('fs');
const os = require('os');
const path = require('path');

const CONFIG_PATH = path.join(os.homedir(), '.focusia', 'config.json');

function loadConfigToEnv() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
            const config = JSON.parse(configData);

            // Load Groq API key from config (only if not already set)
            if (config.GROQ_API_KEY && !process.env.GROQ_API_KEY) {
                process.env.GROQ_API_KEY = config.GROQ_API_KEY;
                console.log('✅ Loaded GROQ_API_KEY from ~/.focusia/config.json');
            } else if (!config.GROQ_API_KEY) {
                console.warn('⚠️  No GROQ_API_KEY found in config.json');
            }

            // Load MongoDB URI if present (only if not already set by docker-compose)
            if (config.MONGODB_URI && !process.env.MONGODB_URI) {
                process.env.MONGODB_URI = config.MONGODB_URI;
                console.log('✅ Loaded MONGODB_URI from config');
            }

            return true;
        } else {
            console.warn('⚠️  Config file not found at:', CONFIG_PATH);
            console.warn('⚠️  Please configure Groq API key in the Electron app settings');
            return false;
        }
    } catch (error) {
        console.error('❌ Error loading config:', error.message);
        return false;
    }
}

// Load config immediately when this module is imported
loadConfigToEnv();

module.exports = { loadConfigToEnv, CONFIG_PATH };
