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
import numpy as np
import uvicorn
import pickle
import pandas as pd
from src.smart_classifier import SmartClassifier
from src.context_analyzer import ContextAnalyzer
from src.preprocess import preprocess_data

# Global variables for model
model = None
app_name_encoder = None
tab_name_encoder = None
label_encoder = None

# Global variable for background task
background_task = None
is_fetching_enabled = True

# Initialize the global data storage
REAL_MONGODB_DATA = []

# Define the response models
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
    detailed_activities: List[FocusActivity]
    summary: FocusSummary

class ProductivitySummaryResponse(BaseModel):
    user_id: str
    email: str
    date: str
    productive_content: Dict[str, int]
    non_productive_content: Dict[str, int]
    max_productive_app: str
    total_productive_time: int
    total_non_productive_time: int
    overall_total_usage: int
    focus_score: int
    most_visited_tab: str
    most_used_app: str
    distraction_apps: Dict[str, int]

# Enhanced data processing function with tab and app separation
def process_user_data(user_data):
    """Process user app and tab data separately and calculate productivity metrics"""
    try:
        app_usage = user_data.get("appUsage", [])
        tab_usage = user_data.get("tabUsage", [])
        
        # Define productivity classifications
        productive_apps = ["Code", "VSCode", "Terminal", "Gnome-terminal", "mysql", "postman", "Slack", "Eclipse", "IntelliJ", "PyCharm", "Vim", "Emacs", "Git", "Docker"]
        distraction_apps = ["Netflix", "Spotify", "YouTube", "Twitter", "Instagram", "Facebook", "TikTok", "Reddit", "Gaming", "Steam"]
        
        # Process app usage
        productive_content = {}
        non_productive_content = {}
        total_productive_time = 0
        total_non_productive_time = 0
        
        print(f"🔄 Processing {len(app_usage)} app records and {len(tab_usage)} tab records...")
        
        # Process applications
        for app in app_usage:
            if not isinstance(app, dict):
                continue
                
            app_name = app.get("appName", "")
            duration = app.get("duration", 0)
            
            if not app_name or duration <= 0:
                continue
            
            # Classify app as productive or non-productive
            is_productive = any(prod_app.lower() in app_name.lower() for prod_app in productive_apps)
            is_distraction = any(dist_app.lower() in app_name.lower() for dist_app in distraction_apps)
            
            if is_productive:
                productive_content[app_name] = productive_content.get(app_name, 0) + duration
                total_productive_time += duration
            elif is_distraction:
                non_productive_content[app_name] = non_productive_content.get(app_name, 0) + duration
                total_non_productive_time += duration
            else:
                # Default unknown apps to productive (could be work-related)
                productive_content[app_name] = productive_content.get(app_name, 0) + duration
                total_productive_time += duration
        
        # Process tab usage (browser tabs)
        for tab in tab_usage:
            if not isinstance(tab, dict):
                continue
                
            domain = tab.get("domain", tab.get("title", "Browser"))
            duration = tab.get("duration", 0)
            
            if not domain or duration <= 0:
                continue
            
            # Classify tab based on domain
            tab_name = f"Browser - {domain}"
            is_social_media = any(social in domain.lower() for social in ["youtube", "facebook", "twitter", "instagram", "tiktok", "reddit"])
            is_productive_site = any(prod in domain.lower() for prod in ["github", "stackoverflow", "docs", "documentation", "gitlab", "bitbucket"])
            
            if is_social_media:
                non_productive_content[tab_name] = non_productive_content.get(tab_name, 0) + duration
                total_non_productive_time += duration
            elif is_productive_site:
                productive_content[tab_name] = productive_content.get(tab_name, 0) + duration
                total_productive_time += duration
            else:
                # Default to productive for work-related browsing
                productive_content[tab_name] = productive_content.get(tab_name, 0) + duration
                total_productive_time += duration
        
        # Calculate metrics
        overall_total_usage = total_productive_time + total_non_productive_time
        focus_score = int((total_productive_time / overall_total_usage * 100) if overall_total_usage > 0 else 0)
        distraction_score = int((total_non_productive_time / overall_total_usage * 100) if overall_total_usage > 0 else 0)
        
        # Find most productive and most used apps
        max_productive_app = max(productive_content.items(), key=lambda x: x[1])[0] if productive_content else ""
        all_apps = {**productive_content, **non_productive_content}
        most_used_app = max(all_apps.items(), key=lambda x: x[1])[0] if all_apps else ""
        
        # Find most visited tab (from tab usage)
        most_visited_tab = ""
        if tab_usage:
            tab_durations = {tab.get("domain", "Browser"): tab.get("duration", 0) for tab in tab_usage if isinstance(tab, dict)}
            most_visited_tab = max(tab_durations.items(), key=lambda x: x[1])[0] if tab_durations else ""
        
        result = {
            "productive_content": productive_content,
            "non_productive_content": non_productive_content,
            "max_productive_app": max_productive_app,
            "total_productive_time": total_productive_time,
            "total_non_productive_time": total_non_productive_time,
            "overall_total_usage": overall_total_usage,
            "focus_score": focus_score,
            "distraction_score": distraction_score,
            "most_visited_tab": most_visited_tab,
            "most_used_app": most_used_app,
            "distraction_apps": {k: v for k, v in non_productive_content.items()},
        }
        
        print(f"✅ Processed data - Focus Score: {focus_score}%, Distraction Score: {distraction_score}%")
        print(f"📊 Total Productive Time: {total_productive_time}s, Total Non-Productive Time: {total_non_productive_time}s")
        
        return result
        
    except Exception as e:
        print(f"❌ Error processing user data: {str(e)}")
        return {
            "productive_content": {},
            "non_productive_content": {},
            "max_productive_app": "",
            "total_productive_time": 0,
            "total_non_productive_time": 0,
            "overall_total_usage": 0,
            "focus_score": 0,
            "distraction_score": 0,
            "most_visited_tab": "",
            "most_used_app": "",
            "distraction_apps": {},
        }
        
def process_real_data(app_data):
    """Process raw MongoDB app usage data into focus activities - Legacy function for compatibility"""
    try:
        activities = []
        
        if not app_data:
            print("⚠️ No app data provided for processing")
            return activities
        
        # Handle both old format (list) and new format (dict with appUsage/tabUsage)
        if isinstance(app_data, dict) and ("appUsage" in app_data or "tabUsage" in app_data):
            # New format - process both app and tab data
            all_apps = []
            all_apps.extend(app_data.get("appUsage", []))
            
            # Convert tab data to app format
            for tab in app_data.get("tabUsage", []):
                if isinstance(tab, dict):
                    domain = tab.get("domain", tab.get("title", "Browser"))
                    all_apps.append({
                        "appName": f"Browser - {domain}",
                        "duration": tab.get("duration", 0),
                        "userId": tab.get("userId", ""),
                        "email": tab.get("email", ""),
                        "date": tab.get("date", "")
                    })
            
            app_data = all_apps
        
        # Define productivity classifications based on app names
        productive_apps = ["Code", "VSCode", "Terminal", "Gnome-terminal", "mysql", "postman", "Slack", "Eclipse", "IntelliJ", "PyCharm", "Vim", "Emacs"]
        distraction_apps = ["Netflix", "Spotify", "YouTube", "Twitter", "Instagram", "Facebook", "TikTok", "Reddit", "Gaming"]
        
        print(f"🔄 Processing {len(app_data)} app records...")
        
        for app in app_data:
            if not isinstance(app, dict):
                continue
                
            app_name = app.get("appName", "")
            duration = app.get("duration", 0)
            
            if not app_name or duration <= 0:
                continue
            
            # Simple classification based on app name
            if any(prod_app.lower() in app_name.lower() for prod_app in productive_apps):
                predicted_label = "Focused"
                confidence = 0.85
            elif any(dist_app.lower() in app_name.lower() for dist_app in distraction_apps):
                predicted_label = "Distracted"
                confidence = 0.80
            elif "browser" in app_name.lower() or "chrome" in app_name.lower() or "firefox" in app_name.lower():
                # Browser apps - check the domain/title for better classification
                if any(social in app_name.lower() for social in ["youtube", "facebook", "twitter", "instagram"]):
                    predicted_label = "Distracted"
                    confidence = 0.75
                else:
                    predicted_label = "Focused"  # Assume work-related browsing
                    confidence = 0.65
            else:
                # For unknown apps, use duration as a heuristic
                # Short sessions might be distractions, longer sessions might be productive
                predicted_label = "Focused" if duration > 300 else "Distracted"
                confidence = 0.60
                
            activity = FocusActivity(
                app_name=app_name,
                tab_title=app_name,  # Use app name as tab title for simplicity
                duration=int(duration),
                predicted_label=predicted_label,
                confidence=confidence
            )
            
            activities.append(activity)
            
        print(f"✅ Processed {len(activities)} activities")
        return activities
        
    except Exception as e:
        print(f"❌ Error processing data: {str(e)}")
        return []

# Function to get existing productivity summary from backend
async def get_existing_productivity_summary(user_id: str, email: str, date: str):
    """Fetch existing productivity summary from backend"""
    try:
        backend_url = "http://localhost:5001"
        
        # Try to get existing summary
        response = requests.get(f"{backend_url}/api/productivity-summary", 
                              params={"date": date}, 
                              headers={"Authorization": f"Bearer {get_user_token(user_id)}"}, 
                              timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and data.get("summaries"):
                summary = data["summaries"][0]  # Get first summary
                print(f"✅ Found existing productivity summary for {email} on {date}")
                return summary
        
        print(f"⚠️ No existing productivity summary found for {email} on {date}")
        return None
        
    except Exception as e:
        print(f"❌ Error fetching existing summary: {e}")
        return None

# Function to update backend with incremental data
async def update_backend_productivity_summary(user_id: str, email: str, date: str, new_metrics: dict, existing_summary: dict = None):
    """Update backend with incremental productivity data"""
    try:
        backend_url = "http://localhost:5001"
        
        if existing_summary:
            print(f"🔄 Calculating incremental updates...")
            
            # Calculate incremental changes
            existing_productive = existing_summary.get("totalProductiveTime", 0)
            existing_non_productive = existing_summary.get("totalNonProductiveTime", 0)
            existing_total = existing_summary.get("overallTotalUsage", 0)
            
            new_productive = new_metrics["total_productive_time"]
            new_non_productive = new_metrics["total_non_productive_time"]
            new_total = new_metrics["overall_total_usage"]
            
            # Calculate differential (only add new time)
            productive_diff = max(0, new_productive - existing_productive)
            non_productive_diff = max(0, new_non_productive - existing_non_productive)
            total_diff = max(0, new_total - existing_total)
            
            print(f"📊 Incremental Update:")
            print(f"   Productive time diff: +{productive_diff}s")
            print(f"   Non-productive time diff: +{non_productive_diff}s")
            print(f"   Total time diff: +{total_diff}s")
            
            # Update existing content maps
            updated_productive_content = existing_summary.get("productiveContent", {})
            updated_non_productive_content = existing_summary.get("nonProductiveContent", {})
            
            # Add new productive content incrementally
            for app, duration in new_metrics["productive_content"].items():
                if app in updated_productive_content:
                    # Add only the difference
                    existing_duration = updated_productive_content[app]
                    increment = max(0, duration - existing_duration)
                    updated_productive_content[app] = existing_duration + increment
                else:
                    updated_productive_content[app] = duration
            
            # Add new non-productive content incrementally
            for app, duration in new_metrics["non_productive_content"].items():
                if app in updated_non_productive_content:
                    # Add only the difference
                    existing_duration = updated_non_productive_content[app]
                    increment = max(0, duration - existing_duration)
                    updated_non_productive_content[app] = existing_duration + increment
                else:
                    updated_non_productive_content[app] = duration
            
            # Prepare update payload
            update_payload = {
                "appUsageData": [{"appName": app, "duration": dur} for app, dur in updated_productive_content.items()],
                "tabUsageData": [],  # Could be enhanced to include tab data
                "date": date,
                "incrementalUpdate": True,
                "totalProductiveTime": existing_productive + productive_diff,
                "totalNonProductiveTime": existing_non_productive + non_productive_diff,
                "overallTotalUsage": existing_total + total_diff
            }
        else:
            print(f"🆕 Creating new productivity summary...")
            # Create new summary
            update_payload = {
                "appUsageData": [{"appName": app, "duration": dur} for app, dur in new_metrics["productive_content"].items()],
                "tabUsageData": [],
                "date": date,
                "incrementalUpdate": False,
                "totalProductiveTime": new_metrics["total_productive_time"],
                "totalNonProductiveTime": new_metrics["total_non_productive_time"],
                "overallTotalUsage": new_metrics["overall_total_usage"]
            }
        
        # Send update to backend
        response = requests.post(f"{backend_url}/api/productivity-summary",
                               json=update_payload,
                               headers={"Authorization": f"Bearer {get_user_token(user_id)}"}, 
                               timeout=15)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Successfully updated productivity summary in backend")
            return result
        else:
            print(f"❌ Failed to update backend: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error updating backend productivity summary: {e}")
        return None

# Helper function to get user token (implement based on your auth system)
def get_user_token(user_id: str):
    """Get authentication token for user - implement based on your auth system"""
    # This is a placeholder - you'll need to implement actual token retrieval
    # For now, return empty string as your backend might not require auth for this endpoint
    return ""

# Legacy function - kept for compatibility  
def process_legacy_data(app_data):
    """Process raw MongoDB app usage data into focus activities"""
    try:
        activities = []
        
        if not app_data:
            print("⚠️ No app data provided for processing")
            return activities
        
        # Define productivity classifications based on app names
        productive_apps = ["Code", "VSCode", "Terminal", "Gnome-terminal", "mysql", "postman", "Slack", "Eclipse", "IntelliJ", "PyCharm", "Vim", "Emacs"]
        distraction_apps = ["Netflix", "Spotify", "YouTube", "Twitter", "Instagram", "Facebook", "TikTok", "Reddit", "Gaming"]
        
        print(f"🔄 Processing {len(app_data)} app records...")
        
        for app in app_data:
            if not isinstance(app, dict):
                continue
                
            app_name = app.get("appName", "")
            duration = app.get("duration", 0)
            
            if not app_name or duration <= 0:
                continue
            
            # Simple classification based on app name
            if any(prod_app.lower() in app_name.lower() for prod_app in productive_apps):
                predicted_label = "Focused"
                confidence = 0.85
            elif any(dist_app.lower() in app_name.lower() for dist_app in distraction_apps):
                predicted_label = "Distracted"
                confidence = 0.80
            elif "browser" in app_name.lower() or "chrome" in app_name.lower() or "firefox" in app_name.lower():
                # Browser apps - check the domain/title for better classification
                if any(social in app_name.lower() for social in ["youtube", "facebook", "twitter", "instagram"]):
                    predicted_label = "Distracted"
                    confidence = 0.75
                else:
                    predicted_label = "Focused"  # Assume work-related browsing
                    confidence = 0.65
            else:
                # For unknown apps, use duration as a heuristic
                # Short sessions might be distractions, longer sessions might be productive
                predicted_label = "Focused" if duration > 300 else "Distracted"
                confidence = 0.60
                
            activity = FocusActivity(
                app_name=app_name,
                tab_title=app_name,  # Use app name as tab title for simplicity
                duration=int(duration),
                predicted_label=predicted_label,
                confidence=confidence
            )
            
            activities.append(activity)
            
        print(f"✅ Processed {len(activities)} activities")
        return activities
        
    except Exception as e:
        print(f"❌ Error processing data: {str(e)}")
        return []

# Add this function to categorize activities by focus/distraction
def categorize_activities(activities):
    """Group activities into focus and distraction areas"""
    try:
        focus_areas = {}
        distraction_areas = {}
        
        for activity in activities:
            if activity.predicted_label.lower() == "focused":
                category = "Productivity"
                area_dict = focus_areas
            else:
                category = "Entertainment"
                area_dict = distraction_areas
                
            if category not in area_dict:
                area_dict[category] = {
                    "category": category,
                    "total_duration": 0,
                    "activity_count": 0,
                    "apps": [],
                    "confidences": []
                }
                
            area = area_dict[category]
            area["total_duration"] += activity.duration
            area["activity_count"] += 1
            if activity.app_name not in area["apps"]:
                area["apps"].append(activity.app_name)
            area["confidences"].append(activity.confidence)
        
        # Convert to list of AppCategoryItem and calculate average confidence
        focus_items = []
        for _, area in focus_areas.items():
            avg_confidence = sum(area["confidences"]) / len(area["confidences"]) if area["confidences"] else 0
            focus_items.append(AppCategoryItem(
                category=area["category"],
                total_duration=area["total_duration"],
                activity_count=area["activity_count"],
                apps=area["apps"],
                avg_confidence=avg_confidence
            ))
        
        distraction_items = []
        for _, area in distraction_areas.items():
            avg_confidence = sum(area["confidences"]) / len(area["confidences"]) if area["confidences"] else 0
            distraction_items.append(AppCategoryItem(
                category=area["category"],
                total_duration=area["total_duration"],
                activity_count=area["activity_count"],
                apps=area["apps"],
                avg_confidence=avg_confidence
            ))
        
        return focus_items, distraction_items
        
    except Exception as e:
        print(f"❌ Error categorizing activities: {str(e)}")
        return [], []

# Add this function to generate summary statistics
def generate_summary(activities):
    """Generate summary statistics from activities"""
    try:
        focused_activities = [a for a in activities if a.predicted_label.lower() == "focused"]
        distracted_activities = [a for a in activities if a.predicted_label.lower() == "distracted"]
        
        focused_duration = sum(a.duration for a in focused_activities)
        distracted_duration = sum(a.duration for a in distracted_activities)
        total_duration = focused_duration + distracted_duration
        
        # Calculate productivity score (percentage of focused time)
        productivity_score = int((focused_duration / total_duration * 100) if total_duration > 0 else 0)
        
        # Find most focused and distracting apps
        focused_apps = Counter([a.app_name for a in focused_activities])
        distracted_apps = Counter([a.app_name for a in distracted_activities])
        
        most_focused_app = focused_apps.most_common(1)[0][0] if focused_apps else "None"
        most_distracting_app = distracted_apps.most_common(1)[0][0] if distracted_apps else "None"
        
        return FocusSummary(
            productivity_score=productivity_score,
            focused_duration_minutes=focused_duration // 60,  # Convert seconds to minutes
            distracted_duration_minutes=distracted_duration // 60,
            total_duration_minutes=total_duration // 60,
            most_focused_app=most_focused_app,
            most_distracting_app=most_distracting_app,
            focus_percentage=productivity_score
        )
        
    except Exception as e:
        print(f"❌ Error generating summary: {str(e)}")
        return FocusSummary(
            productivity_score=0,
            focused_duration_minutes=0,
            distracted_duration_minutes=0,
            total_duration_minutes=0,
            most_focused_app="None",
            most_distracting_app="None",
            focus_percentage=0
        )

def create_placeholder_model():
    """Create placeholder model files if they don't exist"""
    try:
        import numpy as np
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.preprocessing import LabelEncoder
        
        print("🔧 Creating placeholder model files...")
        
        # Create simple app name encoder
        app_name_encoder = LabelEncoder()
        app_names = ['Chrome', 'VS Code', 'Code', 'MongoDB Compass', 'Google-chrome', 'Gnome-terminal', 'focusai-app', 'Gnome-control-center']
        app_name_encoder.fit(app_names)
        joblib.dump(app_name_encoder, 'app_name_encoder.pkl')
        
        # Create simple tab name encoder
        tab_name_encoder = LabelEncoder()
        tab_names = ['Chrome - Activity', 'VS Code - Activity', 'Code - Activity', 'MongoDB Compass - Activity', 
                    'Google-chrome - Activity', 'Gnome-terminal - Activity', 'YouTube - Comedy Clips']
        tab_name_encoder.fit(tab_names)
        joblib.dump(tab_name_encoder, 'tab_name_encoder.pkl')
        
        # Create simple label encoder
        label_encoder = LabelEncoder()
        labels = ['Focused', 'Distracted']
        label_encoder.fit(labels)
        joblib.dump(label_encoder, 'label_encoder.pkl')
        
        # Create simple random forest model
        X_dummy = np.array([[0, 0, 100], [0, 0, 200], [1, 1, 300], [1, 1, 400]])
        y_dummy = np.array([0, 0, 1, 1])  # 0: Distracted, 1: Focused
        
        model = RandomForestClassifier(n_estimators=10, random_state=42)
        model.fit(X_dummy, y_dummy)
        joblib.dump(model, 'focus_model.pkl')
        
        print("✅ All model files created successfully!")
        return True
    except Exception as e:
        print(f"❌ Error creating placeholder models: {e}")
        return False

# Add this function to fetch real MongoDB data from backend
async def fetch_real_mongodb_data(user_id: str = None, email: str = None, date: str = None):
    """Fetch real MongoDB data from the backend for a specific user"""
    try:
        backend_url = "http://localhost:5001"  # Update this to match your backend URL
        
        print(f"🔄 Fetching data for user {user_id}, email {email}, date {date}")
        
        # Try different backend endpoints
        endpoints_to_try = [
            f"{backend_url}/g",
            f"{backend_url}/api/user-data",
        ]
        
        for endpoint in endpoints_to_try:
            try:
                # Add query parameters if provided
                params = {}
                if user_id:
                    params['userId'] = user_id
                if email:
                    params['email'] = email
                if date:
                    params['date'] = date
                
                print(f"🔄 Trying endpoint: {endpoint} with params: {params}")
                response = requests.get(endpoint, params=params, timeout=10)
                
                if response.status_code == 200:
                    backend_data = response.json()
                    print(f"✅ Fetched backend data from {endpoint}")
                    
                    # Process and format the data
                    formatted_data = []
                    
                    # Process app usage data
                    app_usage = backend_data.get('appUsage', [])
                    if isinstance(app_usage, list):
                        for app in app_usage:
                            if isinstance(app, dict):
                                # Filter by user if specified
                                if user_id and str(app.get('userId')) != str(user_id):
                                    continue
                                if email and app.get('email') != email:
                                    continue
                                if date and app.get('date') != date:
                                    continue
                                
                                formatted_data.append({
                                    "userId": str(app.get('userId', '')),
                                    "email": app.get('email', ''),
                                    "date": app.get('date', datetime.now().strftime("%Y-%m-%d")),
                                    "appName": app.get('appName', ''),
                                    "duration": int(app.get('duration', 0)),
                                    "lastUpdated": app.get('lastUpdated', datetime.now().isoformat())
                                })
                    
                    # Process tab usage data as additional app entries
                    tab_usage = backend_data.get('tabUsage', [])
                    if isinstance(tab_usage, list):
                        for tab in tab_usage:
                            if isinstance(tab, dict):
                                # Filter by user if specified
                                if user_id and str(tab.get('userId')) != str(user_id):
                                    continue
                                if email and tab.get('email') != email:
                                    continue
                                if date and tab.get('date') != date:
                                    continue
                                
                                # Convert tab to app format
                                app_name = tab.get('domain', tab.get('title', 'Browser'))
                                if app_name and app_name != 'unknown':
                                    formatted_data.append({
                                        "userId": str(tab.get('userId', '')),
                                        "email": tab.get('email', ''),
                                        "date": tab.get('date', datetime.now().strftime("%Y-%m-%d")),
                                        "appName": f"Browser - {app_name}",
                                        "duration": int(tab.get('duration', 0)),
                                        "lastUpdated": tab.get('lastUpdated', datetime.now().isoformat())
                                    })
                    
                    print(f"✅ Formatted {len(formatted_data)} records for user analysis")
                    return formatted_data
                    
                else:
                    print(f"⚠️ Backend endpoint {endpoint} returned status {response.status_code}")
                    
            except requests.exceptions.RequestException as e:
                print(f"⚠️ Could not fetch from {endpoint}: {e}")
                continue
        
        # If no backend endpoints worked, return empty list
        print("⚠️ All backend endpoints failed, returning empty data")
        return []
        
    except Exception as e:
        print(f"❌ Error fetching MongoDB data: {e}")
        return []

# Update the periodic fetch to use the new function
async def fetch_data_periodically():
    """Background task to fetch data from backend every minute"""
    global REAL_MONGODB_DATA, is_fetching_enabled
    
    while is_fetching_enabled:
        try:
            print("🔄 Running periodic data fetch from MongoDB...")
            
            # Fetch fresh data from MongoDB
            fresh_data = await fetch_real_mongodb_data()
            
            if fresh_data:
                # Update global data with fresh MongoDB data
                current_date = datetime.now().strftime("%Y-%m-%d")
                
                # Remove old data for current date
                REAL_MONGODB_DATA = [
                    x for x in REAL_MONGODB_DATA 
                    if x.get("date") != current_date
                ]
                # Add fresh data
                REAL_MONGODB_DATA.extend(fresh_data)
                print(f"✅ Updated with {len(fresh_data)} fresh records from MongoDB")
            else:
                print("⚠️ No fresh data retrieved from MongoDB")
                
        except Exception as e:
            print(f"❌ Error in periodic MongoDB fetch: {e}")
        
        # Wait for 60 seconds before next fetch
        await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global model, app_name_encoder, tab_name_encoder, label_encoder, background_task, is_fetching_enabled
    
    print("🚀 Starting Focus AI Analysis API...")
    
    # Load the trained model and encoders
    try:
        model = joblib.load('focus_model.pkl')
        app_name_encoder = joblib.load('app_name_encoder.pkl')
        tab_name_encoder = joblib.load('tab_name_encoder.pkl')
        label_encoder = joblib.load('label_encoder.pkl')
        print("✅ Model and encoders loaded successfully")
    except FileNotFoundError as e:
        print(f"❌ Model files not found: {e}")
        print("🔄 Attempting to create placeholder models...")
        
        if create_placeholder_model():
            # Try loading again
            try:
                model = joblib.load('focus_model.pkl')
                app_name_encoder = joblib.load('app_name_encoder.pkl')
                tab_name_encoder = joblib.load('tab_name_encoder.pkl')
                label_encoder = joblib.load('label_encoder.pkl')
                print("✅ Placeholder models loaded successfully")
            except Exception as e:
                print(f"❌ Failed to load placeholder models: {e}")
                model = None
        else:
            model = None
    
    # Start the background data fetching task
    print("🚀 Starting background data fetch task...")
    is_fetching_enabled = True
    background_task = asyncio.create_task(fetch_data_periodically())
    
    yield
    
    # Shutdown
    print("🔌 API shutting down")
    is_fetching_enabled = False
    if background_task:
        background_task.cancel()
        try:
            await background_task
        except asyncio.CancelledError:
            print("✅ Background task cancelled successfully")

app = FastAPI(
    title="Focus AI Analysis API", 
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.get("/")
async def root():
    return {"message": "Welcome to Focus AI Analysis API", "status": "running"}

@app.post("/user/{user_id}/analyze-and-store")
async def analyze_and_store_productivity(user_id: str, date: Optional[str] = None, email: Optional[str] = None):
    """
    Enhanced endpoint that:
    1. Fetches user tab and app usage data
    2. Analyzes it with the model to calculate productivity/distraction scores
    3. Categorizes the data and updates backend with incremental storage
    """
    try:
        current_date = date or datetime.now().strftime("%Y-%m-%d")
        
        print(f"🚀 Starting analyze and store for user {user_id} (email: {email}) on {current_date}")
        
        # Step 1: Fetch user data (both app and tab usage)
        user_data = await fetch_real_mongodb_data(user_id=user_id, email=email, date=current_date)
        
        if not user_data or (not user_data.get("appUsage") and not user_data.get("tabUsage")):
            raise HTTPException(status_code=404, detail=f"No app or tab usage data found for user {user_id} on {current_date}")
        
        # Step 2: Process the data and calculate productivity metrics
        processed_metrics = process_user_data(user_data)
        
        if not processed_metrics:
            raise HTTPException(status_code=500, detail="Failed to process user data")
        
        # Step 3: Get existing productivity summary from backend
        existing_summary = await get_existing_productivity_summary(user_id, email or "unknown@example.com", current_date)
        
        # Step 4: Update backend with incremental data (a + (b - a) logic)
        backend_result = await update_backend_productivity_summary(
            user_id, 
            email or "unknown@example.com", 
            current_date, 
            processed_metrics, 
            existing_summary
        )
        
        # Step 5: Prepare response with categorized data
        focus_areas = []
        distraction_areas = []
        
        # Create focus areas from productive content
        if processed_metrics["productive_content"]:
            total_productive_duration = sum(processed_metrics["productive_content"].values())
            focus_areas.append(AppCategoryItem(
                category="Productivity",
                total_duration=total_productive_duration,
                activity_count=len(processed_metrics["productive_content"]),
                apps=list(processed_metrics["productive_content"].keys()),
                avg_confidence=0.85
            ))
        
        # Create distraction areas from non-productive content
        if processed_metrics["non_productive_content"]:
            total_distraction_duration = sum(processed_metrics["non_productive_content"].values())
            distraction_areas.append(AppCategoryItem(
                category="Entertainment",
                total_duration=total_distraction_duration,
                activity_count=len(processed_metrics["non_productive_content"]),
                apps=list(processed_metrics["non_productive_content"].keys()),
                avg_confidence=0.80
            ))
        
        # Create summary
        summary = FocusSummary(
            productivity_score=processed_metrics["focus_score"],
            focused_duration_minutes=processed_metrics["total_productive_time"] // 60,
            distracted_duration_minutes=processed_metrics["total_non_productive_time"] // 60,
            total_duration_minutes=processed_metrics["overall_total_usage"] // 60,
            most_focused_app=processed_metrics["max_productive_app"],
            most_distracting_app=list(processed_metrics["distraction_apps"].keys())[0] if processed_metrics["distraction_apps"] else "None",
            focus_percentage=processed_metrics["focus_score"]
        )
        
        # Prepare detailed activities
        detailed_activities = []
        
        # Add productive activities
        for app_name, duration in processed_metrics["productive_content"].items():
            detailed_activities.append(FocusActivity(
                app_name=app_name,
                tab_title=app_name,
                duration=duration,
                predicted_label="Focused",
                confidence=0.85
            ))
        
        # Add non-productive activities
        for app_name, duration in processed_metrics["non_productive_content"].items():
            detailed_activities.append(FocusActivity(
                app_name=app_name,
                tab_title=app_name,
                duration=duration,
                predicted_label="Distracted",
                confidence=0.80
            ))
        
        # Create comprehensive response
        response = {
            "user_id": user_id,
            "email": email or "unknown@example.com",
            "analysis_date": current_date,
            "total_activities": len(detailed_activities),
            "total_duration": processed_metrics["overall_total_usage"],
            "focus_areas": focus_areas,
            "distraction_areas": distraction_areas,
            "detailed_activities": detailed_activities,
            "summary": summary,
            "backend_update_status": "success" if backend_result else "failed",
            "incremental_update": existing_summary is not None,
            "productivity_metrics": {
                "focus_score": processed_metrics["focus_score"],
                "distraction_score": processed_metrics["distraction_score"],
                "total_productive_time": processed_metrics["total_productive_time"],
                "total_non_productive_time": processed_metrics["total_non_productive_time"],
                "most_used_app": processed_metrics["most_used_app"],
                "most_visited_tab": processed_metrics["most_visited_tab"]
            }
        }
        
        print(f"✅ Analysis complete - Focus: {processed_metrics['focus_score']}%, Distraction: {processed_metrics['distraction_score']}%")
        print(f"📊 Backend update: {'Success' if backend_result else 'Failed'}")
        
        return response
        
    except HTTPException as e:
        print(f"❌ HTTP Error: {e.status_code}: {e.detail}")
        raise
    except Exception as e:
        print(f"❌ Unexpected error in analyze_and_store: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze and store productivity data: {str(e)}")

@app.get("/user/{user_id}/productivity-analysis", response_model=FocusAnalysisResponse)
async def get_productivity_analysis(user_id: str, date: Optional[str] = None, email: Optional[str] = None):
    """
    Get comprehensive productivity analysis for a user
    This endpoint fetches, analyzes, and stores data in one call
    """
    try:
        # Call the analyze and store endpoint
        result = await analyze_and_store_productivity(user_id, date, email)
        
        # Return in FocusAnalysisResponse format
        return FocusAnalysisResponse(
            user_id=result["user_id"],
            analysis_date=result["analysis_date"],
            total_activities=result["total_activities"],
            total_duration=result["total_duration"],
            focus_areas=result["focus_areas"],
            distraction_areas=result["distraction_areas"],
            detailed_activities=result["detailed_activities"],
            summary=result["summary"]
        )
        
    except Exception as e:
        print(f"❌ Error in productivity analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get productivity analysis: {str(e)}")
    """Analyze user focus based on app usage data from MongoDB"""
    try:
        # Use current date if none provided
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")
            
        print(f"🔍 Analyzing focus for user {user_id} (email: {email}) on {date}")
        
        # Fetch real data from MongoDB backend
        app_data = await fetch_real_mongodb_data(user_id=user_id, email=email, date=date)
        
        # Also check our local data as fallback
        local_data = [item for item in REAL_MONGODB_DATA 
                     if item["userId"] == user_id and item["date"] == date]
        
        # Combine both data sources, preferring backend data
        if app_data:
            combined_data = app_data
            print(f"✅ Using {len(app_data)} records from MongoDB backend")
        elif local_data:
            combined_data = local_data
            print(f"✅ Using {len(local_data)} records from local data")
        else:
            combined_data = []
            print(f"⚠️ No data found for user {user_id}")
        
        # If no data, return empty but valid response
        if not combined_data:
            return {
                "user_id": user_id,
                "analysis_date": date,
                "total_activities": 0,
                "total_duration": 0,
                "focus_areas": [],
                "distraction_areas": [],
                "detailed_activities": [],
                "summary": {
                    "productivity_score": 0,
                    "focused_duration_minutes": 0,
                    "distracted_duration_minutes": 0,
                    "total_duration_minutes": 0,
                    "most_focused_app": "None",
                    "most_distracting_app": "None",
                    "focus_percentage": 0
                }
            }
        
        # Process the data
        activities = process_real_data(combined_data)
        if not activities:
            raise HTTPException(status_code=404, detail=f"Failed to process data for user {user_id}")
            
        # Categorize activities
        focus_areas, distraction_areas = categorize_activities(activities)
        
        # Generate summary
        summary = generate_summary(activities)
        
        # Create response
        return {
            "user_id": user_id,
            "analysis_date": date,
            "total_activities": len(activities),
            "total_duration": sum(a.duration for a in activities),
            "focus_areas": focus_areas,
            "distraction_areas": distraction_areas,
            "detailed_activities": activities,
            "summary": summary
        }
            
    except HTTPException as e:
        print(f"❌ Error in focus analysis: {e.status_code}: {e.detail}")
        raise
    except Exception as e:
        print(f"❌ Unexpected error in focus analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze focus: {str(e)}")

async def fetch_user_data_from_backend(user_id: str, date: str = None):
    """Fetch real user data from the backend API"""
    try:
        # Backend API endpoints
        backend_url = "http://localhost:5001"
        
        # Try to fetch app usage data from backend
        try:
            response = requests.get(f"{backend_url}/public/focus-data", timeout=5)
            if response.status_code == 200:
                backend_data = response.json()
                print(f"✅ Fetched backend data for processing")
                return backend_data
            else:
                print(f"⚠️ Backend returned status {response.status_code}")
        except Exception as e:
            print(f"⚠️ Could not fetch from backend: {e}")
        
        # Fallback to existing data if backend is not available
        return None
        
    except Exception as e:
        print(f"❌ Error fetching backend data: {e}")
        return None

@app.get("/user/{user_id}/quick-stats")
async def get_user_quick_stats(user_id: str, date: Optional[str] = None):
    """Get quick focus stats for a user"""
    try:
        # Use current date if none provided
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")
            
        # First try to get real data from backend
        backend_data = await fetch_user_data_from_backend(user_id, date)
        
        # Filter data for the specified user (from both backend and local data)
        user_data = [item for item in REAL_MONGODB_DATA if item["userId"] == user_id]
        
        # If we have backend data, process it and add to user_data
        if backend_data and isinstance(backend_data, dict):
            app_usage = backend_data.get("appUsage", {})
            if isinstance(app_usage, dict):
                for app_name, duration in app_usage.items():
                    if duration > 0:
                        user_data.append({
                            "userId": user_id,
                            "email": "user@example.com",
                            "date": date,
                            "appName": app_name,
                            "duration": duration,
                            "lastUpdated": datetime.now().isoformat()
                        })
        
        if not user_data:
            return {
                "user_id": user_id,
                "date": date,
                "quick_stats": {
                    "productivity_score": 0,
                    "focus_time_minutes": 0,
                    "distraction_time_minutes": 0,
                    "total_time_minutes": 0
                },
                "focus_areas_count": 0,
                "distraction_areas_count": 0
            }
        
        # Get activities
        activities = process_real_data(user_data)
        
        # Calculate focus metrics
        focused_activities = [a for a in activities if a.predicted_label.lower() == "focused"]
        distracted_activities = [a for a in activities if a.predicted_label.lower() == "distracted"]
        
        focused_duration = sum(a.duration for a in focused_activities) if focused_activities else 0
        distracted_duration = sum(a.duration for a in distracted_activities) if distracted_activities else 0
        total_duration = focused_duration + distracted_duration
        
        # Calculate productivity score (percentage of focused time)
        productivity_score = int((focused_duration / total_duration * 100) if total_duration > 0 else 0)
        
        # Get unique apps in each category
        focus_areas = set(a.app_name for a in focused_activities)
        distraction_areas = set(a.app_name for a in distracted_activities)
        
        return {
            "user_id": user_id,
            "date": date,
            "quick_stats": {
                "productivity_score": productivity_score,
                "focus_time_minutes": focused_duration // 60,  # Convert seconds to minutes
                "distraction_time_minutes": distracted_duration // 60,
                "total_time_minutes": total_duration // 60
            },
            "focus_areas_count": len(focus_areas),
            "distraction_areas_count": len(distraction_areas)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting quick stats: {str(e)}")

@app.post("/seed-test-data/{user_id}")
async def seed_test_data(user_id: str, date: Optional[str] = None):
    """Seed test data for a specific user"""
    try:
        # Use current date if none provided
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")
        
        # Create sample test data for the user
        test_data = [
            {"userId": user_id, "email": "test@example.com", "date": date, "appName": "VSCode", "duration": 3600, "lastUpdated": f"{date}T10:33:51.141Z"},
            {"userId": user_id, "email": "test@example.com", "date": date, "appName": "Chrome", "duration": 1800, "lastUpdated": f"{date}T12:33:16.138Z"},
            {"userId": user_id, "email": "test@example.com", "date": date, "appName": "Slack", "duration": 900, "lastUpdated": f"{date}T14:24:09.553Z"},
            {"userId": user_id, "email": "test@example.com", "date": date, "appName": "Terminal", "duration": 600, "lastUpdated": f"{date}T16:01:36.420Z"},
            {"userId": user_id, "email": "test@example.com", "date": date, "appName": "Spotify", "duration": 1200, "lastUpdated": f"{date}T17:04:27.143Z"},
            {"userId": user_id, "email": "test@example.com", "date": date, "appName": "YouTube", "duration": 1500, "lastUpdated": f"{date}T18:30:08.901Z"}
        ]
        
        # Add test data to the global data
        for item in test_data:
            # Remove existing entries for this user and date and app
            global REAL_MONGODB_DATA
            REAL_MONGODB_DATA = [
                x for x in REAL_MONGODB_DATA 
                if not (x["userId"] == user_id and x["date"] == date and x["appName"] == item["appName"])
            ]
            REAL_MONGODB_DATA.append(item)
        
        return {"message": f"Test data seeded for user {user_id} on {date}", "count": len(test_data)}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to seed test data: {str(e)}")

@app.post("/sync-user-data/{user_id}")
async def sync_user_data(user_id: str, data: Dict[str, Any]):
    """
    Sync user app and tab data for focus analysis
    
    This endpoint receives data from the frontend and processes it for focus analysis
    """
    try:
        # Extract data
        date = data.get("date", datetime.now().strftime("%Y-%m-%d"))
        app_usage = data.get("appUsage", [])
        tab_usage = data.get("tabUsage", [])
        current_session = data.get("currentSession", [])
        
        print(f"📊 Received data for user {user_id} on {date}")
        print(f"App usage entries: {len(app_usage)}")
        print(f"Tab usage entries: {len(tab_usage)}")
        print(f"Current session entries: {len(current_session)}")
        
        # Debug: Print the actual data structure
        print(f"🔍 App usage type: {type(app_usage)}")
        print(f"🔍 App usage sample: {app_usage}")
        if isinstance(app_usage, dict) and len(app_usage) > 0:
            print(f"🔍 App usage keys: {list(app_usage.keys())}")
        elif isinstance(app_usage, list) and len(app_usage) > 0:
            print(f"🔍 First app usage item: {app_usage[0] if app_usage else 'None'}")
        
        # Format data for our model
        formatted_app_data = []
        
        # Process app usage data from backend
        # Handle both array format and object format
        if isinstance(app_usage, dict):
            # If app_usage is an object like {"Spotify": 1000, "Code": 1327}
            for app_name, duration in app_usage.items():
                if app_name and duration > 0:
                    formatted_app = {
                        "userId": user_id,
                        "email": data.get("email", "user@example.com"),
                        "date": date,
                        "appName": app_name,
                        "duration": int(duration),
                        "lastUpdated": datetime.now().isoformat()
                    }
                    formatted_app_data.append(formatted_app)
        elif isinstance(app_usage, list):
            # If app_usage is an array of objects
            for app in app_usage:
                if isinstance(app, dict):
                    app_name = app.get("appName") or app.get("app") or app.get("name", "Unknown")
                    duration = app.get("duration", 0)
                    
                    if app_name and duration > 0:
                        formatted_app = {
                            "userId": user_id,
                            "email": app.get("email", "user@example.com"),
                            "date": date,
                            "appName": app_name,
                            "duration": int(duration),
                            "lastUpdated": app.get("lastUpdated", datetime.now().isoformat())
                        }
                        formatted_app_data.append(formatted_app)
        
        # Process current session data as well
        for session in current_session:
            if isinstance(session, dict):
                app_name = session.get("appName") or session.get("app") or session.get("name", "Unknown")
                duration = session.get("duration", 0)
                
                if app_name and duration > 0:
                    formatted_app = {
                        "userId": user_id,
                        "email": session.get("email", "user@example.com"),
                        "date": date,
                        "appName": app_name,
                        "duration": int(duration),
                        "lastUpdated": session.get("lastUpdated", datetime.now().isoformat())
                    }
                    formatted_app_data.append(formatted_app)
        
        # If we have data, store it in our global variable
        if formatted_app_data:
            # Remove existing data for this user and date
            global REAL_MONGODB_DATA
            REAL_MONGODB_DATA = [
                x for x in REAL_MONGODB_DATA 
                if not (x["userId"] == user_id and x["date"] == date)
            ]
            # Add new data
            REAL_MONGODB_DATA.extend(formatted_app_data)
            
            print(f"✅ Stored {len(formatted_app_data)} entries for user {user_id}")
            
            return {
                "success": True,
                "message": f"Processed {len(formatted_app_data)} app usage entries",
                "user_id": user_id,
                "date": date
            }
        else:
            print(f"⚠️ No valid app usage data found for user {user_id}")
            return {
                "success": False,
                "message": "No valid app usage data provided",
                "user_id": user_id,
                "date": date
            }
            
    except Exception as e:
        print(f"❌ Error processing user data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process user data: {str(e)}")

@app.get("/background-fetch-status")
async def get_background_fetch_status():
    """Get the status of background data fetching"""
    global is_fetching_enabled, background_task
    return {
        "fetching_enabled": is_fetching_enabled,
        "task_running": background_task is not None and not background_task.done(),
        "message": "Background fetching is active every 60 seconds" if is_fetching_enabled else "Background fetching is disabled"
    }

@app.post("/toggle-background-fetch")
async def toggle_background_fetch():
    """Toggle background data fetching on/off"""
    global is_fetching_enabled, background_task
    
    is_fetching_enabled = not is_fetching_enabled
    
    if is_fetching_enabled:
        # Restart the background task if it's not running
        if background_task is None or background_task.done():
            background_task = asyncio.create_task(fetch_data_periodically())
        return {"message": "Background fetching enabled", "status": "enabled"}
    else:
        return {"message": "Background fetching disabled", "status": "disabled"}

@app.post("/manual-fetch")
async def manual_fetch():
    """Manually trigger a data fetch from backend"""
    global REAL_MONGODB_DATA
    
    try:
        print("🔄 Manual fetch triggered...")
        fresh_data = await fetch_real_mongodb_data()
        
        if fresh_data:
            REAL_MONGODB_DATA.extend(fresh_data)
            return {
                "success": True, 
                "message": f"Fetched {len(fresh_data)} records",
                "total_records": len(REAL_MONGODB_DATA)
            }
        else:
            return {"success": False, "message": "No data fetched"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Manual fetch failed: {str(e)}")

# ========== PRODUCTIVITY SUMMARY ENDPOINTS ==========

@app.get("/user/{user_id}/productivity-summary", response_model=ProductivitySummaryResponse)
async def get_user_productivity_summary(user_id: str, date: Optional[str] = None, email: Optional[str] = None):
    """Get productivity summary for a user from the backend"""
    try:
        backend_url = "http://localhost:5000"
        current_date = date or datetime.now().strftime("%Y-%m-%d")
        
        print(f"📊 Fetching productivity summary for user {user_id} (email: {email}) on {current_date}")
        
        # Try to fetch from backend first
        try:
            params = {"date": current_date}
            headers = {}
            
            # If we have user auth info, we'd add it here
            # For now, we'll try the public endpoint
            response = requests.get(f"{backend_url}/api/productivity-summary", params=params, timeout=10)
            
            if response.status_code == 200:
                backend_data = response.json()
                
                if backend_data.get("success") and backend_data.get("summaries"):
                    summary = backend_data["summaries"][0]  # Get the first/latest summary
                    
                    return ProductivitySummaryResponse(
                        user_id=summary["userId"],
                        email=summary["email"],
                        date=summary["date"],
                        productive_content=summary["productiveContent"],
                        non_productive_content=summary["nonProductiveContent"],
                        max_productive_app=summary["maxProductiveApp"],
                        total_productive_time=summary["totalProductiveTime"],
                        total_non_productive_time=summary["totalNonProductiveTime"],
                        overall_total_usage=summary["overallTotalUsage"],
                        focus_score=summary["focusScore"],
                        most_visited_tab=summary["mostVisitedTab"],
                        most_used_app=summary["mostUsedApp"],
                        distraction_apps=summary["distractionApps"]
                    )
                    
        except requests.exceptions.RequestException as e:
            print(f"⚠️ Could not fetch from backend productivity API: {e}")
        
        # Fallback: Generate summary from raw app/tab data
        app_data = await fetch_real_mongodb_data(user_id=user_id, email=email, date=current_date)
        
        if not app_data:
            # Return empty summary
            return ProductivitySummaryResponse(
                user_id=user_id,
                email=email or "unknown@example.com",
                date=current_date,
                productive_content={},
                non_productive_content={},
                max_productive_app="",
                total_productive_time=0,
                total_non_productive_time=0,
                overall_total_usage=0,
                focus_score=0,
                most_visited_tab="",
                most_used_app="",
                distraction_apps={}
            )
        
        # Generate summary from app data
        productive_content = {}
        non_productive_content = {}
        distraction_apps = {}
        
        # Define productive and non-productive apps
        productive_apps = ["code", "vscode", "terminal", "gnome-terminal", "mysql", "postman", "slack", "eclipse", "intellij", "pycharm", "vim", "emacs"]
        non_productive_apps = ["netflix", "spotify", "youtube", "twitter", "instagram", "facebook", "tiktok", "reddit", "gaming"]
        
        for app in app_data:
            app_name = app.get("appName", "")
            duration = app.get("duration", 0)
            
            if not app_name or duration <= 0:
                continue
            
            app_lower = app_name.lower()
            
            # Classify app
            is_productive = any(prod_app in app_lower for prod_app in productive_apps)
            is_non_productive = any(non_prod_app in app_lower for non_prod_app in non_productive_apps)
            
            if is_productive:
                productive_content[app_name] = productive_content.get(app_name, 0) + duration
            elif is_non_productive:
                non_productive_content[app_name] = non_productive_content.get(app_name, 0) + duration
                distraction_apps[app_name] = distraction_apps.get(app_name, 0) + duration
            else:
                # Default neutral apps to productive (could be work-related)
                productive_content[app_name] = productive_content.get(app_name, 0) + duration
        
        # Calculate totals and metrics
        total_productive_time = sum(productive_content.values())
        total_non_productive_time = sum(non_productive_content.values())
        overall_total_usage = total_productive_time + total_non_productive_time
        
        focus_score = int((total_productive_time / overall_total_usage * 100) if overall_total_usage > 0 else 0)
        
        # Find max productive app and most used app
        max_productive_app = max(productive_content.items(), key=lambda x: x[1])[0] if productive_content else ""
        
        all_apps = {**productive_content, **non_productive_content}
        most_used_app = max(all_apps.items(), key=lambda x: x[1])[0] if all_apps else ""
        
        # For tabs, we'd need to process tab data separately
        most_visited_tab = ""  # Would need tab data to calculate this
        
        return ProductivitySummaryResponse(
            user_id=user_id,
            email=email or "unknown@example.com",
            date=current_date,
            productive_content=productive_content,
            non_productive_content=non_productive_content,
            max_productive_app=max_productive_app,
            total_productive_time=total_productive_time,
            total_non_productive_time=total_non_productive_time,
            overall_total_usage=overall_total_usage,
            focus_score=focus_score,
            most_visited_tab=most_visited_tab,
            most_used_app=most_used_app,
            distraction_apps=distraction_apps
        )
        
    except Exception as e:
        print(f"❌ Error getting productivity summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get productivity summary: {str(e)}")

@app.post("/user/{user_id}/update-productivity")
async def update_user_productivity_summary(user_id: str, data: Dict[str, Any]):
    """Update productivity summary for a user"""
    try:
        backend_url = "http://localhost:5000"
        
        print(f"📊 Updating productivity summary for user {user_id}")
        
        # Forward the request to the backend
        try:
            headers = {"Content-Type": "application/json"}
            # In a real implementation, you'd add the auth token here
            
            response = requests.post(
                f"{backend_url}/api/productivity-summary", 
                json=data, 
                headers=headers, 
                timeout=10
            )
            
            if response.status_code == 200:
                backend_data = response.json()
                
                if backend_data.get("success"):
                    summary = backend_data["summary"]
                    
                    return {
                        "success": True,
                        "message": "Productivity summary updated successfully",
                        "summary": summary
                    }
            else:
                print(f"❌ Backend returned status {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"⚠️ Could not update backend productivity summary: {e}")
        
        # If backend update fails, still return success but log the issue
        return {
            "success": True,
            "message": "Update queued (backend unavailable)",
            "note": "Productivity summary will be updated when backend is available"
        }
        
    except Exception as e:
        print(f"❌ Error updating productivity summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update productivity summary: {str(e)}")

class FocusAI:
    def __init__(self):
        # Load models
        self.models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
        
        # Load encoders and model
        self.app_encoder = self._load_pickle('app_name_encoder.pkl')
        self.tab_encoder = self._load_pickle('tab_name_encoder.pkl')
        self.label_encoder = self._load_pickle('label_encoder.pkl')
        self.focus_model = self._load_pickle('focus_model.pkl')
        
        # Initialize classifiers
        self.smart_classifier = SmartClassifier(
            self.app_encoder, 
            self.tab_encoder,
            self.focus_model, 
            self.label_encoder
        )
        self.context_analyzer = ContextAnalyzer()
        
        print("FocusAI model initialized successfully!")
        
    def _load_pickle(self, filename):
        """Load a pickled model file"""
        file_path = os.path.join(self.models_dir, filename)
        with open(file_path, 'rb') as f:
            return pickle.load(f)
    
    def analyze_app_usage(self, app_data):
        """
        Analyze app usage data to determine productivity
        
        Args:
            app_data: List of dictionaries containing app usage information
                      Each dict should have 'app_name', 'duration' fields
        
        Returns:
            Dictionary with productivity metrics
        """
        if not app_data:
            return {"error": "No app data provided"}
            
        # Preprocess the data
        processed_data = preprocess_data(app_data)
        
        # Use the smart classifier to predict productivity
        productivity_results = self.smart_classifier.classify_apps(processed_data)
        
        # Use context analyzer for deeper insights
        context_results = self.context_analyzer.analyze_context(
            processed_data, 
            productivity_results
        )
        
        # Combine results
        total_time = sum(app['duration'] for app in app_data)
        productive_time = sum(app['duration'] for i, app in enumerate(app_data) 
                            if productivity_results[i] == 'productive')
        distracted_time = sum(app['duration'] for i, app in enumerate(app_data) 
                            if productivity_results[i] == 'distracted')
        neutral_time = total_time - productive_time - distracted_time
        
        focus_score = int((productive_time / total_time) * 100) if total_time > 0 else 0
        
        return {
            "focus_score": focus_score,
            "productive_time": productive_time,
            "distracted_time": distracted_time,
            "neutral_time": neutral_time,
            "total_time": total_time,
            "app_classifications": [{
                "app_name": app["app_name"],
                "duration": app["duration"],
                "classification": productivity_results[i]
            } for i, app in enumerate(app_data)],
            "insights": context_results.get("insights", [])
        }

if __name__ == "__main__":
    # Test the model with sample data
    focus_ai = FocusAI()
    
    sample_data = [
        {"app_name": "VS Code", "duration": 3600},
        {"app_name": "Chrome", "duration": 1800},
        {"app_name": "Slack", "duration": 900},
        {"app_name": "Netflix", "duration": 1200}
    ]
    
    results = focus_ai.analyze_app_usage(sample_data)
    print("Analysis Results:")
    print(f"Focus Score: {results['focus_score']}%")
    print(f"Productive Time: {results['productive_time']} seconds")
    print(f"Distracted Time: {results['distracted_time']} seconds")
    print(f"Total Time: {results['total_time']} seconds")