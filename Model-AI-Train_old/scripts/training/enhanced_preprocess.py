import pandas as pd
from sklearn.preprocessing import LabelEncoder
import joblib

# Load the original dataset
df = pd.read_csv('FocusaiModelTraining.csv')

# Define development tools that should be considered focused
DEV_TOOLS = [
    'MongoDB Compass', 'Postman', 'Terminal', 'Gnome-terminal', 
    'VS Code', 'Code', 'Notepad++', 'Stack Overflow', 'GitHub',
    'Docker', 'MySQL Workbench', 'pgAdmin', 'Redis CLI',
    'Gnome-control-center'  # System settings for dev environment
]

# Define work-related browser activities
WORK_BROWSER_ACTIVITIES = [
    'Stack Overflow', 'GitHub', 'GeeksforGeeks', 'LeetCode', 
    'HackerRank', 'Medium - Tech', 'Documentation', 'API Docs',
    'Tutorials', 'Backend Guide', 'Frontend Guide', 'Tutorial'
]

def enhance_labels(row):
    """Enhanced labeling logic for development activities"""
    app_name = row['App_Name']
    tab_name = row['Tab_Name']
    duration = row['Usage_Seconds']
    
    # Development tools are always focused (regardless of duration)
    if app_name in DEV_TOOLS:
        return 'Focused'
    
    # Browser activities - check tab content
    if app_name in ['Chrome', 'Google-chrome', 'Firefox']:
        # Work-related browser tabs
        if any(work_term in tab_name for work_term in WORK_BROWSER_ACTIVITIES):
            return 'Focused'
        # Learning content
        if any(term in tab_name.lower() for term in ['tutorial', 'guide', 'documentation', 'learn', 'course']):
            return 'Focused'
        # Entertainment
        if any(term in tab_name.lower() for term in ['memes', 'funny', 'comedy', 'jokes', 'reels', 'stories']):
            return 'Distracted'
    
    # Communication tools - depends on context
    if app_name in ['Teams', 'Slack', 'Zoom', 'Google Meet']:
        if any(term in tab_name.lower() for term in ['meeting', 'call', 'sync', 'standup', 'review', 'planning']):
            return 'Focused'
    
    # Social media and entertainment
    if app_name in ['Instagram', 'Facebook', 'Twitter', 'Netflix', 'Reddit']:
        if any(term in tab_name.lower() for term in ['tech', 'programming', 'coding', 'development']):
            return 'Focused'  # Tech-related social content
        else:
            return 'Distracted'
    
    # Default to original label if no rule applies
    return row['Label']

# Apply enhanced labeling
df['Enhanced_Label'] = df.apply(enhance_labels, axis=1)

# Use enhanced labels for training
df['Label'] = df['Enhanced_Label']

# Continue with normal preprocessing
app_name_encoder = LabelEncoder()
tab_name_encoder = LabelEncoder()
label_encoder = LabelEncoder()

df['AppNameEncoded'] = app_name_encoder.fit_transform(df['App_Name'])
df['TabNameEncoded'] = tab_name_encoder.fit_transform(df['Tab_Name'])
df['LabelEncoded'] = label_encoder.fit_transform(df['Label'])

# Save enhanced encoders
joblib.dump(app_name_encoder, 'enhanced_app_name_encoder.pkl')
joblib.dump(tab_name_encoder, 'enhanced_tab_name_encoder.pkl')
joblib.dump(label_encoder, 'enhanced_label_encoder.pkl')

df.to_csv('enhanced_training_data.csv', index=False)
print("✅ Enhanced training data created with better dev tool classification")