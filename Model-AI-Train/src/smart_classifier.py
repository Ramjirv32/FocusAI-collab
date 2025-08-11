import joblib
import numpy as np
from typing import Dict, Any, Optional
from ...config.constants import DEV_TOOLS, WORK_BROWSER_PATTERNS
from ...utils.model_utils import create_features, encode_categorical

class SmartFocusClassifier:
    """Enhanced smart classifier with rule-based and ML approaches"""
    
    def __init__(self):
        self.load_models()
        self.dev_rules = self._setup_dev_rules()
        
    def load_models(self):
        """Load all available models"""
        try:
            # Try to load enhanced model first
            self.model = joblib.load('src/data/models/enhanced_focus_model.pkl')
            self.app_encoder = joblib.load('src/data/models/enhanced_app_name_encoder.pkl')
            self.tab_encoder = joblib.load('src/data/models/enhanced_tab_name_encoder.pkl')
            self.label_encoder = joblib.load('src/data/models/enhanced_label_encoder.pkl')
            print("✅ Enhanced models loaded")
        except FileNotFoundError:
            try:
                # Fallback to original models
                self.model = joblib.load('focus_model.pkl')
                self.app_encoder = joblib.load('app_name_encoder.pkl')
                self.tab_encoder = joblib.load('tab_name_encoder.pkl')
                self.label_encoder = joblib.load('label_encoder.pkl')
                print("✅ Original models loaded")
            except FileNotFoundError:
                print("⚠️  No models found, using rule-based classification only")
                self.model = None
    
    def _setup_dev_rules(self) -> Dict[str, Any]:
        """Setup development tool rules"""
        return {
            'high_focus_apps': {
                'VS Code': 0.95, 'Code': 0.95, 'MongoDB Compass': 0.92,
                'Postman': 0.90, 'Terminal': 0.88, 'Gnome-terminal': 0.88,
                'GitHub Desktop': 0.90, 'Docker': 0.85, 'IntelliJ IDEA': 0.95
            },
            'system_tools': {
                'Gnome-control-center': 0.75,
                'System Settings': 0.75
            }
        }
    
    def classify(self, app_name: str, tab_name: str, duration: int) -> Dict[str, Any]:
        """Main classification method"""
        
        # Rule 1: High-confidence dev tools
        if app_name in self.dev_rules['high_focus_apps']:
            confidence = self.dev_rules['high_focus_apps'][app_name]
            if duration > 300:
                confidence = min(0.98, confidence + 0.03)
            return {
                'label': 'Focused',
                'confidence': confidence,
                'reason': 'Development tool'
            }
        
        # Rule 2: Work-related browser activity
        if app_name.lower() in ['chrome', 'google-chrome', 'firefox', 'edge']:
            tab_lower = tab_name.lower()
            work_score = sum(1 for pattern in WORK_BROWSER_PATTERNS if pattern in tab_lower)
            if work_score > 0:
                confidence = min(0.95, 0.82 + (work_score * 0.04))
                return {
                    'label': 'Focused',
                    'confidence': confidence,
                    'reason': 'Work-related browsing'
                }
        
        # Rule 3: System tools
        if app_name in self.dev_rules['system_tools'] and duration > 30:
            return {
                'label': 'Focused',
                'confidence': self.dev_rules['system_tools'][app_name],
                'reason': 'System configuration'
            }
        
        # Fallback to model or duration-based
        if self.model:
            return self._model_prediction(app_name, tab_name, duration)
        else:
            return {
                'label': 'Focused' if duration > 600 else 'Distracted',
                'confidence': 0.60,
                'reason': 'Duration-based fallback'
            }
    
    def _model_prediction(self, app_name: str, tab_name: str, duration: int) -> Dict[str, Any]:
        """Fallback to ML model prediction"""
        try:
            # Handle app mapping and encoding
            mapped_app = self._map_app_name(app_name)
            encoded_features = encode_categorical(mapped_app, tab_name, duration, 
                                                self.app_encoder, self.tab_encoder)
            
            prediction = self.model.predict([encoded_features])[0]
            confidence = max(self.model.predict_proba([encoded_features])[0])
            label = self.label_encoder.inverse_transform([prediction])[0]
            
            return {
                'label': label,
                'confidence': confidence,
                'reason': 'ML model prediction'
            }
        except Exception as e:
            return {
                'label': 'Focused' if duration > 300 else 'Distracted',
                'confidence': 0.65,
                'reason': f'Model error: {str(e)}'
            }
    
    def _map_app_name(self, app_name: str) -> str:
        """Map real app names to training data names"""
        mapping = {
            "Code": "VS Code",
            "Google-chrome": "Chrome",
            "focusai-app": "Chrome",
            "MongoDB Compass": "Chrome",
            "Gnome-terminal": "VS Code",
            "Gnome-control-center": "Chrome"
        }
        return mapping.get(app_name, app_name)