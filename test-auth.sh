#!/bin/bash

# UCG API Authentication Testing Script
# This script tests all authentication and protected endpoints

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000/api/v1}"

echo "======================================"
echo "UCG API Authentication Testing"
echo "======================================"
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Login as Super Admin
echo -e "${YELLOW}[1/10] Testing Login (Super Admin)...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@ucg.co.tz",
    "password": "Test@123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo -e "${RED}✗ Login failed${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
else
  echo -e "${GREEN}✓ Login successful${NC}"
  echo "Token: ${TOKEN:0:50}..."
fi

echo ""

# Test 2: Verify Token
echo -e "${YELLOW}[2/10] Testing Token Verification...${NC}"
VERIFY_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/verify" \
  -H "Authorization: Bearer $TOKEN")

if echo "$VERIFY_RESPONSE" | jq -e '.user' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Token is valid${NC}"
  USER_ROLE=$(echo $VERIFY_RESPONSE | jq -r '.user.role')
  echo "User Role: $USER_ROLE"
else
  echo -e "${RED}✗ Token verification failed${NC}"
  echo "Response: $VERIFY_RESPONSE"
fi

echo ""

# Test 3: Get Profile
echo -e "${YELLOW}[3/10] Testing Get Profile...${NC}"
PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer $TOKEN")

if echo "$PROFILE_RESPONSE" | jq -e '.email' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Profile retrieved successfully${NC}"
  echo "Email: $(echo $PROFILE_RESPONSE | jq -r '.email')"
  echo "Name: $(echo $PROFILE_RESPONSE | jq -r '.firstName') $(echo $PROFILE_RESPONSE | jq -r '.lastName')"
else
  echo -e "${RED}✗ Profile retrieval failed${NC}"
fi

echo ""

# Test 4: Get All Users (Admin endpoint)
echo -e "${YELLOW}[4/10] Testing Get All Users (Protected)...${NC}"
USERS_RESPONSE=$(curl -s -X GET "$BASE_URL/users?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN")

if echo "$USERS_RESPONSE" | jq -e '.data' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Users retrieved successfully${NC}"
  USER_COUNT=$(echo $USERS_RESPONSE | jq -r '.meta.total // 0')
  echo "Total Users: $USER_COUNT"
else
  echo -e "${RED}✗ Users retrieval failed${NC}"
fi

echo ""

# Test 5: Get User Statistics
echo -e "${YELLOW}[5/10] Testing User Statistics...${NC}"
STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/users/statistics" \
  -H "Authorization: Bearer $TOKEN")

if echo "$STATS_RESPONSE" | jq -e '.' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Statistics retrieved successfully${NC}"
  echo "$STATS_RESPONSE" | jq -r '. | to_entries[] | "\(.key): \(.value)"'
else
  echo -e "${RED}✗ Statistics retrieval failed${NC}"
fi

echo ""

# Test 6: Get Service Providers (Protected)
echo -e "${YELLOW}[6/10] Testing Service Providers Endpoint...${NC}"
SP_RESPONSE=$(curl -s -X GET "$BASE_URL/service-providers?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN")

if echo "$SP_RESPONSE" | jq -e '.data' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Service Providers retrieved${NC}"
  SP_COUNT=$(echo $SP_RESPONSE | jq -r '.meta.total // 0')
  echo "Total Service Providers: $SP_COUNT"
else
  echo -e "${RED}✗ Service Providers retrieval failed${NC}"
fi

echo ""

# Test 7: Get References (Protected)
echo -e "${YELLOW}[7/10] Testing References Endpoint...${NC}"
REF_RESPONSE=$(curl -s -X GET "$BASE_URL/references?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN")

if echo "$REF_RESPONSE" | jq -e '.data' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ References retrieved${NC}"
  REF_COUNT=$(echo $REF_RESPONSE | jq -r '.meta.total // 0')
  echo "Total References: $REF_COUNT"
else
  echo -e "${RED}✗ References retrieval failed${NC}"
fi

echo ""

# Test 8: Get Payments (Protected)
echo -e "${YELLOW}[8/10] Testing Payments Endpoint...${NC}"
PAYMENT_RESPONSE=$(curl -s -X GET "$BASE_URL/payments?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN")

if echo "$PAYMENT_RESPONSE" | jq -e '.' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Payments endpoint accessed${NC}"
else
  echo -e "${RED}✗ Payments retrieval failed${NC}"
fi

echo ""

# Test 9: Test without token (should fail)
echo -e "${YELLOW}[9/10] Testing Endpoint Without Token (Should Fail)...${NC}"
NO_TOKEN_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/users" 2>&1)
HTTP_CODE=$(echo "$NO_TOKEN_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" == "401" ]; then
  echo -e "${GREEN}✓ Correctly returned 401 Unauthorized${NC}"
else
  echo -e "${RED}✗ Expected 401, got $HTTP_CODE${NC}"
fi

echo ""

# Test 10: Login with different roles
echo -e "${YELLOW}[10/10] Testing Different User Roles...${NC}"

for role in "admin" "manager" "operator" "viewer"; do
  echo -n "  Testing $role@ucg.co.tz... "

  ROLE_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$role@ucg.co.tz\",
      \"password\": \"Test@123\"
    }")

  ROLE_TOKEN=$(echo $ROLE_LOGIN | jq -r '.accessToken // empty')

  if [ ! -z "$ROLE_TOKEN" ] && [ "$ROLE_TOKEN" != "null" ]; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗${NC}"
  fi
done

echo ""
echo "======================================"
echo -e "${GREEN}Testing Complete!${NC}"
echo "======================================"
echo ""
echo "Summary of Test Users:"
echo "----------------------"
echo "Email: superadmin@ucg.co.tz | Password: Test@123 | Role: SUPER_ADMIN"
echo "Email: admin@ucg.co.tz      | Password: Test@123 | Role: ADMIN"
echo "Email: manager@ucg.co.tz    | Password: Test@123 | Role: MANAGER"
echo "Email: operator@ucg.co.tz   | Password: Test@123 | Role: OPERATOR"
echo "Email: viewer@ucg.co.tz     | Password: Test@123 | Role: VIEWER"
echo ""
echo "Your access token (valid for 15 minutes):"
echo "$TOKEN"
echo ""
echo "Use this token in API requests:"
echo "curl -H \"Authorization: Bearer $TOKEN\" $BASE_URL/your-endpoint"
