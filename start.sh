#!/bin/bash

# Academic Dashboard — Startup Script
# Requires PostgreSQL (via Supabase or Docker).

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

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Building production bundle...${NC}"
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
        open http://localhost:3000
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        xdg-open http://localhost:3000 2>/dev/null || sensible-browser http://localhost:3000 2>/dev/null
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        start http://localhost:3000
    fi
}

# Open browser in background AFTER the build completes, so the server has time to start
pnpm build

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Build complete — starting production server...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

open_browser &

pnpm start
