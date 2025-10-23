#!/bin/bash

# Quick fix script for sales app unit ID issue

echo "🔧 Fixing Sales App Unit ID Issue..."

# Stop the sales app container
echo "Stopping sales app container..."
cd elif-sales-app
docker compose down

# Remove the build directory with force
echo "Removing old build directory..."
cd beverage_management_system
rm -rf build

# Build the app
echo "Building sales app with fix..."
npm run build

# Start the container
echo "Starting sales app container..."
cd ..
docker compose up -d

echo "✅ Sales app fix applied!"
echo "🌐 Access: http://192.168.149.215:3001"

