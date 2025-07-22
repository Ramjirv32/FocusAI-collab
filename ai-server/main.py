import os
from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic_settings import BaseSettings
from pymongo import MongoClient
from openai import OpenAI  # NEW
from dotenv import load_dotenv
load_dotenv()

# ==================== CONFIGURATION ====================
class Settings(BaseSettings):
    mongo_uri: str = os.getenv("MONGO_URI")
    openrouter_api_key: str = str(os.getenv("OPENROUTER_API_KEY"))  # Required
    model_name: str = os.getenv("MODEL_NAME")
    max_tokens: int = int(os.getenv("MAX_TOKENS", 2048))

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()

# ==================== MONGODB SERVICE ====================
from bson import ObjectId
class MongoService:
    def __init__(self):
        self.client = MongoClient(settings.mongo_uri)
        self.db = self.client.focuai

    def get_user_data(self, user_id: str) -> dict:
        """Retrieve user's app/tab usage data"""
        try:
           # Try both string and ObjectId
            query = {"userId": user_id}
            app_usage = list(self.db.appusages.find(query,{"date":1 , "appName":1,"duration":1,"_id":0 } ,limit=100))
            tab_usage = list(self.db.tabusages.find(query,{"_id":0 ,"domain":1,"title":1 , "duration":1,"date":1} ,limit=100))
            if not app_usage :
                # Try ObjectId if string didn't work
                try:
                    oid = ObjectId(user_id)
                    query = {"userId": oid}
                    app_usage = list(self.db.appusages.find(query,{"date":1 , "appName":1,"duration":1,"_id":0 } ,limit=100))
                    # tab_usage = list(self.db.tabusages.find(query, limit=100))
                except Exception:
                    pass
            return {
              "app_usage": app_usage,
              "tab_usage": tab_usage
            }
        except Exception as e:
            raise HTTPException(500, f"MongoDB error: {str(e)}")

mongo_service = MongoService()

# ==================== OpenRouter LLM SERVICE ====================
class OpenRouterLLMService:
    def __init__(self):
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.openrouter_api_key,
        )
        self.model = settings.model_name
        self.max_tokens = settings.max_tokens

    def generate(self, prompt: str) -> str:
        """Generate response using OpenRouter API"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                max_tokens=self.max_tokens,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            raise HTTPException(500, f"OpenRouter error: {str(e)}")

llm_service = OpenRouterLLMService()

# ==================== API ENDPOINTS ====================
router = APIRouter()

@router.post("/ask/{user_id}")
async def ask_question(user_id: str, question: str):
    print(f"Received question from user {user_id}: {question}")
    """Main chatbot endpoint"""
    try:
        # 1. Get user context
        context = mongo_service.get_user_data(user_id)
        print(f"User context: {context}")
        if not context:
            raise HTTPException(404, "User data not found")
        # 2. Create focused prompt
        prompt = f"""**Situation**
You are FocusAI, an advanced productivity assistant designed to analyze user app usage data and provide targeted, actionable insights to improve personal efficiency and time management.

**Task**
Carefully examine the provided user app usage data and directly answer the specific question while generating concrete, personalized productivity recommendations.

**Objective**
Empower the user to optimize their digital habits, reduce time-wasting activities, and enhance overall productivity through data-driven, practical suggestions.

**Knowledge**
- Analyze app usage patterns, screen time, and application interactions
- Focus on identifying potential productivity bottlenecks
- Provide clear, implementable recommendations
- Maintain a friendly, supportive chatbot communication style
- Use emojis to make the response engaging and approachable

**Key Performance Guidelines**
- Respond in a conversational, direct tone
- Do not ask further questions for suggestion.
- Avoid asking additional questions
- Do not use markdown or asterisks
- Prioritize actionable and specific suggestions
- Ensure recommendations are directly linked to the user's actual usage data

**Output Requirements**
- Concise, clear productivity advice
- Emoji-enhanced communication
- No follow-up questions
- Immediate, practical recommendations

USER DATA:
{context}

QUESTION: {question}
For general questions like Hi reply simple .Dont ever bold or highlight anything.
Respond in a chatbot tone with direct productivity suggestions. Do not use *'s or markdown.The output is not well formatted has *'s.
/Use emojis to make it more engaging./"""
        
        # 3. Get OpenRouter response
        response = llm_service.generate(prompt)
        return {"response": response}
    
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(500, f"Unexpected error: {str(e)}")

# ==================== FASTAPI APP ====================
app = FastAPI(title="FocusAI Chatbot", version="1.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Include the router after CORS is configured
app.include_router(router, prefix="/api/v1/chat")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "llm": "openrouter"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
