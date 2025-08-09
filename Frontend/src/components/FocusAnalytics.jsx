// Import the API URLs from your service file
import { AI_API_URL, MODEL_API_URL, BACKEND_API_URL } from '../services/activityDataService';

// Then use them in your fetch calls:
const summaryResponse = await fetch(`${AI_API_URL}/user/${userId}/productivity-summary?date=${date}&email=${email}`);
const analysisResponse = await fetch(`${AI_API_URL}/user/${userId}/productivity-analysis?date=${date}&email=${email}`);