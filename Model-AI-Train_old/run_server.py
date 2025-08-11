import uvicorn
from src.api.main import app
from src.config.settings import settings

if __name__ == "__main__":
    print("🚀 Starting Focus AI Analysis API v2.0...")
    print(f"📊 Server will run on http://{settings.API_HOST}:{settings.API_PORT}")
    print(f"📚 API Documentation: http://{settings.API_HOST}:{settings.API_PORT}/docs")
    
    uvicorn.run(
        "src.api.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True
    )