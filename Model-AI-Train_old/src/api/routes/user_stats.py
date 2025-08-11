from fastapi import APIRouter, HTTPException
from typing import Optional
from ..routes.focus_analysis import get_user_focus_analysis

router = APIRouter(prefix="/stats", tags=["User Statistics"])

@router.get("/user/{user_id}/quick")
async def get_quick_stats(user_id: str, date: Optional[str] = None):
    """Get quick focus statistics for a user"""
    try:
        analysis = await get_user_focus_analysis(user_id, date)
        return {
            "user_id": user_id,
            "date": analysis.analysis_date,
            "quick_stats": analysis.summary,
            "focus_areas_count": len(analysis.focus_areas),
            "distraction_areas_count": len(analysis.distraction_areas)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting quick stats: {str(e)}")

@router.get("/user/{user_id}/trends")
async def get_user_trends(user_id: str, days: int = 7):
    """Get user productivity trends over time"""
    return {
        "user_id": user_id,
        "days": days,
        "message": "Trends analysis endpoint"
    }