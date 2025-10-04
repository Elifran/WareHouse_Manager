#!/bin/bash

# Comprehensive Warehouse Manager Server Monitoring
# Monitors all server activities: traffic, authentication, API calls, database operations

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

# Log files
LOG_DIR="/tmp/warehouse_monitoring"
TRAFFIC_LOG="$LOG_DIR/traffic.log"
AUTH_LOG="$LOG_DIR/auth.log"
API_LOG="$LOG_DIR/api.log"
DB_LOG="$LOG_DIR/database.log"
ERROR_LOG="$LOG_DIR/errors.log"
PERFORMANCE_LOG="$LOG_DIR/performance.log"

# Create log directory
mkdir -p "$LOG_DIR"

# Function to refresh IP detection
refresh_ip_detection() {
    DYNAMIC_IP=$($DETECT_IP_SCRIPT current 2>/dev/null || echo "192.168.13.215")
    BEST_IP=$($DETECT_IP_SCRIPT best 2>/dev/null || echo "10.10.1.1")
}

# Function to log with timestamp
log_with_timestamp() {
    local log_file=$1
    local message=$2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $message" >> "$log_file"
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
        "TRAFFIC")
            echo -e "${CYAN}📊${NC} $service: $message"
            ;;
        "AUTH")
            echo -e "${YELLOW}🔐${NC} $service: $message"
            ;;
        "API")
            echo -e "${BLUE}🔌${NC} $service: $message"
            ;;
        "DB")
            echo -e "${GREEN}🗄️${NC} $service: $message"
            ;;
    esac
}

# Function to monitor traffic
monitor_traffic() {
    print_status "HEADER" "Traffic Monitoring"
    
    # Monitor backend traffic
    local backend_requests=$(docker logs --since 1m elif-shared-backend-elif-shared-backend-elif-backend-1-1 2>/dev/null | grep -c "GET\|POST\|PUT\|DELETE\|PATCH" || echo "0")
    local backend_errors=$(docker logs --since 1m elif-shared-backend-elif-shared-backend-elif-backend-1-1 2>/dev/null | grep -c "ERROR\|Exception\|500\|400\|404" || echo "0")
    
    # Monitor frontend traffic (nginx access logs)
    local admin_requests=$(docker logs --since 1m elif-admin-app-elif-admin-app-1-elif-admin-app-elif-admin-app-1-1 2>/dev/null | grep -c "GET\|POST" || echo "0")
    local orders_requests=$(docker logs --since 1m elif-orders-app-elif-orders-app-1-elif-orders-app-elif-orders-app-1-1 2>/dev/null | grep -c "GET\|POST" || echo "0")
    local sales_requests=$(docker logs --since 1m elif-sales-app-elif-sales-app-1-elif-sales-app-elif-sales-app-1-1 2>/dev/null | grep -c "GET\|POST" || echo "0")
    
    # Calculate total traffic
    local total_requests=$((backend_requests + admin_requests + orders_requests + sales_requests))
    
    print_status "TRAFFIC" "Backend" "Requests: $backend_requests, Errors: $backend_errors"
    print_status "TRAFFIC" "Admin App" "Requests: $admin_requests"
    print_status "TRAFFIC" "Orders App" "Requests: $orders_requests"
    print_status "TRAFFIC" "Sales App" "Requests: $sales_requests"
    print_status "TRAFFIC" "Total" "All requests: $total_requests"
    
    # Log traffic data
    log_with_timestamp "$TRAFFIC_LOG" "Backend: $backend_requests requests, $backend_errors errors"
    log_with_timestamp "$TRAFFIC_LOG" "Frontend: Admin=$admin_requests, Orders=$orders_requests, Sales=$sales_requests"
    
    # Check for high traffic
    if [ "$total_requests" -gt 100 ]; then
        print_status "WARNING" "Traffic" "High traffic detected: $total_requests requests in last minute"
        log_with_timestamp "$ERROR_LOG" "HIGH_TRAFFIC: $total_requests requests in last minute"
    fi
    
    echo ""
}

# Function to monitor authentication
monitor_authentication() {
    print_status "HEADER" "Authentication Monitoring"
    
    # Monitor login attempts
    local login_attempts=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "login\|authentication\|token" || echo "0")
    local failed_logins=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "Invalid\|Failed\|Unauthorized\|401" || echo "0")
    local successful_logins=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "Login successful\|Token generated\|200.*login" || echo "0")
    
    # Monitor token activities
    local token_refreshes=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "token.*refresh\|refresh.*token" || echo "0")
    local token_expirations=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "token.*expired\|expired.*token" || echo "0")
    
    # Monitor session activities
    local active_sessions=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "session\|Session" || echo "0")
    
    print_status "AUTH" "Login Attempts" "Total: $login_attempts, Success: $successful_logins, Failed: $failed_logins"
    print_status "AUTH" "Token Activity" "Refreshes: $token_refreshes, Expirations: $token_expirations"
    print_status "AUTH" "Sessions" "Active sessions: $active_sessions"
    
    # Log authentication data
    log_with_timestamp "$AUTH_LOG" "Login attempts: $login_attempts (Success: $successful_logins, Failed: $failed_logins)"
    log_with_timestamp "$AUTH_LOG" "Token activity: Refreshes=$token_refreshes, Expirations=$token_expirations"
    
    # Check for security issues
    if [ "$failed_logins" -gt 10 ]; then
        print_status "WARNING" "Security" "High number of failed login attempts: $failed_logins"
        log_with_timestamp "$ERROR_LOG" "SECURITY_WARNING: $failed_logins failed login attempts"
    fi
    
    echo ""
}

# Function to monitor API activities
monitor_api_activities() {
    print_status "HEADER" "API Activity Monitoring"
    
    # Monitor different HTTP methods
    local get_requests=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "GET " || echo "0")
    local post_requests=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "POST " || echo "0")
    local put_requests=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "PUT " || echo "0")
    local delete_requests=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "DELETE " || echo "0")
    local patch_requests=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "PATCH " || echo "0")
    
    # Monitor API endpoints
    local products_api=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "/api/products/" || echo "0")
    local sales_api=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "/api/sales/" || echo "0")
    local purchases_api=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "/api/purchases/" || echo "0")
    local reports_api=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "/api/reports/" || echo "0")
    local users_api=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "/api/users/" || echo "0")
    
    # Monitor response codes
    local status_200=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "200 " || echo "0")
    local status_400=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "400 " || echo "0")
    local status_401=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "401 " || echo "0")
    local status_404=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "404 " || echo "0")
    local status_500=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "500 " || echo "0")
    
    print_status "API" "HTTP Methods" "GET: $get_requests, POST: $post_requests, PUT: $put_requests, DELETE: $delete_requests, PATCH: $patch_requests"
    print_status "API" "Endpoints" "Products: $products_api, Sales: $sales_api, Purchases: $purchases_api, Reports: $reports_api, Users: $users_api"
    print_status "API" "Response Codes" "200: $status_200, 400: $status_400, 401: $status_401, 404: $status_404, 500: $status_500"
    
    # Log API data
    log_with_timestamp "$API_LOG" "HTTP Methods: GET=$get_requests, POST=$post_requests, PUT=$put_requests, DELETE=$delete_requests, PATCH=$patch_requests"
    log_with_timestamp "$API_LOG" "Endpoints: Products=$products_api, Sales=$sales_api, Purchases=$purchases_api, Reports=$reports_api, Users=$users_api"
    log_with_timestamp "$API_LOG" "Status Codes: 200=$status_200, 400=$status_400, 401=$status_401, 404=$status_404, 500=$status_500"
    
    # Check for API issues
    local total_errors=$((status_400 + status_401 + status_404 + status_500))
    if [ "$total_errors" -gt 5 ]; then
        print_status "WARNING" "API" "High number of API errors: $total_errors"
        log_with_timestamp "$ERROR_LOG" "API_ERRORS: $total_errors errors in last minute"
    fi
    
    echo ""
}

# Function to monitor database activities
monitor_database() {
    print_status "HEADER" "Database Monitoring"
    
    # Monitor database queries
    local db_queries=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "SELECT\|INSERT\|UPDATE\|DELETE" || echo "0")
    local slow_queries=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "slow\|timeout\|long" || echo "0")
    local db_errors=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "database.*error\|sql.*error\|connection.*error" || echo "0")
    
    # Monitor database connections
    local db_connections=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "connection\|connect" || echo "0")
    local connection_errors=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "connection.*failed\|connection.*refused" || echo "0")
    
    # Monitor specific database operations
    local product_operations=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "product.*save\|product.*update\|product.*delete" || echo "0")
    local sale_operations=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "sale.*save\|sale.*update\|sale.*delete" || echo "0")
    local purchase_operations=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "purchase.*save\|purchase.*update\|purchase.*delete" || echo "0")
    
    print_status "DB" "Queries" "Total: $db_queries, Slow: $slow_queries, Errors: $db_errors"
    print_status "DB" "Connections" "Active: $db_connections, Errors: $connection_errors"
    print_status "DB" "Operations" "Products: $product_operations, Sales: $sale_operations, Purchases: $purchase_operations"
    
    # Log database data
    log_with_timestamp "$DB_LOG" "Queries: $db_queries (Slow: $slow_queries, Errors: $db_errors)"
    log_with_timestamp "$DB_LOG" "Connections: $db_connections (Errors: $connection_errors)"
    log_with_timestamp "$DB_LOG" "Operations: Products=$product_operations, Sales=$sale_operations, Purchases=$purchase_operations"
    
    # Check for database issues
    if [ "$db_errors" -gt 0 ]; then
        print_status "WARNING" "Database" "Database errors detected: $db_errors"
        log_with_timestamp "$ERROR_LOG" "DB_ERRORS: $db_errors database errors"
    fi
    
    if [ "$slow_queries" -gt 2 ]; then
        print_status "WARNING" "Database" "Slow queries detected: $slow_queries"
        log_with_timestamp "$ERROR_LOG" "SLOW_QUERIES: $slow_queries slow queries"
    fi
    
    echo ""
}

# Function to monitor performance
monitor_performance() {
    print_status "HEADER" "Performance Monitoring"
    
    # Get container resource usage
    local backend_cpu=$(docker stats --no-stream --format "{{.CPUPerc}}" elif-shared-backend-elif-backend-1 2>/dev/null | sed 's/%//' || echo "0")
    local backend_memory=$(docker stats --no-stream --format "{{.MemPerc}}" elif-shared-backend-elif-backend-1 2>/dev/null | sed 's/%//' || echo "0")
    
    local admin_cpu=$(docker stats --no-stream --format "{{.CPUPerc}}" elif-admin-app-elif-admin-app-1 2>/dev/null | sed 's/%//' || echo "0")
    local admin_memory=$(docker stats --no-stream --format "{{.MemPerc}}" elif-admin-app-elif-admin-app-1 2>/dev/null | sed 's/%//' || echo "0")
    
    local orders_cpu=$(docker stats --no-stream --format "{{.CPUPerc}}" elif-orders-app-elif-orders-app-1 2>/dev/null | sed 's/%//' || echo "0")
    local orders_memory=$(docker stats --no-stream --format "{{.MemPerc}}" elif-orders-app-elif-orders-app-1 2>/dev/null | sed 's/%//' || echo "0")
    
    local sales_cpu=$(docker stats --no-stream --format "{{.CPUPerc}}" elif-sales-app-elif-sales-app-1 2>/dev/null | sed 's/%//' || echo "0")
    local sales_memory=$(docker stats --no-stream --format "{{.MemPerc}}" elif-sales-app-elif-sales-app-1 2>/dev/null | sed 's/%//' || echo "0")
    
    # Monitor response times (approximate from logs)
    local response_times=$(docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -c "response.*time\|time.*response" || echo "0")
    
    print_status "INFO" "Backend" "CPU: ${backend_cpu}%, Memory: ${backend_memory}%"
    print_status "INFO" "Admin App" "CPU: ${admin_cpu}%, Memory: ${admin_memory}%"
    print_status "INFO" "Orders App" "CPU: ${orders_cpu}%, Memory: ${orders_memory}%"
    print_status "INFO" "Sales App" "CPU: ${sales_cpu}%, Memory: ${sales_memory}%"
    print_status "INFO" "Response Times" "Logged: $response_times"
    
    # Log performance data
    log_with_timestamp "$PERFORMANCE_LOG" "Backend: CPU=${backend_cpu}%, Memory=${backend_memory}%"
    log_with_timestamp "$PERFORMANCE_LOG" "Frontend: Admin(CPU=${admin_cpu}%, Mem=${admin_memory}%), Orders(CPU=${orders_cpu}%, Mem=${orders_memory}%), Sales(CPU=${sales_cpu}%, Mem=${sales_memory}%)"
    
    # Check for performance issues
    if (( $(echo "$backend_cpu > 80" | bc -l) )); then
        print_status "WARNING" "Performance" "High CPU usage on backend: ${backend_cpu}%"
        log_with_timestamp "$ERROR_LOG" "HIGH_CPU: Backend CPU usage ${backend_cpu}%"
    fi
    
    if (( $(echo "$backend_memory > 80" | bc -l) )); then
        print_status "WARNING" "Performance" "High memory usage on backend: ${backend_memory}%"
        log_with_timestamp "$ERROR_LOG" "HIGH_MEMORY: Backend memory usage ${backend_memory}%"
    fi
    
    echo ""
}

# Function to show real-time activity
show_realtime_activity() {
    print_status "HEADER" "Real-time Activity (Last 30 seconds)"
    
    # Show recent backend activity
    echo -e "${BLUE}Backend Activity:${NC}"
    docker logs --since 30s elif-shared-backend-elif-backend-1 2>/dev/null | tail -5 | while read line; do
        echo "  $line"
    done
    
    echo ""
    echo -e "${BLUE}Recent Errors:${NC}"
    docker logs --since 1m elif-shared-backend-elif-backend-1 2>/dev/null | grep -i "error\|exception\|failed" | tail -3 | while read line; do
        echo -e "  ${RED}$line${NC}"
    done
    
    echo ""
}

# Function to generate comprehensive report
generate_comprehensive_report() {
    local report_file="/tmp/warehouse_comprehensive_report_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "Warehouse Manager Comprehensive Monitoring Report"
        echo "Generated: $(date)"
        echo "================================================"
        echo ""
        
        echo "IP Configuration:"
        echo "Static IP: $STATIC_IP"
        echo "Dynamic IP: $DYNAMIC_IP"
        echo "Best IP: $BEST_IP"
        echo ""
        
        echo "Traffic Summary (Last 5 minutes):"
        echo "--------------------------------"
        tail -10 "$TRAFFIC_LOG" 2>/dev/null || echo "No traffic data available"
        echo ""
        
        echo "Authentication Summary (Last 5 minutes):"
        echo "--------------------------------------"
        tail -10 "$AUTH_LOG" 2>/dev/null || echo "No authentication data available"
        echo ""
        
        echo "API Activity Summary (Last 5 minutes):"
        echo "------------------------------------"
        tail -10 "$API_LOG" 2>/dev/null || echo "No API data available"
        echo ""
        
        echo "Database Activity Summary (Last 5 minutes):"
        echo "-----------------------------------------"
        tail -10 "$DB_LOG" 2>/dev/null || echo "No database data available"
        echo ""
        
        echo "Performance Summary (Last 5 minutes):"
        echo "-----------------------------------"
        tail -10 "$PERFORMANCE_LOG" 2>/dev/null || echo "No performance data available"
        echo ""
        
        echo "Error Summary (Last 5 minutes):"
        echo "-----------------------------"
        tail -10 "$ERROR_LOG" 2>/dev/null || echo "No errors recorded"
        echo ""
        
        echo "Container Status:"
        echo "---------------"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        echo ""
        
        echo "System Resources:"
        echo "---------------"
        df -h /
        echo ""
        free -h
        
    } > "$report_file"
    
    print_status "INFO" "Report" "Comprehensive report generated: $report_file"
}

# Main monitoring function
comprehensive_monitor() {
    clear
    print_status "HEADER" "Comprehensive Warehouse Manager Monitoring"
    echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    
    # Refresh IP detection
    refresh_ip_detection
    print_status "INFO" "IP Detection" "Static: $STATIC_IP, Current: $DYNAMIC_IP, Best: $BEST_IP"
    echo ""
    
    # Run all monitoring functions
    monitor_traffic
    monitor_authentication
    monitor_api_activities
    monitor_database
    monitor_performance
    show_realtime_activity
    
    # Log monitoring completion
    log_with_timestamp "$LOG_DIR/monitor.log" "Comprehensive monitoring check completed"
}

# Continuous monitoring mode
continuous_comprehensive_monitor() {
    local interval=${1:-60}
    print_status "INFO" "Monitor" "Starting comprehensive monitoring (interval: ${interval}s)"
    print_status "INFO" "Monitor" "Press Ctrl+C to stop"
    print_status "INFO" "Monitor" "Monitoring: Traffic, Authentication, API, Database, Performance"
    
    while true; do
        comprehensive_monitor
        sleep $interval
    done
}

# Show help
show_help() {
    echo "Comprehensive Warehouse Manager Monitoring"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -c, --continuous    Continuous monitoring mode"
    echo "  -i, --interval N    Set interval for continuous mode (default: 60s)"
    echo "  -r, --report        Generate comprehensive report"
    echo "  -l, --logs          Show recent logs from all categories"
    echo "  -t, --traffic       Show only traffic monitoring"
    echo "  -a, --auth          Show only authentication monitoring"
    echo "  -p, --api           Show only API monitoring"
    echo "  -d, --database      Show only database monitoring"
    echo "  -f, --performance   Show only performance monitoring"
    echo ""
    echo "Examples:"
    echo "  $0                  # Single comprehensive check"
    echo "  $0 -c               # Continuous monitoring (60s interval)"
    echo "  $0 -c -i 30         # Continuous monitoring (30s interval)"
    echo "  $0 -r               # Generate comprehensive report"
    echo "  $0 -l               # Show recent logs"
    echo "  $0 -t               # Show only traffic monitoring"
}

# Main script logic
case "$1" in
    -h|--help)
        show_help
        ;;
    -c|--continuous)
        continuous_comprehensive_monitor "$2"
        ;;
    -i|--interval)
        continuous_comprehensive_monitor "$2"
        ;;
    -r|--report)
        generate_comprehensive_report
        ;;
    -l|--logs)
        print_status "HEADER" "Recent Logs"
        echo -e "${BLUE}Traffic Logs:${NC}"
        tail -5 "$TRAFFIC_LOG" 2>/dev/null || echo "No traffic logs"
        echo ""
        echo -e "${BLUE}Authentication Logs:${NC}"
        tail -5 "$AUTH_LOG" 2>/dev/null || echo "No auth logs"
        echo ""
        echo -e "${BLUE}API Logs:${NC}"
        tail -5 "$API_LOG" 2>/dev/null || echo "No API logs"
        echo ""
        echo -e "${BLUE}Database Logs:${NC}"
        tail -5 "$DB_LOG" 2>/dev/null || echo "No database logs"
        echo ""
        echo -e "${BLUE}Error Logs:${NC}"
        tail -5 "$ERROR_LOG" 2>/dev/null || echo "No error logs"
        ;;
    -t|--traffic)
        monitor_traffic
        ;;
    -a|--auth)
        monitor_authentication
        ;;
    -p|--api)
        monitor_api_activities
        ;;
    -d|--database)
        monitor_database
        ;;
    -f|--performance)
        monitor_performance
        ;;
    "")
        comprehensive_monitor
        ;;
    *)
        echo "Unknown option: $1"
        show_help
        exit 1
        ;;
esac
