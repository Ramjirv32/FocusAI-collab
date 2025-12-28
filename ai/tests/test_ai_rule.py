import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from main import predict_with_xgboost
print("=" * 80)
print(" " * 20 + "TESTING AI HARDCODED RULE IN MAIN.PY")
print("=" * 80)
test_cases = [
    ("Browser", "focusai", 40),
    ("Browser", "focus-ai", 40),
    ("Browser", "FOCUSAI", 40),
    ("Antigravity", "main.py", 40),
    ("Browser", "github", 40),
    ("Browser", "youtube", 40),
    ("ChatGPT", "conversation", 300),
    ("Gmail", "inbox", 60),
]
print("\n🧪 Testing predictions with AI hardcoded rule:\n")
for app_name, tab_name, duration in test_cases:
    result = predict_with_xgboost(app_name, tab_name, duration)
    label = result['label']
    confidence = result['confidence']
    emoji = "✅" if label == "Productive" else "❌"
    has_ai = 'ai' in app_name.lower() or 'ai' in tab_name.lower()
    ai_marker = " [AI RULE]" if has_ai else ""
    print(f"{emoji} {app_name:15s} | {tab_name:20s} | {duration:4d}s → {label:15s} ({confidence:.1%}){ai_marker}")
print("\n" + "=" * 80)
print("✅ Test complete! Apps/tabs with 'ai' are marked as Productive")
print("=" * 80)
