#!/bin/bash

# Test script for gamification endpoints
# This script will help verify that the backend endpoints are working correctly

echo "Testing gamification endpoints..."

# Test health endpoint
echo -e "\n=== Testing health endpoint ==="
curl -s http://localhost:5001/api/health | jq

# Login to get a token
echo -e "\n=== Getting authentication token ==="
TOKEN=$(curl -s -X POST \
  http://localhost:5001/api/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }' | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Failed to get authentication token. Check credentials or server status."
  exit 1
fi

echo "Token obtained successfully!"

# Test gamification stats endpoint
echo -e "\n=== Testing gamification stats endpoint ==="
curl -s -X GET \
  http://localhost:5001/api/gamification/stats \
  -H "Authorization: Bearer $TOKEN" | jq

# Test achievements endpoint
echo -e "\n=== Testing gamification achievements endpoint ==="
curl -s -X GET \
  http://localhost:5001/api/gamification/achievements \
  -H "Authorization: Bearer $TOKEN" | jq

# Test challenges endpoint
echo -e "\n=== Testing gamification challenges endpoint ==="
curl -s -X GET \
  http://localhost:5001/api/gamification/challenges \
  -H "Authorization: Bearer $TOKEN" | jq

# Test leaderboard endpoint
echo -e "\n=== Testing gamification leaderboard endpoint ==="
curl -s -X GET \
  http://localhost:5001/api/gamification/leaderboard \
  -H "Authorization: Bearer $TOKEN" | jq

# Test timeline endpoint
echo -e "\n=== Testing gamification timeline endpoint ==="
curl -s -X GET \
  http://localhost:5001/api/gamification/timeline \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n=== Test complete ==="
