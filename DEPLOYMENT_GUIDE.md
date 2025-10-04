# ELIF Applications - Deployment Guide

## 🚀 Quick Start

### Full Deployment (IP + Domain Access)
```bash
sudo ./deploy-with-domains.sh
```

## 📱 Access Methods

Your applications support **multiple access methods**:

### 1. **Dynamic IP Access** (Always Works)
- **Orders**: `http://192.168.237.215:3000`
- **Sales**: `http://192.168.237.215:3001`
- **Admin**: `http://192.168.237.215:3002`
- **Backend**: `http://192.168.237.215:8000`

### 2. **Static IP Access** (Permanent)
- **Orders**: `http://10.10.1.1:3000`
- **Sales**: `http://10.10.1.1:3001`
- **Admin**: `http://10.10.1.1:3002`
- **Backend**: `http://10.10.1.1:8000`

### 3. **Domain Access** (If nginx is configured)
- **Orders**: `http://orders.elif`
- **Sales**: `http://sales.elif`
- **Admin**: `http://admin.elif`
- **Backend**: `http://api.elif`

## 🔧 Available Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `deploy-with-domains.sh` | **Main deployment script with domains** | `sudo ./deploy-with-domains.sh` |
| `status.sh` | Check application status | `./status.sh` |
| `stop-server.sh` | Stop all services | `./stop-server.sh` |
| `configure-other-devices.sh` | **Setup guide for other devices** | `./configure-other-devices.sh` |
| `setup-domains-linux.sh` | **Domain setup for Linux/Mac devices** | `sudo ./setup-domains-linux.sh` |
| `setup-domains-windows.bat` | **Domain setup for Windows devices** | Run as Administrator |

## 🌐 Network Configuration

### Current Setup
- **Dynamic IP**: `192.168.237.215` (changes when reconnecting to WiFi)
- **Static IP**: `10.10.1.1` (permanent, manually configured)
- **Network Interface**: `wlo1` (WiFi)

### IP Address Behavior
- **Dynamic IP**: Changes automatically, but apps remain accessible on the new IP
- **Static IP**: Never changes, always works
- **Both IPs**: Work simultaneously for maximum compatibility

## 🔄 Automatic Updates

The unified deployment script automatically:
- ✅ Detects your current dynamic IP
- ✅ Updates all configurations with the current IP
- ✅ Handles port 80 conflicts (stops Apache/HTTPD)
- ✅ Configures nginx for domain access
- ✅ Sets up domain resolution in `/etc/hosts`
- ✅ Tests all services after deployment

## 📋 Configuration Files Updated

### Backend (Django)
- **File**: `elif-shared-backend/backend/config/settings.py`
- **Changes**: Added dynamic IP to `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`

### Docker Compose
- **Files**: All `docker-compose.yml` files
- **Changes**: Changed port binding from `10.10.1.1:PORT:PORT` to `0.0.0.0:PORT:PORT`

### Nginx
- **File**: `nginx.conf`
- **Changes**: Updated to use `127.0.0.1` for internal routing and support both IPs

## 🗑️ Cleaned Up Files

Removed unnecessary files:
- `deploy-unified.sh` (redundant with `deploy-with-domains.sh`)
- `add-domains.sh` (redundant with `deploy-with-domains.sh`)
- `deploy.sh` (just a wrapper)
- `change-static-ip.sh` (using fixed 10.10.1.1)
- `enable-network-access.sh` (redundant)
- `fix-backend-network-access.sh` (redundant)
- `fix-frontend-backend-connection.sh` (redundant)
- `fix-network-issues.sh` (redundant)
- `diagnose-network.sh` (redundant)
- `setup-domains-for-other-devices.sh` (redundant with individual scripts)
- `nginx-elif-fixed.conf` (replaced by updated `nginx.conf`)
- `test-domains.sh` (functionality moved to `status.sh`)
- `setup-nginx.sh` (functionality moved to `deploy-with-domains.sh`)

## 🚨 Troubleshooting

### Frontend-Backend Connection Issues
**Problem**: Other devices can access frontend but can't connect to backend
**Solution**: 
```bash
sudo ./deploy-with-domains.sh
```
This script automatically:
1. Updates frontend API URLs to use current dynamic IP
2. Rebuilds frontend applications with correct backend URL
3. Tests the connection

### Port 80 Conflicts
The scripts automatically handle port 80 conflicts by:
1. Stopping Apache/HTTPD services
2. Disabling conflicting services
3. Force killing processes if needed

### Network Access Issues
If other devices can't access your apps:
1. Run `./configure-other-devices.sh` for setup instructions
2. Configure other devices with static IPs in 10.10.1.0/24 range
3. Check firewall settings
4. Verify network connectivity

### Domain Access Issues
If domains don't work:
1. Run `sudo ./deploy-with-domains.sh`
2. Check `/etc/hosts` file
3. Verify nginx is running: `systemctl status nginx`
4. For other devices, run domain setup scripts:
   - Linux/Mac: `sudo ./setup-domains-linux.sh`
   - Windows: Run `setup-domains-windows.bat` as Administrator

## 📊 Status Checking

Use `./status.sh` to check:
- ✅ Network configuration
- ✅ Docker container status
- ✅ Nginx status
- ✅ Domain resolution
- ✅ Service accessibility
- ✅ Access URLs

## 🎯 Best Practices

1. **Use `deploy-with-domains.sh`** for all deployments
2. **Check status** with `./status.sh` after deployment
3. **Use static IP (10.10.1.1)** for reliable server access
4. **Configure other devices** with static IPs in 10.10.1.0/24 range
5. **Use domain setup scripts** for other devices to enable domain access

## 🔐 Security Notes

- Applications are accessible from the local network
- No authentication required for basic access
- Consider firewall rules for production use
- Static IP provides consistent access for server deployments
