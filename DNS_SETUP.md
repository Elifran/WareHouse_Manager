# DNS Configuration for ELIF Subdomains

To set up the subdomains for your ELIF applications, you need to configure DNS records with your domain provider.

## 🌐 **Required DNS Records**

Add these DNS records to your domain configuration:

### **A Records (IPv4)**
```
orders.yourdomain.com    A    YOUR_SERVER_IP
sales.yourdomain.com     A    YOUR_SERVER_IP  
admin.yourdomain.com     A    YOUR_SERVER_IP
```

### **AAAA Records (IPv6) - Optional**
```
orders.yourdomain.com    AAAA    YOUR_SERVER_IPV6
sales.yourdomain.com     AAAA    YOUR_SERVER_IPV6
admin.yourdomain.com     AAAA    YOUR_SERVER_IPV6
```

### **CNAME Records (Alternative)**
If you prefer using CNAME records:
```
orders.yourdomain.com    CNAME    yourdomain.com
sales.yourdomain.com     CNAME    yourdomain.com
admin.yourdomain.com     CNAME    yourdomain.com
```

## 🔧 **Common DNS Providers Setup**

### **Cloudflare**
1. Login to Cloudflare Dashboard
2. Select your domain
3. Go to **DNS** → **Records**
4. Click **Add record**
5. Set Type to **A**
6. Enter subdomain name (e.g., `orders`)
7. Enter your server IP
8. Click **Save**

### **GoDaddy**
1. Login to GoDaddy
2. Go to **My Products** → **DNS**
3. Click **Add** under **Records**
4. Set Type to **A**
5. Enter subdomain name
6. Enter your server IP
7. Click **Save**

### **Namecheap**
1. Login to Namecheap
2. Go to **Domain List** → **Manage**
3. Go to **Advanced DNS**
4. Click **Add New Record**
5. Set Type to **A Record**
6. Enter subdomain name
7. Enter your server IP
8. Click **Save**

## ⏱️ **DNS Propagation**

DNS changes can take time to propagate:
- **Local changes**: 5-15 minutes
- **Global propagation**: 24-48 hours
- **Maximum**: Up to 72 hours

## 🧪 **Testing DNS Configuration**

### **Check DNS Resolution**
```bash
# Test each subdomain
nslookup orders.yourdomain.com
nslookup sales.yourdomain.com
nslookup admin.yourdomain.com

# Or use dig
dig orders.yourdomain.com
dig sales.yourdomain.com
dig admin.yourdomain.com
```

### **Online DNS Checkers**
- [whatsmydns.net](https://www.whatsmydns.net/)
- [dnschecker.org](https://dnschecker.org/)
- [dnsmap.io](https://dnsmap.io/)

## 🔒 **SSL Certificate Setup**

After DNS is configured, SSL certificates will be automatically generated using Let's Encrypt:

```bash
# The deployment script will handle this automatically
certbot --nginx -d orders.yourdomain.com -d sales.yourdomain.com -d admin.yourdomain.com
```

## 🚨 **Troubleshooting**

### **DNS Not Resolving**
1. Check if DNS records are correctly configured
2. Wait for propagation (up to 72 hours)
3. Clear your local DNS cache:
   ```bash
   # Windows
   ipconfig /flushdns
   
   # macOS
   sudo dscacheutil -flushcache
   
   # Linux
   sudo systemctl restart systemd-resolved
   ```

### **SSL Certificate Issues**
1. Ensure DNS is resolving correctly
2. Check if ports 80 and 443 are open
3. Verify Nginx configuration
4. Check Let's Encrypt rate limits

### **Application Not Loading**
1. Check if applications are running:
   ```bash
   docker ps
   ```
2. Check Nginx status:
   ```bash
   systemctl status nginx
   ```
3. Check application logs:
   ```bash
   docker-compose logs -f
   ```

## 📋 **Pre-Deployment Checklist**

- [ ] Domain registered and active
- [ ] Server IP address obtained
- [ ] DNS records configured
- [ ] Server has ports 80 and 443 open
- [ ] Nginx installed and configured
- [ ] Docker and Docker Compose installed
- [ ] SSL certificates ready (or Let's Encrypt configured)

## 🎯 **Final URLs**

After successful setup, your applications will be available at:

- **🛒 Orders App**: `https://orders.yourdomain.com`
- **📈 Sales App**: `https://sales.yourdomain.com`
- **⚙️ Admin App**: `https://admin.yourdomain.com`

Replace `yourdomain.com` with your actual domain name.
