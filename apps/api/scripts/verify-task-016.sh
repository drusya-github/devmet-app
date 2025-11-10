#!/bin/bash
# TASK-016 Quick Verification Script
# Checks if all required files and configurations are in place

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 TASK-016 Verification Script${NC}"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ Error: Must run from apps/api directory${NC}"
    exit 1
fi

ALL_CHECKS_PASSED=true

# Check 1: Required files exist
echo -e "\n${YELLOW}📁 Checking required files...${NC}"
files=(
    "src/modules/users/users.service.ts"
    "src/modules/users/users.routes.ts"
    "src/modules/users/users.validation.ts"
    "src/modules/users/users.types.ts"
    "src/modules/users/index.ts"
    "src/modules/users/__tests__/users.service.test.ts"
    "src/modules/users/__tests__/users.routes.test.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file - NOT FOUND"
        ALL_CHECKS_PASSED=false
    fi
done

# Check 2: Schema has deletedAt field
echo -e "\n${YELLOW}🗄️  Checking database schema...${NC}"
if grep -q "deletedAt" prisma/schema.prisma; then
    echo -e "${GREEN}✓${NC} deletedAt field exists in schema"
else
    echo -e "${RED}✗${NC} deletedAt field not found in schema"
    ALL_CHECKS_PASSED=false
fi

# Check 3: Server.ts includes users routes
echo -e "\n${YELLOW}🔌 Checking server integration...${NC}"
if grep -q "usersRoutes" src/server.ts && grep -q "/api/users" src/server.ts; then
    echo -e "${GREEN}✓${NC} Users routes registered in server.ts"
else
    echo -e "${RED}✗${NC} Users routes not found in server.ts"
    ALL_CHECKS_PASSED=false
fi

# Check 4: Check for common issues in code
echo -e "\n${YELLOW}🔍 Checking code quality...${NC}"

# Check if users.service.ts imports invalidateUserCache
if grep -q "invalidateUserCache" src/modules/users/users.service.ts; then
    echo -e "${GREEN}✓${NC} Cache invalidation implemented"
else
    echo -e "${RED}✗${NC} Cache invalidation not found"
    ALL_CHECKS_PASSED=false
fi

# Check if routes use authenticate middleware
if grep -q "fastify.authenticate" src/modules/users/users.routes.ts; then
    echo -e "${GREEN}✓${NC} Authentication middleware used"
else
    echo -e "${RED}✗${NC} Authentication middleware not found"
    ALL_CHECKS_PASSED=false
fi

# Check if validation schemas are exported
if grep -q "updateProfileRequestSchema" src/modules/users/users.validation.ts; then
    echo -e "${GREEN}✓${NC} Validation schemas defined"
else
    echo -e "${RED}✗${NC} Validation schemas not found"
    ALL_CHECKS_PASSED=false
fi

# Summary
echo ""
echo "=================================================="
if [ "$ALL_CHECKS_PASSED" = true ]; then
    echo -e "${GREEN}✅ All file checks passed!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "${BLUE}1.${NC} Generate Prisma client: ${GREEN}npm run db:generate${NC}"
    echo -e "${BLUE}2.${NC} Create migration: ${GREEN}npm run db:migrate${NC}"
    echo -e "${BLUE}3.${NC} Type check: ${GREEN}npm run typecheck${NC}"
    echo -e "${BLUE}4.${NC} Lint check: ${GREEN}npm run lint${NC}"
    echo -e "${BLUE}5.${NC} Run tests: ${GREEN}npm test -- users${NC}"
    echo -e "${BLUE}6.${NC} Start server: ${GREEN}npm run dev${NC}"
    echo -e "${BLUE}7.${NC} Test endpoints (see TASK-016-VERIFICATION.md)"
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Please review the errors above.${NC}"
    exit 1
fi

