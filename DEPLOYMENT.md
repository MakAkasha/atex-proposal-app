# VPS Deployment Guide for ATEX Proposal App

## Prerequisites

- VPS with Ubuntu 20.04 or later
- Node.js 18+ installed
- Domain name (optional, but recommended)

## Quick Deploy with PM2 (Recommended)

### 1. Connect to your VPS

```bash
ssh your_username@your-vps-ip
```

### 2. Install Node.js (if not installed)

```bash
# Using NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 3. Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
pm2 --version
```

### 4. Upload Project Files

You can upload via FTP, SCP, or Git:

**Option A: Using Git**
```bash
git clone https://github.com/your-repo/atex-app.git
cd atex-app
npm install
```

**Option B: Using SCP**
```bash
scp -r /local/path/to/atex-app your_username@your-vps-ip:/home/your_username/
```

### 5. Configure Environment

Create a `.env` file or set environment variables:

```bash
# Set production environment variables
export PORT=80
export JWT_SECRET="your-super-secret-key-here-generate-random-string"
export NODE_ENV=production
```

### 6. Start Application with PM2

```bash
# Start the app
pm2 start server.js --name atex-app -- --production

# Check status
pm2 status

# View logs
pm2 logs atex-app

# Setup startup script
pm2 startup
pm2 save
```

### 7. Configure Firewall (if enabled)

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow ssh

# Enable firewall
sudo ufw enable
```

### 8. Configure Reverse Proxy (Nginx - Optional but Recommended)

Install Nginx:

```bash
sudo apt install nginx
```

Create Nginx config:

```bash
sudo nano /etc/nginx/sites-available/atex-app
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/atex-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 9. Setup SSL with Let's Encrypt (Optional)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## Manual Deployment (Without PM2)

```bash
# Run in background with nohup
nohup node server.js > app.log 2>&1 &

# Or use screen/tmux
screen -S atex
node server.js
# Ctrl+A then D to detach
```

## PM2 Useful Commands

```bash
# Check logs
pm2 logs atex-app

# Restart app
pm2 restart atex-app

# Stop app
pm2 stop atex-app

# Delete app
pm2 delete atex-app

# Monitor resources
pm2 monit

# Check status
pm2 status
```

## Project Structure on VPS

```
~/atex-app/
├── server.js          # Main server file
├── package.json       # Dependencies
├── atex.db            # SQLite database (auto-created)
├── public/            # Static files
│   ├── index.html     # Main app
│   └── ...
├── product-image/     # Uploaded images
├── templates/         # PDF templates
└── README.md
```

## Default Login

```
Username: admin
Password: admin123
```

## Important Notes

1. **Database**: The app uses SQLite (`atex.db`). Make sure to backup regularly.

2. **Port**: By default runs on port 8080. Use nginx reverse proxy for port 80/443.

3. **JWT Secret**: Change `JWT_SECRET` in production for security.

4. **Uploads**: Uploaded images are stored in `product-image/` folder.

5. **Firewall**: Make sure port 8080 is accessible if not using nginx.

## Backup & Restore

### Backup
```bash
# Backup database
cp atex.db atex-backup-$(date +%Y%m%d).db

# Backup entire app
tar -czf atex-backup-$(date +%Y%m%d).tar.gz .
```

### Restore
```bash
# Restore database
cp atex-backup-YYYYMMDD.db atex.db

# Or restore from tar
tar -xzf atex-backup-YYYYMMDD.tar.gz
```

## Troubleshooting

1. **App won't start**: Check logs with `pm2 logs atex-app`

2. **Database errors**: Ensure `atex.db` has write permissions

3. **Images not loading**: Check `product-image/` folder exists

4. **Can't login**: Reset admin password in database or recreate

5. **Port already in use**: Change PORT environment variable

## Update Application

```bash
# Pull latest code
git pull

# Install updates
npm install

# Restart PM2
pm2 restart atex-app
```

## Docker Deployment (Alternative)

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
```

Create `docker-compose.yml`:

```yaml
version: '3'
services:
  atex-app:
    build: .
    ports:
      - "8080:8080"
    volumes:
      - .:/app
      - atex-data:/app
    restart: always

volumes:
  atex-data:
```

Deploy:

```bash
docker-compose up -d
docker-compose logs -f
```