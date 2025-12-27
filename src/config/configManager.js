const fs = require('fs');
const os = require('os');
const path = require('path');

const CONFIG_DIR = path.join(os.homedir(), '.focusia');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

class ConfigManager {
    constructor() {
        this.ensureConfigDir();
    }

    ensureConfigDir() {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
            console.log('✅ Created config directory:', CONFIG_DIR);
        }
    }

    saveConfig(config) {
        try {
            const data = {
                GROQ_API_KEY: config.GROQ_API_KEY || '',
                API_BASE_URL: config.API_BASE_URL || 'http://localhost:5001',
                MONGODB_URI: config.MONGODB_URI || 'mongodb://localhost:27018/focusai',
                updatedAt: new Date().toISOString()
            };

            fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
            console.log('✅ Config saved to:', CONFIG_FILE);
            return { success: true, path: CONFIG_FILE };
        } catch (error) {
            console.error('❌ Error saving config:', error);
            return { success: false, error: error.message };
        }
    }

    loadConfig() {
        try {
            if (fs.existsSync(CONFIG_FILE)) {
                const data = fs.readFileSync(CONFIG_FILE, 'utf8');
                const config = JSON.parse(data);
                console.log('✅ Config loaded from:', CONFIG_FILE);
                return config;
            } else {
                console.log('⚠️  No config file found, using defaults');
                return this.getDefaultConfig();
            }
        } catch (error) {
            console.error('❌ Error loading config:', error);
            return this.getDefaultConfig();
        }
    }

    getDefaultConfig() {
        return {
            GROQ_API_KEY: '',
            API_BASE_URL: 'http://localhost:5001',
            MONGODB_URI: 'mongodb://localhost:27018/focusai'
        };
    }

    hasGroqKey() {
        const config = this.loadConfig();
        return config.GROQ_API_KEY && config.GROQ_API_KEY.length > 0;
    }

    getConfigPath() {
        return CONFIG_FILE;
    }

    deleteConfig() {
        try {
            if (fs.existsSync(CONFIG_FILE)) {
                fs.unlinkSync(CONFIG_FILE);
                console.log('✅ Config deleted');
                return { success: true };
            }
            return { success: true, message: 'No config to delete' };
        } catch (error) {
            console.error('❌ Error deleting config:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new ConfigManager();
