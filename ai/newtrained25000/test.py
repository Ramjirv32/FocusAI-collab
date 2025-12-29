import joblib
import numpy as np
from scipy.sparse import hstack
from collections import Counter

# =========================
# CONFIG
# =========================
THRESHOLD = 0.75
MODEL_FILE = "xgb_productivity.pkl"
VEC_FILE = "xgb_vectorizer.pkl"

import json
import os

# =========================
# HELPER TO LOAD LISTS
# =========================
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

# Load hard rules from files
FORCE_NON_PROD = load_list_from_file("FORCE_UNPROD.json")
FORCE_PROD = load_list_from_file("FORCE_PROD.json")

print(f"Loaded {len(FORCE_NON_PROD)} non-productive and {len(FORCE_PROD)} productive rules.")

# =========================
# LOAD MODEL
# =========================
print(f"Loading model (threshold={THRESHOLD})...")

model = joblib.load(MODEL_FILE)
vectorizer = joblib.load(VEC_FILE)

# =========================
# CORE PREDICTION FUNCTION
# =========================
def predict(text, duration, hour=14, is_weekend=0):
    text_l = text.lower()

    # ---- HARD RULE OVERRIDES ----
    if any(k in text_l for k in FORCE_NON_PROD):
        return "NON-PROD", 0.01

    if any(k in text_l for k in FORCE_PROD):
        return "PRODUCTIVE", 0.99

    # ---- ML INFERENCE ----
    X_text = vectorizer.transform([text])
    X_num = np.array([[duration, hour, is_weekend]])
    X = hstack([X_text, X_num]).tocsr()

    prob = model.predict_proba(X)[0][1]
    label = "PRODUCTIVE" if prob >= THRESHOLD else "NON-PROD"

    return label, prob

# =========================
# TEST INPUT (YOUR FORMAT)
# =========================
# { app_name : seconds }
# { tab_url  : seconds }
test_input = {
    "app": {
        # ===== IDEs / DEV TOOLS =====
        "VS Code": 1200,
        "PyCharm": 2400,
        "IntelliJ IDEA": 3000,
        "Eclipse": 1800,
        "Android Studio": 3600,
        "Jupyter Notebook": 5400,
        "JupyterLab": 4200,
        "MongoDB Compass": 1800,
        "Postman": 1500,
        "Docker Desktop": 2400,
        "Kubernetes Dashboard": 3000,
        "Redis Insight": 1200,
        "pgAdmin": 1800,
        "MySQL Workbench": 2100,
        "DBeaver": 2400,

        # ===== TERMINALS =====
        "Windows Terminal": 1800,
        "PowerShell": 900,
        "GNOME Terminal": 2400,
        "Konsole": 2100,

        # ===== COLLAB / DOCS =====
        "Notion": 3600,
        "Slack": 900,
        "Microsoft Teams": 3000,
        "Zoom": 3600,
        "LibreOffice Writer": 4200,
        "LibreOffice Calc": 2700,

        # ===== NON-PRODUCTIVE APPS =====
        "Spotify App": 3600,
        "Netflix App": 5400,
        "VLC Media Player": 1800,
        "Steam": 7200,
        "Epic Games": 3600,
        "Roblox": 4200,
        "Minecraft": 5400,
        "Discord": 2400,
        "Telegram Desktop": 1800,
        "WhatsApp Desktop": 900,
        "Google Chrome": 3000
    },

    "url": {
        # ===== PRODUCTIVE URLS =====
        "https://github.com/microsoft/vscode/pull/123": 1800,
        "https://gitlab.com/team/repo/merge_requests/42": 2400,
        "https://bitbucket.org/team/repo/pull-requests": 1500,
        "https://stackoverflow.com/questions/123/debug-null-pointer": 900,
        "https://fastapi.tiangolo.com/tutorial/bigger-applications/": 1200,
        "https://kubernetes.io/docs/concepts/workloads/pods/": 1800,
        "https://docs.mongodb.com/manual/aggregation/": 1500,
        "https://registry.terraform.io/providers/hashicorp/aws": 1200,
        "https://leetcode.com/problems/two-sum/solution/": 3600,
        "https://cloud.google.com/kubernetes/docs": 2400,
        "https://learn.microsoft.com/en-us/azure/": 1800,
        "https://grafana.com/docs/grafana/latest/": 1200,
        "https://sentry.io/organizations/my-org/issues/123": 900,

        # ===== YOUTUBE (LEARNING) =====
        "https://youtube.com/watch?v=dsa_full_course": 5400,
        "https://youtube.com/watch?v=system_design_interview": 4800,
        "https://youtube.com/watch?v=machine_learning_lecture": 3600,
        "https://youtube.com/watch?v=python_backend_fastapi": 4200,

        # ===== NON-PRODUCTIVE URLS =====
        "https://youtube.com/shorts/funny_video": 120,
        "https://youtube.com/watch?v=music_video": 300,
        "https://netflix.com/watch/series_episode": 5400,
        "https://disneyplus.com/movies/star-wars": 4800,
        "https://primevideo.com/watch/movie": 3600,
        "https://tiktok.com/@user/video/funny_prank": 180,
        "https://instagram.com/reels/viral_video": 300,
        "https://facebook.com/groups/memes": 900,
        "https://9gag.com/gag/funny_meme": 240,

        # ===== SHOPPING / NEWS =====
        "https://amazon.com/cart": 600,
        "https://flipkart.com/search/mobile": 900,
        "https://ebay.com/itm/product": 450,
        "https://bbc.com/news/world-update": 600,
        "https://cnn.com/article/celebrity-gossip": 300,

        # ===== MIXED / EDGE =====
        "https://en.wikipedia.org/wiki/Neural_network": 1800,
        "https://en.wikipedia.org/wiki/List_of_movies": 300,
        "https://google.com/maps/dir/home/office": 300
    }
}


# =========================
# EXECUTION
# =========================
print("\n=== PREDICTIONS ===")

results = []

print("\nAPP RESULTS")
print("-" * 60)
for app, sec in test_input["app"].items():
    label, conf = predict(app, sec)
    results.append(label)
    print(f"{app:<30} | {label:<12} | {conf:.1%}")

print("\nURL RESULTS")
print("-" * 60)
for url, sec in test_input["url"].items():
    label, conf = predict(url, sec)
    results.append(label)
    print(f"{url[:40]:<40} | {label:<12} | {conf:.1%}")

# =========================
# SUMMARY
# =========================
print("\n" + "=" * 40)
print("SUMMARY")
print("=" * 40)

counts = Counter(results)
print(f"Total items      : {len(results)}")
print(f"PRODUCTIVE       : {counts['PRODUCTIVE']}")
print(f"NON-PROD         : {counts['NON-PROD']}")
print("=" * 40)
