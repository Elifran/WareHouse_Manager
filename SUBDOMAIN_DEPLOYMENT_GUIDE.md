# 🚀 ELIF Subdomain Deployment Guide

This guide will help you deploy your 3 ELIF applications to separate subdomains.

## 📋 **Prerequisites**

- Linux server (Ubuntu 20.04+ recommended)
- Domain name registered
- Server with public IP address
- Root or sudo access

## 🛠️ **Server Setup**

### **1. Install Required Software**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Nginx
sudo apt install nginx -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js (for building)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# Install Certbot (for SSL)
sudo apt install certbot python3-certbot-nginx -y
```

### **2. Configure Firewall**
```bash
# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable
```

## 🌐 **DNS Configuration**

### **Add DNS Records**
Add these A records to your domain DNS settings:

```
orders.yourdomain.com    A    YOUR_SERVER_IP
sales.yourdomain.com     A    YOUR_SERVER_IP
admin.yourdomain.com     A    YOUR_SERVER_IP
```

**Replace `yourdomain.com` with your actual domain and `YOUR_SERVER_IP` with your server's IP address.**

## 🚀 **Deployment Steps**

### **1. Update Domain Configuration**
```bash
# Edit the deployment script to use your domain
nano deploy-subdomains.sh

# Change this line:
DOMAIN="yourdomain.com"
# To your actual domain:
DOMAIN="yourdomain.com"
```

### **2. Update Nginx Configuration**
```bash
# Edit the Nginx configuration
nano nginx-subdomains.conf

# Replace all instances of "yourdomain.com" with your actual domain
```

### **3. Run Deployment Script**
```bash
# Make script executable (already done)
chmod +x deploy-subdomains.sh

# Run deployment
sudo ./deploy-subdomains.sh
```

## ✅ **Verification**

### **Check Applications**
After deployment, verify your applications are running:

```bash
# Check Docker containers
docker ps

# Check Nginx status
sudo systemctl status nginx

# Test subdomains
curl -I https://orders.yourdomain.com
curl -I https://sales.yourdomain.com
curl -I https://admin.yourdomain.com
```

### **Access Your Applications**
- **🛒 Orders App**: `https://orders.yourdomain.com`
- **📈 Sales App**: `https://sales.yourdomain.com`
- **⚙️ Admin App**: `https://admin.yourdomain.com`

## 🔧 **Management Commands**

### **View Logs**
```bash
# Orders App logs
cd elif-orders-app && docker-compose logs -f

# Sales App logs
cd elif-sales-app && docker-compose logs -f

# Admin App logs
cd elif-admin-app && docker-compose logs -f
```

### **Restart Applications**
```bash
# Restart all apps
cd elif-orders-app && docker-compose restart
cd ../elif-sales-app && docker-compose restart
cd ../elif-admin-app && docker-compose restart
```

### **Update Applications**
```bash
# Pull latest changes and redeploy
git pull
sudo ./deploy-subdomains.sh
```

## 🚨 **Troubleshooting**

### **DNS Issues**
```bash
# Check DNS resolution
nslookup orders.yourdomain.com
dig orders.yourdomain.com

# Test from different locations
# Use online tools like whatsmydns.net
```

### **SSL Certificate Issues**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificates
sudo certbot renew

# Test SSL
openssl s_client -connect orders.yourdomain.com:443
```

### **Application Issues**
```bash
# Check container status
docker ps -a

# Check application logs
docker-compose logs

# Restart specific service
docker-compose restart elif-orders-app
```

## 📊 **Monitoring**

### **System Resources**
```bash
# Check disk usage
df -h

# Check memory usage
free -h

# Check running processes
htop
```

### **Application Health**
```bash
# Check if applications respond
curl -f https://orders.yourdomain.com/api/health
curl -f https://sales.yourdomain.com/api/health
curl -f https://admin.yourdomain.com/api/health
```

## 🔒 **Security Considerations**

1. **Keep system updated**: `sudo apt update && sudo apt upgrade`
2. **Configure firewall**: Only allow necessary ports
3. **Use strong passwords**: For all user accounts
4. **Regular backups**: Database and application files
5. **Monitor logs**: Check for suspicious activity
6. **SSL certificates**: Keep them renewed

## 📞 **Support**

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Verify DNS configuration
3. Check firewall settings
4. Ensure all services are running
5. Review Nginx configuration

## 🎯 **Next Steps**

After successful deployment:

1. **Configure monitoring** (optional)
2. **Set up automated backups**
3. **Configure log rotation**
4. **Set up SSL certificate auto-renewal**
5. **Create user accounts** in the admin app
6. **Configure your business settings**

---

**🎉 Congratulations! Your ELIF applications are now running on separate subdomains!**
