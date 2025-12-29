
import load_config

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
from scipy.sparse import hstack
import uvicorn
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5001')
AI_SERVICE_PORT = int(os.getenv('AI_SERVICE_PORT', '8000'))
AI_SERVICE_HOST = os.getenv('AI_SERVICE_HOST', '0.0.0.0')

print(f"🔧 Configuration loaded:")
print(f"   Backend URL: {BACKEND_URL}")
print(f"   AI Service: {AI_SERVICE_HOST}:{AI_SERVICE_PORT}")

model = None
tfidf_vectorizer = None
FORCE_PROD = []
FORCE_NON_PROD = []

background_task = None
is_fetching_enabled = True

REAL_MONGODB_DATA = []

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
    global model, tfidf_vectorizer, FORCE_PROD, FORCE_NON_PROD
    
    # Selection of text for classification
    # If it's a browser, the tab_name (URL/Title) is more descriptive
    browsers = ["browser", "chrome", "firefox", "chromium", "brave", "edge", "safari", "opera"]
    text = tab_name if any(b in app_name.lower() for b in browsers) else app_name
    
    if not text:
        return {"label": "Neutral", "confidence": 0.5}

    text_l = text.lower()
    
    if any(k.lower() in text_l for k in FORCE_NON_PROD):
        return {"label": "Non-Productive", "confidence": 0.99}
    
    if any(k.lower() in text_l for k in FORCE_PROD):
        return {"label": "Productive", "confidence": 0.99}
        
    if "youtube.com/watch" in text_l and duration >= 1800:
        return {"label": "Productive", "confidence": 0.90}

    if "wikipedia.org/wiki" in text_l and duration >= 1200:
        return {"label": "Productive", "confidence": 0.85}

    UTILITY_APPS = [
        "calculator", "notepad", "settings", 
        "control panel", "task manager", "system monitor",
        "gnome-settings", "windows settings"
    ]
    if any(u in text_l for u in UTILITY_APPS):
        if duration >= 900: # 15 minutes
            return {"label": "Productive", "confidence": 0.80}
        else:
            return {"label": "Neutral", "confidence": 0.60}

    if model is None or tfidf_vectorizer is None:
        return {"label": "Neutral", "confidence": 0.5}

    try:
        dt = datetime.now()
        hour = dt.hour
        is_weekend = 1 if dt.weekday() >= 5 else 0
        
        # 4. ML Inference
        X_text = tfidf_vectorizer.transform([text])
        X_num = np.array([[duration, hour, is_weekend]])
        X = hstack([X_text, X_num]).tocsr()

        prob = model.predict_proba(X)[0][1]
        
        if prob >= 0.75:
            label = "Productive"
            confidence = float(prob)
        elif prob <= 0.35:
            label = "Non-Productive"
            confidence = float(1.0 - prob)
        else:
            label = "Neutral"
            # Higher confidence if closer to 0.55 (the center of our neutral zone)
            confidence = float(0.5 + (0.2 - abs(prob - 0.55)))
        
        return {
            "label": label,
            "confidence": confidence
        }
    except Exception as e:
        print(f"❌ Error in XGBoost prediction: {e}")
        return {"label": "Neutral", "confidence": 0.5}

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
        
        print(f"🔄 Processing {len(app_usage)} items with XGBoost model...")
        
        for app in app_usage:
            if not isinstance(app, dict): continue
            name = app.get("appName", "")
            duration = app.get("duration", 0)
            url = app.get("url", "")
            if not name or duration <= 0: continue
            
            prediction = predict_with_xgboost(name, url if url else name, duration)
            if prediction['label'] == 'Productive':
                productive_content[name] = productive_content.get(name, 0) + duration
                total_productive_time += duration
            elif prediction['label'] == 'Non-Productive':
                non_productive_content[name] = non_productive_content.get(name, 0) + duration
                total_non_productive_time += duration
            else:
                neutral_content[name] = neutral_content.get(name, 0) + duration
                total_neutral_time += duration
                
        for tab in tab_usage:
            if not isinstance(tab, dict): continue
            domain = tab.get("domain", tab.get("title", "Browser"))
            url = tab.get("url", "")
            duration = tab.get("duration", 0)
            if not duration or duration <= 0: continue
            
            prediction = predict_with_xgboost("Browser", url if url else domain, duration)
            # Use URL as the primary identifier (given as link)
            tab_name = url if url else f"Browser - {domain}"
            
            if prediction['label'] == 'Productive':
                productive_content[tab_name] = productive_content.get(tab_name, 0) + duration
                total_productive_time += duration
            elif prediction['label'] == 'Non-Productive':
                non_productive_content[tab_name] = non_productive_content.get(tab_name, 0) + duration
                total_non_productive_time += duration
            else:
                neutral_content[tab_name] = neutral_content.get(tab_name, 0) + duration
                total_neutral_time += duration
        
        overall_total_usage = total_productive_time + total_non_productive_time + total_neutral_time
        focus_score = int((total_productive_time / overall_total_usage * 100) if overall_total_usage > 0 else 0)
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
        return None

def process_real_data(app_data):
    activities = []
    if not app_data: return activities
    
    if isinstance(app_data, dict) and ("appUsage" in app_data or "tabUsage" in app_data):
        combined = []
        combined.extend(app_data.get("appUsage", []))
        for tab in app_data.get("tabUsage", []):
            if isinstance(tab, dict):
                combined.append({
                    "appName": f"Browser - {tab.get('domain', 'Browser')}",
                    "url": tab.get("url", ""),
                    "duration": tab.get("duration", 0)
                })
        app_data = combined

    for app in app_data:
        name = app.get("appName", "")
        duration = app.get("duration", 0)
        url = app.get("url", "")
        if not name or duration <= 0: continue
        
        res = predict_with_xgboost(name, url if url else name, duration)
        label = "Focused" if res['label'] == 'Productive' else ("Distracted" if res['label'] == 'Non-Productive' else "Neutral")
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
                # Simple extraction of everything into a single list
                for app in data.get('appUsage', []):
                    if not isinstance(app, dict): continue
                    formatted.append({
                        "appName": app.get('appName', ''),
                        "duration": int(app.get('duration', 0)),
                        "url": app.get('url', ''),
                        "email": app.get('email', email),
                        "userId": app.get('userId', user_id),
                        "date": app.get('date', date)
                    })
                for tab in data.get('tabUsage', []):
                    if not isinstance(tab, dict): continue
                    domain = tab.get('domain', 'Browser')
                    formatted.append({
                        "appName": f"Browser - {domain}",
                        "url": tab.get('url', ''),
                        "duration": int(tab.get('duration', 0)),
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
    global model, tfidf_vectorizer, FORCE_PROD, FORCE_NON_PROD, background_task
    model_dir = 'newtrained25000'
    try:
        model = joblib.load(f'{model_dir}/xgb_productivity.pkl')
        tfidf_vectorizer = joblib.load(f'{model_dir}/xgb_vectorizer.pkl')
        with open(f'{model_dir}/FORCE_PROD.json') as f: FORCE_PROD = json.load(f)
        with open(f'{model_dir}/FORCE_UNPROD.json') as f: FORCE_NON_PROD = json.load(f)
        print("✅ XGBoost model and rules loaded")
    except Exception as e: print(f"❌ Load error: {e}")
    
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
    score = int(p_dur/total*100) if total > 0 else 0
    
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
    data = [x for x in REAL_MONGODB_DATA if x.get("userId") == user_id and x.get("date") == cur_date]
    activities = process_real_data(data)
    p_dur = sum(a.duration for a in activities if a.predicted_label == "Focused")
    total = sum(a.duration for a in activities)
    return {
        "productivity_score": int(p_dur/total*100) if total > 0 else 0,
        "total_time_minutes": total // 60,
        "activity_count": len(activities)
    }

@app.post("/seed-test-data/{user_id}")
async def seed_test_data(user_id: str):
    return {"message": "Success"}

@app.post("/sync-user-data/{user_id}")
async def sync_user_data(user_id: str, data: Dict[str, Any]):
    global REAL_MONGODB_DATA
    REAL_MONGODB_DATA.extend(data.get("appUsage", []))
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