#!/bin/bash

# ============================================================================
# Quick Database Fix Script
# ============================================================================
# This script automatically applies the database fixes for the client
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Database Fix Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Check if postgres container exists
if ! docker ps -a --format '{{.Names}}' | grep -q "^yapague-postgres$"; then
    echo -e "${YELLOW}Warning: yapague-postgres container not found${NC}"
    echo -e "${YELLOW}Please start your Docker containers first:${NC}"
    echo -e "${YELLOW}  docker-compose up -d${NC}"
    exit 1
fi

# Check if postgres container is running
if ! docker ps --format '{{.Names}}' | grep -q "^yapague-postgres$"; then
    echo -e "${YELLOW}PostgreSQL container is not running. Starting it...${NC}"
    docker-compose up -d postgres
    echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
    sleep 5
fi

# Get database credentials from environment or use defaults
DB_NAME="${DB_NAME:-yapague_db}"
DB_USER="${DB_USERNAME:-yapague_user}"
DB_PASSWORD="${DB_PASSWORD:-yapague_password}"

echo -e "${GREEN}Connecting to database: ${DB_NAME}${NC}"
echo ""

# Check if fix script exists (try current error fix first, then complete fix)
FIX_SCRIPT="database/fixes/fix-current-error.sql"
if [ ! -f "$FIX_SCRIPT" ]; then
    FIX_SCRIPT="database/fixes/fix-db-errors.sql"
    if [ ! -f "$FIX_SCRIPT" ]; then
        echo -e "${RED}Error: Fix script not found${NC}"
        exit 1
    fi
fi

# Copy script to container
echo -e "${YELLOW}Copying fix script to container...${NC}"
docker cp "$FIX_SCRIPT" yapague-postgres:/tmp/fix-db-errors.sql

# Run the fix script
echo -e "${YELLOW}Running database fix script...${NC}"
echo ""

if docker exec -i yapague-postgres psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/fix-db-errors.sql; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ Database fixes applied successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${YELLOW}You can now start your application:${NC}"
    echo -e "${YELLOW}  docker-compose up -d${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}✗ Error applying database fixes${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo -e "${YELLOW}Please check the error messages above and:${NC}"
    echo -e "${YELLOW}1. Verify database credentials${NC}"
    echo -e "${YELLOW}2. Check database logs: docker logs yapague-postgres${NC}"
    echo -e "${YELLOW}3. Try running the SQL script manually${NC}"
    exit 1
fi

# Cleanup
docker exec yapague-postgres rm -f /tmp/fix-db-errors.sql

echo -e "${GREEN}Done!${NC}"

