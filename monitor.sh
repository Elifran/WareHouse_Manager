#!/bin/bash

# Warehouse Manager Monitoring Launcher
# Choose your monitoring mode

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# Function to show menu
show_menu() {
    clear
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                WAREHOUSE MANAGER MONITORING                 ║${NC}"
    echo -e "${PURPLE}║                        $(date '+%Y-%m-%d %H:%M:%S')                        ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}Choose your monitoring mode:${NC}"
    echo ""
    echo -e "  ${GREEN}1.${NC} ${WHITE}Real-time Logs${NC}        - See all server activities live"
    echo -e "  ${GREEN}2.${NC} ${WHITE}Clean Real-time Logs${NC}  - See NEW activities only (no history)"
    echo -e "  ${GREEN}3.${NC} ${WHITE}Detailed Logs${NC}         - Complete info: IPs, user agents, etc."
    echo -e "  ${GREEN}4.${NC} ${WHITE}Live Dashboard${NC}        - Beautiful real-time dashboard"
    echo -e "  ${GREEN}5.${NC} ${WHITE}Comprehensive Monitor${NC} - Detailed analysis and reports"
    echo -e "  ${GREEN}6.${NC} ${WHITE}Quick Status Check${NC}    - One-time health check"
    echo -e "  ${GREEN}7.${NC} ${WHITE}Filter Logs${NC}           - Search specific logs"
    echo -e "  ${GREEN}8.${NC} ${WHITE}Show Help${NC}             - Display help information"
    echo -e "  ${GREEN}0.${NC} ${WHITE}Exit${NC}                  - Exit monitoring"
    echo ""
    echo -e "${YELLOW}Note: All monitoring modes run continuously until stopped with Ctrl+C${NC}"
    echo ""
}

# Function to start real-time logs
start_realtime_logs() {
    echo -e "${CYAN}Starting real-time log monitoring...${NC}"
    echo -e "${YELLOW}This will show ALL server activities in real-time${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    echo ""
    sleep 2
    ./realtime-logs.sh
}

# Function to start clean real-time logs
start_clean_realtime_logs() {
    echo -e "${CYAN}Starting clean real-time log monitoring...${NC}"
    echo -e "${YELLOW}This will show ONLY NEW server activities (no historical logs)${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    echo ""
    sleep 2
    ./realtime-logs-clean.sh
}

# Function to start detailed logs
start_detailed_logs() {
    echo -e "${CYAN}Starting detailed log monitoring...${NC}"
    echo -e "${YELLOW}This will show COMPLETE information: IP addresses, user agents, request details${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    echo ""
    sleep 2
    ./detailed-logs.sh
}

# Function to start live dashboard
start_live_dashboard() {
    echo -e "${CYAN}Starting live dashboard...${NC}"
    echo -e "${YELLOW}This will show a beautiful real-time dashboard${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    echo ""
    sleep 2
    ./dashboard.sh
}

# Function to start comprehensive monitoring
start_comprehensive_monitor() {
    echo -e "${CYAN}Starting comprehensive monitoring...${NC}"
    echo -e "${YELLOW}This will show detailed analysis and reports${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    echo ""
    sleep 2
    ./comprehensive-monitor.sh -c
}

# Function to do quick status check
quick_status_check() {
    echo -e "${CYAN}Performing quick status check...${NC}"
    echo ""
    ./monitor-servers.sh
    echo ""
    echo -e "${YELLOW}Press Enter to return to menu...${NC}"
    read
}

# Function to filter logs
filter_logs() {
    echo -e "${CYAN}Log Filter Options:${NC}"
    echo ""
    echo -e "  ${GREEN}1.${NC} Show error logs"
    echo -e "  ${GREEN}2.${NC} Show authentication logs"
    echo -e "  ${GREEN}3.${NC} Show API logs"
    echo -e "  ${GREEN}4.${NC} Show database logs"
    echo -e "  ${GREEN}5.${NC} Custom filter"
    echo -e "  ${GREEN}0.${NC} Back to main menu"
    echo ""
    echo -n "Enter your choice: "
    read filter_choice
    
    case $filter_choice in
        1)
            ./realtime-logs.sh -e
            ;;
        2)
            ./realtime-logs.sh -a
            ;;
        3)
            ./realtime-logs.sh -p
            ;;
        4)
            ./realtime-logs.sh -d
            ;;
        5)
            echo -n "Enter filter text: "
            read filter_text
            ./realtime-logs.sh -f "$filter_text"
            ;;
        0)
            return
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            sleep 2
            ;;
    esac
    
    echo ""
    echo -e "${YELLOW}Press Enter to return to menu...${NC}"
    read
}

# Function to show help
show_help() {
    clear
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                    MONITORING HELP                          ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}Available Monitoring Modes:${NC}"
    echo ""
    echo -e "${GREEN}1. Real-time Logs${NC}"
    echo -e "   - Shows ALL server activities as they happen"
    echo -e "   - Color-coded by type (API, Auth, DB, Errors)"
    echo -e "   - Includes connections, requests, responses"
    echo -e "   - Best for debugging and real-time monitoring"
    echo ""
    echo -e "${GREEN}2. Live Dashboard${NC}"
    echo -e "   - Beautiful visual dashboard with status indicators"
    echo -e "   - Shows service health, system metrics, recent activity"
    echo -e "   - Auto-refreshes every 5 seconds"
    echo -e "   - Best for overview and status monitoring"
    echo ""
    echo -e "${GREEN}3. Comprehensive Monitor${NC}"
    echo -e "   - Detailed analysis with statistics and reports"
    echo -e "   - Traffic analysis, performance metrics, error tracking"
    echo -e "   - Generates detailed reports"
    echo -e "   - Best for analysis and troubleshooting"
    echo ""
    echo -e "${GREEN}4. Quick Status Check${NC}"
    echo -e "   - One-time health check of all services"
    echo -e "   - Shows current status and basic metrics"
    echo -e "   - Best for quick verification"
    echo ""
    echo -e "${GREEN}5. Filter Logs${NC}"
    echo -e "   - Search and filter specific types of logs"
    echo -e "   - Filter by errors, authentication, API calls, etc."
    echo -e "   - Best for finding specific information"
    echo ""
    echo -e "${YELLOW}All continuous monitoring modes can be stopped with Ctrl+C${NC}"
    echo ""
    echo -e "${YELLOW}Press Enter to return to menu...${NC}"
    read
}

# Main menu loop
while true; do
    show_menu
    echo -n "Enter your choice: "
    read choice
    
    case $choice in
        1)
            start_realtime_logs
            ;;
        2)
            start_clean_realtime_logs
            ;;
        3)
            start_detailed_logs
            ;;
        4)
            start_live_dashboard
            ;;
        5)
            start_comprehensive_monitor
            ;;
        6)
            quick_status_check
            ;;
        7)
            filter_logs
            ;;
        8)
            show_help
            ;;
        0)
            echo -e "${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice. Please try again.${NC}"
            sleep 2
            ;;
    esac
done
