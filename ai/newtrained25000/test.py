import joblib
import numpy as np
from scipy.sparse import hstack
from collections import Counter
import json
import os
THRESHOLD = 0.75
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE = os.path.join(BASE_DIR, "xgb_productivity.pkl")
VEC_FILE = os.path.join(BASE_DIR, "xgb_vectorizer.pkl")
def load_list_from_file(filename):
    filepath = os.path.join(os.path.dirname(__file__), filename)
    if not os.path.exists(filepath):
        print(f"⚠️ Warning: {filename} not found.")
        return []
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Error loading {filename}: {e}")
        return []
FORCE_NON_PROD = load_list_from_file("FORCE_UNPROD.json")
FORCE_PROD = load_list_from_file("FORCE_PROD.json")
print(f"Loaded {len(FORCE_NON_PROD)} non-productive and {len(FORCE_PROD)} productive rules.")
print(f"Loading model (threshold={THRESHOLD})...")
model = joblib.load(MODEL_FILE)
vectorizer = joblib.load(VEC_FILE)
import re
from functools import lru_cache
FORCE_PROD_SET = set(FORCE_PROD)
FORCE_UNPROD_SET = set(FORCE_NON_PROD)
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
def smart_keyword_match(text_combined: str):
    text_lower = text_combined.lower()
    if text_lower in FORCE_PROD_SET:
        return "PRODUCTIVE", 0.95, [text_lower]
    if text_lower in FORCE_UNPROD_SET:
        return "NON-PROD", 0.95, [text_lower]
    tokens = set(re.split(r'[\s\-_\.\:\/\?\#\&\=\@]+', text_lower))
    tokens = {t for t in tokens if len(t) >= 2}
    prod_matches = []
    unprod_matches = []
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
    if prod_matches:
        return "PRODUCTIVE", 0.98, list(set(prod_matches))
    if unprod_matches:
        return "NON-PROD", 0.98, list(set(unprod_matches))
    return None, 0, []
def predict(text, duration, hour=14, is_weekend=0):
    text_l = text.lower()
    kw_label, kw_conf, kw_matches = smart_keyword_match(text_l)
    X_text = vectorizer.transform([text])
    X_num = np.array([[duration, hour, is_weekend]])
    X = hstack([X_text, X_num]).tocsr()
    prob = model.predict_proba(X)[0][1]
    ml_label = "PRODUCTIVE" if prob >= THRESHOLD else "NON-PROD"
    ml_conf = prob if prob >= 0.5 else (1.0 - prob)
    if kw_label:
        return kw_label, max(kw_conf, ml_conf), kw_matches
    return ml_label, ml_conf, []
test_cases = [
    {"app": "VS Code", "tab": "main.js - FocusAI", "duration": 1200, "desc": "JavaScript Coding"},
    {"app": "PyCharm", "tab": "train.py", "duration": 3000, "desc": "Python Development"},
    {"app": "IntelliJ IDEA", "tab": "BackendController.java", "duration": 2400, "desc": "Java Backend Dev"},
    {"app": "WebStorm", "tab": "App.tsx [Frontend]", "duration": 1800, "desc": "React Frontend Dev"},
    {"app": "Android Studio", "tab": "MainActivity.kt", "duration": 3600, "desc": "Android App Dev"},
    {"app": "Xcode", "tab": "AppDelegate.swift", "duration": 2700, "desc": "iOS App Dev"},
    {"app": "GoLand", "tab": "server.go", "duration": 1500, "desc": "Go Service Dev"},
    {"app": "Sublime Text", "tab": "config.yaml", "duration": 300, "desc": "Config Editing"},
    {"app": "Terminal", "tab": "npm run dev", "duration": 600, "desc": "Process Monitoring"},
    {"app": "iTerm2", "tab": "git commit -m 'feat: sync'", "duration": 120, "desc": "Version Control"},
    {"app": "Docker Desktop", "tab": "Container: redis-db", "duration": 450, "desc": "DevOps Container Mgmt"},
    {"app": "Postman", "tab": "POST /api/predict", "duration": 900, "desc": "API Testing"},
    {"app": "MongoDB Compass", "tab": "Collection: appusages", "duration": 1200, "desc": "Database Management"},
    {"app": "DBeaver", "tab": "SELECT * FROM users", "duration": 1800, "desc": "SQL Querying"},
    {"app": "Jupyter Notebook", "tab": "model_training.ipynb", "duration": 5400, "desc": "Data Science Research"},
    {"app": "TablePlus", "tab": "Production DB", "duration": 600, "desc": "Database Admin"},
    {"app": "DataGrip", "tab": "Index Optimization", "duration": 1500, "desc": "Database Tuning"},
    {"app": "Sourcetree", "tab": "Rebase develop", "duration": 300, "desc": "Git GUI Admin"},
    {"app": "Fork", "tab": "Merge Request Review", "duration": 400, "desc": "Git Workflow"},
    {"app": "GitHub Desktop", "tab": "Publish Branch", "duration": 100, "desc": "Git Client"},
    {"app": "Chrome", "tab": "https://stackoverflow.com/questions/123", "duration": 300, "desc": "StackOverflow Research"},
    {"app": "Chrome", "tab": "https://github.com/microsoft/vscode/issues/99", "duration": 600, "desc": "GitHub Issue Debugging"},
    {"app": "Chrome", "tab": "https://developer.mozilla.org/en-US/docs/Web/API", "duration": 900, "desc": "MDN Documentation"},
    {"app": "Chrome", "tab": "https://react.dev/reference/react", "duration": 1200, "desc": "React Docs"},
    {"app": "Chrome", "tab": "https://docs.docker.com/engine/reference/", "duration": 400, "desc": "Docker Docs"},
    {"app": "Chrome", "tab": "https://kubernetes.io/docs/concepts/", "duration": 800, "desc": "K8s Concepts"},
    {"app": "Chrome", "tab": "https://aws.amazon.com/documentation/", "duration": 1500, "desc": "Cloud Infrastructure Research"},
    {"app": "Chrome", "tab": "https://fastapi.tiangolo.com/tutorial/", "duration": 2000, "desc": "Framework Learning"},
    {"app": "Chrome", "tab": "https://www.typescriptlang.org/docs/", "duration": 600, "desc": "TypeScript Handbook"},
    {"app": "Chrome", "tab": "https://nginx.org/en/docs/", "duration": 300, "desc": "Web Server Config Docs"},
    {"app": "Chrome", "tab": "https://redis.io/commands/", "duration": 120, "desc": "Command Reference"},
    {"app": "Chrome", "tab": "https://pkg.go.dev/std", "duration": 500, "desc": "Go Standard Library"},
    {"app": "Chrome", "tab": "https://rust-lang.github.io/book/", "duration": 1800, "desc": "Reading The Rust Book"},
    {"app": "Chrome", "tab": "https://pydantic-docs.helpmanual.io/", "duration": 450, "desc": "Library Docs"},
    {"app": "Chrome", "tab": "https://dev.to/t/webdev", "duration": 600, "desc": "Reading Tech Articles"},
    {"app": "Chrome", "tab": "https://blog.cleancoder.com/", "duration": 900, "desc": "Architecture Blog"},
    {"app": "Chrome", "tab": "https://medium.com/engineering-at-meta", "duration": 1200, "desc": "Engineering Blog"},
    {"app": "Chrome", "tab": "https://news.ycombinator.com/", "duration": 300, "desc": "Hacker News (Industry News)"},
    {"app": "Chrome", "tab": "https://arxiv.org/abs/1234.5678", "duration": 2400, "desc": "Reading Research Paper"},
    {"app": "Chrome", "tab": "https://scholar.google.com/search", "duration": 600, "desc": "Academic Search"},
    {"app": "Chrome", "tab": "https://chatgpt.com/", "duration": 600, "desc": "ChatGPT Assistant"},
    {"app": "Chrome", "tab": "https://claude.ai/", "duration": 900, "desc": "Claude AI Development"},
    {"app": "Chrome", "tab": "https://grok.com/", "duration": 300, "desc": "Grok AI Research"},
    {"app": "Chrome", "tab": "https://perplexity.ai/", "duration": 450, "desc": "AI Search Engine"},
    {"app": "Chrome", "tab": "https://notion.so/workspace/Project-Roadmap", "duration": 1800, "desc": "Project Planning - Notion"},
    {"app": "Chrome", "tab": "https://trello.com/b/dashboard", "duration": 600, "desc": "Kanban Management"},
    {"app": "Chrome", "tab": "https://linear.app/team/issue/focus-1", "duration": 1200, "desc": "Issue Tracking - Linear"},
    {"app": "Chrome", "tab": "https://figma.com/file/design-v2", "duration": 3600, "desc": "Product Design"},
    {"app": "Chrome", "tab": "https://canva.com/design/presentation", "duration": 1500, "desc": "Graphic Design"},
    {"app": "Chrome", "tab": "https://miro.com/app/board/123", "duration": 2400, "desc": "System Architecture Diagram"},
    {"app": "Chrome", "tab": "https://excalidraw.com/", "duration": 900, "desc": "Hand-drawn Diagrams"},
    {"app": "Chrome", "tab": "https://overleaf.com/project/thesis", "duration": 3000, "desc": "Scientific Writing (LaTeX)"},
    {"app": "Chrome", "tab": "https://draw.io/", "duration": 600, "desc": "Flowchart Creation"},
    {"app": "Chrome", "tab": "https://docs.google.com/document/d/123", "duration": 1800, "desc": "Writing Technical Spec"},
    {"app": "Chrome", "tab": "https://docs.google.com/spreadsheets/d/123", "duration": 1200, "desc": "Data Analysis (Sheets)"},
    {"app": "Chrome", "tab": "https://docs.google.com/presentation/d/123", "duration": 900, "desc": "Slide Deck Preparation"},
    {"app": "Slack", "tab": "Slack | #dev-team", "duration": 1200, "desc": "Team Communication"},
    {"app": "Microsoft Teams", "tab": "Teams | General", "duration": 3600, "desc": "Work Meeting"},
    {"app": "Discord", "tab": "FocusAI Dev Server", "duration": 900, "desc": "Community Dev"},
    {"app": "Zoom", "tab": "Daily Standup Meeting", "duration": 1800, "desc": "Video Call"},
    {"app": "Chrome", "tab": "https://www.youtube.com/watch?v=algorithm_basics", "duration": 2400, "desc": "Algorithm Lecture"},
    {"app": "Chrome", "tab": "https://www.youtube.com/watch?v=system_design_101", "duration": 3600, "desc": "System Design Course"},
    {"app": "Chrome", "tab": "https://udemy.com/course/web-dev", "duration": 5400, "desc": "Online Coding Course"},
    {"app": "Chrome", "tab": "https://coursera.org/learn/machine-learning", "duration": 7200, "desc": "ML Specialization"},
    {"app": "Chrome", "tab": "https://edx.org/course/cs50", "duration": 4500, "desc": "CS Degree Material"},
    {"app": "Chrome", "tab": "https://leetcode.com/problems/two-sum", "duration": 1800, "desc": "DSA Practice"},
    {"app": "Chrome", "tab": "https://hackerrank.com/challenges", "duration": 1200, "desc": "Coding Competition"},
    {"app": "Chrome", "tab": "https://codeforces.com/problemset", "duration": 3600, "desc": "Competitive Programming"},
    {"app": "Chrome", "tab": "https://freecodecamp.org/learn", "duration": 2700, "desc": "Web Dev Learning"},
    {"app": "Chrome", "tab": "https://pluralsight.com/paths/clojure", "duration": 3600, "desc": "Skill IQ Assessment"},
    {"app": "Chrome", "tab": "https://brilliant.org/courses/math-basics", "duration": 1500, "desc": "Logical Thinking Exercise"},
    {"app": "Chrome", "tab": "https://khanacademy.org/math/linear-algebra", "duration": 2400, "desc": "Math Education"},
    {"app": "Chrome", "tab": "https://wikipedia.org/wiki/Neural_network", "duration": 900, "desc": "Academic Reading"},
    {"app": "Chrome", "tab": "https://medium.com/towards-data-science", "duration": 1200, "desc": "Data Science Research"},
    {"app": "Chrome", "tab": "https://fast.ai/lessons/", "duration": 3600, "desc": "AI Lesson Video"},
    {"app": "Chrome", "tab": "https://frontendmasters.com/courses/react", "duration": 3600, "desc": "Professional Workshops"},
    {"app": "Chrome", "tab": "https://egghead.io/lessons/graphql", "duration": 900, "desc": "Short Coding Lesson"},
    {"app": "Kindle", "tab": "Clean Code - Robert C. Martin", "duration": 1800, "desc": "Reading Technical Book"},
    {"app": "Books", "tab": "Design Patterns - GoF", "duration": 1200, "desc": "Studying Architecture"},
    {"app": "Calibre", "tab": "Programming in Rust.pdf", "duration": 3000, "desc": "E-book Reference"},
    {"app": "Chrome", "tab": "https://www.facebook.com/", "duration": 60, "desc": "Social Media Browsing"},
    {"app": "Chrome", "tab": "https://www.instagram.com/reels/", "duration": 120, "desc": "Watching Reels"},
    {"app": "Chrome", "tab": "https://www.tiktok.com/", "duration": 300, "desc": "TikTok Scrolling"},
    {"app": "Chrome", "tab": "https://twitter.com/home", "duration": 300, "desc": "Twitter Feed"},
    {"app": "Chrome", "tab": "https://reddit.com/r/funny", "duration": 600, "desc": "Meme Browsing"},
    {"app": "Chrome", "tab": "https://www.youtube.com/shorts/cats", "duration": 45, "desc": "Short Form Distraction"},
    {"app": "Chrome", "tab": "https://www.netflix.com/browse", "duration": 120, "desc": "Choosing a Movie"},
    {"app": "Chrome", "tab": "https://www.netflix.com/watch/ID", "duration": 5400, "desc": "Streaming Content"},
    {"app": "Chrome", "tab": "https://www.disneyplus.com/home", "duration": 180, "desc": "Streaming UI"},
    {"app": "Chrome", "tab": "https://www.primevideo.com/", "duration": 120, "desc": "Amazon Video"},
    {"app": "Chrome", "tab": "https://www.hulu.com/", "duration": 300, "desc": "Streaming Site"},
    {"app": "Chrome", "tab": "https://www.twitch.tv/gaming_stream", "duration": 3600, "desc": "Watching Game Stream"},
    {"app": "Chrome", "tab": "https://www.amazon.com/gp/cart", "duration": 300, "desc": "Online Shopping (Cart)"},
    {"app": "Chrome", "tab": "https://www.ebay.com/itm/123", "duration": 450, "desc": "Shopping - Auction"},
    {"app": "Chrome", "tab": "https://www.flipkart.com/search", "duration": 600, "desc": "Product Search"},
    {"app": "Chrome", "tab": "https://www.aliexpress.com/", "duration": 900, "desc": "Browsing Gadgets"},
    {"app": "Chrome", "tab": "https://www.ign.com/reviews", "duration": 600, "desc": "Gaming News"},
    {"app": "Chrome", "tab": "https://www.gamespot.com/", "duration": 400, "desc": "Gaming Site"},
    {"app": "Spotify", "tab": "Artist - Song Name", "duration": 3600, "desc": "Background Music (Social)"},
    {"app": "Discord", "tab": "Gaming Hangout | Voice", "duration": 2400, "desc": "Social Gaming Voice"},
    {"app": "Steam", "tab": "Counter-Strike: Global Offensive", "duration": 7200, "desc": "Gaming (App)"},
    {"app": "Epic Games", "tab": "Fortnite Launcher", "duration": 300, "desc": "Game Launcher"},
    {"app": "Battle.net", "tab": "Overwatch 2", "duration": 5400, "desc": "Gaming (Launcher/App)"},
    {"app": "RobloxPlayer", "tab": "Roblox Game", "duration": 3600, "desc": "Kids/Social Gaming"},
    {"app": "Minecraft", "tab": "Minecraft Launcher", "duration": 180, "desc": "Game Start"},
    {"app": "Chrome", "tab": "https://chess.com/play/online", "duration": 1200, "desc": "Online Board Game"},
    {"app": "Chrome", "tab": "https://www.buzzfeed.com/quiz", "duration": 300, "desc": "Time Wasting Quiz"},
    {"app": "Chrome", "tab": "https://9gag.com/trending", "duration": 450, "desc": "Looking at Funny Memes"},
    {"app": "Chrome", "tab": "https://www.pinterest.com/home", "duration": 600, "desc": "Pinterest Scrolling"},
    {"app": "Chrome", "tab": "https://www.behance.net/", "duration": 300, "desc": "Art Browsing (Distraction)"},
    {"app": "Calculator", "tab": "Calculator", "duration": 30, "desc": "Simple Calculation"},
    {"app": "Control Panel", "tab": "System Settings", "duration": 60, "desc": "Adjusting PC Config"},
    {"app": "Settings", "tab": "Windows Update", "duration": 300, "desc": "Maintenance Update"},
    {"app": "Display Settings", "tab": "Resolutions", "duration": 45, "desc": "Display Tweak"},
    {"app": "Task Manager", "tab": "Process Monitoring", "duration": 120, "desc": "System Monitor"},
    {"app": "File Explorer", "tab": "Documents/Project", "duration": 60, "desc": "File Navigation"},
    {"app": "Finder", "tab": "Downloads", "duration": 30, "desc": "File Access (Mac)"},
    {"app": "Nautilus", "tab": "Home Directory", "duration": 40, "desc": "File Access (Linux)"},
    {"app": "Notepad", "tab": "temp.txt", "duration": 60, "desc": "Fast Snippet Note"},
    {"app": "TextEdit", "tab": "memo.rtf", "duration": 180, "desc": "Writing Short Memo"},
    {"app": "KDE Connect", "tab": "Phone Sync", "duration": 10, "desc": "Sync Utility"},
    {"app": "Chrome", "tab": "http://localhost:3000/", "duration": 1800, "desc": "Local App Development"},
    {"app": "Chrome", "tab": "http://127.0.0.1:8000/", "duration": 600, "desc": "Internal API Testing"},
    {"app": "Chrome", "tab": "https://www.google.com/search?q=weather", "duration": 30, "desc": "Quick Google Search"},
    {"app": "Chrome", "tab": "https://www.google.com/maps", "duration": 300, "desc": "Looking for Route"},
    {"app": "Wireshark", "tab": "Capturing on eth0", "duration": 600, "desc": "Network Analysis"},
    {"app": "Burp Suite", "tab": "Proxy Intercept", "duration": 1200, "desc": "Security Auditing"},
    {"app": "IDA Pro", "tab": "Reversing binary", "duration": 3600, "desc": "Reverse Engineering"},
    {"app": "Matlab", "tab": "Simulation.m", "duration": 2400, "desc": "Scientific Computing"},
    {"app": "RStudio", "tab": "analysis.R", "duration": 1800, "desc": "Statistical Analysis"},
    {"app": "Chrome", "tab": "https://pypi.org/project/fastapi/", "duration": 300, "desc": "Library Research (PyPI)"},
    {"app": "Chrome", "tab": "https://npmjs.com/package/react", "duration": 300, "desc": "Library Research (NPM)"},
    {"app": "Chrome", "tab": "https://hub.docker.com/_/postgres", "duration": 600, "desc": "Image Research (DockerHub)"},
    {"app": "Chrome", "tab": "https://console.cloud.google.com/", "duration": 1800, "desc": "GCP Console 관리"},
    {"app": "Chrome", "tab": "https://portal.azure.com/", "duration": 1200, "desc": "Azure Management"},
    {"app": "Chrome", "tab": "https://vercel.com/dashboard", "duration": 600, "desc": "Deployment Monitoring"},
    {"app": "Chrome", "tab": "https://heroku.com/apps", "duration": 450, "desc": "PaaS Management"},
    {"app": "Chrome", "tab": "https://circleci.com/dashboard", "duration": 300, "desc": "CI/CD Monitoring"},
    {"app": "Chrome", "tab": "https://travis-ci.com/", "duration": 300, "desc": "CI Monitoring"},
    {"app": "Chrome", "tab": "https://jenkins.io/", "duration": 600, "desc": "CI Build Setup"},
    {"app": "Chrome", "tab": "https://bitbucket.org/", "duration": 900, "desc": "Repo Management"},
    {"app": "Chrome", "tab": "https://gitlab.com/", "duration": 1200, "desc": "GitLab Workflow"},
    {"app": "Chrome", "tab": "https://bit.ly/3xYzAb", "duration": 60, "desc": "Shortened Link (Unknown)"},
    {"app": "Chrome", "tab": "https://t.co/xyz123", "duration": 30, "desc": "Twitter Link"},
    {"app": "Chrome", "tab": "https://tinyurl.com/abc", "duration": 45, "desc": "Redirect Link"},
    {"app": "Chrome", "tab": "https://archive.org/web/", "duration": 600, "desc": "Wayback Machine"},
    {"app": "Chrome", "tab": "https://news.google.com/", "duration": 600, "desc": "News Reading (Mixed)"},
    {"app": "Chrome", "tab": "https://quora.com/", "duration": 900, "desc": "Knowledge Sharing (Mixed)"},
]
print("\n=== PREDICTIONS ===")
results = []
print(f"{'#' : <3} | {'Description':<30} | {'App / Tab':<40} | {'Result':<12} | {'Conf'} | {'Matches'}")
print("-" * 140)
for i, case in enumerate(test_cases, 1):
    combined_text = f"{case['app']} {case['tab']}"
    label, conf, matches = predict(combined_text, case['duration'])
    results.append(label)
    display_text = f"{case['app']} ({case['tab'][:20]}...)"
    print(f"{i: <3} | {case['desc']:<30} | {display_text:<40} | {label:<12} | {conf:.1%} | {matches}")
print("\n" + "=" * 40)
print("SUMMARY")
print("=" * 40)
counts = Counter(results)
print(f"Total items      : {len(results)}")
print(f"PRODUCTIVE       : {counts['PRODUCTIVE']}")
print(f"NON-PROD         : {counts['NON-PROD']}")
print("=" * 40)
