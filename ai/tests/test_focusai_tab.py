import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'trainedmodel'))
import joblib
import pandas as pd
import numpy as np
import json
from datetime import datetime
print("=" * 80)
print(" " * 25 + "FOCUSAI TAB PREDICTION TEST")
print("=" * 80)
model_dir = os.path.join(os.path.dirname(__file__), '..', 'trainedmodel')
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
app_name = "Browser"
tab_name = "focusai"
duration = 40
print(f"\n🧪 Testing prediction for:")
print(f"   App: {app_name}")
print(f"   Tab: {tab_name}")
print(f"   Duration: {duration} seconds\n")
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
prob_productive = float(probability[1])
prob_non_productive = float(probability[0])
print("=" * 80)
print(" " * 30 + "PREDICTION RESULT")
print("=" * 80)
emoji = "✅" if label == "Productive" else "❌"
print(f"\n{emoji} Prediction: {label}")
print(f"📊 Confidence: {confidence:.2%}")
print(f"\n📈 Probability Breakdown:")
print(f"   Productive:     {prob_productive:.2%}")
print(f"   Non-Productive: {prob_non_productive:.2%}")
print(f"\n⏱️  Duration: {duration} seconds ({duration_minutes:.2f} minutes)")
print(f"🕐 Current Hour: {current_hour}:00")
print("\n" + "=" * 80)
if label == "Productive":
    print("✅ FocusAI tab is classified as PRODUCTIVE!")
else:
    print("❌ FocusAI tab is classified as NON-PRODUCTIVE")
print("=" * 80)
