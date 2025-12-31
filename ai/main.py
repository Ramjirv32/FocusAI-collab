
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
vectorizer = None # New single vectorizer
metadata = {}
FORCE_PROD = []
FORCE_NON_PROD = []
THRESHOLD = 0.75 # From new train.py

background_task = None
is_fetching_enabled = True

REAL_MONGODB_DATA = []

# Global optimized lookup structures
FORCE_PROD_SET = set()
FORCE_UNPROD_SET = set()
FORCE_PROD_PATTERNS = []
FORCE_UNPROD_PATTERNS = []

def prepare_optimized_lookups():
    """Convert JSON lists to optimized data structures for O(1) lookup"""
    global FORCE_PROD_SET, FORCE_UNPROD_SET, FORCE_PROD_PATTERNS, FORCE_UNPROD_PATTERNS
    
    # Exact match sets (O(1) lookup)
    FORCE_PROD_SET = {str(k).lower() for k in FORCE_PROD}
    FORCE_UNPROD_SET = {str(k).lower() for k in FORCE_NON_PROD}
    
    # Compile regex patterns for URL/domain matching
    FORCE_PROD_PATTERNS = [
        re.compile(re.escape(str(k).lower())) 
        for k in FORCE_PROD 
        if '.' in str(k) or '/' in str(k)  # URLs/domains only
    ]
    
    FORCE_UNPROD_PATTERNS = [
        re.compile(re.escape(str(k).lower())) 
        for k in FORCE_NON_PROD 
        if '.' in str(k) or '/' in str(k)
    ]
    
    print(f"✅ Optimized lookups: {len(FORCE_PROD_SET)} prod, {len(FORCE_UNPROD_SET)} unprod")

@lru_cache(maxsize=1000)  # Cache results for repeated queries
def smart_keyword_match(text_combined: str):
    """Ultra-fast keyword matching with smart tokenization"""
    text_lower = text_combined.lower()
    
    # 1. Exact matches (fastest - O(1))
    if text_lower in FORCE_PROD_SET:
        return "Productive", 0.95, [text_lower]
    if text_lower in FORCE_UNPROD_SET:
        return "Non-Productive", 0.95, [text_lower]
    
    # 2. Domain/URL extraction
    url_pattern = r'(?:https?://)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?:/[^\s]*)?)'
    urls = re.findall(url_pattern, text_lower)
    
    prod_matches = []
    unprod_matches = []
    
    # Check URLs first (highest priority)
    for url in urls:
        # Extract domain (strip port if present)
        domain = url.split('/')[0].split(':')[0]
        if domain in FORCE_PROD_SET:
            prod_matches.append(domain)
        if domain in FORCE_UNPROD_SET:
            unprod_matches.append(domain)
            
        # Subdomain check
        parts = domain.split('.')
        for i in range(len(parts)):
            subdomain = '.'.join(parts[i:])
            if subdomain in FORCE_PROD_SET:
                prod_matches.append(subdomain)
            if subdomain in FORCE_UNPROD_SET:
                unprod_matches.append(subdomain)
    
    # 3. Word token matching
    # Split by common separators including URL characters
    tokens = set(re.split(r'[\s\-_\.\:\/\?\#\&\=\@]+', text_lower))
    tokens = {t for t in tokens if len(t) >= 2} # Catch shorter keywords like 'ai', 'go', 'git'
    
    # Check multi-word phrases from the combined text
    # We check phrases that exist in our FORCE sets
    for phrase in FORCE_PROD_SET:
        if len(phrase) > 4 and phrase in text_lower:
            # Word boundary check to avoid partial matches
            if re.search(r'\b' + re.escape(phrase) + r'\b', text_lower):
                prod_matches.append(phrase)

    for phrase in FORCE_UNPROD_SET:
        if len(phrase) > 4 and phrase in text_lower:
            if re.search(r'\b' + re.escape(phrase) + r'\b', text_lower):
                unprod_matches.append(phrase)

    # Single word matching from tokens
    for token in tokens:
        if token in FORCE_PROD_SET:
            prod_matches.append(token)
        if token in FORCE_UNPROD_SET:
            unprod_matches.append(token)
    
    # 4. File extension matching
    ext_pattern = r'\.([a-z0-9]{1,5})$'
    extensions = re.findall(ext_pattern, text_lower)
    for ext in extensions:
        ext_with_dot = f".{ext}"
        if ext_with_dot in FORCE_PROD_SET:
            prod_matches.append(ext_with_dot)
    
    # 5. Pattern matching (last resort)
    if not prod_matches and not unprod_matches:
        for pattern in FORCE_PROD_PATTERNS:
            if pattern.search(text_lower):
                prod_matches.append(pattern.pattern)
                break
        
        for pattern in FORCE_UNPROD_PATTERNS:
            if pattern.search(text_lower):
                unprod_matches.append(pattern.pattern)
                break
    
    # Decision logic: Modified to prioritize Productivity as requested
    # If ANY productive keyword is found, it's productive (user: "if any one of works... is exists in prod... make it productive")
    if prod_matches:
        # Sort by length to get the most specific keyword first
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

def predict_with_xgboost(app_name, tab_name, duration):
    global model, vectorizer, metadata
    
    app_low = str(app_name or "").lower()
    tab_low = str(tab_name or "").lower()
    
    # Combine app and tab/title for maximum context. 
    # This prevents missing keywords when app name is generic (like "Browser" or "Terminal")
    # or when tab title is just a URL.
    text_to_predict = f"{app_low} {tab_low}".strip()
    
    # If the combined text is too short or empty, provide a fallback
    if len(text_to_predict) < 2:
        text_to_predict = "none"
    
    # 1. FAST keyword-based classification (O(1) average)
    result, confidence, matches = smart_keyword_match(text_to_predict)
    
    if result:
        print(f"🎯 [KEYWORD HIT] '{text_to_predict}' -> {result} (Matches: {matches})")
        return {
            "label": result,
            "confidence": float(confidence),
            "matches": matches,
            "method": "keyword"
        }
    
    # 2. Context-based rules (fast heuristics)
    # YouTube: educational if long duration
    if "youtube.com/watch" in text_to_predict and duration >= 1800:
        return {"label": "Productive", "confidence": 0.90, "method": "context"}
    
    # Localhost/development
    if any(x in text_to_predict for x in ["localhost", "127.0.0.1", ":3000", ":8080", ":5000"]):
        return {"label": "Productive", "confidence": 0.95, "method": "context"}
    
    # Common productivity patterns
    if any(x in text_to_predict for x in ["github.com", "stackoverflow", "docs.", "/api/", "/documentation"]):
        return {"label": "Productive", "confidence": 0.92, "method": "context"}
    
    # Common distraction patterns  
    if any(x in text_to_predict for x in ["/feed", "/shorts", "/reels", "tiktok", "instagram.com"]):
        return {"label": "Non-Productive", "confidence": 0.92, "method": "context"}
    
    # Utility apps - duration-based
    UTILITY_APPS = {"calculator", "notepad", "settings", "control panel", "task manager"}
    if any(u in text_to_predict for u in UTILITY_APPS):
        # User requested no neutral: utilities are productive
        return {"label": "Productive", "confidence": 0.70, "method": "utility"}
    
    # 3. ML Model prediction (fallback for unknown items)
    if model is None or vectorizer is None:
        print(f"⚠️ [DEFAULT] '{text_to_predict}' -> Productive (Model missing, defaulting as requested)")
        return {"label": "Productive", "confidence": 0.5, "method": "default"}

    try:
        now = datetime.now()
        current_hour = now.hour
        is_weekend = 1 if now.weekday() >= 5 else 0
        
        # Prepare features exactly as trained: [X_text, duration, hour, is_weekend]
        X_text = vectorizer.transform([text_to_predict])
        X_num = np.array([[duration, current_hour, is_weekend]])
        X = hstack([X_text, X_num]).tocsr()

        prob = model.predict_proba(X)[0][1] # Probability of being Productive
        
        if prob >= THRESHOLD:
            label = "Productive"
            confidence = float(prob)
        elif prob <= (1.0 - THRESHOLD):
            label = "Non-Productive"
            confidence = float(1.0 - prob)
        else:
            # User requested no neutral: map middle-range to Productive
            label = "Productive"
            confidence = float(max(prob, 1.0 - prob))

        print(f"🤖 [ML] '{text_to_predict}' -> {label} (Prob: {prob:.2f})")
        return {
            "label": label,
            "confidence": confidence,
            "method": "ml_model"
        }
    except Exception as e:
        print(f"❌ Error in XGBoost prediction: {e}")
        return {"label": "Neutral", "confidence": 0.5, "method": "error"}

def process_user_data(user_data):
    try:
        app_usage = user_data.get("appUsage", [])
        tab_usage = user_data.get("tabUsage", [])
        productive_content = {}
        non_productive_content = {}
        neutral_content = {}
        total_productive_time = 0
        total_non_productive_time = 0
        total_neutral_time = 0
        
        browsers = ["browser", "chrome", "firefox", "chromium", "brave", "edge", "safari", "opera", "vivaldi", "google-chrome"]
        
        # Check if we have any tabs to determine if we should skip browser app entries
        has_any_tabs = any(item.get("sourceType") == "tab" for item in (app_usage + tab_usage))
        
        # Combine them but keep track of type
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

            # Skip generic browser app shells to avoid double-counting IF we have tab data
            # If we don't have tab data, we keep the browser app entries as a fallback
            if has_any_tabs and source_type == "app" and any(b in name.lower() for b in browsers):
                continue
            
            # Include the name/title even for tabs to catch keywords (e.g., "FOCUS-AI")
            prediction = predict_with_xgboost(name, url if url and url != 'unknown' else name, duration)
            
            display_url = url if url and url != 'unknown' else 'N/A'
            print(f"🔍 [AI] Analyzing: {name} ({source_type}) | Link: {display_url} | Result: {prediction['label']}")
            
            # Use name (which is title for tabs) as storage key for display
            storage_key = name
            
            if prediction['label'] == 'Productive':
                productive_content[storage_key] = productive_content.get(storage_key, 0) + duration
                total_productive_time += duration
            elif prediction['label'] == 'Non-Productive':
                non_productive_content[storage_key] = non_productive_content.get(storage_key, 0) + duration
                total_non_productive_time += duration
            else:
                neutral_content[storage_key] = neutral_content.get(storage_key, 0) + duration
                total_neutral_time += duration
        
        overall_total_usage = total_productive_time + total_non_productive_time + total_neutral_time
        
        # Focus Score calculation: 
        # Binary focus score (No Neutral as requested)
        if overall_total_usage > 0:
            focus_score = int((total_productive_time / overall_total_usage) * 100)
        else:
            focus_score = 0
            
        distraction_score = int((total_non_productive_time / overall_total_usage * 100) if overall_total_usage > 0 else 0)
        
        max_productive_app = max(productive_content.items(), key=lambda x: x[1])[0] if productive_content else ""
        all_apps = {**productive_content, **non_productive_content, **neutral_content}
        most_used_app = max(all_apps.items(), key=lambda x: x[1])[0] if all_apps else ""
        
        return {
            "productive_content": productive_content,
            "non_productive_content": non_productive_content,
            "neutral_content": neutral_content,
            "max_productive_app": max_productive_app,
            "total_productive_time": total_productive_time,
            "total_non_productive_time": total_non_productive_time,
            "total_neutral_time": total_neutral_time,
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
    
    # Ensure it's a list for iteration
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
        
        # Deduplication
        if has_any_tabs and source_type == "app" and any(b in name.lower() for b in browsers):
            continue

        # Consistent prediction logic: Take BOTH name and URL into account
        # In process_real_data, 'name' is often the window title.
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
        # Prepare all metrics to send to the internal endpoint
        payload = {
            "userId": user_id,
            "email": email,
            "date": date,
            "productiveContent": metrics["productive_content"],
            "nonProductiveContent": metrics["non_productive_content"],
            "neutralContent": metrics.get("neutral_content", {}),
            "totalProductiveTime": metrics["total_productive_time"],
            "totalNonProductiveTime": metrics["total_non_productive_time"],
            "totalNeutralTime": metrics.get("total_neutral_time", 0),
            "overallTotalUsage": metrics["overall_total_usage"],
            "focusScore": metrics["focus_score"],
            "maxProductiveApp": metrics["max_productive_app"],
            "mostUsedApp": metrics["most_used_app"]
        }
        # Use internal endpoint which accepts pre-processed data
        res = requests.post(f"{BACKEND_URL}/api/internal/productivity-summary", json=payload, timeout=10)
        return res.status_code == 200
    except Exception as e:
        print(f"❌ Backend update error: {e}")
        return False

async def fetch_real_mongodb_data(user_id=None, email=None, date=None):
    params = {"userId": user_id, "email": email, "date": date}
    endpoints = [f"{BACKEND_URL}/api/user-data", f"{BACKEND_URL}/g"]
    for ep in endpoints:
        try:
            res = requests.get(ep, params=params, timeout=10)
            if res.status_code == 200:
                data = res.json()
                formatted = []
                # Distinguish between apps and tabs
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
    
    # Load NEW model from ai/newtrained25000
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
            # Fallback for old multi-vectorizer model if needed? 
            # Actually better to just fail if we expect the new one
            
        # Load rules
        with open(f'{rules_dir}/FORCE_PROD.json') as f: 
            FORCE_PROD = json.load(f)
            if "mongodb" not in [x.lower() for x in FORCE_PROD]: FORCE_PROD.append("mongodb")
            if "groq" not in [x.lower() for x in FORCE_PROD]: FORCE_PROD.append("groq")
            if "grok" not in [x.lower() for x in FORCE_PROD]: FORCE_PROD.append("grok")
            
        with open(f'{rules_dir}/FORCE_UNPROD.json') as f: 
            FORCE_NON_PROD = json.load(f)
        
        # Build optimized lookup structures
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
    
    # Simple aggregation for the response
    p_apps = [a.app_name for a in activities if a.predicted_label == "Focused"]
    d_apps = [a.app_name for a in activities if a.predicted_label == "Distracted"]
    n_apps = [a.app_name for a in activities if a.predicted_label == "Neutral"]
    
    p_dur = sum(a.duration for a in activities if a.predicted_label == "Focused")
    d_dur = sum(a.duration for a in activities if a.predicted_label == "Distracted")
    n_dur = sum(a.duration for a in activities if a.predicted_label == "Neutral")
    
    total = p_dur + d_dur + n_dur
    if total > 0:
        score = int(((p_dur + (n_dur * 0.5)) / total) * 100)
    else:
        score = 0
    
    return FocusAnalysisResponse(
        user_id=user_id,
        analysis_date=cur_date,
        total_activities=len(activities),
        total_duration=total,
        focus_areas=[AppCategoryItem(category="Work", total_duration=p_dur, activity_count=len(p_apps), apps=list(set(p_apps)), avg_confidence=0.9)],
        distraction_areas=[AppCategoryItem(category="Entertainment", total_duration=d_dur, activity_count=len(d_apps), apps=list(set(d_apps)), avg_confidence=0.9)],
        neutral_areas=[AppCategoryItem(category="Neutral", total_duration=n_dur, activity_count=len(n_apps), apps=list(set(n_apps)), avg_confidence=0.9)],
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
    n_dur = sum(a.duration for a in activities if a.predicted_label == "Neutral")
    
    total = p_dur + d_dur + n_dur
    
    # Match the formula used in process_user_data
    if total > 0:
        score = int(((p_dur + (n_dur * 0.5)) / total) * 100)
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
        # Handle case where it's a summary map (appName -> duration) - skip for now as we want raw data
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