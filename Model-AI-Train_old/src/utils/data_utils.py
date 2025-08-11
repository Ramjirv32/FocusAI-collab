from typing import List, Dict
from ..api.schemas.response_models import FocusAnalysisResponse, FocusActivity, CategoryAnalysis
from ..models.classifiers.smart_classifier import SmartFocusClassifier

async def process_user_data(user_data: List[Dict], classifier: SmartFocusClassifier) -> FocusAnalysisResponse:
    """Process user data and return analysis response"""
    
    activities = []
    for item in user_data:
        result = classifier.classify(
            app_name=item["appName"],
            tab_name=f"{item['appName']} - Activity",
            duration=item["duration"]
        )
        
        activity = FocusActivity(
            app_name=item["appName"],
            tab_title=f"{item['appName']} - Activity",
            duration=item["duration"],
            predicted_label=result['label'],
            confidence=round(result['confidence'], 4),
            timestamp=item["lastUpdated"],
            classification_reason=result['reason']
        )
        activities.append(activity)
    
    # Categorize activities
    focus_areas, distraction_areas = categorize_activities(activities)
    
    # Generate summary
    summary = generate_summary(activities)
    
    return FocusAnalysisResponse(
        user_id=user_data[0]["userId"],
        analysis_date=user_data[0]["date"],
        total_activities=len(activities),
        total_duration=sum(a.duration for a in activities),
        focus_areas=focus_areas,
        distraction_areas=distraction_areas,
        detailed_activities=activities,
        summary=summary
    )

def categorize_activities(activities: List[FocusActivity]) -> tuple:
    """Categorize activities into focus and distraction areas"""
    focus_activities = [a for a in activities if a.predicted_label.lower() == 'focused']
    distraction_activities = [a for a in activities if a.predicted_label.lower() == 'distracted']
    
    focus_areas = create_category_analysis(focus_activities, "Focused")
    distraction_areas = create_category_analysis(distraction_activities, "Distracted")
    
    return focus_areas, distraction_areas

def create_category_analysis(activities: List[FocusActivity], category: str) -> List[CategoryAnalysis]:
    """Create category analysis from activities"""
    if not activities:
        return []
    
    app_groups = {}
    for activity in activities:
        app = activity.app_name
        if app not in app_groups:
            app_groups[app] = []
        app_groups[app].append(activity)
    
    category_list = []
    for app, app_activities in app_groups.items():
        total_duration = sum(a.duration for a in app_activities)
        avg_confidence = sum(a.confidence for a in app_activities) / len(app_activities)
        
        category_list.append(CategoryAnalysis(
            category=f"{category} - {app}",
            total_duration=total_duration,
            activity_count=len(app_activities),
            apps=[app],
            avg_confidence=round(avg_confidence, 4)
        ))
    
    category_list.sort(key=lambda x: x.total_duration, reverse=True)
    return category_list

def generate_summary(activities: List[FocusActivity]) -> Dict:
    """Generate comprehensive summary statistics"""
    if not activities:
        return {}
    
    total_duration = sum(a.duration for a in activities)
    focused_activities = [a for a in activities if a.predicted_label.lower() == 'focused']
    distracted_activities = [a for a in activities if a.predicted_label.lower() == 'distracted']
    
    focused_duration = sum(a.duration for a in focused_activities)
    distracted_duration = sum(a.duration for a in distracted_activities)
    
    from collections import Counter
    app_usage = Counter(a.app_name for a in activities)
    top_apps = app_usage.most_common(5)
    
    avg_confidence = sum(a.confidence for a in activities) / len(activities)
    
    return {
        "total_sessions": len(activities),
        "focused_sessions": len(focused_activities),
        "distracted_sessions": len(distracted_activities),
        "focus_percentage": round((len(focused_activities) / len(activities)) * 100, 2),
        "total_duration_minutes": round(total_duration / 60, 2),
        "focused_duration_minutes": round(focused_duration / 60, 2),
        "distracted_duration_minutes": round(distracted_duration / 60, 2),
        "average_confidence": round(avg_confidence, 4),
        "top_apps": [{"app": app, "usage_count": count} for app, count in top_apps],
        "productivity_score": round((focused_duration / total_duration) * 100, 2) if total_duration > 0 else 0
    }