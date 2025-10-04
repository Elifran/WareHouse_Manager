#!/bin/bash

# Warehouse Manager Dashboard
# Real-time overview of all services

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

# First run flag for smooth updates
FIRST_RUN="true"

# Function to refresh IP detection
refresh_ip_detection() {
    DYNAMIC_IP=$($DETECT_IP_SCRIPT current 2>/dev/null || echo "192.168.13.215")
    BEST_IP=$($DETECT_IP_SCRIPT best 2>/dev/null || echo "10.10.1.1")
}

# Function to clear screen and show header (only on first run)
show_header() {
    if [ "$FIRST_RUN" = "true" ]; then
        clear
        FIRST_RUN="false"
    fi
    
    # Refresh IP detection
    refresh_ip_detection
    
    # Move cursor to top and clear from cursor to end of screen
    printf "\033[H\033[J"
    
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                    WAREHOUSE MANAGER DASHBOARD                ║${NC}"
    echo -e "${PURPLE}║                        $(date '+%Y-%m-%d %H:%M:%S')                        ║${NC}"
    echo -e "${PURPLE}║${NC} Static: $STATIC_IP | Current: $DYNAMIC_IP | Best: $BEST_IP ${PURPLE}║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
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

# Function to show service status table
show_services() {
    echo -e "${CYAN}┌─────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│                        SERVICE STATUS                      │${NC}"
    echo -e "${CYAN}├─────────────────────────────────────────────────────────────┤${NC}"
    
    # Backend Services
    local backend_static=$(get_service_status "Backend (Static)" "http://$STATIC_IP:$BACKEND_PORT/api/health/")
    local backend_dynamic=$(get_service_status "Backend (Dynamic)" "http://$DYNAMIC_IP:$BACKEND_PORT/api/health/")
    local admin_app=$(get_service_status "Admin App" "http://$BEST_IP:$ADMIN_PORT")
    local orders_app=$(get_service_status "Orders App" "http://$BEST_IP:$ORDERS_PORT")
    local sales_app=$(get_service_status "Sales App" "http://$BEST_IP:$SALES_PORT")
    
    printf "${CYAN}│${NC} %-20s ${backend_static} %-15s ${NC}${CYAN}│${NC}\n" "Backend (Static)" "http://$STATIC_IP:$BACKEND_PORT"
    printf "${CYAN}│${NC} %-20s ${backend_dynamic} %-15s ${NC}${CYAN}│${NC}\n" "Backend (Dynamic)" "http://$DYNAMIC_IP:$BACKEND_PORT"
    printf "${CYAN}│${NC} %-20s ${admin_app} %-15s ${NC}${CYAN}│${NC}\n" "Admin App" "http://$BEST_IP:$ADMIN_PORT"
    printf "${CYAN}│${NC} %-20s ${orders_app} %-15s ${NC}${CYAN}│${NC}\n" "Orders App" "http://$BEST_IP:$ORDERS_PORT"
    printf "${CYAN}│${NC} %-20s ${sales_app} %-15s ${NC}${CYAN}│${NC}\n" "Sales App" "http://$BEST_IP:$SALES_PORT"
    
    echo -e "${CYAN}└─────────────────────────────────────────────────────────────┘${NC}"
    echo ""
}

# Function to show container status
show_containers() {
    echo -e "${BLUE}┌─────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${BLUE}│                      CONTAINER STATUS                      │${NC}"
    echo -e "${BLUE}├─────────────────────────────────────────────────────────────┤${NC}"
    
    local backend_container=$(get_container_status "elif-shared-backend-elif-backend-1")
    local admin_container=$(get_container_status "elif-admin-app-elif-admin-app-1")
    local orders_container=$(get_container_status "elif-orders-app-elif-orders-app-1")
    local sales_container=$(get_container_status "elif-sales-app-elif-sales-app-1")
    
    printf "${BLUE}│${NC} %-20s ${backend_container} %-15s ${NC}${BLUE}│${NC}\n" "elif-shared-backend-elif-backend-1" "Backend Service"
    printf "${BLUE}│${NC} %-20s ${admin_container} %-15s ${NC}${BLUE}│${NC}\n" "elif-admin-app-elif-admin-app-1" "Admin Frontend"
    printf "${BLUE}│${NC} %-20s ${orders_container} %-15s ${NC}${BLUE}│${NC}\n" "elif-orders-app-elif-orders-app-1" "Orders Frontend"
    printf "${BLUE}│${NC} %-20s ${sales_container} %-15s ${NC}${BLUE}│${NC}\n" "elif-sales-app-elif-sales-app-1" "Sales Frontend"
    
    echo -e "${BLUE}└─────────────────────────────────────────────────────────────┘${NC}"
    echo ""
}

# Function to show system metrics
show_system_metrics() {
    local metrics=$(get_system_metrics)
    local cpu=$(echo $metrics | cut -d'|' -f1)
    local memory=$(echo $metrics | cut -d'|' -f2)
    local disk=$(echo $metrics | cut -d'|' -f3)
    
    echo -e "${YELLOW}┌─────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${YELLOW}│                      SYSTEM METRICS                        │${NC}"
    echo -e "${YELLOW}├─────────────────────────────────────────────────────────────┤${NC}"
    
    # CPU Usage with color coding
    local cpu_color=$GREEN
    if (( $(echo "$cpu > 80" | bc -l) )); then
        cpu_color=$RED
    elif (( $(echo "$cpu > 60" | bc -l) )); then
        cpu_color=$YELLOW
    fi
    
    # Memory Usage with color coding
    local mem_color=$GREEN
    if (( $(echo "$memory > 80" | bc -l) )); then
        mem_color=$RED
    elif (( $(echo "$memory > 60" | bc -l) )); then
        mem_color=$YELLOW
    fi
    
    # Disk Usage with color coding
    local disk_color=$GREEN
    if [ "$disk" -gt 80 ]; then
        disk_color=$RED
    elif [ "$disk" -gt 60 ]; then
        disk_color=$YELLOW
    fi
    
    printf "${YELLOW}│${NC} %-15s ${cpu_color}%6s%%${NC} %-15s ${NC}${YELLOW}│${NC}\n" "CPU Usage:" "$cpu" ""
    printf "${YELLOW}│${NC} %-15s ${mem_color}%6s%%${NC} %-15s ${NC}${YELLOW}│${NC}\n" "Memory Usage:" "$memory" ""
    printf "${YELLOW}│${NC} %-15s ${disk_color}%6s%%${NC} %-15s ${NC}${YELLOW}│${NC}\n" "Disk Usage:" "$disk" ""
    
    echo -e "${YELLOW}└─────────────────────────────────────────────────────────────┘${NC}"
    echo ""
}

# Function to show quick actions
show_quick_actions() {
    echo -e "${WHITE}┌─────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${WHITE}│                       QUICK ACTIONS                        │${NC}"
    echo -e "${WHITE}├─────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${WHITE}│${NC} ${GREEN}●${NC} = Online    ${RED}●${NC} = Offline    ${YELLOW}⚠${NC} = Warning    ${BLUE}ℹ${NC} = Info ${WHITE}│${NC}"
    echo -e "${WHITE}└─────────────────────────────────────────────────────────────┘${NC}"
    echo ""
    echo -e "${CYAN}Available Commands:${NC}"
    echo -e "  ${GREEN}./monitor-servers.sh${NC}     - Detailed monitoring"
    echo -e "  ${GREEN}./start-monitoring.sh${NC}    - Start background monitoring"
    echo -e "  ${GREEN}./restart-all-services.sh${NC} - Restart all services"
    echo -e "  ${GREEN}./status.sh${NC}              - Check service status"
    echo -e "  ${GREEN}./switch-api-url.sh${NC}      - Switch between IP addresses"
    echo -e "  ${GREEN}./detect-ip.sh${NC}           - Check current IP addresses"
    echo ""
    echo -e "${CYAN}Current Access URLs:${NC}"
    echo -e "  ${GREEN}Backend:${NC} http://$BEST_IP:$BACKEND_PORT"
    echo -e "  ${GREEN}Admin:${NC}   http://$BEST_IP:$ADMIN_PORT"
    echo -e "  ${GREEN}Orders:${NC}  http://$BEST_IP:$ORDERS_PORT"
    echo -e "  ${GREEN}Sales:${NC}   http://$BEST_IP:$SALES_PORT"
    echo ""
}

# Function to show recent activity
show_recent_activity() {
    echo -e "${PURPLE}┌─────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${PURPLE}│                      RECENT ACTIVITY                       │${NC}"
    echo -e "${PURPLE}├─────────────────────────────────────────────────────────────┤${NC}"
    
    # Show recent API calls
    local recent_requests=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "GET\|POST\|PUT\|DELETE" || echo "0")
    local recent_errors=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "ERROR\|Exception\|500\|400\|404" || echo "0")
    local recent_auth=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "login\|auth\|token" || echo "0")
    
    echo -e "${PURPLE}│${NC} Last Minute Activity:"
    echo -e "${PURPLE}│${NC}   API Requests: $recent_requests"
    echo -e "${PURPLE}│${NC}   Errors: $recent_errors"
    echo -e "${PURPLE}│${NC}   Auth Events: $recent_auth"
    
    # Show recent backend logs
    echo -e "${PURPLE}│${NC} Recent Backend Logs:"
    docker logs --tail 2 elif-shared-backend-elif-backend-1 2>/dev/null | while read line; do
        # Truncate long lines
        if [ ${#line} -gt 50 ]; then
            line="${line:0:47}..."
        fi
        printf "${PURPLE}│${NC}   %s\n" "$line"
    done
    
    echo -e "${PURPLE}└─────────────────────────────────────────────────────────────┘${NC}"
    echo ""
}

# Main dashboard function
show_dashboard() {
    show_header
    show_services
    show_containers
    show_system_metrics
    show_recent_activity
    show_quick_actions
}

# Auto-refresh mode
auto_refresh() {
    local interval=${1:-5}
    
    # Set up signal handler for clean exit
    trap 'echo -e "\n${YELLOW}Stopping dashboard...${NC}"; exit 0' INT
    
    # Show initial dashboard
    show_dashboard
    echo -e "${CYAN}Auto-refreshing every ${interval} seconds... Press Ctrl+C to exit${NC}"
    
    while true; do
        sleep $interval
        show_dashboard
        echo -e "${CYAN}Auto-refreshing every ${interval} seconds... Press Ctrl+C to exit${NC}"
    done
}

# Show help
show_help() {
    echo "Warehouse Manager Dashboard"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -r, --refresh N     Auto-refresh mode (default: 10s)"
    echo "  -s, --single        Show dashboard once and exit"
    echo ""
    echo "Examples:"
    echo "  $0                  # Show dashboard once"
    echo "  $0 -r               # Auto-refresh every 10 seconds"
    echo "  $0 -r 5             # Auto-refresh every 5 seconds"
    echo "  $0 -s               # Show dashboard once and exit"
}

# Main script logic
case "$1" in
    -h|--help)
        show_help
        ;;
    -r|--refresh)
        auto_refresh "$2"
        ;;
    -s|--single)
        show_dashboard
        ;;
    "")
        # Default to continuous mode
        auto_refresh 5
        ;;
    *)
        echo "Unknown option: $1"
        show_help
        exit 1
        ;;
esac
