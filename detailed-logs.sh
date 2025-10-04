#!/bin/bash

# Detailed Log Monitoring for Warehouse Manager
# Shows complete information: IP addresses, user agents, request details, etc.

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

# Function to refresh IP detection
refresh_ip_detection() {
    DYNAMIC_IP=$($DETECT_IP_SCRIPT current 2>/dev/null || echo "192.168.13.215")
    BEST_IP=$($DETECT_IP_SCRIPT best 2>/dev/null || echo "10.10.1.1")
}

# Function to get timestamp
get_timestamp() {
    date '+%H:%M:%S'
}

# Function to parse and format detailed log entry
format_detailed_log() {
    local service=$1
    local line=$2
    local timestamp=$(get_timestamp)
    
    # Parse different log formats
    if echo "$line" | grep -q "HTTP/1.1"; then
        # Django/Backend logs: [04/Oct/2025 10:32:47] "GET /api/health/ HTTP/1.1" 200 45
        parse_backend_log "$service" "$line" "$timestamp"
    elif echo "$line" | grep -q "GET\|POST\|PUT\|DELETE"; then
        # Nginx logs: 10.10.1.1 - - [04/Oct/2025:10:32:47 +0000] "GET / HTTP/1.1" 200 658 "-" "curl/8.14.1" "-"
        parse_nginx_log "$service" "$line" "$timestamp"
    else
        # Other logs
        format_generic_log "$service" "$line" "$timestamp"
    fi
}

# Function to parse Django/Backend logs
parse_backend_log() {
    local service=$1
    local line=$2
    local timestamp=$3
    
    # Extract components using regex
    if [[ $line =~ \[([^\]]+)\]\ \"([A-Z]+)\ ([^\"]+)\ HTTP/1\.1\"\ ([0-9]+)\ ([0-9]+) ]]; then
        local log_time="${BASH_REMATCH[1]}"
        local method="${BASH_REMATCH[2]}"
        local path="${BASH_REMATCH[3]}"
        local status="${BASH_REMATCH[4]}"
        local size="${BASH_REMATCH[5]}"
        
        # Color code by status
        local status_color=$GREEN
        if [[ $status -ge 400 && $status -lt 500 ]]; then
            status_color=$YELLOW
        elif [[ $status -ge 500 ]]; then
            status_color=$RED
        fi
        
        # Color code by method
        local method_color=$BLUE
        case $method in
            "GET") method_color=$GREEN ;;
            "POST") method_color=$YELLOW ;;
            "PUT") method_color=$PURPLE ;;
            "DELETE") method_color=$RED ;;
            "PATCH") method_color=$CYAN ;;
        esac
        
        echo -e "${GRAY}[$timestamp]${NC} ${PURPLE}[$service]${NC}"
        echo -e "  ${CYAN}Time:${NC} $log_time"
        echo -e "  ${CYAN}Method:${NC} ${method_color}$method${NC}"
        echo -e "  ${CYAN}Path:${NC} $path"
        echo -e "  ${CYAN}Status:${NC} ${status_color}$status${NC}"
        echo -e "  ${CYAN}Size:${NC} ${size} bytes"
        
        # Add extra info based on path
        if [[ $path == *"/api/"* ]]; then
            echo -e "  ${CYAN}Type:${NC} ${GREEN}API Request${NC}"
        fi
        if [[ $path == *"/admin/"* ]]; then
            echo -e "  ${CYAN}Type:${NC} ${PURPLE}Admin Access${NC}"
        fi
        if [[ $path == *"/static/"* ]]; then
            echo -e "  ${CYAN}Type:${NC} ${GRAY}Static File${NC}"
        fi
        
        echo ""
    else
        # Fallback for unparseable backend logs
        format_generic_log "$service" "$line" "$timestamp"
    fi
}

# Function to parse Nginx logs
parse_nginx_log() {
    local service=$1
    local line=$2
    local timestamp=$3
    
    # Parse nginx log format: IP - - [time] "method path protocol" status size "referer" "user-agent" "forwarded"
    # Handle both HTTP/1.0 and HTTP/1.1
    if [[ $line =~ ^([0-9.]+)\ -\ -\ \[([^\]]+)\]\ \"([A-Z]+)\ ([^\"]+)\ HTTP/1\.[01]\"\ ([0-9]+)\ ([0-9]+)\ \"([^\"]*)\"\ \"([^\"]*)\"\ \"([^\"]*)\" ]]; then
        local client_ip="${BASH_REMATCH[1]}"
        local log_time="${BASH_REMATCH[2]}"
        local method="${BASH_REMATCH[3]}"
        local path="${BASH_REMATCH[4]}"
        local status="${BASH_REMATCH[5]}"
        local size="${BASH_REMATCH[6]}"
        local referer="${BASH_REMATCH[7]}"
        local user_agent="${BASH_REMATCH[8]}"
        local forwarded="${BASH_REMATCH[9]}"
        
        # Color code by status
        local status_color=$GREEN
        if [[ $status -ge 400 && $status -lt 500 ]]; then
            status_color=$YELLOW
        elif [[ $status -ge 500 ]]; then
            status_color=$RED
        fi
        
        # Color code by method
        local method_color=$BLUE
        case $method in
            "GET") method_color=$GREEN ;;
            "POST") method_color=$YELLOW ;;
            "PUT") method_color=$PURPLE ;;
            "DELETE") method_color=$RED ;;
            "PATCH") method_color=$CYAN ;;
        esac
        
        # Determine client type
        local client_type="Unknown"
        if [[ $user_agent == *"curl"* ]]; then
            client_type="${BLUE}API Client (curl)${NC}"
        elif [[ $user_agent == *"Mozilla"* ]]; then
            client_type="${GREEN}Web Browser${NC}"
        elif [[ $user_agent == *"Postman"* ]]; then
            client_type="${PURPLE}Postman${NC}"
        elif [[ $user_agent == *"python"* ]]; then
            client_type="${YELLOW}Python Script${NC}"
        elif [[ $user_agent == *"wget"* ]]; then
            client_type="${BLUE}API Client (wget)${NC}"
        elif [[ $user_agent == *"Chrome"* ]]; then
            client_type="${GREEN}Chrome Browser${NC}"
        elif [[ $user_agent == *"Firefox"* ]]; then
            client_type="${GREEN}Firefox Browser${NC}"
        elif [[ $user_agent == *"Safari"* ]]; then
            client_type="${GREEN}Safari Browser${NC}"
        elif [[ $user_agent == *"Edge"* ]]; then
            client_type="${GREEN}Edge Browser${NC}"
        fi
        
        echo -e "${GRAY}[$timestamp]${NC} ${PURPLE}[$service]${NC}"
        echo -e "  ${CYAN}Client IP:${NC} ${WHITE}$client_ip${NC}"
        if [[ $forwarded != "-" && $forwarded != "" ]]; then
            echo -e "  ${CYAN}Real IP:${NC} ${WHITE}$forwarded${NC} (via proxy)"
        fi
        echo -e "  ${CYAN}Time:${NC} $log_time"
        echo -e "  ${CYAN}Method:${NC} ${method_color}$method${NC}"
        echo -e "  ${CYAN}Path:${NC} $path"
        echo -e "  ${CYAN}Status:${NC} ${status_color}$status${NC}"
        echo -e "  ${CYAN}Size:${NC} ${size} bytes"
        echo -e "  ${CYAN}Client:${NC} $client_type"
        
        if [[ $referer != "-" && $referer != "" ]]; then
            echo -e "  ${CYAN}Referer:${NC} $referer"
        fi
        
        if [[ $user_agent != "-" && $user_agent != "" ]]; then
            echo -e "  ${CYAN}User Agent:${NC} $user_agent"
        fi
        
        # Add extra info based on path
        if [[ $path == *"/api/"* ]]; then
            echo -e "  ${CYAN}Type:${NC} ${GREEN}API Request${NC}"
        fi
        if [[ $path == *"/admin/"* ]]; then
            echo -e "  ${CYAN}Type:${NC} ${PURPLE}Admin Access${NC}"
        fi
        if [[ $path == *"/static/"* ]]; then
            echo -e "  ${CYAN}Type:${NC} ${GRAY}Static File${NC}"
        fi
        
        echo ""
    else
        # Fallback for unparseable nginx logs
        format_generic_log "$service" "$line" "$timestamp"
    fi
}

# Function to format generic logs
format_generic_log() {
    local service=$1
    local line=$2
    local timestamp=$3
    
    # Categorize log entries
    if echo "$line" | grep -qi "error\|exception\|failed\|500\|400\|404"; then
        echo -e "${RED}[$timestamp]${NC} ${YELLOW}[$service]${NC} ${RED}$line${NC}"
    elif echo "$line" | grep -qi "warning\|warn"; then
        echo -e "${YELLOW}[$timestamp]${NC} ${YELLOW}[$service]${NC} ${YELLOW}$line${NC}"
    elif echo "$line" | grep -qi "login\|auth\|token\|session"; then
        echo -e "${PURPLE}[$timestamp]${NC} ${PURPLE}[$service]${NC} ${PURPLE}$line${NC}"
    elif echo "$line" | grep -qi "select\|insert\|update\|delete\|query"; then
        echo -e "${CYAN}[$timestamp]${NC} ${CYAN}[$service]${NC} ${CYAN}$line${NC}"
    else
        echo -e "${WHITE}[$timestamp]${NC} ${WHITE}[$service]${NC} ${WHITE}$line${NC}"
    fi
}

# Function to monitor backend logs with detailed parsing
monitor_backend_detailed() {
    local start_time=$(date '+%Y-%m-%dT%H:%M:%S')
    docker logs -f --since "$start_time" elif-shared-backend-elif-backend-1 2>&1 | while read line; do
        format_detailed_log "BACKEND" "$line"
    done &
}

# Function to monitor admin app logs with detailed parsing
monitor_admin_detailed() {
    local start_time=$(date '+%Y-%m-%dT%H:%M:%S')
    docker logs -f --since "$start_time" elif-admin-app-elif-admin-app-1 2>&1 | while read line; do
        format_detailed_log "ADMIN" "$line"
    done &
}

# Function to monitor orders app logs with detailed parsing
monitor_orders_detailed() {
    local start_time=$(date '+%Y-%m-%dT%H:%M:%S')
    docker logs -f --since "$start_time" elif-orders-app-elif-orders-app-1 2>&1 | while read line; do
        format_detailed_log "ORDERS" "$line"
    done &
}

# Function to monitor sales app logs with detailed parsing
monitor_sales_detailed() {
    local start_time=$(date '+%Y-%m-%dT%H:%M:%S')
    docker logs -f --since "$start_time" elif-sales-app-elif-sales-app-1 2>&1 | while read line; do
        format_detailed_log "SALES" "$line"
    done &
}

# Function to show connection statistics
show_connection_stats() {
    while true; do
        local backend_conn=$(netstat -an 2>/dev/null | grep ":$BACKEND_PORT" | grep ESTABLISHED | wc -l)
        local admin_conn=$(netstat -an 2>/dev/null | grep ":$ADMIN_PORT" | grep ESTABLISHED | wc -l)
        local orders_conn=$(netstat -an 2>/dev/null | grep ":$ORDERS_PORT" | grep ESTABLISHED | wc -l)
        local sales_conn=$(netstat -an 2>/dev/null | grep ":$SALES_PORT" | grep ESTABLISHED | wc -l)
        
        if [ $((backend_conn + admin_conn + orders_conn + sales_conn)) -gt 0 ]; then
            echo -e "${BLUE}[$(get_timestamp)]${NC} ${CYAN}[CONNECTIONS]${NC}"
            echo -e "  ${CYAN}Backend:${NC} $backend_conn active connections"
            echo -e "  ${CYAN}Admin:${NC} $admin_conn active connections"
            echo -e "  ${CYAN}Orders:${NC} $orders_conn active connections"
            echo -e "  ${CYAN}Sales:${NC} $sales_conn active connections"
            echo ""
        fi
        
        sleep 15
    done &
}

# Function to show detailed connection info
show_detailed_connections() {
    while true; do
        echo -e "${BLUE}[$(get_timestamp)]${NC} ${CYAN}[DETAILED CONNECTIONS]${NC}"
        
        # Show active connections with IP details
        netstat -an 2>/dev/null | grep -E ":$BACKEND_PORT|:$ADMIN_PORT|:$ORDERS_PORT|:$SALES_PORT" | grep ESTABLISHED | while read line; do
            local local_addr=$(echo $line | awk '{print $4}')
            local remote_addr=$(echo $line | awk '{print $5}')
            local state=$(echo $line | awk '{print $6}')
            
            # Extract port from local address
            local port=$(echo $local_addr | cut -d: -f2)
            local service_name="Unknown"
            
            case $port in
                "$BACKEND_PORT") service_name="Backend" ;;
                "$ADMIN_PORT") service_name="Admin" ;;
                "$ORDERS_PORT") service_name="Orders" ;;
                "$SALES_PORT") service_name="Sales" ;;
            esac
            
            echo -e "  ${GREEN}$service_name${NC}: ${WHITE}$remote_addr${NC} -> ${WHITE}$local_addr${NC} (${GREEN}$state${NC})"
        done
        
        echo ""
        sleep 20
    done &
}

# Function to show header
show_header() {
    clear
    refresh_ip_detection
    
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                        WAREHOUSE MANAGER - DETAILED LOGS                           ║${NC}"
    echo -e "${PURPLE}║                                $(date '+%Y-%m-%d %H:%M:%S')                                ║${NC}"
    echo -e "${PURPLE}║${NC} Static: $STATIC_IP | Current: $DYNAMIC_IP | Best: $BEST_IP ${PURPLE}║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}Monitoring with COMPLETE information: IP addresses, user agents, request details...${NC}"
    echo -e "${CYAN}Press Ctrl+C to stop monitoring${NC}"
    echo ""
    echo -e "${WHITE}Information Shown:${NC}"
    echo -e "  ${GREEN}●${NC} Client IP addresses"
    echo -e "  ${GREEN}●${NC} Request methods and paths"
    echo -e "  ${GREEN}●${NC} HTTP status codes"
    echo -e "  ${GREEN}●${NC} Response sizes"
    echo -e "  ${GREEN}●${NC} User agents and client types"
    echo -e "  ${GREEN}●${NC} Referer information"
    echo -e "  ${GREEN}●${NC} Connection details"
    echo -e "  ${GREEN}●${NC} Request timestamps"
    echo ""
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Function to start detailed monitoring
start_detailed_monitoring() {
    show_header
    
    # Start all monitoring processes
    monitor_backend_detailed
    monitor_admin_detailed
    monitor_orders_detailed
    monitor_sales_detailed
    show_connection_stats
    show_detailed_connections
    
    # Wait for user interrupt
    trap 'echo -e "\n${YELLOW}Stopping detailed monitoring...${NC}"; kill $(jobs -p) 2>/dev/null; exit 0' INT
    
    # Keep the script running
    while true; do
        sleep 1
    done
}

# Function to show recent detailed logs
show_recent_detailed() {
    local service=${1:-"all"}
    local limit=${2:-10}
    
    echo -e "${BLUE}Recent Detailed Logs (Service: $service, Limit: $limit):${NC}"
    echo ""
    
    case $service in
        "backend")
            echo -e "${YELLOW}=== BACKEND DETAILED LOGS ===${NC}"
            docker logs elif-shared-backend-elif-backend-1 2>&1 | tail -$limit | while read line; do
                format_detailed_log "BACKEND" "$line"
            done
            echo ""
            ;;
        "admin")
            echo -e "${YELLOW}=== ADMIN DETAILED LOGS ===${NC}"
            docker logs elif-admin-app-elif-admin-app-1 2>&1 | tail -$limit | while read line; do
                format_detailed_log "ADMIN" "$line"
            done
            echo ""
            ;;
        "orders")
            echo -e "${YELLOW}=== ORDERS DETAILED LOGS ===${NC}"
            docker logs elif-orders-app-elif-orders-app-1 2>&1 | tail -$limit | while read line; do
                format_detailed_log "ORDERS" "$line"
            done
            echo ""
            ;;
        "sales")
            echo -e "${YELLOW}=== SALES DETAILED LOGS ===${NC}"
            docker logs elif-sales-app-elif-sales-app-1 2>&1 | tail -$limit | while read line; do
                format_detailed_log "SALES" "$line"
            done
            echo ""
            ;;
        "all"|*)
            echo -e "${YELLOW}=== BACKEND DETAILED LOGS ===${NC}"
            docker logs elif-shared-backend-elif-backend-1 2>&1 | tail -$limit | while read line; do
                format_detailed_log "BACKEND" "$line"
            done
            echo ""
            
            echo -e "${YELLOW}=== ADMIN DETAILED LOGS ===${NC}"
            docker logs elif-admin-app-elif-admin-app-1 2>&1 | tail -$limit | while read line; do
                format_detailed_log "ADMIN" "$line"
            done
            echo ""
            
            echo -e "${YELLOW}=== ORDERS DETAILED LOGS ===${NC}"
            docker logs elif-orders-app-elif-orders-app-1 2>&1 | tail -$limit | while read line; do
                format_detailed_log "ORDERS" "$line"
            done
            echo ""
            
            echo -e "${YELLOW}=== SALES DETAILED LOGS ===${NC}"
            docker logs elif-sales-app-elif-sales-app-1 2>&1 | tail -$limit | while read line; do
                format_detailed_log "SALES" "$line"
            done
            echo ""
            ;;
    esac
}

# Function to show help
show_help() {
    echo "Detailed Log Monitoring for Warehouse Manager"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -s, --start         Start detailed monitoring (default)"
    echo "  -r, --recent        Show recent detailed logs"
    echo "  -c, --service NAME  Filter by service (backend, admin, orders, sales)"
    echo "  -l, --limit N       Limit number of log entries (default: 10)"
    echo ""
    echo "Features:"
    echo "  - Complete IP address information"
    echo "  - User agent and client type detection"
    echo "  - Request method, path, and status codes"
    echo "  - Response sizes and timing"
    echo "  - Referer and forwarded headers"
    echo "  - Connection statistics"
    echo "  - Color-coded by status and method"
    echo "  - Real-time monitoring of NEW logs only"
    echo ""
    echo "Examples:"
    echo "  $0                  # Start detailed monitoring"
    echo "  $0 -s               # Start detailed monitoring"
    echo "  $0 -r               # Show recent detailed logs"
    echo "  $0 -r -c backend    # Show recent backend logs"
    echo "  $0 -r -l 20         # Show last 20 detailed logs"
}

# Main script logic
case "$1" in
    -h|--help)
        show_help
        ;;
    -s|--start|"")
        start_detailed_monitoring
        ;;
    -r|--recent)
        show_recent_detailed "$3" "$5"
        ;;
    -c|--service)
        show_recent_detailed "$2" "$4"
        ;;
    -l|--limit)
        show_recent_detailed "$4" "$2"
        ;;
    *)
        echo "Unknown option: $1"
        show_help
        exit 1
        ;;
esac
