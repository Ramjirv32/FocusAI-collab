import requests
import json
from datetime import datetime

def test_focus_analysis():
    """Test the focus analysis by triggering it manually"""
    
    # Test user ID from your system - using the one from your logs
    user_id = "68906d04c70329933379c241"
    email = "user@example.com"
    
    print("🧪 Testing focus analysis system...")
    print(f"Testing with user ID: {user_id}")
    
    # First, trigger the manual analysis
    try:
        response = requests.post(f"http://localhost:8000/analyze-and-store/{user_id}", 
                               params={"email": email})
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Analysis completed successfully!")
            print(f"Success: {result.get('success')}")
            print(f"Message: {result.get('message')}")
            print(f"Productivity Score: {result.get('productivity_score', 'N/A')}")
            print(f"Focus Areas: {result.get('focus_areas_count', 'N/A')}")
            print(f"Distraction Areas: {result.get('distraction_areas_count', 'N/A')}")
        else:
            print(f"❌ Analysis failed with status {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error during analysis: {e}")
    
    # Test if the backend has received and stored the data
    print("\n📊 Testing backend focus areas storage...")
    try:
        # Get token from a real user (you'll need to login first)
        token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODhmMzlkM2QxMDhiZmZmYzIxZTU3MWMiLCJlbWFpbCI6ImhAZ21haWwuY29tIiwiaWF0IjoxNzU0MjkzMDA1LCJleHAiOjE3NTQ4OTc4MDV9.3D98ZzHX9ZvSbrSmHP5wzgvmr25tJp-_73H9BgkFvuI"
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get("http://localhost:5001/focus-areas", 
                              headers=headers,
                              params={"date": datetime.now().strftime("%Y-%m-%d"), "timeFrame": "daily"})
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Backend API responded successfully!")
            print(f"Focus Areas: {len(result.get('focusAreas', []))}")
            print(f"Distraction Areas: {len(result.get('distractionAreas', []))}")
            print(f"Total Focus Time: {result.get('totalFocusTime', 0)} seconds")
            print(f"Total Distraction Time: {result.get('totalDistractionTime', 0)} seconds")
            
            # Print detailed focus areas
            if result.get('focusAreas'):
                print("\n🎯 Focus Areas:")
                for area in result['focusAreas']:
                    print(f"  - {area.get('name')}: {area.get('duration')} seconds")
                    
            if result.get('distractionAreas'):
                print("\n😵 Distraction Areas:")
                for area in result['distractionAreas']:
                    print(f"  - {area.get('name')}: {area.get('duration')} seconds")
                    
            # Test top users
            if result.get('topUsers'):
                print("\n👥 Top Users:")
                for user in result['topUsers']:
                    print(f"  - {user.get('name')}: {user.get('avgProductivity')}% productivity")
        else:
            print(f"❌ Backend API failed with status {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error testing backend API: {e}")

def test_direct_backend_storage():
    """Test storing focus data directly to backend"""
    print("\n🔧 Testing direct backend storage...")
    
    # Test data to store directly
    test_data = {
        "userId": "68906d04c70329933379c241",
        "email": "test@example.com",
        "date": datetime.now().strftime("%Y-%m-%d"),
        "productivityScore": 85,
        "focusAreas": [
            {
                "category": "Development",
                "total_duration": 7200,  # 2 hours
                "activity_count": 5,
                "apps": ["VSCode", "Terminal"],
                "avg_confidence": 0.9
            },
            {
                "category": "Communication",
                "total_duration": 1800,  # 30 minutes
                "activity_count": 3,
                "apps": ["Slack"],
                "avg_confidence": 0.85
            }
        ],
        "distractionAreas": [
            {
                "category": "Social Media",
                "total_duration": 1200,  # 20 minutes
                "activity_count": 2,
                "apps": ["Facebook"],
                "avg_confidence": 0.95
            }
        ],
        "totalFocusTimeSeconds": 9000,  # 2.5 hours
        "totalDistractionTimeSeconds": 1200  # 20 minutes
    }
    
    try:
        response = requests.post("http://localhost:5001/focus-areas", 
                               json=test_data,
                               headers={"Content-Type": "application/json"})
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Direct backend storage successful!")
            print(f"Response: {result}")
        else:
            print(f"❌ Direct backend storage failed with status {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error with direct backend storage: {e}")

if __name__ == "__main__":
    test_focus_analysis()
    test_direct_backend_storage()
    
    # Now test the backend API to see if data was stored
    print("\n📊 Testing backend API...")
    try:
        # Get a token (you may need to adjust this based on your auth system)
        token = "your_jwt_token_here"  # Replace with actual token
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get("http://localhost:5001/focus-areas", 
                              headers=headers,
                              params={"date": datetime.now().strftime("%Y-%m-%d"), "timeFrame": "daily"})
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Backend API responded successfully!")
            print(f"Focus Areas: {len(result.get('focusAreas', []))}")
            print(f"Distraction Areas: {len(result.get('distractionAreas', []))}")
            print(f"Total Focus Time: {result.get('totalFocusTime', 0)} seconds")
            print(f"Total Distraction Time: {result.get('totalDistractionTime', 0)} seconds")
            
            # Print detailed focus areas
            if result.get('focusAreas'):
                print("\n🎯 Focus Areas:")
                for area in result['focusAreas']:
                    print(f"  - {area.get('name')}: {area.get('duration')} seconds")
                    
            if result.get('distractionAreas'):
                print("\n😵 Distraction Areas:")
                for area in result['distractionAreas']:
                    print(f"  - {area.get('name')}: {area.get('duration')} seconds")
        else:
            print(f"❌ Backend API failed with status {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error testing backend API: {e}")

if __name__ == "__main__":
    test_focus_analysis()
