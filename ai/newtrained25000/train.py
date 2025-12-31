import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, roc_auc_score, f1_score
from scipy.sparse import hstack
import joblib
import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
DATA_FILE = "active_web_dirty.csv"
MODEL_FILE = "xgb_productivity.pkl"
VEC_FILE = "xgb_vectorizer.pkl"
THRESHOLD = 0.75
df = pd.read_csv(DATA_FILE)
df = df.sample(frac=1, random_state=42).reset_index(drop=True)
app_df = pd.DataFrame({
    "text": df["app_name"].astype(str),
    "duration": df["app_duration_seconds"],
    "hour": df["hour"],
    "is_weekend": df["is_weekend"],
    "label": df["label"]
})
url_df = pd.DataFrame({
    "text": df["tab_url"].astype(str),
    "duration": df["duration_seconds"],
    "hour": df["hour"],
    "is_weekend": df["is_weekend"],
    "label": df["label"]
})
final_df = pd.concat([app_df, url_df], ignore_index=True)
vectorizer = TfidfVectorizer(
    max_features=3000,
    stop_words="english",
    ngram_range=(1, 2)
)
X_text = vectorizer.fit_transform(final_df["text"])
X_num = final_df[["duration", "hour", "is_weekend"]].values
X = hstack([X_text, X_num]).tocsr()
y = final_df["label"]
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
model = xgb.XGBClassifier(
    n_estimators=120,
    learning_rate=0.1,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    tree_method="hist",
    n_jobs=-1,
    random_state=42,
    early_stopping_rounds=10
)
model.fit(
    X_train,
    y_train,
    eval_set=[(X_test, y_test)],
    verbose=10
)
probs = model.predict_proba(X_test)[:, 1]
preds = (probs >= THRESHOLD).astype(int)
print("\n=== METRICS ===")
print("Accuracy :", accuracy_score(y_test, preds))
print("ROC-AUC  :", roc_auc_score(y_test, probs))
print("F1 Score :", f1_score(y_test, preds))
joblib.dump(model, MODEL_FILE)
joblib.dump(vectorizer, VEC_FILE)
print("\n✅ Model & vectorizer saved successfully")
