#!/bin/bash

# Start Warehouse Manager Monitoring Service
# This script starts the monitoring in the background

MONITOR_SCRIPT="/home/el-ifran/WareHouse_Manager/monitor-servers.sh"
PID_FILE="/tmp/warehouse_monitor.pid"
LOG_FILE="/tmp/warehouse_monitor.log"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to check if monitoring is already running
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

# Function to start monitoring
start_monitoring() {
    if is_running; then
        echo -e "${YELLOW}Monitoring is already running (PID: $(cat $PID_FILE))${NC}"
        return 1
    fi
    
    echo -e "${GREEN}Starting warehouse server monitoring...${NC}"
    
    # Start monitoring in background
    nohup "$MONITOR_SCRIPT" --continuous --interval 30 > "$LOG_FILE" 2>&1 &
    local pid=$!
    
    # Save PID
    echo "$pid" > "$PID_FILE"
    
    echo -e "${GREEN}Monitoring started successfully (PID: $pid)${NC}"
    echo -e "${GREEN}Log file: $LOG_FILE${NC}"
    echo -e "${GREEN}To stop monitoring: ./stop-monitoring.sh${NC}"
    echo -e "${GREEN}To view logs: tail -f $LOG_FILE${NC}"
}

# Function to stop monitoring
stop_monitoring() {
    if is_running; then
        local pid=$(cat "$PID_FILE")
        echo -e "${YELLOW}Stopping monitoring (PID: $pid)...${NC}"
        kill "$pid"
        rm -f "$PID_FILE"
        echo -e "${GREEN}Monitoring stopped${NC}"
    else
        echo -e "${RED}Monitoring is not running${NC}"
    fi
}

# Function to show status
show_status() {
    if is_running; then
        local pid=$(cat "$PID_FILE")
        echo -e "${GREEN}Monitoring is running (PID: $pid)${NC}"
        echo -e "${GREEN}Log file: $LOG_FILE${NC}"
        echo ""
        echo "Recent log entries:"
        tail -5 "$LOG_FILE" 2>/dev/null || echo "No log entries yet"
    else
        echo -e "${RED}Monitoring is not running${NC}"
    fi
}

# Main script logic
case "$1" in
    start)
        start_monitoring
        ;;
    stop)
        stop_monitoring
        ;;
    restart)
        stop_monitoring
        sleep 2
        start_monitoring
        ;;
    status)
        show_status
        ;;
    logs)
        if [ -f "$LOG_FILE" ]; then
            tail -f "$LOG_FILE"
        else
            echo -e "${RED}No log file found${NC}"
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start monitoring service"
        echo "  stop    - Stop monitoring service"
        echo "  restart - Restart monitoring service"
        echo "  status  - Show monitoring status"
        echo "  logs    - View real-time logs"
        exit 1
        ;;
esac
