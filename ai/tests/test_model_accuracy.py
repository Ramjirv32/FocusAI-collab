
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'trainedmodel'))

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report
import joblib
import json
from datetime import datetime

print("=" * 100)
print(" " * 30 + "MODEL ACCURACY TESTING")
print("=" * 100)

print("\n[STEP 1] LOADING TRAINED MODEL...\n")

model_dir = 'trainedmodel'

try:
    model = joblib.load(f'{model_dir}/xgboost_productivity_model.pkl')
    tfidf_app = joblib.load(f'{model_dir}/tfidf_app_vectorizer.pkl')
    tfidf_tab = joblib.load(f'{model_dir}/tfidf_tab_vectorizer.pkl')
    
    with open(f'{model_dir}/model_metadata.json') as f:
        metadata = json.load(f)
    
    print(f"✓ Model loaded successfully")
    print(f"✓ Model type: {metadata['model_type']}")
    print(f"✓ Training date: {metadata['training_date']}")
    print(f"✓ Training accuracy: {metadata['accuracy']:.4f} ({metadata['accuracy']*100:.2f}%)")
    print(f"✓ Number of features: {metadata['n_features']}")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    sys.exit(1)

print("\n[STEP 2] LOADING TEST DATASET...\n")

csv_file = f'{model_dir}/productivity_dataset_30000_UNIQUE.csv'

if not os.path.exists(csv_file):
    print(f"❌ Error: {csv_file} not found!")
    sys.exit(1)

df = pd.read_csv(csv_file)
print(f"✓ Loaded {len(df):,} rows")
print(f"✓ Productive: {(df['label'] == 1).sum():,}")
print(f"✓ Non-Productive: {(df['label'] == 0).sum():,}")

print("\n[STEP 3] PREPARING TEST DATA...\n")

X = df.copy()
y = X['label'].copy()

X = X.drop(['session_id', 'label', 'category', 'timestamp', 'date', 'day_of_week', 'unique_key', 'productivity_score'], axis=1, errors='ignore')

print("✓ Processing app_name with TF-IDF...")
app_features = tfidf_app.transform(X['app_name'].astype(str))
app_features_df = pd.DataFrame(app_features.toarray(), columns=[f'app_{i}' for i in range(app_features.shape[1])])

print("✓ Processing tab_name with TF-IDF...")
tab_features = tfidf_tab.transform(X['tab_name'].astype(str))
tab_features_df = pd.DataFrame(tab_features.toarray(), columns=[f'tab_{i}' for i in range(tab_features.shape[1])])

print("✓ Processing duration features...")
duration_features = pd.DataFrame({
    'duration': X['duration'],
    'duration_minutes': X['duration_minutes'],
    'duration_log': np.log1p(X['duration']),
    'duration_squared': X['duration'] ** 2,
    'duration_sqrt': np.sqrt(X['duration']),
})

print("✓ Processing temporal features...")
temporal_features = pd.DataFrame({
    'hour': X['hour'],
    'is_working_hours': ((X['hour'] >= 9) & (X['hour'] <= 17)).astype(int),
    'is_early_morning': ((X['hour'] >= 6) & (X['hour'] < 9)).astype(int),
    'is_late_night': ((X['hour'] >= 18) | (X['hour'] < 6)).astype(int),
})

temporal_features['hour_sin'] = np.sin(2 * np.pi * X['hour'] / 24)
temporal_features['hour_cos'] = np.cos(2 * np.pi * X['hour'] / 24)

print("✓ Processing source features...")
source_dummies = pd.get_dummies(X['source'], prefix='source')

print("✓ Processing app_type features...")
app_type_dummies = pd.get_dummies(X['app_type'], prefix='type')

X_processed = pd.concat([
    app_features_df,
    tab_features_df,
    duration_features,
    temporal_features,
    source_dummies,
    app_type_dummies
], axis=1)

for col in metadata['feature_names']:
    if col not in X_processed.columns:
        X_processed[col] = 0

X_processed = X_processed[metadata['feature_names']]

print(f"\n✓ Total features prepared: {X_processed.shape[1]}")

print("\n[STEP 4] SPLITTING DATA...\n")

X_train, X_test, y_train, y_test = train_test_split(
    X_processed, y, test_size=0.2, random_state=42, stratify=y
)

print(f"✓ Training set: {len(X_train):,} rows ({len(X_train)/len(X_processed)*100:.1f}%)")
print(f"✓ Test set: {len(X_test):,} rows ({len(X_test)/len(X_processed)*100:.1f}%)")

print("\n[STEP 5] CALCULATING ACCURACY...\n")

y_pred_train = model.predict(X_train)
y_proba_train = model.predict_proba(X_train)

y_pred_test = model.predict(X_test)
y_proba_test = model.predict_proba(X_test)

train_acc = accuracy_score(y_train, y_pred_train)
test_acc = accuracy_score(y_test, y_pred_test)
precision = precision_score(y_test, y_pred_test, zero_division=0)
recall = recall_score(y_test, y_pred_test, zero_division=0)
f1 = f1_score(y_test, y_pred_test, zero_division=0)

print("=" * 100)
print(" " * 35 + "ACCURACY RESULTS")
print("=" * 100)

print(f"\n📊 PERFORMANCE METRICS:")
print(f"   Training Accuracy: {train_acc:.4f} ({train_acc*100:.2f}%)")
print(f"   Test Accuracy:     {test_acc:.4f} ({test_acc*100:.2f}%)")
print(f"   Precision:         {precision:.4f} ({precision*100:.2f}%)")
print(f"   Recall:            {recall:.4f} ({recall*100:.2f}%)")
print(f"   F1 Score:          {f1:.4f} ({f1*100:.2f}%)")

print(f"\n📊 CONFUSION MATRIX:")
cm = confusion_matrix(y_test, y_pred_test)
print(f"   True Negatives:  {cm[0,0]:,} (Correctly predicted Non-Productive)")
print(f"   False Positives: {cm[0,1]:,} (Incorrectly predicted Productive)")
print(f"   False Negatives: {cm[1,0]:,} (Incorrectly predicted Non-Productive)")
print(f"   True Positives:  {cm[1,1]:,} (Correctly predicted Productive)")

print(f"\n📊 DETAILED CLASSIFICATION REPORT:")
print(classification_report(y_test, y_pred_test, target_names=['Non-Productive', 'Productive']))

avg_confidence_train = np.mean(np.max(y_proba_train, axis=1))
avg_confidence_test = np.mean(np.max(y_proba_test, axis=1))

print(f"\n📊 CONFIDENCE SCORES:")
print(f"   Average Training Confidence: {avg_confidence_train:.4f} ({avg_confidence_train*100:.2f}%)")
print(f"   Average Test Confidence:     {avg_confidence_test:.4f} ({avg_confidence_test*100:.2f}%)")

print("\n[STEP 7] SAMPLE PREDICTIONS (10 random test cases):\n")

sample_indices = np.random.choice(len(X_test), size=min(10, len(X_test)), replace=False)

for idx in sample_indices:
    actual = "Productive" if y_test.iloc[idx] == 1 else "Non-Productive"
    predicted = "Productive" if y_pred_test[idx] == 1 else "Non-Productive"
    confidence = np.max(y_proba_test[idx])
    match = "✓" if actual == predicted else "✗"
    
    print(f"{match} Actual: {actual:15s} | Predicted: {predicted:15s} | Confidence: {confidence:.2%}")

print("\n[STEP 8] SAVING TEST RESULTS...\n")

test_results = {
    'test_date': datetime.now().isoformat(),
    'dataset_size': len(df),
    'train_size': len(X_train),
    'test_size': len(X_test),
    'training_accuracy': float(train_acc),
    'test_accuracy': float(test_acc),
    'precision': float(precision),
    'recall': float(recall),
    'f1_score': float(f1),
    'avg_train_confidence': float(avg_confidence_train),
    'avg_test_confidence': float(avg_confidence_test),
    'confusion_matrix': {
        'true_negatives': int(cm[0,0]),
        'false_positives': int(cm[0,1]),
        'false_negatives': int(cm[1,0]),
        'true_positives': int(cm[1,1])
    }
}

with open('test_results.json', 'w') as f:
    json.dump(test_results, f, indent=2)

print(f"✓ Test results saved to: test_results.json")

print("\n" + "=" * 100)
print("✅ ACCURACY TESTING COMPLETE")
print("=" * 100)
