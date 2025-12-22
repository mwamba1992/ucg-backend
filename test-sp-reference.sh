#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Server URL
SERVER="http://192.168.1.94:8000"

echo -e "${YELLOW}=== SP Reference Test Script ===${NC}\n"

# Check if TOKEN is provided
if [ -z "$TOKEN" ]; then
  echo -e "${RED}ERROR: TOKEN environment variable not set${NC}"
  echo "Usage: TOKEN=\"your-jwt-token\" ./test-sp-reference.sh"
  exit 1
fi

echo -e "${GREEN}Step 1: Decode JWT token${NC}"
# Decode the JWT payload (middle part)
PAYLOAD=$(echo $TOKEN | cut -d'.' -f2)
# Add padding if needed
case $((${#PAYLOAD} % 4)) in
  2) PAYLOAD="${PAYLOAD}==" ;;
  3) PAYLOAD="${PAYLOAD}=" ;;
esac
echo "Token Payload:"
echo $PAYLOAD | base64 -d 2>/dev/null | jq '.' || echo "Failed to decode token"
echo ""

echo -e "${GREEN}Step 2: List references (to get a valid reference number)${NC}"
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$SERVER/api/v1/sp/references?limit=5")
echo "$RESPONSE" | jq '.'

# Extract first reference number
REFERENCE_NUMBER=$(echo "$RESPONSE" | jq -r '.data.items[0].referenceNumber // empty')
REFERENCE_ID=$(echo "$RESPONSE" | jq -r '.data.items[0].id // empty')

echo ""
echo -e "${YELLOW}Found Reference:${NC}"
echo "  Reference Number: $REFERENCE_NUMBER"
echo "  Reference ID: $REFERENCE_ID"
echo ""

if [ -z "$REFERENCE_NUMBER" ]; then
  echo -e "${RED}No references found. Please create a reference first.${NC}"
  exit 1
fi

echo -e "${GREEN}Step 3: Get reference by reference NUMBER (correct way)${NC}"
echo "URL: $SERVER/api/v1/sp/references/$REFERENCE_NUMBER"
curl -s -H "Authorization: Bearer $TOKEN" "$SERVER/api/v1/sp/references/$REFERENCE_NUMBER" | jq '.'
echo ""

echo -e "${YELLOW}Step 4: Try to get reference by ID (WRONG - will fail)${NC}"
echo "URL: $SERVER/api/v1/sp/references/$REFERENCE_ID"
curl -s -H "Authorization: Bearer $TOKEN" "$SERVER/api/v1/sp/references/$REFERENCE_ID" | jq '.'
echo ""

echo -e "${GREEN}Step 5: Test without token (should get 401)${NC}"
curl -s "$SERVER/api/v1/sp/references/$REFERENCE_NUMBER" | jq '.'
echo ""

echo -e "${GREEN}=== Test Complete ===${NC}"
