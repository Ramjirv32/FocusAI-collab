from fastapi import FastAPI
from contextlib import asynccontextmanager
from .routes import focus_analysis, user_stats, data_management
from ..models.classifiers.smart_classifier import SmartFocusClassifier
from ..config.settings import Settings

# Global classifier instance
classifier = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global classifier
    try:
        classifier = SmartFocusClassifier()
        print("✅ Smart Focus Classifier loaded successfully")
    except Exception as e:
        print(f"❌ Error loading classifier: {e}")
        classifier = None
    
    yield
    
    # Shutdown
    print("🔌 API shutting down")

app = FastAPI(
    title="Focus AI Analysis API",
    version="2.0.0",
    description="Advanced focus and productivity analysis system",
    lifespan=lifespan
)

# Include routers
app.include_router(focus_analysis.router, prefix="/api/v1")
app.include_router(user_stats.router, prefix="/api/v1")
app.include_router(data_management.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "message": "Focus AI Analysis API v2.0",
        "status": "running",
        "classifier_loaded": classifier is not None,
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "classifier_status": "loaded" if classifier else "not_loaded"
    }