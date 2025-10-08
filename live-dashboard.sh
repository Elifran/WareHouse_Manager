#!/bin/bash

# Live Dashboard for Warehouse Manager
# Updates data in place without redrawing the entire screen

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
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

# Function to refresh IP detection
refresh_ip_detection() {
    DYNAMIC_IP=$($DETECT_IP_SCRIPT current 2>/dev/null || echo "192.168.13.215")
    BEST_IP=$($DETECT_IP_SCRIPT best 2>/dev/null || echo "10.10.1.1")
}

# Function to get service status
get_service_status() {
    local service_name=$1
    local url=$2
    local response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "$url" 2>/dev/null)
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}●${NC}"
    else
        echo -e "${RED}●${NC}"
    fi
}

# Function to get container status
get_container_status() {
    local container_name=$1
    local status=$(docker ps --filter "name=$container_name" --format "{{.Status}}" 2>/dev/null)
    
    if [[ $status == *"Up"* ]]; then
        echo -e "${GREEN}●${NC}"
    else
        echo -e "${RED}●${NC}"
    fi
}

# Function to get system metrics
get_system_metrics() {
    # CPU Usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    
    # Memory Usage
    local mem_info=$(free | awk 'NR==2{printf "%.1f", $3*100/$2}')
    
    # Disk Usage
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    echo "$cpu_usage|$mem_info|$disk_usage"
}

# Function to get recent activity
get_recent_activity() {
    local recent_requests=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "GET\|POST\|PUT\|DELETE" || echo "0")
    local recent_errors=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "ERROR\|Exception\|500\|400\|404" || echo "0")
    local recent_auth=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "login\|auth\|token" || echo "0")
    
    echo "$recent_requests|$recent_errors|$recent_auth"
}

# Function to show initial dashboard
show_initial_dashboard() {
    clear
    refresh_ip_detection
    
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                    WAREHOUSE MANAGER DASHBOARD                ║${NC}"
    echo -e "${PURPLE}║                        $(date '+%Y-%m-%d %H:%M:%S')                        ║${NC}"
    echo -e "${PURPLE}║${NC} Static: $STATIC_IP | Current: $DYNAMIC_IP | Best: $BEST_IP ${PURPLE}║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Service Status Section
    echo -e "${CYAN}┌─────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│                        SERVICE STATUS                      │${NC}"
    echo -e "${CYAN}├─────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${CYAN}│${NC} Backend (Static)  : ${GREEN}●${NC} http://$STATIC_IP:$BACKEND_PORT                    ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC} Backend (Dynamic) : ${GREEN}●${NC} http://$DYNAMIC_IP:$BACKEND_PORT                    ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC} Admin App         : ${GREEN}●${NC} http://$BEST_IP:$ADMIN_PORT                        ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC} Orders App        : ${GREEN}●${NC} http://$BEST_IP:$ORDERS_PORT                       ${CYAN}│${NC}"
    echo -e "${CYAN}│${NC} Sales App         : ${GREEN}●${NC} http://$BEST_IP:$SALES_PORT                        ${CYAN}│${NC}"
    echo -e "${CYAN}└─────────────────────────────────────────────────────────────┘${NC}"
    echo ""
    
    # Container Status Section
    echo -e "${BLUE}┌─────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${BLUE}│                      CONTAINER STATUS                      │${NC}"
    echo -e "${BLUE}├─────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${BLUE}│${NC} elif-shared-backend-elif-backend-1     : ${GREEN}●${NC} Backend Service                                    ${BLUE}│${NC}"
    echo -e "${BLUE}│${NC} elif-admin-app-elif-admin-app-1   : ${GREEN}●${NC} Admin Frontend                                     ${BLUE}│${NC}"
    echo -e "${BLUE}│${NC} elif-orders-app-elif-orders-app-1  : ${GREEN}●${NC} Orders Frontend                                    ${BLUE}│${NC}"
    echo -e "${BLUE}│${NC} elif-sales-app-elif-sales-app-1   : ${GREEN}●${NC} Sales Frontend                                     ${BLUE}│${NC}"
    echo -e "${BLUE}└─────────────────────────────────────────────────────────────┘${NC}"
    echo ""
    
    # System Metrics Section
    echo -e "${YELLOW}┌─────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${YELLOW}│                      SYSTEM METRICS                        │${NC}"
    echo -e "${YELLOW}├─────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${YELLOW}│${NC} CPU Usage    : ${GREEN}  0.0%${NC}                                                ${YELLOW}│${NC}"
    echo -e "${YELLOW}│${NC} Memory Usage : ${GREEN}  0.0%${NC}                                                ${YELLOW}│${NC}"
    echo -e "${YELLOW}│${NC} Disk Usage   : ${GREEN}  0%${NC}                                                  ${YELLOW}│${NC}"
    echo -e "${YELLOW}└─────────────────────────────────────────────────────────────┘${NC}"
    echo ""
    
    # Recent Activity Section
    echo -e "${PURPLE}┌─────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${PURPLE}│                      RECENT ACTIVITY                       │${NC}"
    echo -e "${PURPLE}├─────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${PURPLE}│${NC} Last Minute Activity:                                    ${PURPLE}│${NC}"
    echo -e "${PURPLE}│${NC}   API Requests: ${GREEN}  0${NC}                                                ${PURPLE}│${NC}"
    echo -e "${PURPLE}│${NC}   Errors      : ${GREEN}  0${NC}                                                ${PURPLE}│${NC}"
    echo -e "${PURPLE}│${NC}   Auth Events : ${GREEN}  0${NC}                                                ${PURPLE}│${NC}"
    echo -e "${PURPLE}└─────────────────────────────────────────────────────────────┘${NC}"
    echo ""
    
    # Quick Actions Section
    echo -e "${WHITE}┌─────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${WHITE}│                       QUICK ACTIONS                        │${NC}"
    echo -e "${WHITE}├─────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${WHITE}│${NC} ${GREEN}●${NC} = Online    ${RED}●${NC} = Offline    ${YELLOW}⚠${NC} = Warning    ${BLUE}ℹ${NC} = Info ${WHITE}│${NC}"
    echo -e "${WHITE}└─────────────────────────────────────────────────────────────┘${NC}"
    echo ""
    echo -e "${CYAN}Current Access URLs:${NC}"
    echo -e "  ${GREEN}Backend:${NC} http://$BEST_IP:$BACKEND_PORT"
    echo -e "  ${GREEN}Admin:${NC}   http://$BEST_IP:$ADMIN_PORT"
    echo -e "  ${GREEN}Orders:${NC}  http://$BEST_IP:$ORDERS_PORT"
    echo -e "  ${GREEN}Sales:${NC}   http://$BEST_IP:$SALES_PORT"
    echo ""
    echo -e "${CYAN}Auto-refreshing every 5 seconds... Press Ctrl+C to exit${NC}"
}

# Function to update dashboard data in place
update_dashboard() {
    refresh_ip_detection
    
    # Update timestamp in header (line 3)
    printf "\033[3;1H"
    echo -e "${PURPLE}║                        $(date '+%Y-%m-%d %H:%M:%S')                        ║${NC}"
    
    # Update IP info in header (line 4)
    printf "\033[4;1H"
    echo -e "${PURPLE}║${NC} Static: $STATIC_IP | Current: $DYNAMIC_IP | Best: $BEST_IP ${PURPLE}║${NC}"
    
    # Update service status (lines 8-12)
    local backend_static=$(get_service_status "Backend (Static)" "http://$STATIC_IP:$BACKEND_PORT/api/health/")
    local backend_dynamic=$(get_service_status "Backend (Dynamic)" "http://$DYNAMIC_IP:$BACKEND_PORT/api/health/")
    local admin_app=$(get_service_status "Admin App" "http://$BEST_IP:$ADMIN_PORT")
    local orders_app=$(get_service_status "Orders App" "http://$BEST_IP:$ORDERS_PORT")
    local sales_app=$(get_service_status "Sales App" "http://$BEST_IP:$SALES_PORT")
    
    printf "\033[8;1H"
    echo -e "${CYAN}│${NC} Backend (Static)  : $backend_static http://$STATIC_IP:$BACKEND_PORT                    ${CYAN}│${NC}"
    printf "\033[9;1H"
    echo -e "${CYAN}│${NC} Backend (Dynamic) : $backend_dynamic http://$DYNAMIC_IP:$BACKEND_PORT                    ${CYAN}│${NC}"
    printf "\033[10;1H"
    echo -e "${CYAN}│${NC} Admin App         : $admin_app http://$BEST_IP:$ADMIN_PORT                        ${CYAN}│${NC}"
    printf "\033[11;1H"
    echo -e "${CYAN}│${NC} Orders App        : $orders_app http://$BEST_IP:$ORDERS_PORT                       ${CYAN}│${NC}"
    printf "\033[12;1H"
    echo -e "${CYAN}│${NC} Sales App         : $sales_app http://$BEST_IP:$SALES_PORT                        ${CYAN}│${NC}"
    
    # Update container status (lines 16-19)
    local backend_container=$(get_container_status "elif-shared-backend-elif-backend-1")
    local admin_container=$(get_container_status "elif-admin-app-elif-admin-app-1")
    local orders_container=$(get_container_status "elif-orders-app-elif-orders-app-1")
    local sales_container=$(get_container_status "elif-sales-app-elif-sales-app-1")
    
    printf "\033[16;1H"
    echo -e "${BLUE}│${NC} elif-shared-backend-elif-backend-1     : $backend_container Backend Service                                    ${BLUE}│${NC}"
    printf "\033[17;1H"
    echo -e "${BLUE}│${NC} elif-admin-app-elif-admin-app-1   : $admin_container Admin Frontend                                     ${BLUE}│${NC}"
    printf "\033[18;1H"
    echo -e "${BLUE}│${NC} elif-orders-app-elif-orders-app-1  : $orders_container Orders Frontend                                    ${BLUE}│${NC}"
    printf "\033[19;1H"
    echo -e "${BLUE}│${NC} elif-sales-app-elif-sales-app-1   : $sales_container Sales Frontend                                     ${BLUE}│${NC}"
    
    # Update system metrics (lines 23-25)
    local metrics=$(get_system_metrics)
    local cpu=$(echo $metrics | cut -d'|' -f1)
    local memory=$(echo $metrics | cut -d'|' -f2)
    local disk=$(echo $metrics | cut -d'|' -f3)
    
    # Color code based on usage
    local cpu_color=$GREEN
    if (( $(echo "$cpu > 80" | bc -l) )); then
        cpu_color=$RED
    elif (( $(echo "$cpu > 60" | bc -l) )); then
        cpu_color=$YELLOW
    fi
    
    local mem_color=$GREEN
    if (( $(echo "$memory > 80" | bc -l) )); then
        mem_color=$RED
    elif (( $(echo "$memory > 60" | bc -l) )); then
        mem_color=$YELLOW
    fi
    
    local disk_color=$GREEN
    if [ "$disk" -gt 80 ]; then
        disk_color=$RED
    elif [ "$disk" -gt 60 ]; then
        disk_color=$YELLOW
    fi
    
    printf "\033[23;1H"
    echo -e "${YELLOW}│${NC} CPU Usage    : ${cpu_color}%5s${NC}                                                ${YELLOW}│${NC}" "$cpu"
    printf "\033[24;1H"
    echo -e "${YELLOW}│${NC} Memory Usage : ${mem_color}%5s${NC}                                                ${YELLOW}│${NC}" "$memory"
    printf "\033[25;1H"
    echo -e "${YELLOW}│${NC} Disk Usage   : ${disk_color}%3s${NC}                                                  ${YELLOW}│${NC}" "$disk"
    
    # Update recent activity (lines 30-32)
    local activity=$(get_recent_activity)
    local requests=$(echo $activity | cut -d'|' -f1)
    local errors=$(echo $activity | cut -d'|' -f2)
    local auth=$(echo $activity | cut -d'|' -f3)
    
    printf "\033[30;1H"
    echo -e "${PURPLE}│${NC}   API Requests: ${GREEN}%3s${NC}                                                ${PURPLE}│${NC}" "$requests"
    printf "\033[31;1H"
    echo -e "${PURPLE}│${NC}   Errors      : ${GREEN}%3s${NC}                                                ${PURPLE}│${NC}" "$errors"
    printf "\033[32;1H"
    echo -e "${PURPLE}│${NC}   Auth Events : ${GREEN}%3s${NC}                                                ${PURPLE}│${NC}" "$auth"
    
    # Update access URLs (lines 40-43)
    printf "\033[40;1H"
    echo -e "  ${GREEN}Backend:${NC} http://$BEST_IP:$BACKEND_PORT"
    printf "\033[41;1H"
    echo -e "  ${GREEN}Admin:${NC}   http://$BEST_IP:$ADMIN_PORT"
    printf "\033[42;1H"
    echo -e "  ${GREEN}Orders:${NC}  http://$BEST_IP:$ORDERS_PORT"
    printf "\033[43;1H"
    echo -e "  ${GREEN}Sales:${NC}   http://$BEST_IP:$SALES_PORT"
    
    # Move cursor to bottom
    printf "\033[45;1H"
}

# Function to start live dashboard
start_live_dashboard() {
    local interval=${1:-5}
    
    # Set up signal handler for clean exit
    trap 'echo -e "\n${YELLOW}Stopping live dashboard...${NC}"; exit 0' INT
    
    # Show initial dashboard
    show_initial_dashboard
    
    # Update dashboard continuously
    while true; do
        sleep $interval
        update_dashboard
    done
}

# Function to show help
show_help() {
    echo "Live Dashboard for Warehouse Manager"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -i, --interval N    Set refresh interval in seconds (default: 5)"
    echo ""
    echo "Features:"
    echo "  - Updates data in place without redrawing entire screen"
    echo "  - Real-time service status monitoring"
    echo "  - Live system metrics (CPU, Memory, Disk)"
    echo "  - Recent activity tracking"
    echo "  - Dynamic IP detection"
    echo "  - Color-coded status indicators"
    echo ""
    echo "Examples:"
    echo "  $0                  # Start with 5-second refresh"
    echo "  $0 -i 3             # Start with 3-second refresh"
    echo "  $0 --interval 10    # Start with 10-second refresh"
}

# Main script logic
case "$1" in
    -h|--help)
        show_help
        ;;
    -i|--interval)
        start_live_dashboard "$2"
        ;;
    "")
        start_live_dashboard 5
        ;;
    *)
        echo "Unknown option: $1"
        show_help
        exit 1
        ;;
esac
