from pydantic import BaseSettings
import os

class Settings(BaseSettings):
    """Application settings"""
    
    # API Settings
    API_VERSION: str = "2.0.0"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    
    # Model Settings
    MODEL_PATH: str = "src/data/models/"
    ENHANCED_MODEL_NAME: str = "enhanced_focus_model.pkl"
    ORIGINAL_MODEL_NAME: str = "focus_model.pkl"
    
    # Data Settings
    DATA_PATH: str = "src/data/"
    SAMPLE_DATA_PATH: str = "src/data/sample/"
    
    # Classification Settings
    MIN_FOCUS_DURATION: int = 300  # 5 minutes
    HIGH_CONFIDENCE_THRESHOLD: float = 0.90
    
    class Config:
        env_file = ".env"

settings = Settings()