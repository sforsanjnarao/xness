# AWS EC2 Deployment Plan with Nginx

Complete guide for deploying your trading platform to AWS EC2 with Nginx reverse proxy and SSL.

## Overview

We'll deploy all services (Web, API, Engine, Price Poller, Postgres, Redis) to a single EC2 instance using Docker Compose, with Nginx as a reverse proxy to handle HTTPS and routing.

## Pre-Deployment Checklist

### 1. Update API URL for Production

**IMPORTANT:** Before deploying, you need to update the API URL in your web app to use your domain instead of localhost.

Edit `apps/web/lib/api.ts`:

```typescript
// For production with domain
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://yourdomain.com';
```

Or update `docker-compose.prod.yml` to pass the environment variable:

```yaml
web:
  environment:
    NEXT_PUBLIC_API_URL: "https://${DOMAIN}"
```

### 2. Commit Your Code

```bash
git add .
git commit -m "Production deployment ready"
git push origin main
```

## Step 1: Launch EC2 Instance

1. Go to **AWS Console → EC2 → Launch Instance**

2. **Configuration:**
   - **Name:** xness-production
   - **AMI:** Ubuntu Server 24.04 LTS (or 22.04)
   - **Instance Type:** t3.medium (2 vCPU, 4GB RAM)
     - ⚠️ Don't use t2.micro - it's too small for Docker builds
   - **Key Pair:** Create new → Download .pem file → Keep it safe!

3. **Network Settings:**
   - ✅ Allow SSH (port 22) from My IP (more secure) or Anywhere
   - ✅ Allow HTTP (port 80) from Anywhere
   - ✅ Allow HTTPS (port 443) from Anywhere

4. **Storage:** Configure at least 20 GB gp3

5. Launch Instance and wait for it to start

## Step 2: Connect to Your Instance

```bash
# Set correct permissions for key
chmod 400 xness-key.pem

# Connect to instance (replace with your IP)
ssh -i "xness-key.pem" ubuntu@YOUR_EC2_PUBLIC_IP
```

## Step 3: Install Docker

Run these commands on your EC2 instance:

```bash
# Update system
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Reload groups (logout and login again)
exit
```

SSH back in for the group change to take effect:

```bash
ssh -i "xness-key.pem" ubuntu@YOUR_EC2_PUBLIC_IP
```

## Step 4: Deploy Application

### Option A: Clone from GitHub (Recommended)

```bash
git clone https://github.com/YOUR_USERNAME/xness.git
cd xness
```

### Option B: Copy from Local Machine

From your local machine:

```bash
# Exclude node_modules and other build artifacts
scp -i "xness-key.pem" -r \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.next' \
  . ubuntu@YOUR_EC2_IP:~/xness
```

### Create Production Environment File

On EC2:

```bash
cd xness
nano .env
```

Add:

```env
POSTGRES_USER=sanjana
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=postgres
DOMAIN=yourdomain.com
```

Save with `Ctrl+O`, `Enter`, exit with `Ctrl+X`.

### Build and Start Containers

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

This will take 5-10 minutes to build all services.

### Run Database Migrations

```bash
# Wait for postgres to be ready, then run migrations
docker compose -f docker-compose.prod.yml run --rm engine \
  sh -c "cd ../../packages/db && npm install -g prisma && prisma migrate deploy"
```

## Step 5: Install Nginx

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

## Step 6: Configure Nginx as Reverse Proxy

```bash
# Backup default config
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# Edit config
sudo nano /etc/nginx/sites-available/default
```

Replace everything with (change yourdomain.com):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Next.js frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /v1 {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Prevent access to hidden files
    location ~ /\. {
        deny all;
    }
}
```

Test configuration:

```bash
sudo nginx -t
```

If OK, restart Nginx:

```bash
sudo systemctl restart nginx
```

## Step 7: Configure DNS

Go to your domain registrar (GoDaddy, Namecheap, Cloudflare, Route53, etc.):

1. **Add A Record:**
   - Host: `@` (or your subdomain)
   - Value: Your EC2 Public IP
   - TTL: 3600 (1 hour)

2. **Add A Record for www:**
   - Host: `www`
   - Value: Your EC2 Public IP
   - TTL: 3600

Wait 5-15 minutes for DNS propagation.

## Step 8: Setup SSL with Let's Encrypt

Once DNS is propagated:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts:
- Enter email address
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

Certbot will automatically:
- Get SSL certificates
- Update Nginx config
- Set up auto-renewal

## Verification

### Check Services

```bash
docker compose -f docker-compose.prod.yml ps
```

All should show "Up" status.

### Check Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs http_server
```

### Test Endpoints

```bash
# Test API
curl https://yourdomain.com/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","name":"Test"}'

# Should return 200 OK with user data
```

### Access Your App

Open in browser: `https://yourdomain.com`

## Troubleshooting

### Services Won't Start

```bash
# Check Docker logs
docker compose -f docker-compose.prod.yml logs

# Check system resources
free -h
df -h
```

### Nginx Errors

```bash
# Check Nginx error log
sudo tail -f /var/log/nginx/error.log

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew --dry-run
```

### Can't Connect to Database

```bash
# Verify containers are running
docker compose -f docker-compose.prod.yml ps

# Check postgres logs
docker compose -f docker-compose.prod.yml logs postgres
```

## Monitoring & Maintenance

### View Logs

```bash
docker compose -f docker-compose.prod.yml logs -f --tail=100
```

### Restart Services

```bash
docker compose -f docker-compose.prod.yml restart
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build
```

### Backup Database

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U sanjana postgres > backup_$(date +%Y%m%d).sql
```

## Security Recommendations

1. Change default database password in `.env`
2. Restrict SSH to your IP only in security group
3. Enable UFW firewall:
   ```bash
   sudo ufw allow 22
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```
4. Set up automatic security updates:
   ```bash
   sudo apt install unattended-upgrades
   sudo dpkg-reconfigure -plow unattended-upgrades
   ```

## Next Steps

- Set up monitoring (CloudWatch, Grafana)
- Configure automated backups
- Set up CI/CD pipeline
- Scale to multiple instances with load balancer
