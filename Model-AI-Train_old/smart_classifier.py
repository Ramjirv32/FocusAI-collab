import joblib
import pandas as pd
import numpy as np
from typing import Optional, Dict, Any

class SmartFocusClassifier:
    def __init__(self):
        self.load_models()
        self.dev_tool_rules = self._setup_dev_rules()
    
    def load_models(self):
        """Load enhanced models and encoders"""
        try:
            self.model = joblib.load('enhanced_focus_model.pkl')
            self.app_encoder = joblib.load('enhanced_app_name_encoder.pkl')
            self.tab_encoder = joblib.load('enhanced_tab_name_encoder.pkl')
            self.label_encoder = joblib.load('enhanced_label_encoder.pkl')
            self.feature_columns = joblib.load('enhanced_feature_columns.pkl')
            print("✅ Enhanced models loaded successfully")
        except FileNotFoundError:
            print("⚠️  Enhanced models not found, using rule-based classification")
            self.model = None
    
    def _setup_dev_rules(self):
        """Define development tool classification rules"""
        return {
            'high_focus_apps': {
                'VS Code': 0.95, 'Code': 0.95, 'MongoDB Compass': 0.92,
                'Postman': 0.90, 'Terminal': 0.88, 'Gnome-terminal': 0.88,
                'GitHub Desktop': 0.90, 'Docker': 0.85, 'IntelliJ IDEA': 0.95
            },
            'work_browser_patterns': [
                'stack overflow', 'github', 'documentation', 'api docs',
                'tutorial', 'geeksforgeeks', 'leetcode', 'hackerrank',
                'backend', 'frontend', 'code'
            ],
            'system_tools': {
                'Gnome-control-center': 0.75,
                'System Settings': 0.75
            }
        }
    
    def create_features(self, app_name: str, tab_name: str, duration: int) -> Dict[str, Any]:
        """Create feature set for prediction"""
        # Duration-based features
        duration_log = np.log1p(duration)
        is_short = 1 if duration < 300 else 0
        is_medium = 1 if 300 <= duration < 1200 else 0
        is_long = 1 if duration >= 1200 else 0
        
        # App category features
        dev_tools = ['VS Code', 'Code', 'MongoDB Compass', 'Postman', 'Terminal', 'Gnome-terminal']
        browsers = ['Chrome', 'Google-chrome', 'Firefox', 'Edge']
        communication = ['Teams', 'Slack', 'Zoom', 'Google Meet']
        entertainment = ['Netflix', 'Instagram', 'Facebook', 'Twitter', 'TikTok']
        
        is_dev_tool = 1 if app_name in dev_tools else 0
        is_browser = 1 if app_name in browsers else 0
        is_communication = 1 if app_name in communication else 0
        is_entertainment = 1 if app_name in entertainment else 0
        
        # Content features
        work_keywords = ['code', 'api', 'tutorial', 'documentation', 'stack overflow', 'github']
        entertainment_keywords = ['memes', 'funny', 'comedy', 'reels', 'stories', 'feed']
        
        tab_lower = tab_name.lower()
        work_score = sum(1 for keyword in work_keywords if keyword in tab_lower)
        entertainment_score = sum(1 for keyword in entertainment_keywords if keyword in tab_lower)
        
        return {
            'duration_log': duration_log,
            'is_short_duration': is_short,
            'is_medium_duration': is_medium,
            'is_long_duration': is_long,
            'is_dev_tool': is_dev_tool,
            'is_browser': is_browser,
            'is_communication': is_communication,
            'is_entertainment': is_entertainment,
            'work_content_score': work_score,
            'entertainment_content_score': entertainment_score
        }
    
    def classify_with_rules(self, app_name: str, tab_name: str, duration: int) -> dict:
        """Smart classification using rules and enhanced model"""
        
        # Rule 1: High-confidence dev tools
        if app_name in self.dev_tool_rules['high_focus_apps']:
            confidence = self.dev_tool_rules['high_focus_apps'][app_name]
            if duration > 300:  # Boost for longer usage
                confidence = min(0.98, confidence + 0.03)
            return {
                'label': 'Focused',
                'confidence': confidence,
                'reason': 'Development tool'
            }
        
        # Rule 2: Work-related browser activity
        if app_name.lower() in ['chrome', 'google-chrome', 'firefox', 'edge']:
            tab_lower = tab_name.lower()
            work_score = sum(1 for pattern in self.dev_tool_rules['work_browser_patterns'] 
                           if pattern in tab_lower)
            if work_score > 0:
                confidence = min(0.95, 0.82 + (work_score * 0.04))
                return {
                    'label': 'Focused',
                    'confidence': confidence,
                    'reason': 'Work-related browsing'
                }
        
        # Rule 3: System tools with context
        if app_name in self.dev_tool_rules['system_tools']:
            if duration > 30:  # More than 30 seconds suggests actual work
                return {
                    'label': 'Focused',
                    'confidence': self.dev_tool_rules['system_tools'][app_name],
                    'reason': 'System configuration'
                }
        
        # Use enhanced model if available
        if self.model is not None:
            return self._enhanced_model_prediction(app_name, tab_name, duration)
        
        # Ultimate fallback
        return {
            'label': 'Focused' if duration > 600 else 'Distracted',
            'confidence': 0.60,
            'reason': 'Duration-based fallback'
        }
    
    def _enhanced_model_prediction(self, app_name: str, tab_name: str, duration: int) -> dict:
        """Use enhanced model for prediction"""
        try:
            # Handle unknown apps/tabs
            if app_name not in self.app_encoder.classes_:
                app_name = 'Chrome'  # Default fallback
            if tab_name not in self.tab_encoder.classes_:
                tab_name = 'General Activity'
            
            # Encode categorical features
            app_encoded = self.app_encoder.transform([app_name])[0]
            tab_encoded = self.tab_encoder.transform([tab_name])[0]
            
            # Create all features
            features = self.create_features(app_name, tab_name, duration)
            
            # Create feature vector in correct order
            feature_vector = [
                app_encoded, tab_encoded, duration,
                features['duration_log'],
                features['is_short_duration'],
                features['is_medium_duration'],
                features['is_long_duration'],
                features['is_dev_tool'],
                features['is_browser'],
                features['is_communication'],
                features['is_entertainment'],
                features['work_content_score'],
                features['entertainment_content_score']
            ]
            
            # Make prediction
            prediction = self.model.predict([feature_vector])[0]
            confidence = max(self.model.predict_proba([feature_vector])[0])
            label = self.label_encoder.inverse_transform([prediction])[0]
            
            return {
                'label': label,
                'confidence': confidence,
                'reason': 'Enhanced model prediction'
            }
            
        except Exception as e:
            print(f"Error in enhanced model prediction: {e}")
            return {
                'label': 'Focused' if duration > 300 else 'Distracted',
                'confidence': 0.65,
                'reason': 'Model error fallback'
            }

# Usage function
def create_focus_activity_smart(app_name: str, tab_title: str, duration: int, timestamp) -> Optional[Any]:
    """Enhanced focus activity creation with smart classification"""
    classifier = SmartFocusClassifier()
    
    try:
        result = classifier.classify_with_rules(app_name, tab_title, duration)
        
        return {
            'app_name': app_name,
            'tab_title': tab_title,
            'duration': duration,
            'predicted_label': result['label'],
            'confidence': round(result['confidence'], 4),
            'timestamp': timestamp if isinstance(timestamp, str) else timestamp.isoformat(),
            'classification_reason': result['reason']
        }
    except Exception as e:
        print(f"Error in smart classification: {e}")
        return None