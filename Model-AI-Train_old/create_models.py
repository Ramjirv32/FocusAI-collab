import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder

print("🔧 Creating placeholder model files...")

# Create simple app name encoder
app_name_encoder = LabelEncoder()
app_names = ['Chrome', 'VS Code', 'Code', 'MongoDB Compass', 'Google-chrome', 'Gnome-terminal', 'focusai-app', 'Gnome-control-center']
app_name_encoder.fit(app_names)
joblib.dump(app_name_encoder, 'focus_model_app_name_encoder.pkl')
print("✅ Created app_name_encoder.pkl")

# Create simple tab name encoder
tab_name_encoder = LabelEncoder()
tab_names = ['Chrome - Activity', 'VS Code - Activity', 'Code - Activity', 'MongoDB Compass - Activity', 
            'Google-chrome - Activity', 'Gnome-terminal - Activity', 'YouTube - Comedy Clips']
tab_name_encoder.fit(tab_names)
joblib.dump(tab_name_encoder, 'tab_name_encoder.pkl')
print("✅ Created tab_name_encoder.pkl")

# Create simple label encoder
label_encoder = LabelEncoder()
labels = ['Focused', 'Distracted']
label_encoder.fit(labels)
joblib.dump(label_encoder, 'label_encoder.pkl')
print("✅ Created label_encoder.pkl")

# Create simple random forest model
X_dummy = np.array([[0, 0, 100], [0, 0, 200], [1, 1, 300], [1, 1, 400]])
y_dummy = np.array([0, 0, 1, 1])  # 0: Distracted, 1: Focused

model = RandomForestClassifier(n_estimators=10, random_state=42)
model.fit(X_dummy, y_dummy)
joblib.dump(model, 'focus_model.pkl')
print("✅ Created focus_model.pkl")

print("✅ All model files created successfully!")