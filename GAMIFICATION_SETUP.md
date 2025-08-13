# FocusAI Gamification Setup

This document provides instructions on how to get the gamification features working in the FocusAI application.

## Backend Setup

1. Navigate to the `focuaibackend` directory:
   ```
   cd /path/to/FocusAI-collab/focuaibackend
   ```

2. Install dependencies (if not already done):
   ```
   npm install
   ```

3. Start the backend server:
   ```
   ./start-server.sh
   ```
   
   Or directly:
   ```
   node server.js
   ```

The server will start on port 5001 by default.

## Frontend Setup

1. Navigate to the `Frontend` directory:
   ```
   cd /path/to/FocusAI-collab/Frontend
   ```

2. Install dependencies (if not already done):
   ```
   npm install
   ```

3. Start the frontend development server:
   ```
   npm run dev
   ```

## Testing the Gamification Features

1. Ensure both backend and frontend servers are running.
2. Navigate to the Gamification page in the application.
3. You should see your gamification stats, achievements, challenges, and leaderboard.

## Troubleshooting

If you encounter any issues:

1. Check that the backend server is running by visiting:
   ```
   http://localhost:5001/api/health
   ```

2. If you see 404 errors, make sure the routes are properly registered in `server.js`.

3. Check the backend console for any error messages.

4. If the frontend is showing sample data, check that your authentication token is valid and being sent correctly in the requests.
