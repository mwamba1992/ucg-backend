#!/bin/bash

echo "=== Testing UCG API Authentication ==="
echo

# 1. Login
echo "1. Logging in..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@ucg.co.tz","password":"Test@123"}')

TOKEN=$(echo "$RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "$RESPONSE"
  exit 1
fi

echo "✅ Login successful!"
echo "Token: ${TOKEN:0:50}..."
echo

# 2. Test without token
echo "2. Testing endpoint WITHOUT token (should fail)..."
curl -s http://localhost:3000/api/v1/service-providers | head -c 200
echo
echo

# 3. Test with token
echo "3. Testing endpoint WITH token (should succeed)..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/service-providers | head -c 200
echo
echo

echo "✅ Test complete!"
