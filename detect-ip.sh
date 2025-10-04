#!/bin/bash

# Dynamic IP Detection Script for Warehouse Manager
# This script detects the current network IP address

# Function to get the primary network interface IP
get_current_ip() {
    # Try multiple methods to get the current IP
    local ip=""
    
    # Method 1: Get IP from the default route interface
    local default_interface=$(ip route | grep default | awk '{print $5}' | head -n1)
    if [ -n "$default_interface" ]; then
        ip=$(ip addr show "$default_interface" | grep 'inet ' | awk '{print $2}' | cut -d'/' -f1 | head -n1)
    fi
    
    # Method 2: If method 1 fails, try getting IP from any active interface
    if [ -z "$ip" ]; then
        ip=$(ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d'/' -f1 | head -n1)
    fi
    
    # Method 3: Fallback to hostname -I
    if [ -z "$ip" ]; then
        ip=$(hostname -I | awk '{print $1}')
    fi
    
    # Method 4: Last resort - use ifconfig
    if [ -z "$ip" ]; then
        ip=$(ifconfig | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | head -n1)
    fi
    
    echo "$ip"
}

# Function to get all available IPs
get_all_ips() {
    local ips=()
    
    # Get all non-loopback IPs
    while IFS= read -r line; do
        if [ -n "$line" ] && [ "$line" != "127.0.0.1" ]; then
            ips+=("$line")
        fi
    done < <(ip addr show | grep 'inet ' | awk '{print $2}' | cut -d'/' -f1)
    
    # If no IPs found, try alternative method
    if [ ${#ips[@]} -eq 0 ]; then
        while IFS= read -r line; do
            if [ -n "$line" ] && [ "$line" != "127.0.0.1" ]; then
                ips+=("$line")
            fi
        done < <(hostname -I | tr ' ' '\n')
    fi
    
    printf '%s\n' "${ips[@]}"
}

# Function to check if an IP is reachable
check_ip_reachability() {
    local ip=$1
    local port=${2:-8000}
    
    # Try to connect to the IP:port
    if timeout 3 bash -c "</dev/tcp/$ip/$port" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to find the best IP for backend connection
find_best_backend_ip() {
    local static_ip="10.10.1.1"
    local current_ip=$(get_current_ip)
    local backend_port="8000"
    
    # First, try the static IP
    if check_ip_reachability "$static_ip" "$backend_port"; then
        echo "$static_ip"
        return 0
    fi
    
    # Then try the current detected IP
    if [ -n "$current_ip" ] && check_ip_reachability "$current_ip" "$backend_port"; then
        echo "$current_ip"
        return 0
    fi
    
    # Finally, try all available IPs
    while IFS= read -r ip; do
        if [ -n "$ip" ] && check_ip_reachability "$ip" "$backend_port"; then
            echo "$ip"
            return 0
        fi
    done < <(get_all_ips)
    
    # If nothing works, return the current IP as fallback
    echo "$current_ip"
}

# Main function
main() {
    case "$1" in
        "current")
            get_current_ip
            ;;
        "all")
            get_all_ips
            ;;
        "best")
            find_best_backend_ip
            ;;
        "check")
            local ip=${2:-$(get_current_ip)}
            local port=${3:-8000}
            if check_ip_reachability "$ip" "$port"; then
                echo "IP $ip:$port is reachable"
                exit 0
            else
                echo "IP $ip:$port is not reachable"
                exit 1
            fi
            ;;
        *)
            echo "Usage: $0 {current|all|best|check [ip] [port]}"
            echo ""
            echo "Commands:"
            echo "  current  - Get the primary network IP"
            echo "  all      - Get all available IPs"
            echo "  best     - Find the best IP for backend connection"
            echo "  check    - Check if an IP:port is reachable"
            echo ""
            echo "Examples:"
            echo "  $0 current"
            echo "  $0 all"
            echo "  $0 best"
            echo "  $0 check 192.168.1.100 8000"
            exit 1
            ;;
    esac
}

main "$@"
