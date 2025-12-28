#!/bin/bash

echo "=========================================="
echo "  FOCUSAI LOGIN ENDPOINT TESTS"
echo "=========================================="
echo ""

BASE_URL="http://localhost:5001"

echo "Test 1: Login with non-existent user"
echo "Expected: 404 'User not found'"
curl -s -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@test.com","password":"test123"}' | python3 -m json.tool
echo ""
echo "---"
echo ""

echo "Test 2: Login with empty fields"
echo "Expected: 400 'Email and password are required'"
curl -s -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"","password":""}' | python3 -m json.tool
echo ""
echo "---"
echo ""

echo "Test 3: Login with existing user but wrong password"
echo "Expected: 401 'Incorrect password'"
echo "(Note: This will only work if you have a test user)"
curl -s -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"r@gmail.com","password":"wrongpassword"}' | python3 -m json.tool
echo ""
echo "=========================================="
echo "  TESTS COMPLETE"
echo "=========================================="
