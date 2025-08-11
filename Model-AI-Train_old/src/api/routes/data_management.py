from fastapi import APIRouter
from ...data.sample.sample_data import REAL_MONGODB_DATA

router = APIRouter(prefix="/data", tags=["Data Management"])

@router.get("/sample")
async def get_sample_data():
    """Get sample MongoDB data for testing"""
    return {"mongodb_data": REAL_MONGODB_DATA}

@router.get("/models/status")
async def get_model_status():
    """Get status of all loaded models"""
    return {
        "models": {
            "smart_classifier": "loaded",
            "enhanced_model": "available",
            "context_analyzer": "loaded"
        }
    }