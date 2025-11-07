#!/bin/bash

# Deploy script for History Surfers
# Usage: ./deploy.sh [environment]

set -e  # Exit on error

ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.prod.yml"

echo "🚀 Deploying History Surfers - ${ENVIRONMENT}"
echo "================================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    exit 1
fi

# Check if docker compose is available
if ! command -v docker compose &> /dev/null; then
    echo "❌ Error: docker compose is not installed"
    exit 1
fi

# Load environment variables
if [ -f ".env.${ENVIRONMENT}" ]; then
    echo "📦 Loading environment: .env.${ENVIRONMENT}"
    export $(cat .env.${ENVIRONMENT} | grep -v '^#' | xargs)
else
    echo "⚠️  Warning: .env.${ENVIRONMENT} not found, using defaults"
fi

# Build and start services
echo ""
echo "🔨 Building Docker images..."
docker compose -f ${COMPOSE_FILE} build --no-cache

echo ""
echo "🏃 Starting services..."
docker compose -f ${COMPOSE_FILE} up -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check health
echo ""
echo "🏥 Health check..."
if docker compose -f ${COMPOSE_FILE} ps | grep -q "Up (healthy)"; then
    echo "✅ Services are healthy!"
else
    echo "⚠️  Warning: Some services may not be healthy yet"
    docker compose -f ${COMPOSE_FILE} ps
fi

# Show logs
echo ""
echo "📋 Recent logs:"
docker compose -f ${COMPOSE_FILE} logs --tail=20

echo ""
echo "================================================"
echo "✅ Deployment complete!"
echo ""
echo "📊 Service URLs:"
echo "  - Game: http://${DOMAIN:-localhost}"
echo "  - Health: http://${DOMAIN:-localhost}/health"
echo "  - API: http://${DOMAIN:-localhost}/api/info"
echo ""
echo "📝 Useful commands:"
echo "  - View logs: docker compose -f ${COMPOSE_FILE} logs -f"
echo "  - Stop: docker compose -f ${COMPOSE_FILE} down"
echo "  - Restart: docker compose -f ${COMPOSE_FILE} restart"
echo "  - Status: docker compose -f ${COMPOSE_FILE} ps"
echo ""
