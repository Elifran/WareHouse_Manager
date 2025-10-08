# Warehouse Manager Monitoring System

This guide explains how to use the comprehensive monitoring system for the Warehouse Manager application.

## 📊 Monitoring Scripts Overview

### 1. **monitor-servers.sh** - Main Monitoring Script
The primary monitoring script that provides detailed health checks and system information.

**Features:**
- ✅ Service health checks (Backend, Admin, Orders, Sales apps)
- ✅ Docker container status monitoring
- ✅ System resource monitoring (CPU, Memory, Disk)
- ✅ Database connectivity checks
- ✅ Container resource usage statistics
- ✅ Log monitoring capabilities
- ✅ Report generation

**Usage:**
```bash
# Single monitoring check
./monitor-servers.sh

# Verbose output with logs
./monitor-servers.sh -v

# Continuous monitoring (30s interval)
./monitor-servers.sh -c

# Continuous monitoring with custom interval
./monitor-servers.sh -c -i 60

# Generate detailed report
./monitor-servers.sh -r

# Show recent logs
./monitor-servers.sh -l
```

### 2. **dashboard.sh** - Real-time Dashboard
A beautiful, real-time dashboard showing system status at a glance.

**Features:**
- 🎨 Color-coded status indicators
- 📈 Real-time system metrics
- 🔄 Auto-refresh capability
- 📊 Service and container status overview
- ⚡ Quick actions menu

**Usage:**
```bash
# Show dashboard once
./dashboard.sh

# Auto-refresh every 10 seconds
./dashboard.sh -r

# Auto-refresh with custom interval
./dashboard.sh -r 5

# Single view and exit
./dashboard.sh -s
```

### 3. **start-monitoring.sh** - Background Monitoring Service
Starts monitoring as a background service that runs continuously.

**Features:**
- 🔄 Background monitoring service
- 📝 Log file management
- 🎛️ Service control (start/stop/restart)
- 📊 Status checking

**Usage:**
```bash
# Start monitoring service
./start-monitoring.sh start

# Stop monitoring service
./start-monitoring.sh stop

# Restart monitoring service
./start-monitoring.sh restart

# Check monitoring status
./start-monitoring.sh status

# View real-time logs
./start-monitoring.sh logs
```

### 4. **stop-monitoring.sh** - Quick Stop Script
Quickly stops the background monitoring service.

**Usage:**
```bash
./stop-monitoring.sh
```

## 🚀 Quick Start Guide

### 1. **Start All Services**
```bash
# Start all warehouse manager services
./restart-all-services.sh
```

### 2. **Start Monitoring**
```bash
# Option A: Start background monitoring service
./start-monitoring.sh start

# Option B: Run dashboard with auto-refresh
./dashboard.sh -r

# Option C: Run detailed monitoring continuously
./monitor-servers.sh -c
```

### 3. **Check Status**
```bash
# Quick status check
./monitor-servers.sh

# Beautiful dashboard view
./dashboard.sh

# Check monitoring service status
./start-monitoring.sh status
```

## 📋 Monitoring Features

### Service Health Checks
- **Backend API**: Checks both static (10.10.1.1) and dynamic (192.168.13.215) IPs
- **Frontend Apps**: Admin, Orders, and Sales applications
- **Database**: Connectivity and response checks
- **Docker Containers**: Container status and resource usage

### System Metrics
- **CPU Usage**: Real-time CPU utilization with color coding
- **Memory Usage**: RAM usage monitoring
- **Disk Space**: Storage usage tracking
- **Network**: Container network I/O statistics

### Log Monitoring
- **Container Logs**: Recent logs from all services
- **Error Detection**: Automatic error identification
- **Activity Tracking**: Recent system activity

### Alerting
- **Color-coded Status**: 
  - 🟢 Green: Healthy/Online
  - 🟡 Yellow: Warning
  - 🔴 Red: Error/Offline
- **Resource Thresholds**: Automatic warnings for high resource usage

## 🔧 Configuration

### IP Addresses
The monitoring system automatically detects and monitors both:
- **Static IP**: 10.10.1.1
- **Dynamic IP**: 192.168.13.215

### Ports
- **Backend**: 8000
- **Admin App**: 3002
- **Orders App**: 3000
- **Sales App**: 3001

### Log Files
- **Monitor Log**: `/tmp/warehouse_monitor.log`
- **PID File**: `/tmp/warehouse_monitor.pid`
- **Reports**: `/tmp/warehouse_report_YYYYMMDD_HHMMSS.txt`

## 📊 Dashboard Legend

```
🟢 ● = Service Online/Healthy
🔴 ● = Service Offline/Error
🟡 ⚠ = Warning
🔵 ℹ = Information
```

## 🛠️ Troubleshooting

### Common Issues

1. **Services Not Responding**
   ```bash
   # Check if containers are running
   docker ps
   
   # Restart services
   ./restart-all-services.sh
   ```

2. **Monitoring Not Starting**
   ```bash
   # Check if already running
   ./start-monitoring.sh status
   
   # Check logs
   tail -f /tmp/warehouse_monitor.log
   ```

3. **High Resource Usage**
   ```bash
   # Check system resources
   ./monitor-servers.sh -v
   
   # Generate detailed report
   ./monitor-servers.sh -r
   ```

### Manual Health Checks
```bash
# Test backend connectivity
curl http://10.10.1.1:8000/api/health/
curl http://192.168.13.215:8000/api/health/

# Test frontend apps
curl http://10.10.1.1:3000  # Orders
curl http://10.10.1.1:3001  # Sales
curl http://10.10.1.1:3002  # Admin
```

## 📈 Best Practices

1. **Start Monitoring After Services**: Always start monitoring after all services are up and running
2. **Use Background Monitoring**: For production, use `./start-monitoring.sh start` for continuous monitoring
3. **Regular Health Checks**: Run `./monitor-servers.sh` regularly to check system health
4. **Monitor Logs**: Check logs regularly for any issues or errors
5. **Resource Monitoring**: Keep an eye on CPU, memory, and disk usage

## 🔄 Integration with Existing Scripts

The monitoring system integrates seamlessly with existing management scripts:

```bash
# Complete workflow
./restart-all-services.sh    # Start all services
./start-monitoring.sh start  # Start monitoring
./dashboard.sh -r            # View real-time dashboard
```

## 📞 Support

If you encounter any issues with the monitoring system:

1. Check the log files in `/tmp/`
2. Run `./monitor-servers.sh -v` for verbose output
3. Generate a report with `./monitor-servers.sh -r`
4. Check container status with `docker ps`

---

**Note**: The monitoring system is designed to run after all services are up and running. Make sure to start the warehouse manager services first using `./restart-all-services.sh` before starting monitoring.
