
import joblib
import pandas as pd
import numpy as np
import json
from datetime import datetime

class ProductivityClassifier:
    def __init__(self, model_dir='productivity_model'):
        try:
            self.model = joblib.load(f'{model_dir}/xgboost_productivity_model.pkl')
            self.tfidf_app = joblib.load(f'{model_dir}/tfidf_app_vectorizer.pkl')
            self.tfidf_tab = joblib.load(f'{model_dir}/tfidf_tab_vectorizer.pkl')
            
            with open(f'{model_dir}/model_metadata.json') as f:
                self.metadata = json.load(f)
            
            print("✓ Model loaded successfully")
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            raise
    
    def predict(self, app_name, tab_name, duration):
        
        try:
            
            current_hour = datetime.now().hour
            
            
            app_tfidf = self.tfidf_app.transform([app_name]).toarray()
            app_df = pd.DataFrame(app_tfidf, columns=[f'app_{i}' for i in range(app_tfidf.shape[1])])
            
            
            tab_tfidf = self.tfidf_tab.transform([tab_name]).toarray()
            tab_df = pd.DataFrame(tab_tfidf, columns=[f'tab_{i}' for i in range(tab_tfidf.shape[1])])
            
            
            duration_minutes = duration / 60
            duration_df = pd.DataFrame({
                'duration': [duration],
                'duration_minutes': [duration_minutes],
                'duration_log': [np.log1p(duration)],
                'duration_squared': [duration ** 2],
                'duration_sqrt': [np.sqrt(duration)],
            })
            
            
            temporal_df = pd.DataFrame({
                'hour': [current_hour],
                'is_working_hours': [1 if 9 <= current_hour <= 17 else 0],
                'is_early_morning': [1 if 6 <= current_hour < 9 else 0],
                'is_late_night': [1 if current_hour >= 18 or current_hour < 6 else 0],
                'hour_sin': [np.sin(2 * np.pi * current_hour / 24)],
                'hour_cos': [np.cos(2 * np.pi * current_hour / 24)],
            })
            
            
            source_cols = [col for col in self.metadata['feature_names'] if col.startswith('source_')]
            type_cols = [col for col in self.metadata['feature_names'] if col.startswith('type_')]
            
            source_df = pd.DataFrame({col: [0] for col in source_cols})
            type_df = pd.DataFrame({col: [0] for col in type_cols})
            
            
            X_sample = pd.concat([app_df, tab_df, duration_df, temporal_df, source_df, type_df], axis=1)
            
            
            X_sample = X_sample[self.metadata['feature_names']]
            
            
            prediction = self.model.predict(X_sample)[0]
            probability = self.model.predict_proba(X_sample)[0]
            confidence = float(max(probability))
            
            label = 'Productive' if prediction == 1 else 'Non-Productive'
            
            return {
                'label': label,
                'confidence': confidence,
                'app_name': app_name,
                'tab_name': tab_name,
                'duration_minutes': round(duration_minutes, 2)
            }
        
        except Exception as e:
            return {'error': str(e)}

if __name__ == "__main__":
    print("=" * 100)
    print("PRODUCTIVITY CLASSIFIER - TEST PREDICTIONS")
    print("=" * 100 + "\n")
    
    clf = ProductivityClassifier()
    
    test_cases = [
        {"app_name": "VS Code", "tab_name": "main.py", "duration": 3600},
        {"app_name": "TikTok", "tab_name": "Trending Videos", "duration": 600},
        {"app_name": "Cursor AI", "tab_name": "Python Script Edit", "duration": 3000},
        {"app_name": "Instagram", "tab_name": "feed", "duration": 1200},
        {"app_name": "Notion", "tab_name": "Project Roadmap 2025", "duration": 2700},
        {"app_name": "Asana", "tab_name": "Task Board Q1", "duration": 1800},
        {"app_name": "YouTube", "tab_name": "Recommended", "duration": 1800},
        {"app_name": "GitHub", "tab_name": "Pull Request", "duration": 4200},
        {"app_name": "Netflix", "tab_name": "Browse", "duration": 2400},
    ]
    
    for test in test_cases:
        result = clf.predict(test['app_name'], test['tab_name'], test['duration'])
        print(f"Input:  {test}")
        print(f"Output: {result}\n")
