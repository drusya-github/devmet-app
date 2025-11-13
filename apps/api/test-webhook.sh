#!/bin/bash

# Webhook Testing Script
# Usage: ./test-webhook.sh [event_type]
# Example: ./test-webhook.sh push

set -e

# Configuration
API_URL="${API_URL:-http://localhost:3001}"
WEBHOOK_SECRET="${GITHUB_WEBHOOK_SECRET:-your-webhook-secret-here}"
EVENT_TYPE="${1:-push}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== DevMetrics Webhook Test ===${NC}"
echo ""
echo "Event Type: $EVENT_TYPE"
echo "API URL: $API_URL/api/webhooks/github"
echo ""

# Check if sample payload exists
PAYLOAD_FILE="src/modules/webhooks/__tests__/sample-payloads/${EVENT_TYPE}.json"

if [ ! -f "$PAYLOAD_FILE" ]; then
    echo -e "${RED}Error: Sample payload not found: $PAYLOAD_FILE${NC}"
    echo ""
    echo "Available event types:"
    ls -1 src/modules/webhooks/__tests__/sample-payloads/ | sed 's/.json$//'
    exit 1
fi

echo "Using payload: $PAYLOAD_FILE"
echo ""

# Read payload
PAYLOAD=$(cat "$PAYLOAD_FILE")

# Generate HMAC signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //')

# Generate delivery ID
DELIVERY_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')

echo "Generated signature: sha256=$SIGNATURE"
echo "Delivery ID: $DELIVERY_ID"
echo ""

# Send webhook
echo -e "${YELLOW}Sending webhook...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/webhooks/github" \
    -H "Content-Type: application/json" \
    -H "X-GitHub-Event: $EVENT_TYPE" \
    -H "X-GitHub-Delivery: $DELIVERY_ID" \
    -H "X-Hub-Signature-256: sha256=$SIGNATURE" \
    -d "$PAYLOAD")

# Parse response
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo ""
echo -e "${YELLOW}Response:${NC}"
echo "Status Code: $HTTP_CODE"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Check result
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Webhook sent successfully!${NC}"
    exit 0
else
    echo -e "${RED}✗ Webhook failed with status $HTTP_CODE${NC}"
    exit 1
fi

