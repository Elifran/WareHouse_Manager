#!/bin/bash

# Warehouse Manager Server Monitoring Script
# Monitors all services: Backend, Admin App, Orders App, Sales App

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

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

# Log file
LOG_FILE="/tmp/warehouse_monitor.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Function to refresh IP detection
refresh_ip_detection() {
    DYNAMIC_IP=$($DETECT_IP_SCRIPT current 2>/dev/null || echo "192.168.13.215")
    BEST_IP=$($DETECT_IP_SCRIPT best 2>/dev/null || echo "10.10.1.1")
}

# Function to print colored output
print_status() {
    local status=$1
    local service=$2
    local message=$3
    
    case $status in
        "OK")
            echo -e "${GREEN}✓${NC} $service: $message"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠${NC} $service: $message"
            ;;
        "ERROR")
            echo -e "${RED}✗${NC} $service: $message"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ${NC} $service: $message"
            ;;
        "HEADER")
            echo -e "${PURPLE}=== $service ===${NC}"
            ;;
    esac
}

# Function to check if a service is responding
check_service() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$url" 2>/dev/null)
    
    if [ "$response" = "$expected_status" ]; then
        print_status "OK" "$service_name" "Responding (HTTP $response)"
        return 0
    else
        print_status "ERROR" "$service_name" "Not responding (HTTP $response)"
        return 1
    fi
}

# Function to check Docker container status
check_docker_container() {
    local container_name=$1
    local status=$(docker ps --filter "name=$container_name" --format "table {{.Status}}" | tail -n +2)
    
    if [ -n "$status" ]; then
        if [[ $status == *"Up"* ]]; then
            print_status "OK" "$container_name" "Container running: $status"
            return 0
        else
            print_status "ERROR" "$container_name" "Container not running: $status"
            return 1
        fi
    else
        print_status "ERROR" "$container_name" "Container not found"
        return 1
    fi
}

# Function to get container resource usage
get_container_stats() {
    local container_name=$1
    local stats=$(docker stats --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" --filter "name=$container_name" 2>/dev/null | tail -n +2)
    
    if [ -n "$stats" ]; then
        print_status "INFO" "$container_name" "CPU: $(echo $stats | awk '{print $1}'), Memory: $(echo $stats | awk '{print $2}')"
    fi
}

# Function to check backend health endpoint
check_backend_health() {
    local ip=$1
    local health_url="http://$ip:$BACKEND_PORT/api/health/"
    local response=$(curl -s --connect-timeout 5 "$health_url" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$response" ]; then
        print_status "OK" "Backend Health" "API responding: $response"
        return 0
    else
        print_status "ERROR" "Backend Health" "API not responding"
        return 1
    fi
}

# Function to check database connectivity
check_database() {
    local ip=$1
    local db_url="http://$ip:$BACKEND_PORT/api/products/"
    local response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$db_url" 2>/dev/null)
    
    if [ "$response" = "200" ] || [ "$response" = "401" ]; then
        print_status "OK" "Database" "Connected (HTTP $response)"
        return 0
    else
        print_status "ERROR" "Database" "Connection failed (HTTP $response)"
        return 1
    fi
}

# Function to monitor logs
monitor_logs() {
    local container_name=$1
    local lines=${2:-10}
    
    print_status "INFO" "$container_name" "Recent logs (last $lines lines):"
    docker logs --tail $lines "$container_name" 2>/dev/null | while read line; do
        echo "  $line"
    done
}

# Function to check disk space
check_disk_space() {
    local usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$usage" -lt 80 ]; then
        print_status "OK" "Disk Space" "Usage: ${usage}%"
    elif [ "$usage" -lt 90 ]; then
        print_status "WARNING" "Disk Space" "Usage: ${usage}%"
    else
        print_status "ERROR" "Disk Space" "Usage: ${usage}% - Critical!"
    fi
}

# Function to check memory usage
check_memory() {
    local usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ "$usage" -lt 80 ]; then
        print_status "OK" "Memory" "Usage: ${usage}%"
    elif [ "$usage" -lt 90 ]; then
        print_status "WARNING" "Memory" "Usage: ${usage}%"
    else
        print_status "ERROR" "Memory" "Usage: ${usage}% - Critical!"
    fi
}

# Function to generate report
generate_report() {
    local report_file="/tmp/warehouse_report_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "Warehouse Manager Server Report"
        echo "Generated: $(date)"
        echo "=================================="
        echo ""
        
        echo "System Resources:"
        echo "----------------"
        df -h /
        echo ""
        free -h
        echo ""
        
        echo "Docker Containers:"
        echo "-----------------"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        echo ""
        
        echo "Service Status:"
        echo "--------------"
        check_service "Backend (Static)" "http://$STATIC_IP:$BACKEND_PORT/api/health/"
        check_service "Backend (Dynamic)" "http://$DYNAMIC_IP:$BACKEND_PORT/api/health/"
        check_service "Admin App" "http://$STATIC_IP:$ADMIN_PORT"
        check_service "Orders App" "http://$STATIC_IP:$ORDERS_PORT"
        check_service "Sales App" "http://$STATIC_IP:$SALES_PORT"
        
    } > "$report_file"
    
    print_status "INFO" "Report" "Generated: $report_file"
}

# Main monitoring function
monitor_servers() {
    clear
    print_status "HEADER" "Warehouse Manager Server Monitor"
    echo "Timestamp: $TIMESTAMP"
    
    # Refresh IP detection
    refresh_ip_detection
    print_status "INFO" "IP Detection" "Static: $STATIC_IP, Current: $DYNAMIC_IP, Best: $BEST_IP"
    echo ""
    
    # System Resources
    print_status "HEADER" "System Resources"
    check_disk_space
    check_memory
    echo ""
    
    # Docker Containers
    print_status "HEADER" "Docker Containers"
    check_docker_container "elif-shared-backend-elif-backend-1"
    check_docker_container "elif-admin-app-elif-admin-app-1"
    check_docker_container "elif-orders-app-elif-orders-app-1"
    check_docker_container "elif-sales-app-elif-sales-app-1"
    echo ""
    
    # Service Health Checks
    print_status "HEADER" "Service Health Checks"
    
    # Check both IP addresses for backend
    print_status "INFO" "Backend" "Checking both IP addresses..."
    check_backend_health "$STATIC_IP"
    check_backend_health "$DYNAMIC_IP"
    
    # Check frontend services
    check_service "Admin App" "http://$STATIC_IP:$ADMIN_PORT"
    check_service "Orders App" "http://$STATIC_IP:$ORDERS_PORT"
    check_service "Sales App" "http://$STATIC_IP:$SALES_PORT"
    echo ""
    
    # Database connectivity
    print_status "HEADER" "Database Connectivity"
    check_database "$STATIC_IP"
    echo ""
    
    # Container Resource Usage
    print_status "HEADER" "Container Resource Usage"
    get_container_stats "elif-shared-backend-elif-backend-1"
    get_container_stats "elif-admin-app-elif-admin-app-1"
    get_container_stats "elif-orders-app-elif-orders-app-1"
    get_container_stats "elif-sales-app-elif-sales-app-1"
    echo ""
    
    # Recent Logs (if verbose mode)
    if [ "$1" = "--verbose" ] || [ "$1" = "-v" ]; then
        print_status "HEADER" "Recent Logs"
        monitor_logs "elif-shared-backend-elif-backend-1" 5
        echo ""
        monitor_logs "elif-admin-app-elif-admin-app-1" 3
        echo ""
        monitor_logs "elif-orders-app-elif-orders-app-1" 3
        echo ""
        monitor_logs "elif-sales-app-elif-sales-app-1" 3
        echo ""
    fi
    
    # Log to file
    echo "[$TIMESTAMP] Monitor check completed" >> "$LOG_FILE"
}

# Continuous monitoring mode
continuous_monitor() {
    local interval=${1:-30}
    print_status "INFO" "Monitor" "Starting continuous monitoring (interval: ${interval}s)"
    print_status "INFO" "Monitor" "Press Ctrl+C to stop"
    print_status "INFO" "Monitor" "IP addresses will be detected dynamically on each check"
    
    while true; do
        monitor_servers
        sleep $interval
    done
}

# Show help
show_help() {
    echo "Warehouse Manager Server Monitor"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -v, --verbose       Show detailed logs"
    echo "  -c, --continuous    Continuous monitoring mode"
    echo "  -i, --interval N    Set interval for continuous mode (default: 30s)"
    echo "  -r, --report        Generate detailed report"
    echo "  -l, --logs          Show recent logs from all containers"
    echo ""
    echo "Examples:"
    echo "  $0                  # Single monitoring check"
    echo "  $0 -v               # Single check with verbose output"
    echo "  $0 -c               # Continuous monitoring (30s interval)"
    echo "  $0 -c -i 60         # Continuous monitoring (60s interval)"
    echo "  $0 -r               # Generate detailed report"
    echo "  $0 -l               # Show recent logs"
}

# Main script logic
case "$1" in
    -h|--help)
        show_help
        ;;
    -v|--verbose)
        monitor_servers --verbose
        ;;
    -c|--continuous)
        continuous_monitor "$2"
        ;;
    -i|--interval)
        continuous_monitor "$2"
        ;;
    -r|--report)
        generate_report
        ;;
    -l|--logs)
        print_status "HEADER" "Recent Logs from All Containers"
        monitor_logs "elif-shared-backend-elif-backend-1" 20
        echo ""
        monitor_logs "elif-admin-app-elif-admin-app-1" 10
        echo ""
        monitor_logs "elif-orders-app-elif-orders-app-1" 10
        echo ""
        monitor_logs "elif-sales-app-elif-sales-app-1" 10
        ;;
    "")
        monitor_servers
        ;;
    *)
        echo "Unknown option: $1"
        show_help
        exit 1
        ;;
esac
