import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
from tqdm import tqdm
NUM_ROWS = 250_000
START_DATE = datetime(2025, 1, 1)
OUTPUT_FILE = "active_web_dirty.csv"
PRODUCTIVE_APPS = [
    "VS Code","Visual Studio","PyCharm","IntelliJ IDEA","Eclipse",
    "NetBeans","Android Studio","CLion","WebStorm",
    "Docker Desktop","Kubernetes Dashboard","MongoDB Compass",
    "Postman","Redis Insight","pgAdmin","MySQL Workbench",
    "DBeaver","Lens","Portainer",
    "Windows Terminal","PowerShell","Command Prompt",
    "GNOME Terminal","Konsole","Alacritty","XTerm",
    "Jupyter Notebook","JupyterLab","Anaconda Navigator",
    "TensorBoard","RStudio",
    "Notion","Slack","Microsoft Teams","Zoom",
    "LibreOffice Writer","LibreOffice Calc"
]
NON_PROD_APPS = [
    "Netflix App","Spotify App","VLC Media Player",
    "Windows Media Player","Apple Music",
    "Steam","Epic Games","Roblox","Minecraft",
    "Discord","Telegram Desktop","WhatsApp Desktop",
    "Google Chrome","Microsoft Edge","Firefox"
]
ALL_APPS = PRODUCTIVE_APPS + NON_PROD_APPS
URL_DNA = {
    "productive": {
        "subdomains": [
            "app","console","dev","docs","portal","internal","api","repo",
            "jira","confluence","notion","slack","figma",
            "aws","gcp","azure","cloud","grafana","sentry","jenkins",
            "git","ci","cd","build","deploy","monitor","vault"
        ],
        "paths": [
            "/docs/guide","/api/v1/query","/repo/src/main",
            "/pull-requests","/issues","/dashboard/metrics",
            "/clusters/view","/containers/logs",
            "/models/train","/notebook/eda","/deploy/status"
        ],
        "keywords": ["docs","api","debug","tutorial","deployment"],
        "tlds": [".com",".io",".ai",".dev",".tech",".org"]
    },
    "nonprod": {
        "subdomains": [
            "www","m","play","watch","reels","shop","gaming",
            "stream","live","music","shorts","trending"
        ],
        "paths": [
            "/watch/video","/shorts/reel","/feed/trending",
            "/browse/movies","/shop/deals",
            "/game/start","/video/funny"
        ],
        "keywords": ["funny","viral","hot","cheap","meme"],
        "tlds": [".com",".tv",".shop",".gg",".xyz"]
    }
}
def generate_url(is_productive: bool):
    key = "productive" if is_productive else "nonprod"
    dna = URL_DNA[key]
    domain = "".join(random.choice("bcdfghjklmnpqrstvwxyz") for _ in range(8))
    sub = random.choice(dna["subdomains"])
    tld = random.choice(dna["tlds"])
    path = random.choice(dna["paths"])
    if random.random() < 0.4:
        path += f"/{random.choice(dna['keywords'])}"
    return f"https://{sub}.{domain}{tld}{path}"
rows = []
print("Generating dataset (original logic + app usage added)...")
for _ in tqdm(range(NUM_ROWS)):
    dt = START_DATE + timedelta(seconds=random.randint(0, 31536000))
    hour = dt.hour
    is_weekend = int(dt.weekday() >= 5)
    if 8 <= hour <= 18 and not is_weekend:
        label = np.random.choice([1, 0], p=[0.75, 0.25])
    else:
        label = np.random.choice([1, 0], p=[0.20, 0.80])
    actual_url_label = label
    if random.random() < 0.05:
        actual_url_label = 1 - label
    tab_url = generate_url(actual_url_label)
    if label == 1:
        app_name = random.choice(PRODUCTIVE_APPS)
        app_duration = int(np.random.lognormal(6.8, 0.6))
    else:
        app_name = random.choice(ALL_APPS)
        app_duration = int(np.random.lognormal(4.5, 1.0))
    if label == 1:
        url_duration = int(np.random.lognormal(6.5, 0.8))
    else:
        url_duration = int(np.random.lognormal(4.2, 1.1))
    rows.append({
        "app_name": app_name,
        "app_duration_seconds": min(app_duration, 14400),
        "tab_url": tab_url,
        "duration_seconds": min(url_duration, 14400),
        "hour": hour,
        "is_weekend": is_weekend,
        "label": label
    })
df = pd.DataFrame(rows)
df.to_csv(OUTPUT_FILE, index=False)
print(f"Dataset saved → {OUTPUT_FILE}")
