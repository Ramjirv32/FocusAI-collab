from fastapi import APIRouter, HTTPException
from typing import Optional
from ..schemas.response_models import FocusAnalysisResponse
from ...data.sample.sample_data import REAL_MONGODB_DATA
from ...models.classifiers.smart_classifier import SmartFocusClassifier
from ...utils.data_utils import process_user_data

router = APIRouter(prefix="/focus", tags=["Focus Analysis"])

@router.get("/user/{user_id}/analysis", response_model=FocusAnalysisResponse)
async def get_user_focus_analysis(user_id: str, date: Optional[str] = None):
    """Get comprehensive focus analysis for a user"""
    try:
        classifier = SmartFocusClassifier()
        
        if not date:
            date = "2025-07-12"
        
        # Filter user data
        user_data = [
            item for item in REAL_MONGODB_DATA 
            if item["userId"] == user_id and item["date"] == date
        ]
        
        if not user_data:
            raise HTTPException(
                status_code=404, 
                detail=f"No data found for user {user_id} on {date}"
            )
        
        # Process with smart classifier
        analysis_result = await process_user_data(user_data, classifier)
        
        return analysis_result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")

@router.get("/user/{user_id}/real-time")
async def get_real_time_analysis(user_id: str):
    """Get real-time focus analysis"""
    # Implementation for real-time analysis
    return {"message": "Real-time analysis endpoint", "user_id": user_id}