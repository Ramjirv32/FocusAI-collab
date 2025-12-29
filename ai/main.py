
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
import numpy as np
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
tfidf_app_vectorizer = None
tfidf_tab_vectorizer = None
model_metadata = None

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

def process_user_data(user_data):
    try:
        app_usage = user_data.get("appUsage", [])
        tab_usage = user_data.get("tabUsage", [])
        productive_content = {}
        non_productive_content = {}
        total_productive_time = 0
        total_non_productive_time = 0
        print(f"🔄 Processing {len(app_usage)} app records and {len(tab_usage)} tab records with XGBoost model...")
        for app in app_usage:
            if not isinstance(app, dict):
                continue
            app_name = app.get("appName", "")
            duration = app.get("duration", 0)
            if not app_name or duration <= 0:
                continue
            prediction = predict_with_xgboost(app_name, app_name, duration)
            if prediction['label'] == 'Productive':
                productive_content[app_name] = productive_content.get(app_name, 0) + duration
                total_productive_time += duration
            else:
                non_productive_content[app_name] = non_productive_content.get(app_name, 0) + duration
                total_non_productive_time += duration
        for tab in tab_usage:
            if not isinstance(tab, dict):
                continue
            domain = tab.get("domain", tab.get("title", "Browser"))
            url = tab.get("url", "")
            duration = tab.get("duration", 0)
            if not domain or duration <= 0:
                continue
            tab_name = f"Browser - {domain}"
            # Use full URL for prediction if available, otherwise domain
            prediction = predict_with_xgboost("Browser", url if url else domain, duration)
            print(f"🔍 Tab: '{url if url else domain}' ({duration}s) → {prediction['label']} ({prediction['confidence']:.0%})")
            if prediction['label'] == 'Productive':
                productive_content[tab_name] = productive_content.get(tab_name, 0) + duration
                total_productive_time += duration
            else:
                non_productive_content[tab_name] = non_productive_content.get(tab_name, 0) + duration
                total_non_productive_time += duration
        
        
        overall_total_usage = total_productive_time + total_non_productive_time
        focus_score = int((total_productive_time / overall_total_usage * 100) if overall_total_usage > 0 else 0)
        distraction_score = int((total_non_productive_time / overall_total_usage * 100) if overall_total_usage > 0 else 0)
        
        
        max_productive_app = max(productive_content.items(), key=lambda x: x[1])[0] if productive_content else ""
        all_apps = {**productive_content, **non_productive_content}
        most_used_app = max(all_apps.items(), key=lambda x: x[1])[0] if all_apps else ""
        
        
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
        
def predict_with_xgboost(app_name, tab_name, duration):
    global model, tfidf_app_vectorizer, tfidf_tab_vectorizer, model_metadata
    
    try:
        if 'ai' in app_name.lower() or 'ai' in tab_name.lower():
            return {
                'label': 'Productive',
                'confidence': 0.95
            }
        if model is None or tfidf_app_vectorizer is None or tfidf_tab_vectorizer is None:
            
            return predict_with_rules(app_name, tab_name, duration)
        
        
        current_hour = datetime.now().hour
        
        
        app_tfidf = tfidf_app_vectorizer.transform([app_name]).toarray()
        app_df_dict = {f'app_{i}': app_tfidf[0][i] for i in range(app_tfidf.shape[1])}
        
        
        tab_tfidf = tfidf_tab_vectorizer.transform([tab_name]).toarray()
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
        
        
        source_cols = [col for col in model_metadata['feature_names'] if col.startswith('source_')]
        type_cols = [col for col in model_metadata['feature_names'] if col.startswith('type_')]
        
        source_dict = {col: 0 for col in source_cols}
        type_dict = {col: 0 for col in type_cols}
        
        
        features_dict = {**app_df_dict, **tab_df_dict, **duration_dict, **temporal_dict, **source_dict, **type_dict}
        
        
        import pandas as pd
        X_sample = pd.DataFrame([features_dict])
        X_sample = X_sample[model_metadata['feature_names']]
        
        
        prediction = model.predict(X_sample)[0]
        probability = model.predict_proba(X_sample)[0]
        confidence = float(max(probability))
        
        label = 'Productive' if prediction == 1 else 'Non-Productive'
        
        return {
            'label': label,
            'confidence': confidence
        }
    
    except Exception as e:
        print(f"❌ Error in XGBoost prediction: {e}")
        
        return predict_with_rules(app_name, tab_name, duration)

def predict_with_rules(app_name, tab_name, duration):
    # Standardize to lowercase for comparison
    app_lower = app_name.lower()
    tab_lower = tab_name.lower()

    productive_apps = [
        "Code", "VSCode", "Terminal", "Gnome-terminal", "mysql", "postman", "Slack", 
        "Eclipse", "IntelliJ", "PyCharm", "Vim", "Emacs", "Git", "Docker", "Cursor",
        "GitHub", "GitLab", "Notion", "Asana", "Jira", "Trello", "Antigravity", "FocusAI", 
        "focuai", "visual studio", "windsurf", "sublime", "android studio", "xcode",
        "chatgpt", "openai", "claude", "gemini", "copilot", "perplexity", "cohere",
        "huggingface", "midjourney", "leonardo", "runwayml", "synthesia",
        "Zoom", "Teams", "Discord", "Skype", "Telegram", "Signal", "Confluence",
        "Linear", "Monday", "Basecamp", "ClickUp", "Todoist", "Evernote",
        "OneNote", "GoogleDrive", "Dropbox", "OneDrive", "Box",
        "googledocs", "google docs", "google sheets", "google forms", "google slides",
        "docs", "documentation", "stackoverflow", "devdocs", "mdn", "w3schools",
        "educative", "coursera", "udemy", "pluralsight", "datacamp", "kaggle",
        "medium", "dev.to", "hashnode", "reddit", "quora",
        "figma", "sketch", "adobe", "photoshop", "illustrator", "xd", "procreate",
        "blender", "davinci", "premiere", "affinity", "canva", "webflow",
        "mongodb", "postgresql", "mysql", "redis", "firebase", "dynamodb",
        "elasticsearch", "grafana", "datadog", "sentry", "newrelic",
        "jenkins", "gitlab", "github", "bitbucket", "azure", "aws", "gcp",
        "gmail", "outlook", "slack", "teams", "discord", "zoom", "miro", "figma",
        "excalidraw", "lucidchart", "draw.io", "whimsical",
        "sheets", "excel", "word", "powerpoint", "keynote", "pages", "numbers",
        "obsidian", "roam", "notion", "logseq", "foam", "dendron",
        "jira", "confluence", "trello", "monday", "asana", "linear", "height",
        "vercel", "netlify", "heroku", "railway", "fly", "render",
        "insomnia", "thunderclient", "restclient", "paw", "httpie",
        "swagger", "openapi", "storybook", "chromatic",
        "jest", "pytest", "unittest", "rspec", "mocha", "jasmine",
        "cypress", "selenium", "puppeteer", "playwright",
        "lint", "prettier", "eslint", "black", "flake8", "mypy",
        "kubernetes", "kubectl", "k8s", "docker-compose", "podman", "helm",
        "terraform", "ansible", "vagrant", "cloudformation", "bicep",
        "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy", "scipy",
        "jupyter", "jupyterlab", "anaconda", "conda", "pipenv", "poetry",
        "pytorch", "keras", "fastapi", "flask", "django", "spring", "springboot",
        "node", "npm", "yarn", "pnpm", "webpack", "vite", "parcel", "gulp",
        "react", "vue", "angular", "svelte", "nextjs", "nuxt", "remix", "astro",
        "graphql", "rest", "api", "postman", "insomnia", "swagger", "apidog",
        "git", "svn", "mercurial", "perforce", "fossil", "darcs",
        "jenkins", "gitlab-ci", "github-actions", "circleci", "travis", "appveyor",
        "docker", "podman", "containerd", "rke", "aks", "eks", "gke",
        "prometheus", "grafana", "elk", "splunk", "datadog", "newrelic",
        "nginx", "apache", "tomcat", "iis", "caddy", "traefik",
        "mysql", "postgres", "mongodb", "cassandra", "dynamodb", "cosmosdb",
        "redis", "memcached", "elasticsearch", "opensearch", "solr",
        "kafka", "rabbitmq", "activemq", "zeromq", "nats", "mqtt",
        "aws", "azure", "gcp", "ibm-cloud", "alibaba", "heroku", "vercel",
        "s3", "gs-bucket", "blob-storage", "cloudfiles", "wasabi",
        "lambda", "functions", "cloud-run", "app-engine", "container-instances",
        "rds", "cloud-sql", "aurora", "cosmos", "dynamodb", "bigtable",
        "sns", "sqs", "pubsub", "eventbridge", "servicebusqueue", "topics",
        "vscode", "intellij", "pycharm", "webstorm", "clion", "rider",
        "vim", "neovim", "emacs", "nano", "gedit", "kate", "geany",
        "tmux", "screen", "zsh", "bash", "fish", "powershell",
        "htop", "top", "ps", "systemd", "supervisor", "pm2",
        "curl", "wget", "aria2", "transmission", "qbittorrent",
        "ffmpeg", "imagemagick", "ghostscript", "gifsicle", "optipng",
        "ssl", "openssl", "certbot", "letsencrypt", "vault", "consul",
        "linkedin", "slack", "ms-teams", "webex", "hangouts", "jitsi",
        "miro", "mural", "FigJam", "Excalidraw", "Lucidchart", "draw.io",
        "calendly", "clockify", "toggl", "everhour", "hubstaff", "rescuetime",
        "asana", "monday.com", "clickup", "smartsheet", "plan", "workona",
        "roam", "obsidian", "logseq", "dendron", "foam", "foam", "wiki",
        "slack", "discord", "mattermost", "rocket", "zulip", "twist",
        "stripe", "paypal", "square", "authorize", "adyen", "braintree",
        "github", "gitlab", "gitea", "gitbucket", "gogs", "bitbucket",
        "sentry", "rollbar", "bugsnag", "crashlytics", "appcenter",
        "datadog", "newrelic", "elastic-apm", "dynatrace", "appdynamics",
        "chatgpt", "bard", "claude", "gpt4", "palm", "copilot", "perplexity"
    ]
    
    distraction_apps = [
        "Netflix", "Spotify", "YouTube", "Twitter", "Instagram", "Facebook", 
        "TikTok", "Reddit", "Gaming", "Steam", "Twitch", "hulu", "disney", "prime video",
        "snapchat", "pinterest", "tumblr", "9gag", "imgur", "4chan",
        "liveleak", "pornhub", "xhamster", "onlyfans",
        "roblox", "fortnite", "valorant", "csgo", "dota", "lol", "minecraft",
        "twitch", "kick", "rumble", "dailymotion", "vimeo"
    ]
    
    productive_domains = [
        "github", "gitlab", "stackoverflow", "docs", "documentation",
        "chatgpt", "openai.com", "claude", "gemini", "copilot",
        "perplexity", "cohere", "huggingface", "kaggle",
        "coursera", "udemy", "pluralsight", "datacamp", "educative",
        "mdn", "w3schools", "devdocs", "duckduckgo", "google",
        "figma", "adobe", "jira", "confluence", "linear",
        "github", "gitlab", "bitbucket", "azure", "aws", "gcp",
        "vercel", "netlify", "heroku", "railway", "fly", "render",
        "npm", "pypi", "maven", "cargo", "nuget", "rubygems",
        "medium", "dev.to", "hashnode", "substack", "newsletter",
        "notion", "obsidian", "roam", "logseq", "evernote",
        "sheets", "excel", "airtable", "retool", "bubble",
        "docs.google.com", "sheets.google.com", "forms.google.com", "slides.google.com",
        "google", "googledocs", "googlesheets", "googleforms", "googleslides",
        "notion", "confluence", "miro", "excalidraw", "lucidchart",
        "stripe", "paypal", "square", "shopify", "woocommerce",
        "analytics", "google-analytics", "mixpanel", "amplitude",
        "slack", "teams", "discord", "zoom", "skype", "jitsi",
        "gmail", "outlook", "thunderbird", "mail",
        "kubernetes", "k8s", "docker", "helm", "terraform",
        "aws", "azure", "gcp", "heroku", "vercel", "netlify",
        "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy",
        "jupyter", "anaconda", "conda", "pipenv", "poetry",
        "node", "npm", "yarn", "pnpm", "webpack", "vite",
        "react", "vue", "angular", "svelte", "nextjs", "nuxt",
        "graphql", "rest", "api", "swagger", "openapi",
        "git", "svn", "mercurial", "fossil",
        "jenkins", "gitlab-ci", "github-actions", "circleci",
        "prometheus", "grafana", "elk", "splunk", "datadog",
        "nginx", "apache", "tomcat", "iis", "caddy",
        "mysql", "postgres", "mongodb", "cassandra", "dynamodb",
        "redis", "memcached", "elasticsearch", "opensearch",
        "kafka", "rabbitmq", "activemq", "zeromq", "nats",
        "s3", "bucket", "blob", "cloudfiles", "wasabi",
        "lambda", "functions", "cloud-run", "container",
        "rds", "cloud-sql", "aurora", "cosmos", "bigtable",
        "sns", "sqs", "pubsub", "eventbridge", "servicebusqueue",
        "vscode", "intellij", "pycharm", "webstorm", "clion",
        "vim", "emacs", "nano", "gedit", "kate",
        "tmux", "screen", "zsh", "bash", "fish",
        "htop", "top", "systemd", "supervisor", "pm2",
        "curl", "wget", "aria2", "transmission",
        "ffmpeg", "imagemagick", "ghostscript",
        "ssl", "openssl", "certbot", "letsencrypt", "vault",
        "linkedin", "slack", "teams", "webex", "jitsi",
        "miro", "mural", "figjam", "excalidraw", "lucidchart",
        "calendly", "clockify", "toggl", "everhour", "hubstaff",
        "asana", "monday", "clickup", "smartsheet",
        "roam", "obsidian", "logseq", "dendron", "foam",
        "mattermost", "rocket", "zulip", "twist",
        "paypal", "square", "authorize", "adyen", "braintree",
        "gitea", "gitbucket", "gogs",
        "sentry", "rollbar", "bugsnag", "crashlytics",
        "newrelic", "elastic", "dynatrace", "appdynamics"
    ]
    
    # Combined lists for rule-based classification
    all_productive = [a.lower() for a in productive_apps] + [d.lower() for d in productive_domains]
    all_non_productive = [a.lower() for a in distraction_apps]

    # Rule-based classification logic
    # Check if any productive keyword is in app name or tab name (URL)
    if any(keyword in app_lower for keyword in all_productive) or any(keyword in tab_lower for keyword in all_productive):
        return {
            'label': 'Productive',
            'confidence': 0.95
        }
    
    # Check if any non-productive keyword is in app name or tab name (URL)
    if any(keyword in app_lower for keyword in all_non_productive) or any(keyword in tab_lower for keyword in all_non_productive):
        return {
            'label': 'Non-Productive',
            'confidence': 0.95
        }
    
    # Check for browser-specific rules if it's a browser
    browsers = ["browser", "chrome", "firefox", "chromium", "brave", "edge", "safari", "opera"]
    if any(b in app_lower for b in browsers):
        # We already checked productive/non-productive keywords above
        # If we reach here, default to productive for browsers as they are tools
        return {
            'label': 'Productive',
            'confidence': 0.7
        }

    # Default to neutral if no rules match
    return {
        'label': 'Neutral',
        'confidence': 0.5
    }

def process_real_data(app_data):
    try:
        activities = []
        
        if not app_data:
            print("⚠️ No app data provided for processing")
            return activities
        
        
        if isinstance(app_data, dict) and ("appUsage" in app_data or "tabUsage" in app_data):
            
            all_apps = []
            all_apps.extend(app_data.get("appUsage", []))
            
            
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
        
        print(f"🔄 Processing {len(app_data)} app records with XGBoost model...")
        
        for app in app_data:
            if not isinstance(app, dict):
                continue
                
            app_name = app.get("appName", "")
            duration = app.get("duration", 0)
            
            if not app_name or duration <= 0:
                continue
            
            
            prediction_result = predict_with_xgboost(app_name, app_name, duration)
            
            predicted_label = "Focused" if prediction_result['label'] == 'Productive' else "Distracted"
            confidence = prediction_result['confidence']
                
            activity = FocusActivity(
                app_name=app_name,
                tab_title=app_name,  
                duration=int(duration),
                predicted_label=predicted_label,
                confidence=confidence
            )
            
            activities.append(activity)
            
        print(f"✅ Processed {len(activities)} activities with XGBoost model")
        return activities
        
    except Exception as e:
        print(f"❌ Error processing data: {str(e)}")
        return []

async def get_existing_productivity_summary(user_id: str, email: str, date: str):
    try:
        backend_url = BACKEND_URL
        
        
        response = requests.get(f"{backend_url}/api/productivity-summary", 
                              params={"date": date}, 
                              headers={"Authorization": f"Bearer {get_user_token(user_id)}"}, 
                              timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and data.get("summaries"):
                summary = data["summaries"][0]  
                print(f"✅ Found existing productivity summary for {email} on {date}")
                return summary
        
        print(f"⚠️ No existing productivity summary found for {email} on {date}")
        return None
        
    except Exception as e:
        print(f"❌ Error fetching existing summary: {e}")
        return None

async def update_backend_productivity_summary(user_id: str, email: str, date: str, new_metrics: dict, existing_summary: dict = None):
    try:
        backend_url = BACKEND_URL
        
        if existing_summary:
            print(f"🔄 Calculating incremental updates...")
            
            # Get existing values
            existing_productive = existing_summary.get("totalProductiveTime", 0)
            existing_non_productive = existing_summary.get("totalNonProductiveTime", 0)
            existing_total = existing_summary.get("overallTotalUsage", 0)
            
            new_productive = new_metrics["total_productive_time"]
            new_non_productive = new_metrics["total_non_productive_time"]
            new_total = new_metrics["overall_total_usage"]
            
            # Calculate incremental differences
            productive_diff = max(0, new_productive - existing_productive)
            non_productive_diff = max(0, new_non_productive - existing_non_productive)
            total_diff = max(0, new_total - existing_total)
            
            print(f"📊 Incremental Update:")
            print(f"   Productive time diff: +{productive_diff}s")
            print(f"   Non-productive time diff: +{non_productive_diff}s")
            print(f"   Total time diff: +{total_diff}s")
            
            # Merge content maps
            updated_productive_content = existing_summary.get("productiveContent", {})
            updated_non_productive_content = existing_summary.get("nonProductiveContent", {})
            
            # Update productive content
            for app, duration in new_metrics["productive_content"].items():
                if app in updated_productive_content:
                    # Calculate increment
                    existing_duration = updated_productive_content[app]
                    increment = max(0, duration - existing_duration)
                    updated_productive_content[app] = existing_duration + increment
                else:
                    updated_productive_content[app] = duration
            
            # Update non-productive content
            for app, duration in new_metrics["non_productive_content"].items():
                if app in updated_non_productive_content:
                    # Calculate increment
                    existing_duration = updated_non_productive_content[app]
                    increment = max(0, duration - existing_duration)
                    updated_non_productive_content[app] = existing_duration + increment
                else:
                    updated_non_productive_content[app] = duration
            
            # Prepare payload for incremental update
            update_payload = {
                "userId": user_id,
                "email": email,
                "appUsageData": [{"appName": app, "duration": dur} for app, dur in updated_productive_content.items()],
                "tabUsageData": [],  # Tabs are already included in appUsageData with "Browser -" prefix
                "date": date,
                "incrementalUpdate": True,
                "totalProductiveTime": existing_productive + productive_diff,
                "totalNonProductiveTime": existing_non_productive + non_productive_diff,
                "overallTotalUsage": existing_total + total_diff
            }
        else:
            print(f"🆕 Creating new productivity summary...")
            # Prepare payload for new summary
            update_payload = {
                "userId": user_id,
                "email": email,
                "appUsageData": [{"appName": app, "duration": dur} for app, dur in new_metrics["productive_content"].items()],
                "tabUsageData": [],
                "date": date,
                "incrementalUpdate": False,
                "totalProductiveTime": new_metrics["total_productive_time"],
                "totalNonProductiveTime": new_metrics["total_non_productive_time"],
                "overallTotalUsage": new_metrics["overall_total_usage"]
            }
        
        # Use the internal endpoint that doesn't require authentication
        response = requests.post(f"{backend_url}/api/internal/productivity-summary",
                               json=update_payload,
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

def get_user_token(user_id: str):
    
    
    return ""

def process_legacy_data(app_data):
    try:
        activities = []
        
        if not app_data:
            print("⚠️ No app data provided for processing")
            return activities
        
        productive_apps = [
            "Code", "VSCode", "Terminal", "Gnome-terminal", "mysql", "postman", "Slack", 
            "Eclipse", "IntelliJ", "PyCharm", "Vim", "Emacs", "Git", "Docker", "Cursor",
            "GitHub", "GitLab", "Notion", "Asana", "Jira", "Trello", "Antigravity", "FocusAI", 
            "focuai", "visual studio", "windsurf", "sublime", "android studio", "xcode",
            "chatgpt", "openai", "claude", "gemini", "copilot", "perplexity", "cohere",
            "huggingface", "midjourney", "leonardo", "runwayml", "synthesia",
            "Zoom", "Teams", "Discord", "Skype", "Telegram", "Signal", "Confluence",
            "Linear", "Monday", "Basecamp", "ClickUp", "Todoist", "Evernote",
            "OneNote", "GoogleDrive", "Dropbox", "OneDrive", "Box",
            "googledocs", "google docs", "google sheets", "google forms", "google slides",
            "docs", "documentation", "stackoverflow", "devdocs", "mdn", "w3schools",
            "educative", "coursera", "udemy", "pluralsight", "datacamp", "kaggle",
            "medium", "dev.to", "hashnode", "reddit", "quora",
            "figma", "sketch", "adobe", "photoshop", "illustrator", "xd", "procreate",
            "blender", "davinci", "premiere", "affinity", "canva", "webflow",
            "mongodb", "postgresql", "mysql", "redis", "firebase", "dynamodb",
            "elasticsearch", "grafana", "datadog", "sentry", "newrelic",
            "jenkins", "gitlab", "github", "bitbucket", "azure", "aws", "gcp",
            "gmail", "outlook", "slack", "teams", "discord", "zoom", "miro", "figma",
            "excalidraw", "lucidchart", "draw.io", "whimsical",
            "sheets", "excel", "word", "powerpoint", "keynote", "pages", "numbers",
            "obsidian", "roam", "notion", "logseq", "foam", "dendron",
            "jira", "confluence", "trello", "monday", "asana", "linear", "height",
            "vercel", "netlify", "heroku", "railway", "fly", "render",
            "insomnia", "thunderclient", "restclient", "paw", "httpie",
            "swagger", "openapi", "storybook", "chromatic",
            "jest", "pytest", "unittest", "rspec", "mocha", "jasmine",
            "cypress", "selenium", "puppeteer", "playwright",
            "lint", "prettier", "eslint", "black", "flake8", "mypy",
            "kubernetes", "kubectl", "k8s", "docker-compose", "podman", "helm",
            "terraform", "ansible", "vagrant", "cloudformation", "bicep",
            "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy", "scipy",
            "jupyter", "jupyterlab", "anaconda", "conda", "pipenv", "poetry",
            "pytorch", "keras", "fastapi", "flask", "django", "spring", "springboot",
            "node", "npm", "yarn", "pnpm", "webpack", "vite", "parcel", "gulp",
            "react", "vue", "angular", "svelte", "nextjs", "nuxt", "remix", "astro",
            "graphql", "rest", "api", "postman", "insomnia", "swagger", "apidog",
            "git", "svn", "mercurial", "perforce", "fossil", "darcs",
            "jenkins", "gitlab-ci", "github-actions", "circleci", "travis", "appveyor",
            "docker", "podman", "containerd", "rke", "aks", "eks", "gke",
            "prometheus", "grafana", "elk", "splunk", "datadog", "newrelic",
            "nginx", "apache", "tomcat", "iis", "caddy", "traefik",
            "mysql", "postgres", "mongodb", "cassandra", "dynamodb", "cosmosdb",
            "redis", "memcached", "elasticsearch", "opensearch", "solr",
            "kafka", "rabbitmq", "activemq", "zeromq", "nats", "mqtt",
            "aws", "azure", "gcp", "ibm-cloud", "alibaba", "heroku", "vercel",
            "s3", "gs-bucket", "blob-storage", "cloudfiles", "wasabi",
            "lambda", "functions", "cloud-run", "app-engine", "container-instances",
            "rds", "cloud-sql", "aurora", "cosmos", "dynamodb", "bigtable",
            "sns", "sqs", "pubsub", "eventbridge", "servicebusqueue", "topics",
            "vscode", "intellij", "pycharm", "webstorm", "clion", "rider",
            "vim", "neovim", "emacs", "nano", "gedit", "kate", "geany",
            "tmux", "screen", "zsh", "bash", "fish", "powershell",
            "htop", "top", "ps", "systemd", "supervisor", "pm2",
            "curl", "wget", "aria2", "transmission", "qbittorrent",
            "ffmpeg", "imagemagick", "ghostscript", "gifsicle", "optipng",
            "ssl", "openssl", "certbot", "letsencrypt", "vault", "consul",
            "linkedin", "slack", "ms-teams", "webex", "hangouts", "jitsi",
            "miro", "mural", "FigJam", "Excalidraw", "Lucidchart", "draw.io",
            "calendly", "clockify", "toggl", "everhour", "hubstaff", "rescuetime",
            "asana", "monday.com", "clickup", "smartsheet", "plan", "workona",
            "roam", "obsidian", "logseq", "dendron", "foam", "foam", "wiki",
            "slack", "discord", "mattermost", "rocket", "zulip", "twist",
            "stripe", "paypal", "square", "authorize", "adyen", "braintree",
            "github", "gitlab", "gitea", "gitbucket", "gogs", "bitbucket",
            "sentry", "rollbar", "bugsnag", "crashlytics", "appcenter",
            "datadog", "newrelic", "elastic-apm", "dynatrace", "appdynamics",
            "chatgpt", "bard", "claude", "gpt4", "palm", "copilot", "perplexity"
        ]
        
        distraction_apps = [
            "Netflix", "Spotify", "YouTube", "Twitter", "Instagram", "Facebook", 
            "TikTok", "Reddit", "Gaming", "Steam", "Twitch", "hulu", "disney", "prime video",
            "snapchat", "pinterest", "tumblr", "9gag", "imgur", "4chan",
            "liveleak", "pornhub", "xhamster", "onlyfans",
            "roblox", "fortnite", "valorant", "csgo", "dota", "lol", "minecraft"
        ]
        
        productive_domains = [
            "github", "gitlab", "stackoverflow", "docs", "documentation",
            "chatgpt", "openai.com", "claude", "gemini", "copilot",
            "perplexity", "cohere", "huggingface", "kaggle",
            "coursera", "udemy", "pluralsight", "datacamp", "educative",
            "mdn", "w3schools", "devdocs", "duckduckgo", "google",
            "figma", "adobe", "jira", "confluence", "linear",
            "github", "gitlab", "bitbucket", "azure", "aws", "gcp",
            "vercel", "netlify", "heroku", "railway", "fly", "render",
            "npm", "pypi", "maven", "cargo", "nuget", "rubygems",
            "medium", "dev.to", "hashnode", "substack", "newsletter",
            "notion", "obsidian", "roam", "logseq", "evernote",
            "sheets", "excel", "airtable", "retool", "bubble",
            "docs.google.com", "sheets.google.com", "forms.google.com", "slides.google.com",
            "google", "googledocs", "googlesheets", "googleforms", "googleslides",
            "notion", "confluence", "miro", "excalidraw", "lucidchart",
            "stripe", "paypal", "square", "shopify", "woocommerce",
            "analytics", "google-analytics", "mixpanel", "amplitude",
            "slack", "teams", "discord", "zoom", "skype", "jitsi",
            "gmail", "outlook", "thunderbird", "mail",
            "kubernetes", "k8s", "docker", "helm", "terraform",
            "aws", "azure", "gcp", "heroku", "vercel", "netlify",
            "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy",
            "jupyter", "anaconda", "conda", "pipenv", "poetry",
            "node", "npm", "yarn", "pnpm", "webpack", "vite",
            "react", "vue", "angular", "svelte", "nextjs", "nuxt",
            "graphql", "rest", "api", "swagger", "openapi",
            "git", "svn", "mercurial", "fossil",
            "jenkins", "gitlab-ci", "github-actions", "circleci",
            "prometheus", "grafana", "elk", "splunk", "datadog",
            "nginx", "apache", "tomcat", "iis", "caddy",
            "mysql", "postgres", "mongodb", "cassandra", "dynamodb",
            "redis", "memcached", "elasticsearch", "opensearch",
            "kafka", "rabbitmq", "activemq", "zeromq", "nats",
            "s3", "bucket", "blob", "cloudfiles", "wasabi",
            "lambda", "functions", "cloud-run", "container",
            "rds", "cloud-sql", "aurora", "cosmos", "bigtable",
            "sns", "sqs", "pubsub", "eventbridge", "servicebusqueue",
            "vscode", "intellij", "pycharm", "webstorm", "clion",
            "vim", "emacs", "nano", "gedit", "kate",
            "tmux", "screen", "zsh", "bash", "fish",
            "htop", "top", "systemd", "supervisor", "pm2",
            "curl", "wget", "aria2", "transmission",
            "ffmpeg", "imagemagick", "ghostscript",
            "ssl", "openssl", "certbot", "letsencrypt", "vault",
            "linkedin", "slack", "teams", "webex", "jitsi",
            "miro", "mural", "figjam", "excalidraw", "lucidchart",
            "calendly", "clockify", "toggl", "everhour", "hubstaff",
            "asana", "monday", "clickup", "smartsheet",
            "roam", "obsidian", "logseq", "dendron", "foam",
            "mattermost", "rocket", "zulip", "twist",
            "paypal", "square", "authorize", "adyen", "braintree",
            "gitea", "gitbucket", "gogs",
            "sentry", "rollbar", "bugsnag", "crashlytics",
            "newrelic", "elastic", "dynatrace", "appdynamics"
        ]
        
        print(f"🔄 Processing {len(app_data)} app records with improved classification...")
        
        for app in app_data:
            if not isinstance(app, dict):
                continue
                
            app_name = app.get("appName", "")
            duration = app.get("duration", 0)
            
            if not app_name or duration <= 0:
                continue
            
            # Check productive apps first
            if any(prod_app.lower() in app_name.lower() for prod_app in productive_apps):
                predicted_label = "Focused"
                confidence = 0.90
            elif any(dist_app.lower() in app_name.lower() for dist_app in distraction_apps):
                predicted_label = "Distracted"
                confidence = 0.85
            elif "browser" in app_name.lower() or "chrome" in app_name.lower() or "firefox" in app_name.lower():
                # Browser - check domains
                if any(prod_domain in app_name.lower() for prod_domain in productive_domains):
                    predicted_label = "Focused"
                    confidence = 0.88
                elif any(social in app_name.lower() for social in ["youtube", "facebook", "twitter", "instagram", "tiktok", "reddit", "netflix", "twitch", "gaming"]):
                    predicted_label = "Distracted"
                    confidence = 0.85
                else:
                    predicted_label = "Focused"  
                    confidence = 0.70
            else:
                # Unknown app - default to productive for developers/corporate
                predicted_label = "Focused" if duration > 300 else "Focused"
                confidence = 0.75
                
            activity = FocusActivity(
                app_name=app_name,
                tab_title=app_name,  
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

def categorize_activities(activities):
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

def generate_summary(activities):
    try:
        focused_activities = [a for a in activities if a.predicted_label.lower() == "focused"]
        distracted_activities = [a for a in activities if a.predicted_label.lower() == "distracted"]
        
        focused_duration = sum(a.duration for a in focused_activities)
        distracted_duration = sum(a.duration for a in distracted_activities)
        total_duration = focused_duration + distracted_duration
        
        
        productivity_score = int((focused_duration / total_duration * 100) if total_duration > 0 else 0)
        
        
        focused_apps = Counter([a.app_name for a in focused_activities])
        distracted_apps = Counter([a.app_name for a in distracted_activities])
        
        most_focused_app = focused_apps.most_common(1)[0][0] if focused_apps else "None"
        most_distracting_app = distracted_apps.most_common(1)[0][0] if distracted_apps else "None"
        
        return FocusSummary(
            productivity_score=productivity_score,
            focused_duration_minutes=focused_duration // 60,  
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
    try:
        import numpy as np
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.preprocessing import LabelEncoder
        import os
        
        print("🔧 Creating placeholder model files...")
        
        
        model_files = ['focus_model.pkl', 'app_name_encoder.pkl', 'tab_name_encoder.pkl', 'label_encoder.pkl']
        for file in model_files:
            if os.path.exists(file):
                os.remove(file)
                print(f"🗑️ Removed existing {file}")
        
        
        app_name_encoder = LabelEncoder()
        app_names = ['Chrome', 'VS Code', 'Code', 'MongoDB Compass', 'Google-chrome', 'Gnome-terminal', 'focusai-app', 'Gnome-control-center']
        app_name_encoder.fit(app_names)
        joblib.dump(app_name_encoder, 'app_name_encoder.pkl')
        
        
        tab_name_encoder = LabelEncoder()
        tab_names = ['Chrome - Activity', 'VS Code - Activity', 'Code - Activity', 'MongoDB Compass - Activity', 
                    'Google-chrome - Activity', 'Gnome-terminal - Activity', 'YouTube - Comedy Clips']
        tab_name_encoder.fit(tab_names)
        joblib.dump(tab_name_encoder, 'tab_name_encoder.pkl')
        
        
        label_encoder = LabelEncoder()
        labels = ['Focused', 'Distracted']
        label_encoder.fit(labels)
        joblib.dump(label_encoder, 'label_encoder.pkl')
        
        
        X_dummy = np.array([[0, 0, 100], [0, 0, 200], [1, 1, 300], [1, 1, 400]])
        y_dummy = np.array([0, 0, 1, 1])  
        
        model = RandomForestClassifier(n_estimators=10, random_state=42)
        model.fit(X_dummy, y_dummy)
        joblib.dump(model, 'focus_model.pkl')
        
        print("✅ All model files created successfully with current sklearn version!")
        return True
    except Exception as e:
        print(f"❌ Error creating placeholder models: {e}")
        return False

async def fetch_real_mongodb_data(user_id: str = None, email: str = None, date: str = None):
    try:
        backend_url = BACKEND_URL
        
        print(f"🔄 Fetching data for user {user_id}, email {email}, date {date}")
        
        
        endpoints_to_try = [
            f"{backend_url}/g",
            f"{backend_url}/api/user-data",
        ]
        
        for endpoint in endpoints_to_try:
            try:
                
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
                    
                    
                    formatted_data = []
                    
                    
                    app_usage = backend_data.get('appUsage', [])
                    if isinstance(app_usage, list):
                        for app in app_usage:
                            if isinstance(app, dict):
                                
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
                    
                    
                    tab_usage = backend_data.get('tabUsage', [])
                    if isinstance(tab_usage, list):
                        for tab in tab_usage:
                            if isinstance(tab, dict):
                                
                                if user_id and str(tab.get('userId')) != str(user_id):
                                    continue
                                if email and tab.get('email') != email:
                                    continue
                                if date and tab.get('date') != date:
                                    continue
                                
                                
                                app_name = tab.get('domain', tab.get('title', 'Browser'))
                                url = tab.get('url', '')
                                if app_name and app_name != 'unknown':
                                    formatted_data.append({
                                        "userId": str(tab.get('userId', '')),
                                        "email": tab.get('email', ''),
                                        "date": tab.get('date', datetime.now().strftime("%Y-%m-%d")),
                                        "appName": f"Browser - {app_name}",
                                        "url": url,
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
        
        
        print("⚠️ All backend endpoints failed, returning empty data")
        return []
        
    except Exception as e:
        print(f"❌ Error fetching MongoDB data: {e}")
        return []

async def fetch_data_periodically():
    global REAL_MONGODB_DATA, is_fetching_enabled
    
    while is_fetching_enabled:
        try:
            print("🔄 Running periodic data fetch from MongoDB...")
            
            
            fresh_data = await fetch_real_mongodb_data()
            
            if fresh_data:
                
                current_date = datetime.now().strftime("%Y-%m-%d")
                
                
                REAL_MONGODB_DATA = [
                    x for x in REAL_MONGODB_DATA 
                    if x.get("date") != current_date
                ]
                
                REAL_MONGODB_DATA.extend(fresh_data)
                print(f"✅ Updated with {len(fresh_data)} fresh records from MongoDB")
            else:
                print("⚠️ No fresh data retrieved from MongoDB")
                
        except Exception as e:
            print(f"❌ Error in periodic MongoDB fetch: {e}")
        
        
        await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(app: FastAPI):
    
    global model, tfidf_app_vectorizer, tfidf_tab_vectorizer, model_metadata, background_task, is_fetching_enabled
    
    print("🚀 Starting Focus AI Analysis API...")
    
    
    import json
    import pandas as pd
    
    model_dir = 'trainedmodel'
    try:
        print(f"📦 Loading XGBoost model from {model_dir}/...")
        model = joblib.load(f'{model_dir}/xgboost_productivity_model.pkl')
        tfidf_app_vectorizer = joblib.load(f'{model_dir}/tfidf_app_vectorizer.pkl')
        tfidf_tab_vectorizer = joblib.load(f'{model_dir}/tfidf_tab_vectorizer.pkl')
        
        with open(f'{model_dir}/model_metadata.json') as f:
            model_metadata = json.load(f)
        
        print("✅ XGBoost model loaded successfully")
        print(f"   Model type: {model_metadata.get('model_type', 'Unknown')}")
        print(f"   Training accuracy: {model_metadata.get('accuracy', 0):.4f} ({model_metadata.get('accuracy', 0)*100:.2f}%)")
        print(f"   Features: {model_metadata.get('n_features', 0)}")
    except FileNotFoundError as e:
        print(f"❌ XGBoost model files not found in {model_dir}/: {e}")
        print("⚠️ Falling back to rule-based classification")
        model = None
        tfidf_app_vectorizer = None
        tfidf_tab_vectorizer = None
        model_metadata = None
    except Exception as e:
        print(f"❌ Error loading XGBoost model: {e}")
        print("⚠️ Falling back to rule-based classification")
        model = None
        tfidf_app_vectorizer = None
        tfidf_tab_vectorizer = None
        model_metadata = None
    
    
    print("🚀 Starting background data fetch task...")
    is_fetching_enabled = True
    background_task = asyncio.create_task(fetch_data_periodically())
    
    yield
    
    
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

@app.get("/")
async def root():
    return {"message": "Welcome to Focus AI Analysis API", "status": "running"}

@app.post("/user/{user_id}/analyze-and-store")
async def analyze_and_store_productivity(user_id: str, date: Optional[str] = None, email: Optional[str] = None):
    try:
        current_date = date or datetime.now().strftime("%Y-%m-%d")
        
        print(f"🚀 Starting analyze and store for user {user_id} (email: {email}) on {current_date}")
        
        
        user_data_list = await fetch_real_mongodb_data(user_id=user_id, email=email, date=current_date)
        
        if not user_data_list or len(user_data_list) == 0:
            raise HTTPException(status_code=404, detail=f"No app or tab usage data found for user {user_id} on {current_date}")
        
        # Extract email from the first data record if not provided
        if not email and user_data_list and len(user_data_list) > 0:
            email = user_data_list[0].get('email', 'unknown@example.com')
            print(f"📧 Extracted email from data: {email}")
        
        # Convert list to the format expected by process_user_data
        user_data = {"appUsage": user_data_list}
        
        processed_metrics = process_user_data(user_data)
        
        if not processed_metrics:
            raise HTTPException(status_code=500, detail="Failed to process user data")
        
        
        existing_summary = await get_existing_productivity_summary(user_id, email or "unknown@example.com", current_date)
        
        
        backend_result = await update_backend_productivity_summary(
            user_id, 
            email or "unknown@example.com", 
            current_date, 
            processed_metrics, 
            existing_summary
        )
        
        
        focus_areas = []
        distraction_areas = []
        
        
        if processed_metrics["productive_content"]:
            total_productive_duration = sum(processed_metrics["productive_content"].values())
            focus_areas.append(AppCategoryItem(
                category="Productivity",
                total_duration=total_productive_duration,
                activity_count=len(processed_metrics["productive_content"]),
                apps=list(processed_metrics["productive_content"].keys()),
                avg_confidence=0.85
            ))
        
        
        if processed_metrics["non_productive_content"]:
            total_distraction_duration = sum(processed_metrics["non_productive_content"].values())
            distraction_areas.append(AppCategoryItem(
                category="Entertainment",
                total_duration=total_distraction_duration,
                activity_count=len(processed_metrics["non_productive_content"]),
                apps=list(processed_metrics["non_productive_content"].keys()),
                avg_confidence=0.80
            ))
        
        
        summary = FocusSummary(
            productivity_score=processed_metrics["focus_score"],
            focused_duration_minutes=processed_metrics["total_productive_time"] // 60,
            distracted_duration_minutes=processed_metrics["total_non_productive_time"] // 60,
            total_duration_minutes=processed_metrics["overall_total_usage"] // 60,
            most_focused_app=processed_metrics["max_productive_app"],
            most_distracting_app=list(processed_metrics["distraction_apps"].keys())[0] if processed_metrics["distraction_apps"] else "None",
            focus_percentage=processed_metrics["focus_score"]
        )
        
        
        detailed_activities = []
        
        
        for app_name, duration in processed_metrics["productive_content"].items():
            detailed_activities.append(FocusActivity(
                app_name=app_name,
                tab_title=app_name,
                duration=duration,
                predicted_label="Focused",
                confidence=0.85
            ))
        
        
        for app_name, duration in processed_metrics["non_productive_content"].items():
            detailed_activities.append(FocusActivity(
                app_name=app_name,
                tab_title=app_name,
                duration=duration,
                predicted_label="Distracted",
                confidence=0.80
            ))
        
        
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
    try:
        # Call the analyze_and_store function
        result = await analyze_and_store_productivity(user_id, date, email)
        
        # Return the formatted response
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get productivity analysis: {str(e)}")

async def fetch_user_data_from_backend(user_id: str, date: str = None):
    try:
        
        backend_url = BACKEND_URL
        
        
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
        
        
        return None
        
    except Exception as e:
        print(f"❌ Error fetching backend data: {e}")
        return None

@app.get("/user/{user_id}/quick-stats")
async def get_user_quick_stats(user_id: str, date: Optional[str] = None):
    try:
        
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")
            
        
        backend_data = await fetch_user_data_from_backend(user_id, date)
        
        
        # 1. First, try to use data already stored in REAL_MONGODB_DATA for this user and date
        user_data = [item for item in REAL_MONGODB_DATA 
                     if item["userId"] == user_id and item.get("date") == date]
        
        # 2. Only if we have no local data, or if specifically requested, fetch from backend
        if not user_data:
            print(f"ℹ️ No local data for {user_id} on {date}, fetching from backend...")
            backend_data = await fetch_user_data_from_backend(user_id, date)
            
            if backend_data and isinstance(backend_data, dict):
                # Process appUsage from backend
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
                
                # Also process tabUsage from backend if available
                tab_usage = backend_data.get("tabs", backend_data.get("tabUsage", []))
                if isinstance(tab_usage, list):
                    for tab in tab_usage:
                        if isinstance(tab, dict):
                            domain = tab.get("domain") or tab.get("title") or "Browser"
                            duration = tab.get("duration", 0)
                            if duration > 0:
                                user_data.append({
                                    "userId": user_id,
                                    "email": tab.get("email", "user@example.com"),
                                    "date": date,
                                    "appName": f"Browser - {domain}",
                                    "duration": int(duration),
                                    "lastUpdated": tab.get("lastUpdated", datetime.now().isoformat())
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
        
        
        activities = process_real_data(user_data)
        
        
        focused_activities = [a for a in activities if a.predicted_label.lower() == "focused"]
        distracted_activities = [a for a in activities if a.predicted_label.lower() == "distracted"]
        
        focused_duration = sum(a.duration for a in focused_activities) if focused_activities else 0
        distracted_duration = sum(a.duration for a in distracted_activities) if distracted_activities else 0
        total_duration = focused_duration + distracted_duration
        
        
        productivity_score = int((focused_duration / total_duration * 100) if total_duration > 0 else 0)
        
        
        focus_areas = set(a.app_name for a in focused_activities)
        distraction_areas = set(a.app_name for a in distracted_activities)
        
        return {
            "user_id": user_id,
            "date": date,
            "quick_stats": {
                "productivity_score": productivity_score,
                "focus_time_minutes": focused_duration // 60,  
                "distraction_time_minutes": distracted_duration // 60,
                "total_time_minutes": total_duration // 60,
                "total_activities": len(activities)
            },
            "focus_areas_count": len(focus_areas),
            "distraction_areas_count": len(distraction_areas)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting quick stats: {str(e)}")

@app.post("/seed-test-data/{user_id}")
async def seed_test_data(user_id: str, date: Optional[str] = None):
    try:
        
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")
        
        
        test_data = [
            {"userId": user_id, "email": "test@example.com", "date": date, "appName": "VSCode", "duration": 3600, "lastUpdated": f"{date}T10:33:51.141Z"},
            {"userId": user_id, "email": "test@example.com", "date": date, "appName": "Chrome", "duration": 1800, "lastUpdated": f"{date}T12:33:16.138Z"},
            {"userId": user_id, "email": "test@example.com", "date": date, "appName": "Slack", "duration": 900, "lastUpdated": f"{date}T14:24:09.553Z"},
            {"userId": user_id, "email": "test@example.com", "date": date, "appName": "Terminal", "duration": 600, "lastUpdated": f"{date}T16:01:36.420Z"},
            {"userId": user_id, "email": "test@example.com", "date": date, "appName": "Spotify", "duration": 1200, "lastUpdated": f"{date}T17:04:27.143Z"},
            {"userId": user_id, "email": "test@example.com", "date": date, "appName": "YouTube", "duration": 1500, "lastUpdated": f"{date}T18:30:08.901Z"}
        ]
        
        
        for item in test_data:
            
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
    try:
        
        date = data.get("date", datetime.now().strftime("%Y-%m-%d"))
        app_usage = data.get("appUsage", [])
        tab_usage = data.get("tabUsage", [])
        current_session = data.get("currentSession", [])
        
        print(f"📊 Received data for user {user_id} on {date}")
        print(f"App usage entries: {len(app_usage)}")
        print(f"Tab usage entries: {len(tab_usage)}")
        print(f"Current session entries: {len(current_session)}")
        
        
        print(f"🔍 App usage type: {type(app_usage)}")
        print(f"🔍 App usage sample: {app_usage}")
        if isinstance(app_usage, dict) and len(app_usage) > 0:
            print(f"🔍 App usage keys: {list(app_usage.keys())}")
        elif isinstance(app_usage, list) and len(app_usage) > 0:
            print(f"🔍 First app usage item: {app_usage[0] if app_usage else 'None'}")
        
        
        # Use a dictionary to deduplicate by app name
        # If an app appears in both appUsage and currentSession, appUsage is usually more reliable
        deduplicated_apps = {}
        
        # 1. Process app_usage (aggregated data)
        if isinstance(app_usage, dict):
            for app_name, duration in app_usage.items():
                if app_name and duration > 0:
                    deduplicated_apps[app_name] = {
                        "userId": user_id,
                        "email": data.get("email", "user@example.com"),
                        "date": date,
                        "appName": app_name,
                        "duration": int(duration),
                        "lastUpdated": datetime.now().isoformat()
                    }
        elif isinstance(app_usage, list):
            for app in app_usage:
                if isinstance(app, dict):
                    app_name = app.get("appName") or app.get("app") or app.get("name", "Unknown")
                    duration = app.get("duration", 0)
                    if app_name and duration > 0:
                        deduplicated_apps[app_name] = {
                            "userId": user_id,
                            "email": app.get("email", "user@example.com"),
                            "date": date,
                            "appName": app_name,
                            "duration": int(duration),
                            "lastUpdated": app.get("lastUpdated", datetime.now().isoformat())
                        }
        
        # 2. Process current_session (non-aggregated yet)
        # ONLY add if not already in deduplicated_apps, OR add to existing duration if it's truly separate
        # In this architecture, appUsage is the source of truth for historical, 
        # current_session is for the very last few seconds.
        for session in current_session:
            if isinstance(session, dict):
                app_name = session.get("appName") or session.get("app") or session.get("name", "Unknown")
                duration = session.get("duration", 0)
                if app_name and duration > 0:
                    if app_name in deduplicated_apps:
                        # If it's already there, we might be double counting if we add.
                        # However, sometimes backend separates them. 
                        # For now, let's take the MAX to be safe, or just trust the aggregated one.
                        deduplicated_apps[app_name]["duration"] = max(deduplicated_apps[app_name]["duration"], int(duration))
                    else:
                        deduplicated_apps[app_name] = {
                            "userId": user_id,
                            "email": session.get("email", "user@example.com"),
                            "date": date,
                            "appName": app_name,
                            "duration": int(duration),
                            "lastUpdated": session.get("lastUpdated", datetime.now().isoformat())
                        }

        # 3. Process tab_usage - THIS WAS PREVIOUSLY MISSING
        tab_entries = []
        for tab in tab_usage:
            if isinstance(tab, dict):
                domain = tab.get("domain") or tab.get("title") or "Browser"
                duration = tab.get("duration", 0)
                if domain and duration > 0:
                    tab_entries.append({
                        "userId": user_id,
                        "email": tab.get("email", "user@example.com"),
                        "date": date,
                        "appName": f"Browser - {domain}",
                        "duration": int(duration),
                        "lastUpdated": tab.get("lastUpdated", datetime.now().isoformat())
                    })
        
        formatted_app_data = list(deduplicated_apps.values()) + tab_entries
        
        
        if formatted_app_data:
            
            global REAL_MONGODB_DATA
            REAL_MONGODB_DATA = [
                x for x in REAL_MONGODB_DATA 
                if not (x["userId"] == user_id and x["date"] == date)
            ]
            
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
    global is_fetching_enabled, background_task
    return {
        "fetching_enabled": is_fetching_enabled,
        "task_running": background_task is not None and not background_task.done(),
        "message": "Background fetching is active every 60 seconds" if is_fetching_enabled else "Background fetching is disabled"
    }

@app.post("/toggle-background-fetch")
async def toggle_background_fetch():
    global is_fetching_enabled, background_task
    
    is_fetching_enabled = not is_fetching_enabled
    
    if is_fetching_enabled:
        
        if background_task is None or background_task.done():
            background_task = asyncio.create_task(fetch_data_periodically())
        return {"message": "Background fetching enabled", "status": "enabled"}
    else:
        return {"message": "Background fetching disabled", "status": "disabled"}

@app.post("/manual-fetch")
async def manual_fetch():
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

@app.get("/user/{user_id}/productivity-summary", response_model=ProductivitySummaryResponse)
async def get_user_productivity_summary(user_id: str, date: Optional[str] = None, email: Optional[str] = None):
    try:
        backend_url = BACKEND_URL
        current_date = date or datetime.now().strftime("%Y-%m-%d")
        
        print(f"📊 Fetching productivity summary for user {user_id} (email: {email}) on {current_date}")
        
        
        try:
            params = {"date": current_date}
            headers = {}
            
            
            
            response = requests.get(f"{backend_url}/api/productivity-summary", params=params, timeout=10)
            
            if response.status_code == 200:
                backend_data = response.json()
                
                if backend_data.get("success") and backend_data.get("summaries"):
                    summary = backend_data["summaries"][0]  
                    
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
        
        
        app_data = await fetch_real_mongodb_data(user_id=user_id, email=email, date=current_date)
        
        if not app_data:
            
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
        
        
        productive_content = {}
        non_productive_content = {}
        distraction_apps = {}
        
        
        productive_apps = ["code", "vscode", "terminal", "gnome-terminal", "mysql", "postman", "slack", "eclipse", "intellij", "pycharm", "vim", "emacs", "antigravity", "focus", "focuai"]
        non_productive_apps = ["netflix", "spotify", "youtube", "twitter", "instagram", "facebook", "tiktok", "reddit", "gaming"]
        
        for app in app_data:
            app_name = app.get("appName", "")
            duration = app.get("duration", 0)
            
            if not app_name or duration <= 0:
                continue
            
            app_lower = app_name.lower()
            
            
            is_productive = any(prod_app in app_lower for prod_app in productive_apps)
            is_non_productive = any(non_prod_app in app_lower for non_prod_app in non_productive_apps)
            
            if is_productive:
                productive_content[app_name] = productive_content.get(app_name, 0) + duration
            elif is_non_productive:
                non_productive_content[app_name] = non_productive_content.get(app_name, 0) + duration
                distraction_apps[app_name] = distraction_apps.get(app_name, 0) + duration
            else:
                productive_content[app_name] = productive_content.get(app_name, 0) + duration
        
        total_productive_time = sum(productive_content.values())
        total_non_productive_time = sum(non_productive_content.values())
        overall_total_usage = total_productive_time + total_non_productive_time
        
        focus_score = int((total_productive_time / overall_total_usage * 100) if overall_total_usage > 0 else 0)
        
        max_productive_app = max(productive_content.items(), key=lambda x: x[1])[0] if productive_content else ""
        
        all_apps = {**productive_content, **non_productive_content}
        most_used_app = max(all_apps.items(), key=lambda x: x[1])[0] if all_apps else ""
        
        most_visited_tab = ""  
        
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
    try:
        backend_url = BACKEND_URL
        
        print(f"📊 Updating productivity summary for user {user_id}")
        
        try:
            headers = {"Content-Type": "application/json"}
            
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
        
        return {
            "success": True,
            "message": "Update queued (backend unavailable)",
            "note": "Productivity summary will be updated when backend is available"
        }
        
    except Exception as e:
        print(f"❌ Error updating productivity summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update productivity summary: {str(e)}")

from ai_provider import ai_provider

@app.post("/user/{user_id}/ai-insights")
async def get_user_ai_insights(user_id: str, email: Optional[str] = None, date: Optional[str] = None):
    try:
        current_date = date or datetime.now().strftime("%Y-%m-%d")
        
        # Get productivity summary from backend
        summary = await get_user_productivity_summary(user_id, email, current_date)
        
        if not summary or summary.overall_total_usage == 0:
            return {"insights": "No activity data found yet to provide insights. Try focusing for a bit and check back!"}
            
        # Format context for AI
        context = f"""
        User Productivity Summary for {current_date}:
        - Focus Score: {summary.focus_score}%
        - Total Usage: {summary.overall_total_usage // 60} minutes
        - Productive Time: {summary.total_productive_time // 60} minutes
        - Distraction Time: {summary.total_non_productive_time // 60} minutes
        - Top Productive App: {summary.max_productive_app}
        - Most Used App: {summary.most_used_app}
        """
        
        messages = [
            {"role": "system", "content": "You are a productivity expert assistant. Analyze the user's data and provide 3 ultra-concise, actionable tips to improve their focus tomorrow. Be encouraging but direct."},
            {"role": "user", "content": f"Here is my data: {context}"}
        ]
        
        insights = ai_provider.create_chat_completion(messages)
        
        return {
            "user_id": user_id,
            "date": current_date,
            "insights": insights,
            "provider": ai_provider.provider
        }
            
    except Exception as e:
        print(f"❌ Error generating AI insights: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=AI_SERVICE_HOST, port=AI_SERVICE_PORT)