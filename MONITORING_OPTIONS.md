# Warehouse Manager - Complete Monitoring Options

## 🎯 **Overview**
Your warehouse management system now has comprehensive monitoring capabilities with multiple levels of detail and information.

## 📊 **Available Monitoring Scripts**

### 1. **Interactive Launcher** (`./monitor.sh`)
**Main entry point for all monitoring options**
```bash
./monitor.sh
```
**Features:**
- Interactive menu with 8 different monitoring modes
- Easy navigation and selection
- Consistent interface for all monitoring types

### 2. **Real-time Logs** (`./realtime-logs.sh`)
**Shows all server activities with minimal history**
```bash
./realtime-logs.sh
```
**Features:**
- Real-time streaming of all server logs
- Color-coded by activity type (API, AUTH, DB, ERROR, etc.)
- Shows recent history (last 1 second)
- All services monitored simultaneously

### 3. **Clean Real-time Logs** (`./realtime-logs-clean.sh`)
**Shows ONLY NEW activities (no historical spam)**
```bash
./realtime-logs-clean.sh
```
**Features:**
- **NO historical log spam** - only shows new activities
- Faster startup and cleaner output
- Perfect for continuous monitoring
- Real-time focus on current activities

### 4. **Detailed Logs** (`./detailed-logs.sh`) ⭐ **NEW**
**Shows COMPLETE information with IP addresses and user details**
```bash
./detailed-logs.sh
```
**Features:**
- **Complete IP address information**
- **User agent and client type detection**
- **Request method, path, and status codes**
- **Response sizes and timing**
- **Referer and forwarded headers**
- **Connection statistics**
- **Color-coded by status and method**

### 5. **Live Dashboard** (`./live-dashboard.sh`)
**Beautiful real-time dashboard that updates in place**
```bash
./live-dashboard.sh
```
**Features:**
- Updates data in place (no screen redraws)
- Service status and health checks
- Resource usage monitoring
- Connection statistics
- Recent activity summary

### 6. **Comprehensive Monitor** (`./comprehensive-monitor.sh`)
**Detailed analysis and reporting**
```bash
./comprehensive-monitor.sh
```
**Features:**
- Traffic analysis and statistics
- Authentication monitoring
- API activity reports
- Database performance metrics
- Connection analysis
- Historical data analysis

## 🔍 **Detailed Information Available**

### **IP Address Information**
- **Client IP addresses** - See exactly who is connecting
- **Server IP addresses** - Know which server is handling requests
- **Connection mapping** - Track client-to-server connections

### **Request Details**
- **HTTP Methods** - GET, POST, PUT, DELETE, PATCH
- **Request Paths** - Exact URLs being accessed
- **Status Codes** - 200, 404, 500, etc. with color coding
- **Response Sizes** - Data transfer amounts
- **Request Timing** - When requests occurred

### **Client Information**
- **User Agents** - Browser, curl, Postman, Python scripts
- **Client Types** - Web Browser, API Client, Postman, Python Script
- **Referer Information** - Where requests came from
- **Forwarded Headers** - Proxy and load balancer info

### **Connection Statistics**
- **Active Connections** - Real-time connection counts
- **Connection Details** - IP-to-IP mapping
- **Connection States** - ESTABLISHED, TIME_WAIT, etc.
- **Service-specific Connections** - Per-port connection counts

## 🎨 **Color Coding System**

### **Status Codes**
- 🟢 **Green (200-299)** - Success responses
- 🟡 **Yellow (400-499)** - Client errors
- 🔴 **Red (500-599)** - Server errors

### **HTTP Methods**
- 🟢 **Green** - GET requests
- 🟡 **Yellow** - POST requests
- 🟣 **Purple** - PUT requests
- 🔴 **Red** - DELETE requests
- 🔵 **Cyan** - PATCH requests

### **Activity Types**
- 🟢 **Green** - API requests
- 🟣 **Purple** - Authentication
- 🔵 **Cyan** - Database operations
- 🔴 **Red** - Errors
- 🟡 **Yellow** - Warnings

## 🚀 **Quick Start Guide**

### **For Real-time Monitoring:**
```bash
# Start interactive launcher
./monitor.sh

# Or directly use clean real-time logs (recommended)
./realtime-logs-clean.sh
```

### **For Complete Information:**
```bash
# See detailed logs with IP addresses and user agents
./detailed-logs.sh

# Or use the launcher and choose option 3
./monitor.sh
```

### **For Dashboard View:**
```bash
# Beautiful live dashboard
./live-dashboard.sh

# Or use the launcher and choose option 4
./monitor.sh
```

## 📋 **Example Output**

### **Detailed Logs Example:**
```
[11:40:09] [BACKEND]
  Time: 04/Oct/2025 10:40:02
  Method: GET
  Path: /api/health/
  Status: 200
  Size: 45 bytes
  Type: API Request

[11:40:09] [ORDERS]
  Client IP: 192.168.13.76
  Time: 04/Oct/2025:10:40:02 +0000
  Method: GET
  Path: /api/products/
  Status: 200
  Size: 1024 bytes
  Client: Web Browser
  User Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
  Type: API Request
```

## 🛠 **Advanced Usage**

### **Filter by Service:**
```bash
# Show only backend detailed logs
./detailed-logs.sh -r -c backend

# Show only admin app logs
./detailed-logs.sh -r -c admin
```

### **Limit Results:**
```bash
# Show last 20 detailed logs
./detailed-logs.sh -r -l 20
```

### **Show Recent Logs:**
```bash
# Show recent detailed logs without real-time monitoring
./detailed-logs.sh -r
```

## 🎯 **Recommended Usage**

1. **For Development/Debugging:** Use `./detailed-logs.sh` to see complete information
2. **For Production Monitoring:** Use `./realtime-logs-clean.sh` for clean, real-time monitoring
3. **For Overview:** Use `./live-dashboard.sh` for a beautiful dashboard view
4. **For Analysis:** Use `./comprehensive-monitor.sh` for detailed reports

## 🔧 **All Scripts Support:**
- ✅ Dynamic IP detection (10.10.1.1 and 192.168.13.215)
- ✅ Real-time monitoring
- ✅ Color-coded output
- ✅ Ctrl+C to stop
- ✅ No historical log spam (clean versions)
- ✅ Complete connection information
- ✅ IP address tracking
- ✅ User agent detection
- ✅ Request/response details

## 📞 **Need Help?**
Run any script with `-h` or `--help` for detailed usage information:
```bash
./detailed-logs.sh --help
./realtime-logs-clean.sh --help
./monitor.sh
```

---

**🎉 You now have complete visibility into your warehouse management system with detailed IP tracking, user information, and comprehensive monitoring capabilities!**
