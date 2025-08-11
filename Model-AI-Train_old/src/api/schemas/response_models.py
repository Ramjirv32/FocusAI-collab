from pydantic import BaseModel
from typing import List, Dict, Any

class FocusActivity(BaseModel):
    app_name: str
    tab_title: str
    duration: int
    predicted_label: str
    confidence: float
    timestamp: str
    classification_reason: str = "Smart classification"

class CategoryAnalysis(BaseModel):
    category: str
    total_duration: int
    activity_count: int
    apps: List[str]
    avg_confidence: float

class FocusAnalysisResponse(BaseModel):
    user_id: str
    analysis_date: str
    total_activities: int
    total_duration: int
    focus_areas: List[CategoryAnalysis]
    distraction_areas: List[CategoryAnalysis]
    detailed_activities: List[FocusActivity]
    summary: Dict[str, Any]
    classifier_version: str = "smart_v2.0"