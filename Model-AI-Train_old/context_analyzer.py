import pandas as pd
from collections import defaultdict

class ContextualAnalyzer:
    """Analyze usage patterns to improve classification"""
    
    def __init__(self):
        self.app_patterns = defaultdict(list)
        self.session_contexts = []
    
    def analyze_user_session(self, activities):
        """Analyze entire session for context"""
        session_apps = [a['appName'] for a in activities]
        
        # Development session indicators
        dev_indicators = ['Code', 'VS Code', 'Terminal', 'MongoDB Compass', 'Postman']
        dev_count = sum(1 for app in session_apps if app in dev_indicators)
        
        # If 50% or more apps are dev tools, it's a dev session
        if dev_count / len(session_apps) >= 0.5:
            return 'development_session'
        
        # Learning session indicators
        learning_indicators = ['Chrome', 'YouTube', 'Stack Overflow']
        learning_patterns = ['tutorial', 'guide', 'course', 'learn']
        
        # System maintenance session
        system_indicators = ['Gnome-control-center', 'Terminal', 'Chrome']
        
        return 'mixed_session'
    
    def adjust_classifications(self, activities, session_type):
        """Adjust classifications based on session context"""
        adjusted = []
        
        for activity in activities:
            original_label = activity['predicted_label']
            confidence = activity['confidence']
            
            # In development sessions, system tools are more likely focused
            if session_type == 'development_session':
                if activity['app_name'] in ['Gnome-control-center', 'Google-chrome', 'Terminal']:
                    if original_label == 'Distracted':
                        # Boost to focused with moderate confidence
                        activity['predicted_label'] = 'Focused'
                        activity['confidence'] = min(0.85, confidence + 0.20)
                        activity['adjustment_reason'] = 'Development session context'
            
            adjusted.append(activity)
        
        return adjusted

# Usage example
def enhanced_process_usage_data(app_data: List[Dict], tab_data: List[Dict]) -> List[FocusActivity]:
    """Enhanced processing with contextual analysis"""
    analyzer = ContextualAnalyzer()
    
    # First pass - get initial classifications
    activities = []
    for app_item in app_data:
        activity = create_focus_activity_smart(
            app_item["appName"],
            f"{app_item['appName']} - Activity",
            app_item["duration"],
            app_item["lastUpdated"]
        )
        if activity:
            activities.append(activity.__dict__)
    
    # Analyze session context
    session_type = analyzer.analyze_user_session(app_data)
    
    # Adjust based on context
    adjusted_activities = analyzer.adjust_classifications(activities, session_type)
    
    # Convert back to FocusActivity objects
    result = []
    for item in adjusted_activities:
        result.append(FocusActivity(**item))
    
    return result