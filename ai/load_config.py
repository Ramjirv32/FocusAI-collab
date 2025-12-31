import os
import json
from pathlib import Path
CONFIG_PATH = Path.home() / ".focusia" / "config.json"
def load_config_to_env():
    try:
        if CONFIG_PATH.exists():
            with open(CONFIG_PATH, 'r') as f:
                config = json.load(f)
            if 'AI_PROVIDER' in config:
                os.environ['AI_PROVIDER'] = config['AI_PROVIDER']
            if 'GROQ_API_KEY' in config and config['GROQ_API_KEY']:
                os.environ['GROQ_API_KEY'] = config['GROQ_API_KEY']
            if 'OLLAMA_MODEL' in config:
                os.environ['OLLAMA_MODEL'] = config['OLLAMA_MODEL']
            if 'OLLAMA_URL' in config:
                os.environ['OLLAMA_URL'] = config['OLLAMA_URL']
            if 'API_BASE_URL' in config:
                os.environ['BACKEND_URL'] = config['API_BASE_URL']
            print(f"✅ AI Config loaded: {os.environ.get('AI_PROVIDER', 'groq')} mode")
            return True
        else:
            print(f"⚠️  Config file not found at: {CONFIG_PATH}")
            print("⚠️  Please configure Groq API key in the Electron app settings")
            return False
    except Exception as e:
        print(f"❌ Error loading config: {e}")
        return False
load_config_to_env()
