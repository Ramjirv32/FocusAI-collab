from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from collections import Counter
from contextlib import asynccontextmanager
import joblib
import os
import asyncio 
import requests
import json
import numpy as np
import pandas as pd
from scipy.sparse import hstack
import uvicorn
import traceback
from dotenv import load_dotenv
import re
from functools import lru_cache
from ai_provider import ai_provider
load_dotenv()
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5001')
AI_SERVICE_PORT = int(os.getenv('AI_SERVICE_PORT', '8000'))
AI_SERVICE_HOST = os.getenv('AI_SERVICE_HOST', '0.0.0.0')
print(f"🔧 Configuration loaded:")
print(f"   Backend URL: {BACKEND_URL}")
print(f"   AI Service: {AI_SERVICE_HOST}:{AI_SERVICE_PORT}")
model = None
vectorizer = None
metadata = {}
FORCE_PROD = []
FORCE_NON_PROD = []
THRESHOLD = 0.75
background_task = None
is_fetching_enabled = True
REAL_MONGODB_DATA = []
FORCE_PROD_SET = set()
FORCE_UNPROD_SET = set()
FORCE_PROD_PATTERNS = []
FORCE_UNPROD_PATTERNS = []
def prepare_optimized_lookups():
    """Convert JSON lists to optimized data structures for O(1) lookup"""
    global FORCE_PROD_SET, FORCE_UNPROD_SET, FORCE_PROD_PATTERNS, FORCE_UNPROD_PATTERNS
    FORCE_PROD_SET = {str(k).lower() for k in FORCE_PROD}
    FORCE_UNPROD_SET = {str(k).lower() for k in FORCE_NON_PROD}
    FORCE_PROD_PATTERNS = [
        re.compile(re.escape(str(k).lower())) 
        for k in FORCE_PROD 
        if '.' in str(k) or '/' in str(k)
    ]
    FORCE_UNPROD_PATTERNS = [
        re.compile(re.escape(str(k).lower())) 
        for k in FORCE_NON_PROD 
        if '.' in str(k) or '/' in str(k)
    ]
    print(f"✅ Optimized lookups: {len(FORCE_PROD_SET)} prod, {len(FORCE_UNPROD_SET)} unprod")
@lru_cache(maxsize=1000)
def smart_keyword_match(text_combined: str):
    """Ultra-fast keyword matching with smart tokenization"""
    text_lower = text_combined.lower()
    if text_lower in FORCE_PROD_SET:
        return "Productive", 0.95, [text_lower]
    if text_lower in FORCE_UNPROD_SET:
        return "Non-Productive", 0.95, [text_lower]
    url_pattern = r'(?:https?://)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?:/[^\s]*)?)'
    urls = re.findall(url_pattern, text_lower)
    prod_matches = []
    unprod_matches = []
    for url in urls:
        domain = url.split('/')[0].split(':')[0]
        if domain in FORCE_PROD_SET:
            prod_matches.append(domain)
        if domain in FORCE_UNPROD_SET:
            unprod_matches.append(domain)
        parts = domain.split('.')
        for i in range(len(parts)):
            subdomain = '.'.join(parts[i:])
            if subdomain in FORCE_PROD_SET:
                prod_matches.append(subdomain)
            if subdomain in FORCE_UNPROD_SET:
                unprod_matches.append(subdomain)
    tokens = set(re.split(r'[\s\-_\.\:\/\?\#\&\=\@]+', text_lower))
    tokens = {t for t in tokens if len(t) >= 2}
    for phrase in FORCE_PROD_SET:
        if len(phrase) > 4 and phrase in text_lower:
            if re.search(r'\b' + re.escape(phrase) + r'\b', text_lower):
                prod_matches.append(phrase)
    for phrase in FORCE_UNPROD_SET:
        if len(phrase) > 4 and phrase in text_lower:
            if re.search(r'\b' + re.escape(phrase) + r'\b', text_lower):
                unprod_matches.append(phrase)
    for token in tokens:
        if token in FORCE_PROD_SET:
            prod_matches.append(token)
        if token in FORCE_UNPROD_SET:
            unprod_matches.append(token)
    ext_pattern = r'\.([a-z0-9]{1,5})$'
    extensions = re.findall(ext_pattern, text_lower)
    for ext in extensions:
        ext_with_dot = f".{ext}"
        if ext_with_dot in FORCE_PROD_SET:
            prod_matches.append(ext_with_dot)
    if not prod_matches and not unprod_matches:
        for pattern in FORCE_PROD_PATTERNS:
            if pattern.search(text_lower):
                prod_matches.append(pattern.pattern)
                break
        for pattern in FORCE_UNPROD_PATTERNS:
            if pattern.search(text_lower):
                unprod_matches.append(pattern.pattern)
                break
    if prod_matches:
        sorted_prod = sorted(list(set(prod_matches)), key=len, reverse=True)
        confidence = 0.98 if len(prod_matches) >= 2 else 0.95
        return "Productive", confidence, sorted_prod
    if unprod_matches:
        sorted_unprod = sorted(list(set(unprod_matches)), key=len, reverse=True)
        confidence = 0.98 if len(unprod_matches) >= 2 else 0.95
        return "Non-Productive", confidence, sorted_unprod
    return None, 0, []
class FocusActivity(BaseModel):
    app_name: str
    tab_title: str
    duration: int
    predicted_label: str
    confidence: float
class AppCategoryItem(BaseModel):
    category: str
    total_duration: int
    activity_count: int
    apps: List[str]
    avg_confidence: float
class FocusSummary(BaseModel):
    productivity_score: int
    focused_duration_minutes: int
    distracted_duration_minutes: int
    total_duration_minutes: int
    most_focused_app: str
    most_distracting_app: str
    focus_percentage: int
class FocusAnalysisResponse(BaseModel):
    user_id: str
    analysis_date: str
    total_activities: int
    total_duration: int
    focus_areas: List[AppCategoryItem]
    distraction_areas: List[AppCategoryItem]
    neutral_areas: List[AppCategoryItem] = []
    detailed_activities: List[FocusActivity]
    summary: FocusSummary
class ProductivitySummaryResponse(BaseModel):
    user_id: str
    email: str
    date: str
    productive_content: Dict[str, int]
    non_productive_content: Dict[str, int]
    neutral_content: Dict[str, int] = {}
    max_productive_app: str
    total_productive_time: int
    total_non_productive_time: int
    total_neutral_time: int = 0
    overall_total_usage: int
    focus_score: int
    most_visited_tab: str
    most_used_app: str
    distraction_apps: Dict[str, int]
def _get_ml_prediction(text, duration):
    """Internal helper for ML model inference"""
    global model, vectorizer
    if model is None or vectorizer is None:
        return {"label": "Productive", "confidence": 0.5, "method": "default"}
    try:
        now = datetime.now()
        current_hour = now.hour
        is_weekend = 1 if now.weekday() >= 5 else 0
        X_text = vectorizer.transform([text])
        X_num = np.array([[duration, current_hour, is_weekend]])
        X = hstack([X_text, X_num]).tocsr()
        prob = model.predict_proba(X)[0][1]
        if prob >= THRESHOLD:
            label = "Productive"
            confidence = float(prob)
        elif prob <= (1.0 - THRESHOLD):
            label = "Non-Productive"
            confidence = float(1.0 - prob)
        else:
            label = "Productive"
            confidence = float(max(prob, 1.0 - prob))
        return {"label": label, "confidence": confidence, "method": "ml_model", "prob": prob}
    except Exception as e:
        print(f"❌ ML Prediction Error: {e}")
        return {"label": "Productive", "confidence": 0.5, "method": "error"}
def predict_with_xgboost(app_name, tab_name, duration):
    """
    Hybrid Prediction Logic:
    1. Predict using ML Model
    2. Check against Keyword JSONs (Ground Truth)
    3. Cross-reference: Keyword overrides ML if present, otherwise use ML.
    """
    app_low = str(app_name or "").lower()
    tab_low = str(tab_name or "").lower()
    text_to_predict = f"{app_low} {tab_low}".strip()
    if len(text_to_predict) < 2:
        text_to_predict = "none"
    ml_res = _get_ml_prediction(text_to_predict, duration)
    kw_label, kw_conf, kw_matches = smart_keyword_match(text_to_predict)
    if kw_label:
        if kw_label == ml_res['label']:
            print(f"✅ [STABLE] '{text_to_predict}' -> {kw_label} (AI & JSON Agree)")
            return {
                "label": kw_label,
                "confidence": max(kw_conf, ml_res['confidence']),
                "matches": kw_matches,
                "method": "ai_plus_json"
            }
        else:
            print(f"🔄 [OVERRIDE] '{text_to_predict}' -> {kw_label} (JSON overrides AI: {ml_res['label']})")
            return {
                "label": kw_label,
                "confidence": kw_conf,
                "matches": kw_matches,
                "method": "json_override"
            }
    print(f"🤖 [ML ONLY] '{text_to_predict}' -> {ml_res['label']} (Not in JSON)")
    return ml_res
def process_user_data(user_data):
    try:
        app_usage = user_data.get("appUsage", [])
        tab_usage = user_data.get("tabUsage", [])
        productive_content = {}
        non_productive_content = {}
        total_productive_time = 0
        total_non_productive_time = 0
        browsers = ["browser", "chrome", "firefox", "chromium", "brave", "edge", "safari", "opera", "vivaldi", "google-chrome"]
        has_any_tabs = any(item.get("sourceType") == "tab" for item in (app_usage + tab_usage))
        combined_data = list(app_usage)
        combined_data.extend(tab_usage)
        processed_records = []
        for app in combined_data:
            if not isinstance(app, dict): continue
            name = app.get("appName", "")
            duration = app.get("duration", 0)
            url = app.get("url", "")
            source_type = app.get("sourceType", "app")
            if not name or duration <= 0: continue
            if has_any_tabs and source_type == "app" and any(b in name.lower() for b in browsers):
                continue
            prediction = predict_with_xgboost(name, url if url and url != 'unknown' else name, duration)
            display_url = url if url and url != 'unknown' else 'N/A'
            print(f"🔍 [AI] Analyzing: {name} ({source_type}) | Link: {display_url} | Result: {prediction['label']}")
            storage_key = name
            if prediction['label'] == 'Non-Productive':
                non_productive_content[storage_key] = non_productive_content.get(storage_key, 0) + duration
                total_non_productive_time += duration
            else:
                productive_content[storage_key] = productive_content.get(storage_key, 0) + duration
                total_productive_time += duration
        overall_total_usage = total_productive_time + total_non_productive_time
        if overall_total_usage > 0:
            focus_score = int((total_productive_time / overall_total_usage) * 100)
        else:
            focus_score = 0
        distraction_score = int((total_non_productive_time / overall_total_usage * 100) if overall_total_usage > 0 else 0)
        max_productive_app = max(productive_content.items(), key=lambda x: x[1])[0] if productive_content else ""
        all_apps = {**productive_content, **non_productive_content}
        most_used_app = max(all_apps.items(), key=lambda x: x[1])[0] if all_apps else ""
        return {
            "productive_content": productive_content,
            "non_productive_content": non_productive_content,
            "max_productive_app": max_productive_app,
            "total_productive_time": total_productive_time,
            "total_non_productive_time": total_non_productive_time,
            "overall_total_usage": overall_total_usage,
            "focus_score": focus_score,
            "distraction_score": distraction_score,
            "most_visited_tab": "",
            "most_used_app": most_used_app,
            "distraction_apps": {k: v for k, v in non_productive_content.items()},
        }
    except Exception as e:
        print(f"❌ Error processing user data: {e}")
        traceback.print_exc()
        return None
def process_real_data(app_data):
    activities = []
    if not app_data: return activities
    raw_list = []
    if isinstance(app_data, dict):
        raw_list.extend(app_data.get("appUsage", []))
        raw_list.extend(app_data.get("tabUsage", []))
    else:
        raw_list = app_data
    browsers = ["browser", "chrome", "firefox", "chromium", "brave", "edge", "safari", "opera", "vivaldi", "google-chrome"]
    has_any_tabs = any(item.get("sourceType") == "tab" for item in raw_list)
    for app in raw_list:
        if not isinstance(app, dict): continue
        name = app.get("appName", "")
        duration = app.get("duration", 0)
        url = app.get("url", "")
        source_type = app.get("sourceType", "app")
        if not name or duration <= 0: continue
        if has_any_tabs and source_type == "app" and any(b in name.lower() for b in browsers):
            continue
        res = predict_with_xgboost(name, url if url and url != 'unknown' else name, duration)
        label = "Focused" if res['label'] == 'Productive' else "Distracted"
        activities.append(FocusActivity(
            app_name=name,
            tab_title=name,
            duration=int(duration),
            predicted_label=label,
            confidence=res['confidence']
        ))
    return activities
async def update_backend_productivity_summary(user_id, email, date, metrics):
    try:
        payload = {
            "userId": user_id,
            "email": email,
            "date": date,
            "productiveContent": metrics["productive_content"],
            "nonProductiveContent": metrics["non_productive_content"],
            "totalProductiveTime": metrics["total_productive_time"],
            "totalNonProductiveTime": metrics["total_non_productive_time"],
            "overallTotalUsage": metrics["overall_total_usage"],
            "focusScore": metrics["focus_score"],
            "maxProductiveApp": metrics["max_productive_app"],
            "mostUsedApp": metrics["most_used_app"]
        }
        res = requests.post(f"{BACKEND_URL}/api/internal/productivity-summary", json=payload, timeout=10)
        return res.status_code == 200
    except Exception as e:
        print(f"❌ Backend update error: {e}")
        return False
async def fetch_real_mongodb_data(user_id=None, email=None, date=None):
    params = {"userId": user_id, "email": email, "date": date}
    endpoints = [f"{BACKEND_URL}/api/internal/user-data", f"{BACKEND_URL}/api/user-data"]
    for ep in endpoints:
        try:
            res = requests.get(ep, params=params, timeout=10)
            if res.status_code == 200:
                data = res.json()
                formatted = []
                for app in data.get('appUsage', []):
                    if not isinstance(app, dict): continue
                    formatted.append({
                        "appName": app.get('appName', ''),
                        "duration": int(app.get('duration', 0)),
                        "url": app.get('url', ''),
                        "sourceType": "app",
                        "email": app.get('email', email),
                        "userId": app.get('userId', user_id),
                        "date": app.get('date', date)
                    })
                for tab in data.get('tabUsage', []):
                    if not isinstance(tab, dict): continue
                    title = tab.get('title', 'Browser')
                    url = tab.get('url', '')
                    formatted.append({
                        "appName": title,
                        "url": url,
                        "duration": int(tab.get('duration', 0)),
                        "sourceType": "tab",
                        "email": tab.get('email', email),
                        "userId": tab.get('userId', user_id),
                        "date": tab.get('date', date)
                    })
                return formatted
        except: continue
    return []
async def fetch_data_periodically():
    global REAL_MONGODB_DATA, is_fetching_enabled
    while is_fetching_enabled:
        try:
            fresh = await fetch_real_mongodb_data()
            if fresh:
                REAL_MONGODB_DATA = fresh
                print(f"✅ Synced {len(fresh)} records from MongoDB")
        except Exception as e: print(f"❌ Sync error: {e}")
        await asyncio.sleep(60)
@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, vectorizer, FORCE_PROD, FORCE_NON_PROD, background_task, metadata
    rules_dir = 'newtrained25000'
    try:
        model_path = os.path.join(rules_dir, 'xgb_productivity.pkl')
        vec_path = os.path.join(rules_dir, 'xgb_vectorizer.pkl')
        if os.path.exists(model_path) and os.path.exists(vec_path):
            model = joblib.load(model_path)
            vectorizer = joblib.load(vec_path)
            print(f"✅ NEW XGBoost model and vectorizer loaded from {rules_dir}")
        else:
            print(f"⚠️ Model files not found in {rules_dir}, checking trainedmodel...")
            model_dir = 'trainedmodel'
            model = joblib.load(f'{model_dir}/xgboost_productivity_model.pkl')
        with open(f'{rules_dir}/FORCE_PROD.json') as f: 
            FORCE_PROD = json.load(f)
            if "mongodb" not in [x.lower() for x in FORCE_PROD]: FORCE_PROD.append("mongodb")
            if "groq" not in [x.lower() for x in FORCE_PROD]: FORCE_PROD.append("groq")
            if "grok" not in [x.lower() for x in FORCE_PROD]: FORCE_PROD.append("grok")
        with open(f'{rules_dir}/FORCE_UNPROD.json') as f: 
            FORCE_NON_PROD = json.load(f)
        prepare_optimized_lookups()
        print("✅ Optimized rules and lookup structures initialized")
    except Exception as e: 
        print(f"❌ Load error: {e}")
        traceback.print_exc()
    background_task = asyncio.create_task(fetch_data_periodically())
    yield
    is_fetching_enabled = False
    if background_task: background_task.cancel()
app = FastAPI(title="Focus AI Analysis API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
@app.get("/")
async def root(): return {"message": "Focus AI API Running"}
@app.get("/predict")
async def quick_predict(app: str = "", tab: str = "", duration: int = 60):
    return {"prediction": predict_with_xgboost(app, tab, duration)}
@app.post("/user/{user_id}/analyze-and-store")
async def analyze_and_store_productivity(user_id: str, date: Optional[str] = None, email: Optional[str] = None):
    cur_date = date or datetime.now().strftime("%Y-%m-%d")
    data_list = await fetch_real_mongodb_data(user_id=user_id, email=email, date=cur_date)
    if not data_list: raise HTTPException(status_code=404, detail="No data found")
    user_data = {"appUsage": data_list}
    metrics = process_user_data(user_data)
    if not metrics: raise HTTPException(status_code=500, detail="Processing failed")
    success = await update_backend_productivity_summary(user_id, email, cur_date, metrics)
    return {"success": success, "focus_score": metrics["focus_score"]}
@app.get("/user/{user_id}/productivity-analysis", response_model=FocusAnalysisResponse)
async def get_productivity_analysis(user_id: str, date: Optional[str] = None, email: Optional[str] = None):
    cur_date = date or datetime.now().strftime("%Y-%m-%d")
    data_list = await fetch_real_mongodb_data(user_id=user_id, email=email, date=cur_date)
    activities = process_real_data(data_list)
    p_apps = [a.app_name for a in activities if a.predicted_label == "Focused"]
    d_apps = [a.app_name for a in activities if a.predicted_label == "Distracted"]
    p_dur = sum(a.duration for a in activities if a.predicted_label == "Focused")
    d_dur = sum(a.duration for a in activities if a.predicted_label == "Distracted")
    total = p_dur + d_dur
    if total > 0:
        score = int((p_dur / total) * 100)
    else:
        score = 0
    return FocusAnalysisResponse(
        user_id=user_id,
        analysis_date=cur_date,
        total_activities=len(activities),
        total_duration=total,
        focus_areas=[AppCategoryItem(category="Work", total_duration=p_dur, activity_count=len(p_apps), apps=list(set(p_apps)), avg_confidence=0.9)],
        distraction_areas=[AppCategoryItem(category="Entertainment", total_duration=d_dur, activity_count=len(d_apps), apps=list(set(d_apps)), avg_confidence=0.9)],
        neutral_areas=[],
        detailed_activities=activities,
        summary=FocusSummary(
            productivity_score=score,
            focused_duration_minutes=p_dur//60,
            distracted_duration_minutes=d_dur//60,
            total_duration_minutes=total//60,
            most_focused_app=max(set(p_apps), key=p_apps.count) if p_apps else "None",
            most_distracting_app=max(set(d_apps), key=d_apps.count) if d_apps else "None",
            focus_percentage=score
        )
    )
@app.get("/user/{user_id}/quick-stats")
async def get_user_quick_stats(user_id: str, date: Optional[str] = None):
    cur_date = date or datetime.now().strftime("%Y-%m-%d")
    data = [x for x in REAL_MONGODB_DATA if isinstance(x, dict) and str(x.get("userId")) == str(user_id) and x.get("date") == cur_date]
    activities = process_real_data(data)
    p_dur = sum(a.duration for a in activities if a.predicted_label == "Focused")
    d_dur = sum(a.duration for a in activities if a.predicted_label == "Distracted")
    total = p_dur + d_dur
    if total > 0:
        score = int((p_dur / total) * 100)
    else:
        score = 0
    return {
        "productivity_score": score,
        "total_time_minutes": total // 60,
        "activity_count": len(activities)
    }
@app.post("/seed-test-data/{user_id}")
async def seed_test_data(user_id: str):
    return {"message": "Success"}
@app.post("/sync-user-data/{user_id}")
async def sync_user_data(user_id: str, data: Dict[str, Any]):
    global REAL_MONGODB_DATA
    incoming = data.get("appUsage", [])
    if isinstance(incoming, list):
        REAL_MONGODB_DATA.extend([x for x in incoming if isinstance(x, dict)])
    elif isinstance(incoming, dict):
        pass
    return {"success": True}
@app.get("/user/{user_id}/productivity-summary", response_model=ProductivitySummaryResponse)
async def get_user_productivity_summary(user_id: str, date: Optional[str] = None, email: Optional[str] = None):
    cur_date = date or datetime.now().strftime("%Y-%m-%d")
    data_list = await fetch_real_mongodb_data(user_id=user_id, email=email, date=cur_date)
    metrics = process_user_data({"appUsage": data_list})
    if not metrics: return ProductivitySummaryResponse(user_id=user_id, email=email or "unknown", date=cur_date, 
                                                   productive_content={}, non_productive_content={}, neutral_content={},
                                                   max_productive_app="", total_productive_time=0, total_non_productive_time=0, 
                                                   total_neutral_time=0, overall_total_usage=0,
                                                   focus_score=0, most_visited_tab="", most_used_app="", distraction_apps={})
    return ProductivitySummaryResponse(
        user_id=user_id, email=email or "unknown", date=cur_date,
        productive_content=metrics["productive_content"],
        non_productive_content=metrics["non_productive_content"],
        neutral_content=metrics.get("neutral_content", {}),
        max_productive_app=metrics["max_productive_app"],
        total_productive_time=metrics["total_productive_time"],
        total_non_productive_time=metrics["total_non_productive_time"],
        total_neutral_time=metrics.get("total_neutral_time", 0),
        overall_total_usage=metrics["overall_total_usage"],
        focus_score=metrics["focus_score"],
        most_visited_tab="",
        most_used_app=metrics["most_used_app"],
        distraction_apps=metrics["distraction_apps"]
    )
from ai_provider import ai_provider
@app.post("/user/{user_id}/ai-insights")
async def get_user_ai_insights(user_id: str, email: Optional[str] = None, date: Optional[str] = None):
    cur_date = date or datetime.now().strftime("%Y-%m-%d")
    summary = await get_user_productivity_summary(user_id, email, cur_date)
    if not summary or summary.overall_total_usage == 0:
        return {"insights": "No activity data found yet."}
    context = f"Summary: Score {summary.focus_score}%, Total {summary.overall_total_usage//60}m"
    messages = [
        {"role": "system", "content": "You are a productivity expert assistant."},
        {"role": "user", "content": f"Data: {context}. Give 3 tips."}
    ]
    insights = ai_provider.create_chat_completion(messages)
    return {"insights": insights}
if __name__ == "__main__":
    uvicorn.run(app, host=AI_SERVICE_HOST, port=AI_SERVICE_PORT)