import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib

# Load the original dataset
df = pd.read_csv('FocusaiModelTraining.csv')

# Clean the data - remove any rows with missing labels
df = df.dropna(subset=['Label'])
df = df[df['Label'].isin(['Focused', 'Distracted'])]  # Keep only valid labels

print(f"Dataset shape: {df.shape}")
print(f"Label distribution:\n{df['Label'].value_counts()}")

# Define development tools that should be considered focused
DEV_TOOLS = [
    'MongoDB Compass', 'Postman', 'Terminal', 'Gnome-terminal', 
    'VS Code', 'Code', 'Notepad++', 'IntelliJ IDEA',
    'Docker', 'MySQL Workbench', 'pgAdmin', 'Redis CLI',
    'Gnome-control-center', 'GitHub Desktop'
]

# Define work-related browser activities
WORK_BROWSER_KEYWORDS = [
    'stack overflow', 'github', 'geeksforgeeks', 'leetcode', 
    'hackerrank', 'medium', 'documentation', 'api docs',
    'tutorial', 'guide', 'backend', 'frontend', 'code'
]

def enhance_labels(row):
    """Enhanced labeling logic for development activities"""
    app_name = str(row['App_Name'])
    tab_name = str(row['Tab_Name']).lower()
    duration = row['Usage_Seconds']
    
    # Development tools are always focused (regardless of duration)
    if app_name in DEV_TOOLS:
        return 'Focused'
    
    # Browser activities - check tab content
    if app_name in ['Chrome', 'Google-chrome', 'Firefox', 'Edge']:
        # Work-related browser tabs
        if any(work_term in tab_name for work_term in WORK_BROWSER_KEYWORDS):
            return 'Focused'
        # Entertainment keywords
        if any(term in tab_name for term in ['memes', 'funny', 'comedy', 'jokes', 'reels', 'stories', 'feed']):
            return 'Distracted'
    
    # Communication tools - depends on context
    if app_name in ['Teams', 'Slack', 'Zoom', 'Google Meet']:
        if any(term in tab_name for term in ['meeting', 'call', 'sync', 'standup', 'review', 'planning', 'sprint']):
            return 'Focused'
    
    # Social media and entertainment
    if app_name in ['Instagram', 'Facebook', 'Twitter', 'Netflix', 'TikTok']:
        if any(term in tab_name for term in ['tech', 'programming', 'coding', 'development']):
            return 'Focused'  # Tech-related social content
        else:
            return 'Distracted'
    
    # Default to original label
    return row['Label']

# Apply enhanced labeling
print("Applying enhanced labeling rules...")
df['Enhanced_Label'] = df.apply(enhance_labels, axis=1)

# Show the changes
changes = df[df['Label'] != df['Enhanced_Label']]
print(f"Labels changed for {len(changes)} rows")

# Use enhanced labels for training
df['Label'] = df['Enhanced_Label']

# Create additional features
def create_features(df):
    """Create additional features for better classification"""
    
    # Duration-based features
    df['duration_log'] = np.log1p(df['Usage_Seconds'])
    df['is_short_duration'] = (df['Usage_Seconds'] < 300).astype(int)
    df['is_medium_duration'] = ((df['Usage_Seconds'] >= 300) & (df['Usage_Seconds'] < 1200)).astype(int)
    df['is_long_duration'] = (df['Usage_Seconds'] >= 1200).astype(int)
    
    # App category features
    dev_tools = ['VS Code', 'Code', 'MongoDB Compass', 'Postman', 'Terminal', 'Gnome-terminal', 'IntelliJ IDEA']
    browsers = ['Chrome', 'Google-chrome', 'Firefox', 'Edge']
    communication = ['Teams', 'Slack', 'Zoom', 'Google Meet']
    entertainment = ['Netflix', 'Instagram', 'Facebook', 'Twitter', 'TikTok']
    
    df['is_dev_tool'] = df['App_Name'].isin(dev_tools).astype(int)
    df['is_browser'] = df['App_Name'].isin(browsers).astype(int)
    df['is_communication'] = df['App_Name'].isin(communication).astype(int)
    df['is_entertainment'] = df['App_Name'].isin(entertainment).astype(int)
    
    # Tab content features
    work_keywords = ['code', 'api', 'tutorial', 'documentation', 'stack overflow', 'github', 'backend', 'frontend']
    entertainment_keywords = ['memes', 'funny', 'comedy', 'reels', 'stories', 'feed']
    
    df['work_content_score'] = df['Tab_Name'].str.lower().apply(
        lambda x: sum(1 for keyword in work_keywords if keyword in str(x))
    )
    df['entertainment_content_score'] = df['Tab_Name'].str.lower().apply(
        lambda x: sum(1 for keyword in entertainment_keywords if keyword in str(x))
    )
    
    return df

# Apply feature engineering
print("Creating additional features...")
df = create_features(df)

# Encode categorical features
print("Encoding categorical features...")
app_name_encoder = LabelEncoder()
tab_name_encoder = LabelEncoder()
label_encoder = LabelEncoder()

df['AppNameEncoded'] = app_name_encoder.fit_transform(df['App_Name'].astype(str))
df['TabNameEncoded'] = tab_name_encoder.fit_transform(df['Tab_Name'].astype(str))
df['LabelEncoded'] = label_encoder.fit_transform(df['Label'])

print(f"Unique labels: {label_encoder.classes_}")

# Prepare features
feature_columns = [
    'AppNameEncoded', 'TabNameEncoded', 'Usage_Seconds', 'duration_log',
    'is_short_duration', 'is_medium_duration', 'is_long_duration',
    'is_dev_tool', 'is_browser', 'is_communication', 'is_entertainment',
    'work_content_score', 'entertainment_content_score'
]

X = df[feature_columns]
y = df['LabelEncoded']

print(f"Feature matrix shape: {X.shape}")
print(f"Target distribution: {np.bincount(y)}")

# Train enhanced model
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# Use Random Forest for better feature handling
model = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42,
    class_weight='balanced'  # Handle class imbalance
)

print("Training enhanced model...")
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)

print("Enhanced Model Performance:")
print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=label_encoder.classes_))

# Feature importance
feature_importance = pd.DataFrame({
    'feature': feature_columns,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

print("\nTop 10 Feature Importance:")
print(feature_importance.head(10))

# Save enhanced model and encoders
print("Saving enhanced model and encoders...")
joblib.dump(model, 'enhanced_focus_model.pkl')
joblib.dump(app_name_encoder, 'enhanced_app_name_encoder.pkl')
joblib.dump(tab_name_encoder, 'enhanced_tab_name_encoder.pkl')
joblib.dump(label_encoder, 'enhanced_label_encoder.pkl')

# Save feature columns for prediction
joblib.dump(feature_columns, 'enhanced_feature_columns.pkl')

print("✅ Enhanced model training completed successfully!")

# Test with development tools
print("\n🧪 Testing with development tools:")
test_cases = [
    ('VS Code', 'main.py', 3600),
    ('MongoDB Compass', 'Database Query', 300),
    ('Chrome', 'Stack Overflow - Python', 1200),
    ('Instagram', 'Stories Feed', 600)
]

for app, tab, duration in test_cases:
    try:
        # Create features for prediction
        test_data = pd.DataFrame({
            'App_Name': [app],
            'Tab_Name': [tab],
            'Usage_Seconds': [duration]
        })
        
        # Apply same feature engineering
        test_data = create_features(test_data)
        
        # Handle unknown categories
        try:
            app_encoded = app_name_encoder.transform([app])[0]
        except ValueError:
            app_encoded = 0  # Default to first class
            
        try:
            tab_encoded = tab_name_encoder.transform([tab])[0]
        except ValueError:
            tab_encoded = 0  # Default to first class
        
        test_data['AppNameEncoded'] = app_encoded
        test_data['TabNameEncoded'] = tab_encoded
        
        test_features = test_data[feature_columns].values
        
        prediction = model.predict(test_features)[0]
        confidence = max(model.predict_proba(test_features)[0])
        predicted_label = label_encoder.inverse_transform([prediction])[0]
        
        print(f"{app} -> {predicted_label} ({confidence:.3f})")
        
    except Exception as e:
        print(f"Error testing {app}: {e}")