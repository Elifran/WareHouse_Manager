#!/bin/bash

# Script to restart all services with the current API URL configuration
# This script will use the REACT_APP_API_URL environment variable if set

echo "Restarting all services..."

# Check if API URL is set
if [ -z "$REACT_APP_API_URL" ]; then
    echo "No REACT_APP_API_URL set, using default (10.10.1.1:8000)"
    export REACT_APP_API_URL="http://10.10.1.1:8000"
fi

echo "Using API URL: $REACT_APP_API_URL"
echo ""

# Restart backend
echo "Restarting backend..."
cd elif-shared-backend
docker-compose down
docker-compose up -d
cd ..

# Wait a moment for backend to start
sleep 5

# Restart frontend services
echo "Restarting admin app..."
cd elif-admin-app
docker-compose down
docker-compose up -d
cd ..

echo "Restarting orders app..."
cd elif-orders-app
docker-compose down
docker-compose up -d
cd ..

echo "Restarting sales app..."
cd elif-sales-app
docker-compose down
docker-compose up -d
cd ..

echo ""
echo "All services restarted successfully!"
echo "Backend: http://10.10.1.1:8000"
echo "Admin App: http://10.10.1.1:3002"
echo "Orders App: http://10.10.1.1:3000"
echo "Sales App: http://10.10.1.1:3001"
echo ""
echo "To check service status, run: ./status.sh"
