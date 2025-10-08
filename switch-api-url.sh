#!/bin/bash

# Script to switch API URL between static and dynamic IP addresses
# Usage: ./switch-api-url.sh [static|dynamic]

STATIC_IP="10.10.1.1"
DYNAMIC_IP="192.168.13.215"
PORT="8000"

if [ "$1" = "static" ]; then
    API_URL="http://${STATIC_IP}:${PORT}"
    echo "Switching to static IP: ${API_URL}"
elif [ "$1" = "dynamic" ]; then
    API_URL="http://${DYNAMIC_IP}:${PORT}"
    echo "Switching to dynamic IP: ${API_URL}"
else
    echo "Usage: $0 [static|dynamic]"
    echo "  static  - Use static IP (10.10.1.1)"
    echo "  dynamic - Use dynamic IP (192.168.13.215)"
    exit 1
fi

# Export the environment variable for Docker Compose
export REACT_APP_API_URL="${API_URL}"

echo "Environment variable set: REACT_APP_API_URL=${API_URL}"
echo ""
echo "To restart services with new API URL, run:"
echo "  cd elif-admin-app && docker-compose down && docker-compose up -d"
echo "  cd elif-orders-app && docker-compose down && docker-compose up -d"
echo "  cd elif-sales-app && docker-compose down && docker-compose up -d"
echo ""
echo "Or restart all services at once:"
echo "  ./restart-all-services.sh"
