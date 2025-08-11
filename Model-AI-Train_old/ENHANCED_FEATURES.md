# Enhanced Productivity Analysis System

## Overview
The AI model server (`main.py`) has been enhanced with comprehensive productivity analysis capabilities that fetch user data, analyze it with machine learning, and update the backend with incremental storage logic.

## 🚀 New Features

### 1. Enhanced Data Fetching
- **Fetches both app usage and tab usage data** from the backend
- **Supports multiple backend endpoints** with fallback logic
- **Filters data by user ID, email, and date** for precise analysis

### 2. Comprehensive Data Processing
- **Separates app and tab usage** for detailed analysis
- **Categorizes activities** into productive and non-productive
- **Calculates multiple metrics**:
  - Productivity Score (Focus Score)
  - Distraction Score
  - Total productive/non-productive time
  - Most used apps and tabs

### 3. Incremental Backend Storage
- **Checks for existing productivity summaries** before storing
- **Implements differential calculation logic**:
  ```
  If existing summary has total_time = 1200s
  And new data shows total_time = 1300s
  Then add only the difference: 100s
  Final storage: 1200s + 100s = 1300s
  ```
- **Prevents double-counting** of already processed data
- **Updates both productive and non-productive content incrementally**

## 📊 New API Endpoints

### 1. `/user/{user_id}/analyze-and-store` (POST)
**Primary endpoint for complete productivity analysis**
- Fetches user app and tab usage data
- Processes data with AI model
- Calculates productivity/distraction scores
- Updates backend with incremental logic
- Returns comprehensive analysis results

**Parameters:**
- `user_id` (path): User identifier
- `date` (query, optional): Analysis date (defaults to today)
- `email` (query, optional): User email for filtering

**Response includes:**
- Focus and distraction areas
- Detailed activity breakdown
- Productivity metrics
- Backend update status
- Incremental update indicator

### 2. `/user/{user_id}/productivity-analysis` (GET)
**Simplified interface for getting analysis results**
- Calls the analyze-and-store endpoint internally
- Returns results in `FocusAnalysisResponse` format
- Compatible with existing frontend code

## 🔧 Key Functions

### `process_user_data(user_data)`
- Processes app and tab usage data separately
- Applies productivity classification rules
- Calculates comprehensive metrics
- Returns structured productivity data

### `get_existing_productivity_summary(user_id, email, date)`
- Fetches existing productivity summary from backend
- Used for incremental update logic
- Returns None if no existing summary found

### `update_backend_productivity_summary(user_id, email, date, new_metrics, existing_summary)`
- Implements incremental storage logic
- Calculates differential changes
- Updates backend with only new data
- Prevents double-counting of processed activities

### `fetch_real_mongodb_data(user_id, email, date)`
- Enhanced data fetching from multiple backend endpoints
- Processes both app and tab usage data
- Filters by user parameters
- Returns structured data for analysis

## 🏗️ Architecture Flow

```
1. Frontend Request → /user/{user_id}/analyze-and-store
2. Fetch Data → Backend MongoDB (app & tab usage)
3. Process Data → AI Classification & Metrics Calculation
4. Check Existing → Get current productivity summary
5. Calculate Diff → Incremental update logic (new - existing)
6. Update Backend → Store only differential changes
7. Return Results → Comprehensive analysis response
```

## 🎯 Classification Logic

### Productive Apps:
- Development tools: Code, VSCode, Terminal, Git, Docker
- Communication: Slack (work-related)
- Databases: MySQL, PostGIS, MongoDB Compass
- Design: Figma, Adobe Creative Suite

### Distracting Apps:
- Entertainment: Netflix, Spotify, YouTube, Gaming
- Social Media: Twitter, Instagram, Facebook, TikTok
- Non-work browsing: Reddit, entertainment websites

### Tab Classification:
- **Productive Sites**: GitHub, StackOverflow, Documentation sites
- **Distracting Sites**: Social media, entertainment platforms
- **Default**: Work-related browsing (assumed productive)

## 📈 Metrics Calculated

1. **Focus Score**: Percentage of time spent on productive activities
2. **Distraction Score**: Percentage of time spent on non-productive activities
3. **Total Productive Time**: Sum of all productive app/tab usage
4. **Total Non-Productive Time**: Sum of all distracting app/tab usage
5. **Most Productive App**: App with highest productive usage
6. **Most Visited Tab**: Browser tab with highest usage
7. **Activity Categorization**: Focus areas vs Distraction areas

## 🔄 Incremental Storage Benefits

1. **Prevents Double-Counting**: Only adds new time periods
2. **Maintains Data Accuracy**: Cumulative totals remain correct
3. **Efficient Updates**: Minimal backend processing
4. **Historical Continuity**: Preserves existing productivity data
5. **Real-time Sync**: Updates can be run multiple times safely

## 🧪 Testing

Run the test suite to verify functionality:
```bash
python test_enhanced_productivity.py
```

The test suite verifies:
- Enhanced analysis endpoint functionality
- Incremental update logic
- Backend integration
- Data fetching capabilities
- Server health checks

## 🚀 Usage Examples

### Basic Analysis:
```bash
curl -X POST "http://localhost:8000/user/123/analyze-and-store?date=2025-08-05&email=user@example.com"
```

### Get Analysis Results:
```bash
curl "http://localhost:8000/user/123/productivity-analysis?date=2025-08-05"
```

### Health Check:
```bash
curl "http://localhost:8000/"
```

## 🔧 Configuration

- **Backend URL**: `http://localhost:5001` (configurable in `fetch_real_mongodb_data`)
- **Timeout Settings**: 10-30 seconds for API calls
- **Classification Rules**: Defined in `process_user_data` function
- **Confidence Scores**: 0.60-0.85 based on classification certainty

This enhanced system provides comprehensive productivity analysis with intelligent incremental storage, ensuring accurate and efficient data processing for your FocusAI application.
