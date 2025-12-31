import os
import requests
import json
from typing import List, Dict, Any, Optional
class AIProvider:
    def __init__(self):
        self._refresh_config()
    def _refresh_config(self):
        self.provider = os.getenv("AI_PROVIDER", "groq")
        self.groq_key = os.getenv("GROQ_API_KEY", "")
        self.ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2")
        self.ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
    def create_chat_completion(self, messages: List[Dict[str, str]], temperature: float = 0.7, max_tokens: int = 1024) -> str:
        self._refresh_config()
        if self.provider == "groq":
            if not self.groq_key:
                return "Error: Groq API key not configured."
            try:
                response = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.groq_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": max_tokens
                    },
                    timeout=30
                )
                response.raise_for_status()
                return response.json()["choices"][0]["message"]["content"]
            except Exception as e:
                return f"Groq Error: {str(e)}"
        else:
            try:
                response = requests.post(
                    f"{self.ollama_url}/api/chat",
                    json={
                        "model": self.ollama_model,
                        "messages": messages,
                        "options": {
                            "temperature": temperature,
                            "num_predict": max_tokens
                        },
                        "stream": False
                    },
                    timeout=60
                )
                response.raise_for_status()
                return response.json()["message"]["content"]
            except Exception as e:
                return f"Ollama Error: Could not connect to local Ollama. Make sure it is running and you have the model '{self.ollama_model}' pulled."
ai_provider = AIProvider()
