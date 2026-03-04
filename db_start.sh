#!/bin/bash

# Academic Dashboard Startup Script
# This script checks dependencies and starts the development server

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Academic Dashboard - Class Catch-up  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "  Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✓ Node.js found:${NC} $(node --version)"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}⚠ pnpm is not installed${NC}"
    echo "  Installing pnpm via npm..."
    npm install -g pnpm
    echo -e "${GREEN}✓ pnpm installed${NC}"
else
    echo -e "${GREEN}✓ pnpm found:${NC} $(pnpm --version)"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo ""
    echo -e "${YELLOW}⚠ Dependencies not installed${NC}"
    echo "  Installing dependencies..."
    pnpm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

# Start Docker / PostgreSQL
if command -v docker &> /dev/null; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Starting PostgreSQL via Docker...${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Check if a non-Docker process is already holding port 5432
    NON_DOCKER_PID=$(lsof -ti:5432 2>/dev/null | while read pid; do
        if ! ps -p "$pid" -o command= 2>/dev/null | grep -q "docker\|com.docke"; then
            echo "$pid"
        fi
    done | head -1)

    if [ -n "$NON_DOCKER_PID" ]; then
        CONFLICT_CMD=$(ps -p "$NON_DOCKER_PID" -o command= 2>/dev/null || echo "unknown")
        echo -e "${YELLOW}⚠ Port 5432 is held by a local process (${CONFLICT_CMD##*/})${NC}"
        # Try to stop it via brew services first
        for PG_VER in postgresql@17 postgresql@16 postgresql@15 postgresql@14 postgresql; do
            if brew services list 2>/dev/null | grep -q "^${PG_VER}.*started"; then
                echo -e "${YELLOW}  Stopping local ${PG_VER} to free port 5432...${NC}"
                brew services stop "$PG_VER" 2>/dev/null || true
                break
            fi
        done
        sleep 1
    fi

    docker compose up -d
    echo -e "${GREEN}✓ PostgreSQL started${NC}"
    # Wait briefly for Postgres to be ready
    sleep 2
    # Apply any pending migrations
    pnpm prisma migrate deploy 2>/dev/null || true
    echo ""
else
    echo -e "${YELLOW}⚠ Docker not found — skipping database startup${NC}"
    echo "  Install Docker Desktop from https://www.docker.com/products/docker-desktop/"
    echo ""
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Starting development server...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check for existing dev server and clean up
if [ -f ".next/dev/lock" ]; then
    echo -e "${YELLOW}⚠ Cleaning up existing dev server lock...${NC}"
    rm -rf .next/dev/lock
fi

# Kill any existing Next.js processes on port 3000
if lsof -ti:3000 &> /dev/null; then
    echo -e "${YELLOW}⚠ Killing existing process on port 3000...${NC}"
    kill -9 $(lsof -ti:3000) 2>/dev/null || true
    sleep 1
fi

echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

# Function to open browser once server is ready
open_browser() {
    sleep 3
    echo ""
    echo -e "${GREEN}🚀 Opening browser...${NC}"
    
    # Detect OS and open browser
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open http://localhost:3000
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        xdg-open http://localhost:3000 2>/dev/null || sensible-browser http://localhost:3000 2>/dev/null
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        # Windows
        start http://localhost:3000
    fi
}

# Open browser in background
open_browser &

# Start the development server in database mode
STORAGE_MODE=postgres pnpm dev
