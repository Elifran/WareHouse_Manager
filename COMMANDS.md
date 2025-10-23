# ELIF Applications - Command Reference

## 🚀 Quick Start Commands

### Start All Applications
```bash
./start-system.sh
```

### Stop All Applications
```bash
./stop-system.sh
```

### Check System Status
```bash
docker ps
```

## 📋 Manual Command Order

If you prefer to run commands manually, follow this exact order:

### 1. Stop All Services (if running)
```bash
cd elif-shared-backend && docker compose down && cd ..
cd elif-orders-app && docker compose down && cd ..
cd elif-sales-app && docker compose down && cd ..
cd elif-admin-app && docker compose down && cd ..
```

### 2. Start Backend First
```bash
cd elif-shared-backend
docker compose up -d
cd ..
```

### 3. Wait for Backend (10 seconds)
```bash
sleep 10
```

### 4. Start Frontend Applications
```bash
cd elif-orders-app && docker compose up -d && cd ..
cd elif-sales-app && docker compose up -d && cd ..
cd elif-admin-app && docker compose up -d && cd ..
```

## 🔧 Individual Service Commands

### Backend Only
```bash
cd elif-shared-backend
docker compose up -d    # Start
docker compose down     # Stop
docker compose logs -f  # View logs
```

### Orders App Only
```bash
cd elif-orders-app
docker compose up -d    # Start
docker compose down     # Stop
docker compose logs -f  # View logs
```

### Sales App Only
```bash
cd elif-sales-app
docker compose up -d    # Start
docker compose down     # Stop
docker compose logs -f  # View logs
```

### Admin App Only
```bash
cd elif-admin-app
docker compose up -d    # Start
docker compose down     # Stop
docker compose logs -f  # View logs
```

## 🌐 Access URLs

Replace `[YOUR_IP]` with your actual IP address:

- **Backend API**: `http://[YOUR_IP]:8000`
- **Orders App**: `http://[YOUR_IP]:3000`
- **Sales App**: `http://[YOUR_IP]:3001`
- **Admin App**: `http://[YOUR_IP]:3002`

## 🛠️ Utility Scripts

### Check Current IP
```bash
./set-ip.sh
```

### Verify All APIs
```bash
./verify-apis.sh
```

### Configure for Any IP
```bash
./configure-any-ip.sh
```

## 📊 Monitoring Commands

### View All Container Status
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### View Logs for All Services
```bash
docker compose logs -f
```

### Check Backend Health
```bash
curl http://localhost:8000/api/health/
```

## 🔄 Rebuild Commands

### Rebuild All Applications
```bash
./stop-system.sh
./start-system.sh
```

### Rebuild Specific App
```bash
cd elif-sales-app
docker compose down
docker compose up -d --build
cd ..
```

## ⚠️ Important Notes

1. **Always start Backend first** - Frontend apps depend on it
2. **Wait 10 seconds** after starting Backend before starting Frontend apps
3. **Use the same IP** for all applications
4. **Backend is configured** to accept connections from any IP address
5. **Packaging system** is fully functional and ready to use

## 🆘 Troubleshooting

### If services won't start:
```bash
docker ps -a  # Check all containers
docker logs [container-name]  # Check specific logs
```

### If can't access from different IP:
- Use the server's actual IP address
- Check network connectivity
- Verify firewall settings

### If CORS errors:
- Backend is configured to allow all origins
- Check if backend is running on correct port
- Verify frontend is using correct API URL
