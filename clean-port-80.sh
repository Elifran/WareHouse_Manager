#!/bin/bash
echo "🧹 Cleaning up port 80 conflicts..."

# Stop all docker containers
echo "Stopping all Docker containers..."
docker stop $(docker ps -q) 2>/dev/null || echo "No containers to stop"

# Remove all containers
echo "Removing all Docker containers..."
docker rm $(docker ps -aq) 2>/dev/null || echo "No containers to remove"

# Kill any remaining processes on port 80
echo "Killing processes on port 80..."
sudo lsof -ti:80 | xargs -r sudo kill -9

# Clean up Docker network
docker network create elif-network 2>/dev/null || echo "Network already exists"

echo "✅ Cleanup complete! You can now run ./start-system.sh"