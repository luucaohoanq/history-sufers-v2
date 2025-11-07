#!/bin/bash

# Con đường đổi mới - Colyseus Setup & Test Script

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🎮  Con đường đổi mới - Colyseus Migration Setup           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check Node.js
echo "📦 Step 1: Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js ${NODE_VERSION} found${NC}"
echo ""

# Step 2: Remove old dependencies
echo "🗑️  Step 2: Removing old Socket.IO dependencies..."
npm uninstall socket.io socket.io-client 2>/dev/null
echo -e "${GREEN}✅ Old dependencies removed${NC}"
echo ""

# Step 3: Install new dependencies
echo "📥 Step 3: Installing Colyseus dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi
echo ""

# Step 4: Verify installation
echo "🔍 Step 4: Verifying installation..."

# Check if Colyseus is installed
if [ -d "node_modules/colyseus" ]; then
    echo -e "${GREEN}✅ Colyseus installed${NC}"
else
    echo -e "${RED}❌ Colyseus not found${NC}"
    exit 1
fi

# Check if schema is installed
if [ -d "node_modules/@colyseus/schema" ]; then
    echo -e "${GREEN}✅ @colyseus/schema installed${NC}"
else
    echo -e "${RED}❌ @colyseus/schema not found${NC}"
    exit 1
fi

# Check if monitor is installed
if [ -d "node_modules/@colyseus/monitor" ]; then
    echo -e "${GREEN}✅ @colyseus/monitor installed${NC}"
else
    echo -e "${RED}❌ @colyseus/monitor not found${NC}"
    exit 1
fi

echo ""

# Step 5: Verify file structure
echo "📂 Step 5: Verifying file structure..."

FILES=(
    "server.js"
    "schema/GameState.js"
    "rooms/GameRoom.js"
    "js/network-colyseus.js"
    "multiplayer-colyseus.html"
    "COLYSEUS_MIGRATION.md"
    "COLYSEUS_README.md"
    "MIGRATION_COMPLETE.md"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file not found${NC}"
        exit 1
    fi
done

echo ""

# Step 6: Test server startup
echo "🚀 Step 6: Testing server startup..."
echo "Starting server for 5 seconds..."

# Start server in background
node server.js &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Check if server is running
if ps -p $SERVER_PID > /dev/null; then
    echo -e "${GREEN}✅ Server started successfully (PID: $SERVER_PID)${NC}"

    # Test health endpoint
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)

    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "${GREEN}✅ Health check passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Health check returned $HTTP_CODE${NC}"
    fi

    # Kill server
    kill $SERVER_PID
    wait $SERVER_PID 2>/dev/null
    echo -e "${GREEN}✅ Server stopped${NC}"
else
    echo -e "${RED}❌ Server failed to start${NC}"
    exit 1
fi

echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✨  Setup Complete!                                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📚 Next Steps:"
echo ""
echo "  1. Start the server:"
echo "     ${GREEN}npm start${NC}"
echo ""
echo "  2. Open in browser:"
echo "     ${GREEN}http://localhost:3000/multiplayer-colyseus.html${NC}"
echo ""
echo "  3. Access monitoring dashboard (dev only):"
echo "     ${GREEN}http://localhost:3000/colyseus${NC}"
echo ""
echo "  4. Read the migration guide:"
echo "     ${GREEN}cat COLYSEUS_MIGRATION.md${NC}"
echo ""
echo "  5. Read the usage guide:"
echo "     ${GREEN}cat COLYSEUS_README.md${NC}"
echo ""
echo "  6. Update your existing HTML files:"
echo "     - Replace Socket.IO scripts with Colyseus"
echo "     - Update network.js → network-colyseus.js"
echo "     - See MIGRATION_COMPLETE.md for details"
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🎉  Happy Gaming!                                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
