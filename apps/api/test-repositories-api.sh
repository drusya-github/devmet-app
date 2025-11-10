#!/bin/bash
# Quick test script for Repository Listing API
# Usage: ./test-repositories-api.sh YOUR_JWT_TOKEN

set -e

BASE_URL="${API_URL:-http://localhost:3001}"
TOKEN="${1:-}"

if [ -z "$TOKEN" ]; then
  echo "❌ Error: JWT token required"
  echo "Usage: $0 YOUR_JWT_TOKEN"
  echo ""
  echo "To get a token:"
  echo "1. Authenticate via: curl http://localhost:3001/api/auth/github"
  echo "2. Or use existing token from previous authentication"
  exit 1
fi

echo "🧪 Testing Repository Listing API"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Basic request
echo "Test 1: Basic request (default options)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/repositories/available" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Status: $HTTP_CODE"
  SUCCESS=$(echo "$BODY" | jq -r '.success // false')
  if [ "$SUCCESS" = "true" ]; then
    COUNT=$(echo "$BODY" | jq '.data | length')
    echo "   Found $COUNT repositories"
  fi
else
  echo -e "${RED}❌ FAIL${NC} - Status: $HTTP_CODE"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
echo ""

# Test 2: With pagination
echo "Test 2: With pagination (page=1, perPage=10)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/repositories/available?page=1&perPage=10" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Status: $HTTP_CODE"
  PAGE=$(echo "$BODY" | jq -r '.pagination.page')
  PER_PAGE=$(echo "$BODY" | jq -r '.pagination.perPage')
  echo "   Page: $PAGE, Per Page: $PER_PAGE"
else
  echo -e "${RED}❌ FAIL${NC} - Status: $HTTP_CODE"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
echo ""

# Test 3: With filters
echo "Test 3: With filters (type=owner, sort=created)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/repositories/available?type=owner&sort=created" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Status: $HTTP_CODE"
else
  echo -e "${RED}❌ FAIL${NC} - Status: $HTTP_CODE"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
echo ""

# Test 4: Without authentication (should fail)
echo "Test 4: Without authentication (should return 401)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/repositories/available")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Correctly returned 401"
else
  echo -e "${RED}❌ FAIL${NC} - Expected 401, got $HTTP_CODE"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
echo ""

# Test 5: Invalid query parameters (should fail)
echo "Test 5: Invalid query parameters (should return 400)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/repositories/available?page=invalid&perPage=abc" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "400" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Correctly returned 400"
else
  echo -e "${YELLOW}⚠️  WARN${NC} - Expected 400, got $HTTP_CODE"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
echo ""

# Test 6: Cache test (make two requests, second should be faster)
echo "Test 6: Cache performance test"
echo "   Making first request (cache miss)..."
START1=$(date +%s%N)
curl -s -X GET "$BASE_URL/api/repositories/available" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
END1=$(date +%s%N)
TIME1=$((($END1 - $START1) / 1000000))

echo "   First request took: ${TIME1}ms"
echo "   Making second request (cache hit)..."
START2=$(date +%s%N)
curl -s -X GET "$BASE_URL/api/repositories/available" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
END2=$(date +%s%N)
TIME2=$((($END2 - $START2) / 1000000))

echo "   Second request took: ${TIME2}ms"
if [ $TIME2 -lt $TIME1 ]; then
  SPEEDUP=$(echo "scale=2; $TIME1 / $TIME2" | bc)
  echo -e "${GREEN}✅ PASS${NC} - Cache is working (${SPEEDUP}x faster)"
else
  echo -e "${YELLOW}⚠️  WARN${NC} - Cache may not be working (second request not faster)"
fi
echo ""

echo "=================================="
echo "✅ All tests complete!"
echo ""
echo "💡 Tips:"
echo "   - Check server logs for detailed information"
echo "   - Verify Redis cache keys: redis-cli KEYS repos:available:*"
echo "   - Check database for connected repositories"

