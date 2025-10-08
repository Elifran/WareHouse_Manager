#!/bin/bash

# Stop Warehouse Manager Monitoring Service

PID_FILE="/tmp/warehouse_monitor.pid"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to check if monitoring is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Stop monitoring
if is_running; then
    local pid=$(cat "$PID_FILE")
    echo -e "${YELLOW}Stopping warehouse monitoring (PID: $pid)...${NC}"
    kill "$pid"
    rm -f "$PID_FILE"
    echo -e "${GREEN}Monitoring stopped successfully${NC}"
else
    echo -e "${RED}Monitoring is not running${NC}"
fi
