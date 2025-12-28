
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

import joblib
import json
import numpy as np
import pandas as pd
from datetime import datetime

print("=" * 80)
print(" " * 25 + "XGBOOST PREDICTION TEST")
print("=" * 80)

model_dir = 'trainedmodel'
try:
    print(f"\n📦 Loading model from {model_dir}/...")
    model = joblib.load(f'{model_dir}/xgboost_productivity_model.pkl')
    tfidf_app = joblib.load(f'{model_dir}/tfidf_app_vectorizer.pkl')
    tfidf_tab = joblib.load(f'{model_dir}/tfidf_tab_vectorizer.pkl')
    
    with open(f'{model_dir}/model_metadata.json') as f:
        metadata = json.load(f)
    
    print("✅ Model loaded successfully")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    sys.exit(1)

test_cases = [
    {"app_name": "VS Code", "tab_name": "main.py", "duration": 3600},
    {"app_name": "TikTok", "tab_name": "Trending Videos", "duration": 600},
    {"app_name": "Cursor AI", "tab_name": "Python Script Edit", "duration": 3000},
    {"app_name": "Instagram", "tab_name": "feed", "duration": 1200},
    {"app_name": "Notion", "tab_name": "Project Roadmap 2025", "duration": 2700},
    {"app_name": "GitHub", "tab_name": "Pull Request", "duration": 4200},
    {"app_name": "Netflix", "tab_name": "Browse", "duration": 2400},
    {"app_name": "Slack", "tab_name": "engineering", "duration": 900},
]

print(f"\n🧪 Running {len(test_cases)} test predictions...\n")

for i, test in enumerate(test_cases, 1):
    app_name = test['app_name']
    tab_name = test['tab_name']
    duration = test['duration']
    
    
    current_hour = datetime.now().hour
    
    
    app_tfidf = tfidf_app.transform([app_name]).toarray()
    app_df_dict = {f'app_{i}': app_tfidf[0][i] for i in range(app_tfidf.shape[1])}
    
    
    tab_tfidf = tfidf_tab.transform([tab_name]).toarray()
    tab_df_dict = {f'tab_{i}': tab_tfidf[0][i] for i in range(tab_tfidf.shape[1])}
    
    
    duration_minutes = duration / 60
    duration_dict = {
        'duration': duration,
        'duration_minutes': duration_minutes,
        'duration_log': np.log1p(duration),
        'duration_squared': duration ** 2,
        'duration_sqrt': np.sqrt(duration),
    }
    
    
    temporal_dict = {
        'hour': current_hour,
        'is_working_hours': 1 if 9 <= current_hour <= 17 else 0,
        'is_early_morning': 1 if 6 <= current_hour < 9 else 0,
        'is_late_night': 1 if current_hour >= 18 or current_hour < 6 else 0,
        'hour_sin': np.sin(2 * np.pi * current_hour / 24),
        'hour_cos': np.cos(2 * np.pi * current_hour / 24),
    }
    
    
    source_cols = [col for col in metadata['feature_names'] if col.startswith('source_')]
    type_cols = [col for col in metadata['feature_names'] if col.startswith('type_')]
    
    source_dict = {col: 0 for col in source_cols}
    type_dict = {col: 0 for col in type_cols}
    
    
    features_dict = {**app_df_dict, **tab_df_dict, **duration_dict, **temporal_dict, **source_dict, **type_dict}
    
    
    X_sample = pd.DataFrame([features_dict])
    X_sample = X_sample[metadata['feature_names']]
    
    
    prediction = model.predict(X_sample)[0]
    probability = model.predict_proba(X_sample)[0]
    confidence = float(max(probability))
    
    label = 'Productive' if prediction == 1 else 'Non-Productive'
    
    
    emoji = "✅" if label == "Productive" else "❌"
    print(f"{emoji} Test {i}: {app_name:15s} → {label:15s} (Confidence: {confidence:.2%})")

print("\n" + "=" * 80)
print("✅ ALL PREDICTIONS COMPLETED SUCCESSFULLY")
print("=" * 80)
