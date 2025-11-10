#!/bin/bash

# TASK-018 Quick Test Script
# This script tests the repository connection endpoints

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:3001"
AUTH_TOKEN=""  # You'll need to set this after OAuth login
ORG_ID=""      # Your organization UUID
GITHUB_REPO_ID="" # A GitHub repository ID from available repos

echo -e "${YELLOW}=== TASK-018 Repository Connection Test ===${NC}\n"

# Step 1: Check server health
echo -e "${YELLOW}Step 1: Checking server health...${NC}"
HEALTH=$(curl -s "${API_URL}/health")
if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✓ Server is running${NC}"
    echo "$HEALTH" | jq '.'
else
    echo -e "${RED}✗ Server is not running. Please start it with: npm run dev${NC}"
    exit 1
fi

echo ""

# Check if we have auth token
if [ -z "$AUTH_TOKEN" ]; then
    echo -e "${RED}✗ AUTH_TOKEN not set${NC}"
    echo "Please set AUTH_TOKEN variable in this script after logging in via OAuth"
    echo "Example: AUTH_TOKEN=\"your-jwt-token-here\""
    exit 1
fi

# Check if we have org ID
if [ -z "$ORG_ID" ]; then
    echo -e "${RED}✗ ORG_ID not set${NC}"
    echo "Please set ORG_ID variable in this script"
    echo "Example: ORG_ID=\"your-org-uuid-here\""
    exit 1
fi

# Step 2: Get available repositories
echo -e "${YELLOW}Step 2: Getting available repositories...${NC}"
AVAILABLE_REPOS=$(curl -s -X GET "${API_URL}/api/repositories/available" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✓ Retrieved available repositories${NC}"
    echo "$AVAILABLE_REPOS" | jq '.data[0:3]'  # Show first 3
    
    # Extract first repo ID if not set
    if [ -z "$GITHUB_REPO_ID" ]; then
        GITHUB_REPO_ID=$(echo "$AVAILABLE_REPOS" | jq -r '.data[0].id')
        echo -e "${YELLOW}Using first available repo ID: ${GITHUB_REPO_ID}${NC}"
    fi
else
    echo -e "${RED}✗ Failed to get available repositories${NC}"
    exit 1
fi

echo ""

# Step 3: Connect a repository
echo -e "${YELLOW}Step 3: Connecting repository...${NC}"
CONNECT_RESPONSE=$(curl -s -X POST "${API_URL}/api/repositories" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"githubRepoId\": ${GITHUB_REPO_ID},
    \"orgId\": \"${ORG_ID}\"
  }")

if echo "$CONNECT_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Repository connected successfully${NC}"
    REPO_UUID=$(echo "$CONNECT_RESPONSE" | jq -r '.data.id')
    echo "$CONNECT_RESPONSE" | jq '.data'
    echo -e "${YELLOW}Repository UUID: ${REPO_UUID}${NC}"
else
    echo -e "${RED}✗ Failed to connect repository${NC}"
    echo "$CONNECT_RESPONSE" | jq '.'
    
    # Check if already connected
    if echo "$CONNECT_RESPONSE" | jq -e '.message' | grep -q "already connected"; then
        echo -e "${YELLOW}Repository already connected, continuing tests...${NC}"
        # Get the repo from list
        LIST_RESPONSE=$(curl -s -X GET "${API_URL}/api/repositories?orgId=${ORG_ID}" \
          -H "Authorization: Bearer ${AUTH_TOKEN}")
        REPO_UUID=$(echo "$LIST_RESPONSE" | jq -r '.data[0].id')
    else
        exit 1
    fi
fi

echo ""

# Step 4: List connected repositories
echo -e "${YELLOW}Step 4: Listing connected repositories...${NC}"
LIST_RESPONSE=$(curl -s -X GET "${API_URL}/api/repositories?orgId=${ORG_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✓ Retrieved connected repositories${NC}"
    REPO_COUNT=$(echo "$LIST_RESPONSE" | jq '.data | length')
    echo "Connected repositories: ${REPO_COUNT}"
    echo "$LIST_RESPONSE" | jq '.data[0]'  # Show first one
else
    echo -e "${RED}✗ Failed to list repositories${NC}"
    exit 1
fi

echo ""

# Step 5: Get repository details
echo -e "${YELLOW}Step 5: Getting repository details...${NC}"
DETAILS_RESPONSE=$(curl -s -X GET "${API_URL}/api/repositories/${REPO_UUID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✓ Retrieved repository details${NC}"
    echo "$DETAILS_RESPONSE" | jq '.data'
else
    echo -e "${RED}✗ Failed to get repository details${NC}"
    exit 1
fi

echo ""

# Step 6: Test caching (list repos twice)
echo -e "${YELLOW}Step 6: Testing cache performance...${NC}"
echo "First request (cold cache):"
time curl -s -X GET "${API_URL}/api/repositories?orgId=${ORG_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" > /dev/null

echo "Second request (should be faster from cache):"
time curl -s -X GET "${API_URL}/api/repositories?orgId=${ORG_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" > /dev/null

echo ""

# Step 7: Disconnect repository (optional - commented out by default)
# Uncomment to test disconnection
# echo -e "${YELLOW}Step 7: Disconnecting repository...${NC}"
# DISCONNECT_RESPONSE=$(curl -s -X DELETE "${API_URL}/api/repositories/${REPO_UUID}" \
#   -H "Authorization: Bearer ${AUTH_TOKEN}" \
#   -w "%{http_code}")
# 
# if [[ "$DISCONNECT_RESPONSE" == "204" ]]; then
#     echo -e "${GREEN}✓ Repository disconnected successfully${NC}"
# else
#     echo -e "${RED}✗ Failed to disconnect repository${NC}"
#     exit 1
# fi

echo ""
echo -e "${GREEN}=== All tests completed successfully! ===${NC}"
echo ""
echo "Next steps:"
echo "1. Check database: psql -U postgres -d devmetrics"
echo "2. Check Redis cache: redis-cli KEYS \"repos:*\""
echo "3. Check GitHub webhook settings"
echo "4. Review audit logs in database"



