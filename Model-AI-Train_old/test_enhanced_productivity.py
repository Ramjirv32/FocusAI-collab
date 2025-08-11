#!/usr/bin/env python3
"""
Test script for enhanced productivity analysis functionality
This script tests the new features:
1. Fetch user tab and app usage data
2. Process and categorize productivity/distraction scores
3. Incremental backend storage with differential calculations
"""

import requests
import json
from datetime import datetime

# Configuration
AI_API_BASE_URL = "http://localhost:8000"
BACKEND_API_BASE_URL = "http://localhost:5001"
TEST_USER_ID = "68906d04c70329933379c241"
TEST_EMAIL = "test@example.com"

def test_enhanced_productivity_analysis():
    """Test the enhanced productivity analysis endpoint"""
    print("🧪 Testing Enhanced Productivity Analysis")
    print("=" * 50)
    
    today = datetime.now().strftime("%Y-%m-%d")
    
    try:
        # 1. Test the new analyze-and-store endpoint
        print(f"\n1️⃣ Testing /user/{TEST_USER_ID}/analyze-and-store...")
        
        response = requests.post(
            f"{AI_API_BASE_URL}/user/{TEST_USER_ID}/analyze-and-store",
            params={
                "date": today,
                "email": TEST_EMAIL
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Enhanced analysis successful!")
            print(f"📊 Results:")
            print(f"   - Focus Score: {result.get('summary', {}).get('productivity_score', 0)}%")
            print(f"   - Distraction Score: {result.get('productivity_metrics', {}).get('distraction_score', 0)}%")
            print(f"   - Total Activities: {result.get('total_activities', 0)}")
            print(f"   - Backend Update: {result.get('backend_update_status', 'unknown')}")
            print(f"   - Incremental Update: {result.get('incremental_update', False)}")
            
            # Display productivity breakdown
            print(f"\n📈 Productivity Breakdown:")
            for area in result.get('focus_areas', []):
                print(f"   - {area['category']}: {area['total_duration']}s ({len(area['apps'])} apps)")
                
            print(f"\n🎮 Distraction Breakdown:")
            for area in result.get('distraction_areas', []):
                print(f"   - {area['category']}: {area['total_duration']}s ({len(area['apps'])} apps)")
                
        else:
            print(f"❌ Enhanced analysis failed: {response.status_code}")
            print(f"Error: {response.text}")
    
        # 2. Test the productivity analysis endpoint (simplified interface)
        print(f"\n2️⃣ Testing /user/{TEST_USER_ID}/productivity-analysis...")
        
        response = requests.get(
            f"{AI_API_BASE_URL}/user/{TEST_USER_ID}/productivity-analysis",
            params={
                "date": today,
                "email": TEST_EMAIL
            },
            timeout=20
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Productivity analysis successful!")
            print(f"📊 Focus Analysis Results:")
            print(f"   - Productivity Score: {result['summary']['productivity_score']}%")
            print(f"   - Focus Time: {result['summary']['focused_duration_minutes']} minutes")
            print(f"   - Distraction Time: {result['summary']['distracted_duration_minutes']} minutes")
            print(f"   - Most Focused App: {result['summary']['most_focused_app']}")
            print(f"   - Most Distracting App: {result['summary']['most_distracting_app']}")
        else:
            print(f"❌ Productivity analysis failed: {response.status_code}")
            print(f"Error: {response.text}")
            
        # 3. Test incremental update by running the analysis again
        print(f"\n3️⃣ Testing incremental update (running analysis again)...")
        
        response = requests.post(
            f"{AI_API_BASE_URL}/user/{TEST_USER_ID}/analyze-and-store",
            params={
                "date": today,
                "email": TEST_EMAIL
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Second analysis completed!")
            print(f"   - Incremental Update: {result.get('incremental_update', False)}")
            print(f"   - Backend Status: {result.get('backend_update_status', 'unknown')}")
            
            if result.get('incremental_update'):
                print("🔄 Incremental update logic working correctly!")
            else:
                print("🆕 Created new summary (no existing data found)")
        else:
            print(f"❌ Second analysis failed: {response.status_code}")
        
        # 4. Test data fetching capability
        print(f"\n4️⃣ Testing data fetching from backend...")
        
        # Check if backend is accessible
        try:
            backend_response = requests.get(f"{BACKEND_API_BASE_URL}/public/focus-data", timeout=5)
            if backend_response.status_code == 200:
                data = backend_response.json()
                print(f"✅ Backend accessible - found {len(data.get('appUsage', []))} app records and {len(data.get('tabUsage', []))} tab records")
            else:
                print(f"⚠️ Backend returned status {backend_response.status_code}")
        except Exception as e:
            print(f"⚠️ Backend not accessible: {e}")
            
    except Exception as e:
        print(f"❌ Test failed with error: {e}")

def test_model_server_health():
    """Test if the AI model server is running and healthy"""
    print("\n🏥 Testing AI Model Server Health")
    print("=" * 50)
    
    try:
        response = requests.get(f"{AI_API_BASE_URL}/", timeout=5)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ AI Model Server is healthy: {result.get('message', 'N/A')}")
            print(f"   Status: {result.get('status', 'unknown')}")
        else:
            print(f"❌ AI Model Server unhealthy: {response.status_code}")
    except Exception as e:
        print(f"❌ Cannot reach AI Model Server: {e}")

def demonstrate_incremental_logic():
    """Demonstrate the incremental storage logic with examples"""
    print("\n🧮 Demonstrating Incremental Storage Logic")
    print("=" * 50)
    
    print("Example scenario:")
    print("📊 Existing Summary: Total Time = 1200s")
    print("📊 New Data Fetched: Total Time = 1300s")
    print("🔄 Incremental Logic: Add only the difference = 1300 - 1200 = 100s")
    print("💾 Updated Storage: 1200 + 100 = 1300s")
    print("")
    print("This prevents double-counting and ensures accurate cumulative metrics!")

if __name__ == "__main__":
    print("🚀 Enhanced Productivity Analysis Test Suite")
    print("=" * 60)
    
    # Test server health first
    test_model_server_health()
    
    # Demonstrate the incremental logic
    demonstrate_incremental_logic()
    
    # Run comprehensive tests
    test_enhanced_productivity_analysis()
    
    print("\n✨ Test suite completed!")
    print("=" * 60)
