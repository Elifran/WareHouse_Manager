#!/bin/bash

# Clean Real-time Log Monitoring for Warehouse Manager
# Only shows NEW logs from when monitoring starts (no historical logs)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;37m'
NC='\033[0m'

# Configuration
STATIC_IP="10.10.1.1"
BACKEND_PORT="8000"
ADMIN_PORT="3002"
ORDERS_PORT="3000"
SALES_PORT="3001"

# Dynamic IP detection
DETECT_IP_SCRIPT="/home/el-ifran/WareHouse_Manager/detect-ip.sh"
DYNAMIC_IP=$($DETECT_IP_SCRIPT current 2>/dev/null || echo "192.168.13.215")
BEST_IP=$($DETECT_IP_SCRIPT best 2>/dev/null || echo "10.10.1.1")

# Log files for aggregation
LOG_DIR="/tmp/warehouse_realtime_logs"
mkdir -p "$LOG_DIR"

# Function to refresh IP detection
refresh_ip_detection() {
    DYNAMIC_IP=$($DETECT_IP_SCRIPT current 2>/dev/null || echo "192.168.13.215")
    BEST_IP=$($DETECT_IP_SCRIPT best 2>/dev/null || echo "10.10.1.1")
}

# Function to get timestamp
get_timestamp() {
    date '+%H:%M:%S'
}

# Function to format log entry with colors
format_log_entry() {
    local service=$1
    local level=$2
    local message=$3
    local timestamp=$(get_timestamp)
    
    case $level in
        "ERROR"|"error"|"Exception"|"Failed"|"500"|"400"|"404")
            echo -e "${RED}[$timestamp]${NC} ${YELLOW}[$service]${NC} ${RED}$message${NC}"
            ;;
        "WARNING"|"warning"|"WARN"|"warn")
            echo -e "${YELLOW}[$timestamp]${NC} ${YELLOW}[$service]${NC} ${YELLOW}$message${NC}"
            ;;
        "INFO"|"info"|"GET"|"POST"|"PUT"|"DELETE"|"PATCH")
            echo -e "${GREEN}[$timestamp]${NC} ${BLUE}[$service]${NC} ${GREEN}$message${NC}"
            ;;
        "DEBUG"|"debug")
            echo -e "${GRAY}[$timestamp]${NC} ${GRAY}[$service]${NC} ${GRAY}$message${NC}"
            ;;
        "AUTH"|"auth"|"login"|"token"|"session")
            echo -e "${PURPLE}[$timestamp]${NC} ${PURPLE}[$service]${NC} ${PURPLE}$message${NC}"
            ;;
        "DB"|"database"|"query"|"SELECT"|"INSERT"|"UPDATE"|"DELETE")
            echo -e "${CYAN}[$timestamp]${NC} ${CYAN}[$service]${NC} ${CYAN}$message${NC}"
            ;;
        *)
            echo -e "${WHITE}[$timestamp]${NC} ${WHITE}[$service]${NC} ${WHITE}$message${NC}"
            ;;
    esac
}

# Function to monitor backend logs in real-time (NEW logs only)
monitor_backend_logs() {
    local start_time=$(date '+%Y-%m-%dT%H:%M:%S')
    docker logs -f --since "$start_time" elif-shared-backend-elif-backend-1 2>&1 | while read line; do
        # Categorize log entries
        if echo "$line" | grep -qi "error\|exception\|failed\|500\|400\|404"; then
            format_log_entry "BACKEND" "ERROR" "$line"
        elif echo "$line" | grep -qi "warning\|warn"; then
            format_log_entry "BACKEND" "WARNING" "$line"
        elif echo "$line" | grep -qi "get \|post \|put \|delete \|patch "; then
            format_log_entry "BACKEND" "API" "$line"
        elif echo "$line" | grep -qi "login\|auth\|token\|session"; then
            format_log_entry "BACKEND" "AUTH" "$line"
        elif echo "$line" | grep -qi "select\|insert\|update\|delete\|query"; then
            format_log_entry "BACKEND" "DB" "$line"
        else
            format_log_entry "BACKEND" "INFO" "$line"
        fi
    done &
}

# Function to monitor admin app logs (NEW logs only)
monitor_admin_logs() {
    local start_time=$(date '+%Y-%m-%dT%H:%M:%S')
    docker logs -f --since "$start_time" elif-admin-app-elif-admin-app-1 2>&1 | while read line; do
        if echo "$line" | grep -qi "error\|exception\|failed"; then
            format_log_entry "ADMIN" "ERROR" "$line"
        elif echo "$line" | grep -qi "get \|post "; then
            format_log_entry "ADMIN" "API" "$line"
        else
            format_log_entry "ADMIN" "INFO" "$line"
        fi
    done &
}

# Function to monitor orders app logs (NEW logs only)
monitor_orders_logs() {
    local start_time=$(date '+%Y-%m-%dT%H:%M:%S')
    docker logs -f --since "$start_time" elif-orders-app-elif-orders-app-1 2>&1 | while read line; do
        if echo "$line" | grep -qi "error\|exception\|failed"; then
            format_log_entry "ORDERS" "ERROR" "$line"
        elif echo "$line" | grep -qi "get \|post "; then
            format_log_entry "ORDERS" "API" "$line"
        else
            format_log_entry "ORDERS" "INFO" "$line"
        fi
    done &
}

# Function to monitor sales app logs (NEW logs only)
monitor_sales_logs() {
    local start_time=$(date '+%Y-%m-%dT%H:%M:%S')
    docker logs -f --since "$start_time" elif-sales-app-elif-sales-app-1 2>&1 | while read line; do
        if echo "$line" | grep -qi "error\|exception\|failed"; then
            format_log_entry "SALES" "ERROR" "$line"
        elif echo "$line" | grep -qi "get \|post "; then
            format_log_entry "SALES" "API" "$line"
        else
            format_log_entry "SALES" "INFO" "$line"
        fi
    done &
}

# Function to monitor network connections
monitor_connections() {
    while true; do
        local connections=$(netstat -an 2>/dev/null | grep -E ":$BACKEND_PORT|:$ADMIN_PORT|:$ORDERS_PORT|:$SALES_PORT" | wc -l)
        local established=$(netstat -an 2>/dev/null | grep -E ":$BACKEND_PORT|:$ADMIN_PORT|:$ORDERS_PORT|:$SALES_PORT" | grep ESTABLISHED | wc -l)
        
        if [ "$connections" -gt 0 ]; then
            format_log_entry "NETWORK" "INFO" "Active connections: $connections (Established: $established)"
        fi
        
        sleep 10
    done &
}

# Function to monitor system resources
monitor_system_resources() {
    while true; do
        local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
        local memory_usage=$(free | awk 'NR==2{printf "%.1f", $3*100/$2}')
        local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
        
        # Only log if usage is high
        if (( $(echo "$cpu_usage > 70" | bc -l) )); then
            format_log_entry "SYSTEM" "WARNING" "High CPU usage: ${cpu_usage}%"
        fi
        
        if (( $(echo "$memory_usage > 80" | bc -l) )); then
            format_log_entry "SYSTEM" "WARNING" "High memory usage: ${memory_usage}%"
        fi
        
        if [ "$disk_usage" -gt 80 ]; then
            format_log_entry "SYSTEM" "WARNING" "High disk usage: ${disk_usage}%"
        fi
        
        sleep 30
    done &
}

# Function to show header
show_header() {
    clear
    refresh_ip_detection
    
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                           WAREHOUSE MANAGER - CLEAN REAL-TIME LOGS                 ║${NC}"
    echo -e "${PURPLE}║                                $(date '+%Y-%m-%d %H:%M:%S')                                ║${NC}"
    echo -e "${PURPLE}║${NC} Static: $STATIC_IP | Current: $DYNAMIC_IP | Best: $BEST_IP ${PURPLE}║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}Monitoring NEW server activities only (no historical logs)...${NC}"
    echo -e "${CYAN}Press Ctrl+C to stop monitoring${NC}"
    echo ""
    echo -e "${WHITE}Legend:${NC}"
    echo -e "  ${GREEN}●${NC} API Calls    ${PURPLE}●${NC} Authentication    ${CYAN}●${NC} Database    ${RED}●${NC} Errors    ${YELLOW}●${NC} Warnings"
    echo ""
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Function to show current status
show_current_status() {
    echo -e "${BLUE}Current Service Status:${NC}"
    
    # Check backend
    if curl -s --connect-timeout 2 "http://$BEST_IP:$BACKEND_PORT/api/health/" > /dev/null; then
        echo -e "  ${GREEN}✓${NC} Backend API: Running"
    else
        echo -e "  ${RED}✗${NC} Backend API: Not responding"
    fi
    
    # Check frontend apps
    if curl -s --connect-timeout 2 "http://$BEST_IP:$ADMIN_PORT" > /dev/null; then
        echo -e "  ${GREEN}✓${NC} Admin App: Running"
    else
        echo -e "  ${RED}✗${NC} Admin App: Not responding"
    fi
    
    if curl -s --connect-timeout 2 "http://$BEST_IP:$ORDERS_PORT" > /dev/null; then
        echo -e "  ${GREEN}✓${NC} Orders App: Running"
    else
        echo -e "  ${RED}✗${NC} Orders App: Not responding"
    fi
    
    if curl -s --connect-timeout 2 "http://$BEST_IP:$SALES_PORT" > /dev/null; then
        echo -e "  ${GREEN}✓${NC} Sales App: Running"
    else
        echo -e "  ${RED}✗${NC} Sales App: Not responding"
    fi
    
    echo ""
}

# Function to show active connections
show_active_connections() {
    echo -e "${BLUE}Active Connections:${NC}"
    
    # Show connections to our services
    local backend_conn=$(netstat -an 2>/dev/null | grep ":$BACKEND_PORT" | grep ESTABLISHED | wc -l)
    local admin_conn=$(netstat -an 2>/dev/null | grep ":$ADMIN_PORT" | grep ESTABLISHED | wc -l)
    local orders_conn=$(netstat -an 2>/dev/null | grep ":$ORDERS_PORT" | grep ESTABLISHED | wc -l)
    local sales_conn=$(netstat -an 2>/dev/null | grep ":$SALES_PORT" | grep ESTABLISHED | wc -l)
    
    echo -e "  Backend ($BACKEND_PORT): $backend_conn connections"
    echo -e "  Admin ($ADMIN_PORT): $admin_conn connections"
    echo -e "  Orders ($ORDERS_PORT): $orders_conn connections"
    echo -e "  Sales ($SALES_PORT): $sales_conn connections"
    
    # Show recent connections
    echo -e "${BLUE}Recent Connection Attempts:${NC}"
    netstat -an 2>/dev/null | grep -E ":$BACKEND_PORT|:$ADMIN_PORT|:$ORDERS_PORT|:$SALES_PORT" | grep ESTABLISHED | tail -5 | while read line; do
        echo -e "  ${GREEN}$line${NC}"
    done
    
    echo ""
}

# Function to start real-time monitoring (NEW logs only)
start_realtime_monitoring() {
    show_header
    show_current_status
    show_active_connections
    
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}Starting clean real-time log monitoring (NEW logs only)...${NC}"
    echo ""
    
    # Start all monitoring processes
    monitor_backend_logs
    monitor_admin_logs
    monitor_orders_logs
    monitor_sales_logs
    monitor_connections
    monitor_system_resources
    
    # Wait for user interrupt
    trap 'echo -e "\n${YELLOW}Stopping clean real-time monitoring...${NC}"; kill $(jobs -p) 2>/dev/null; exit 0' INT
    
    # Keep the script running
    while true; do
        sleep 1
    done
}

# Function to show filtered logs (with limit)
show_filtered_logs() {
    local filter=$1
    local service=${2:-"all"}
    local limit=${3:-20}
    
    echo -e "${BLUE}Filtered Logs (Filter: $filter, Service: $service, Limit: $limit):${NC}"
    echo ""
    
    case $service in
        "backend"|"all")
            docker logs elif-shared-backend-elif-backend-1 2>&1 | grep -i "$filter" | tail -$limit | while read line; do
                format_log_entry "BACKEND" "INFO" "$line"
            done
            ;;
        "admin"|"all")
            docker logs elif-admin-app-elif-admin-app-1 2>&1 | grep -i "$filter" | tail -$limit | while read line; do
                format_log_entry "ADMIN" "INFO" "$line"
            done
            ;;
        "orders"|"all")
            docker logs elif-orders-app-elif-orders-app-1 2>&1 | grep -i "$filter" | tail -$limit | while read line; do
                format_log_entry "ORDERS" "INFO" "$line"
            done
            ;;
        "sales"|"all")
            docker logs elif-sales-app-elif-sales-app-1 2>&1 | grep -i "$filter" | tail -$limit | while read line; do
                format_log_entry "SALES" "INFO" "$line"
            done
            ;;
    esac
}

# Function to show help
show_help() {
    echo "Clean Real-time Log Monitoring for Warehouse Manager"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -s, --start         Start clean real-time monitoring (default)"
    echo "  -f, --filter TEXT   Show filtered logs and exit"
    echo "  -c, --service NAME  Filter by service (backend, admin, orders, sales)"
    echo "  -l, --limit N       Limit number of log entries (default: 20)"
    echo "  -e, --errors        Show only error logs"
    echo "  -a, --auth          Show only authentication logs"
    echo "  -p, --api           Show only API logs"
    echo "  -d, --database      Show only database logs"
    echo ""
    echo "Features:"
    echo "  - Shows ONLY NEW logs from when monitoring starts"
    echo "  - No historical log spam"
    echo "  - Color-coded by activity type"
    echo "  - Real-time timestamps"
    echo "  - Connection and system monitoring"
    echo ""
    echo "Examples:"
    echo "  $0                  # Start clean real-time monitoring"
    echo "  $0 -s               # Start clean real-time monitoring"
    echo "  $0 -f error         # Show recent error logs"
    echo "  $0 -f login -c backend  # Show recent login logs from backend"
    echo "  $0 -e               # Show only errors"
    echo "  $0 -a               # Show only authentication logs"
    echo "  $0 -p               # Show only API logs"
    echo "  $0 -d               # Show only database logs"
    echo "  $0 -f error -l 10   # Show last 10 error logs"
}

# Main script logic
case "$1" in
    -h|--help)
        show_help
        ;;
    -s|--start|"")
        start_realtime_monitoring
        ;;
    -f|--filter)
        show_filtered_logs "$2" "$4" "$6"
        ;;
    -c|--service)
        show_filtered_logs "$4" "$2" "$6"
        ;;
    -l|--limit)
        show_filtered_logs "$4" "$6" "$2"
        ;;
    -e|--errors)
        show_filtered_logs "error\|exception\|failed\|500\|400\|404"
        ;;
    -a|--auth)
        show_filtered_logs "login\|auth\|token\|session"
        ;;
    -p|--api)
        show_filtered_logs "get \|post \|put \|delete \|patch "
        ;;
    -d|--database)
        show_filtered_logs "select\|insert\|update\|delete\|query"
        ;;
    *)
        echo "Unknown option: $1"
        show_help
        exit 1
        ;;
esac
