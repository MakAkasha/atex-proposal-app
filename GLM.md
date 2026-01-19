# ATEX Q-System - Project Summary

## 📋 Project Overview

**Project Name:** ATEX Proposal Generator (Q-System)  
**Version:** 1.0.0  
**Type:** Full-Stack Web Application  
**Purpose:** Professional proposal/quotation management system for smart home and building automation products  
**Language:** Arabic (RTL) with English technical support  
**Company:** ATEX (Advanced Technology Experts)

---

## 🛠️ Technology Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Native HTTP Server (no Express)
- **Database:** SQLite (via sql.js - in-memory with file persistence)
- **Authentication:** JWT (jsonwebtoken) + bcryptjs
- **File Upload:** Multipart form data parsing

### Frontend
- **Framework:** Vanilla JavaScript (no frameworks)
- **Styling:** Custom CSS with shadcn UI design system
- **Icons:** SVG inline icons
- **Fonts:** Inter (Google Fonts)

### Deployment
- **Process Manager:** PM2 (cluster mode)
- **Server:** HTTP server on port 8080 (configurable)

---

## 📁 Project Structure

```
Q_system/
├── server.js                    # Main HTTP server & API logic
├── package.json                 # Dependencies & scripts
├── ecosystem.config.js          # PM2 configuration
├── README.md                    # Project documentation
├── GLM.md                       # Complete project documentation (this file)
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
├── atex.db                      # SQLite database file (created at runtime)
│
├── public/                      # Static files
│   ├── index.html               # Single-page application (SPA)
│   ├── ATEX-logo.svg            # Company logo
│   ├── ATEX Slogan.svg          # Company slogan
│   └── sar_symbol.svg           # Saudi Riyal currency symbol
│
├── templates/                   # PDF/HTML proposal templates
│   ├── professional.html        # Professional A4 template (default)
│   ├── compact.html             # Single-page compact template
│   ├── detailed.html            # Detailed specifications template
│   └── invoice.html             # Invoice-style template
│
└── product-image/               # Product images (SKU-based)
    ├── AR-G1.png
    ├── DR-02.png
    ├── FT-300.png
    └── ... (24 product images)
```

---

## 🗄️ Database Schema

### Tables

#### 1. users
```sql
- id (PK, AUTOINCREMENT)
- username (UNIQUE, NOT NULL)
- password (hashed, NOT NULL)
- email (UNIQUE)
- role ('admin' | 'user', DEFAULT 'user')
- created_at (DATETIME)
- updated_at (DATETIME)
```

#### 2. customers
```sql
- id (PK, AUTOINCREMENT)
- name (NOT NULL)
- email
- phone
- company
- address
- tax_number
- notes
- created_by (FK → users.id)
- created_at (DATETIME)
```

#### 3. products
```sql
- id (PK, AUTOINCREMENT)
- sku (UNIQUE, NOT NULL)
- name (NOT NULL)
- description
- price (REAL, DEFAULT 0)
- cost (REAL, DEFAULT 0)
- category
- unit (DEFAULT 'قطعة')
- image_url
- stock (INTEGER, DEFAULT 0)
- active (INTEGER, DEFAULT 1)
- created_by (FK → users.id)
- created_at (DATETIME)
```

#### 4. proposals
```sql
- id (PK, AUTOINCREMENT)
- proposal_number (UNIQUE, NOT NULL)  # Format: PO-YYYYMM-XXXXXX
- title (NOT NULL)
- customer_id (FK → customers.id)
- status ('draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired', DEFAULT 'draft')
- subtotal (REAL, DEFAULT 0)
- discount_percent (REAL, DEFAULT 0)
- discount_amount (REAL, DEFAULT 0)
- tax_percent (REAL, DEFAULT 15)
- tax_amount (REAL, DEFAULT 0)
- total (REAL, DEFAULT 0)
- notes
- terms
- valid_days (INTEGER, DEFAULT 30)
- template ('professional' | 'compact' | 'detailed' | 'invoice', DEFAULT 'professional')
- created_by (FK → users.id)
- created_at (DATETIME)
```

#### 5. proposal_items
```sql
- id (PK, AUTOINCREMENT)
- proposal_id (FK → proposals.id, NOT NULL)
- product_id (FK → products.id)
- description (NOT NULL)
- quantity (REAL, DEFAULT 1)
- unit_price (REAL, DEFAULT 0)
- discount_percent (REAL, DEFAULT 0)
- total (REAL, DEFAULT 0)
- notes
- sort_order (INTEGER, DEFAULT 0)
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Products
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Soft delete product

### Customers
- `GET /api/customers` - List all customers
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Proposals
- `GET /api/proposals` - List all proposals
- `GET /api/proposals/:id` - Get single proposal with items
- `POST /api/proposals` - Create proposal
- `PUT /api/proposals/:id` - Update proposal
- `PUT /api/proposals/:id/status` - Update proposal status
- `DELETE /api/proposals/:id` - Delete proposal
- `POST /api/proposals/:id/duplicate` - Duplicate proposal
- `GET /api/proposals/:id/pdf` - Export proposal as HTML (printable)

### Dashboard
- `GET /api/dashboard/stats` - Get statistics

### Users (Admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `POST /api/users/:id/reset-password` - Reset user password
- `DELETE /api/users/:id` - Delete user

### Uploads
- `POST /api/upload/image` - Upload product image (multipart/form-data)

### System
- `GET /health` - Health check
- `GET /api` - API documentation

---

## 🎨 Frontend Architecture

### Pages (SPA)
1. **Login** - Authentication page
2. **Dashboard** - Statistics and recent proposals
3. **Proposals** - List and manage all proposals
4. **Customers** - Customer management
5. **Products** - Product management
6. **Create Proposal** - 3-tab wizard:
   - Info Tab: Proposal details, customer, discount, tax, template
   - Products Tab: Product selection with grid view, categories, search
   - Preview Tab: Live preview and PDF export
7. **Settings** - 7 sections:
   - Profile: Account info
   - Company: Company details
   - Security: Password change
   - Google Sheets: Import products
   - Notifications: Notification preferences
   - Categories: Product categories management
   - Users: User management (admin only)

### Key Features
- **RTL Support:** Full Arabic interface
- **Responsive Design:** Mobile-friendly with sidebar toggle
- **Real-time Calculations:** Instant subtotal, discount, tax, total
- **Product Images:** Auto-detection from SKU or upload
- **Template System:** 4 proposal templates
- **Categories:** Hierarchical categories with subcategories
- **Search & Filter:** Instant search, category filtering
- **Modals:** Customer/product creation modals
- **Notifications:** Toast notifications system

---

## ⚙️ Configuration

### Environment Variables
```bash
PORT=8080                    # Server port
JWT_SECRET=your-secret-key   # JWT signing secret
NODE_ENV=production          # Environment mode
```

### PM2 Configuration
```javascript
{
  name: 'atex-q-system',
  script: 'server.js',
  instances: 'max',          // Cluster mode
  exec_mode: 'cluster',
  max_memory_restart: '500M',
  port: 3000
}
```

### Default Admin User
- Username: `admin`
- Password: `admin123`
- Role: `admin`

---

## 🚀 Deployment Guide

### Prerequisites
- VPS with Ubuntu 20.04 or later
- Node.js 18+ installed
- Domain name (optional, but recommended)

### Local Development
```bash
npm install
npm start
# Access: http://localhost:8080
```

### Quick Deploy with PM2 (Recommended)

#### 1. Connect to your VPS
```bash
ssh your_username@your-vps-ip
```

#### 2. Install Node.js (if not installed)
```bash
# Using NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### 3. Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
pm2 --version
```

#### 4. Upload Project Files
You can upload via FTP, SCP, or Git:

**Option A: Using Git**
```bash
git clone https://github.com/MakAkasha/atex-proposal-app.git
cd atex-proposal-app
npm install
```

**Option B: Using SCP**
```bash
scp -r /local/path/to/Q_system your_username@your-vps-ip:/home/your_username/
```

#### 5. Configure Environment
Create a `.env` file or set environment variables:
```bash
# Set production environment variables
export PORT=8080
export JWT_SECRET="your-super-secret-key-here-generate-random-string"
export NODE_ENV=production
```

#### 6. Start Application with PM2
```bash
# Start the app
pm2 start ecosystem.config.js --env production

# Check status
pm2 status

# View logs
pm2 logs atex-app

# Setup startup script
pm2 startup
pm2 save
```

#### 7. Configure Firewall (if enabled)
```bash
# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow ssh

# Enable firewall
sudo ufw enable
```

#### 8. Configure Reverse Proxy (Nginx - Recommended)
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

#### 9. Setup SSL with Let's Encrypt (Optional)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Manual Deployment (Without PM2)

```bash
# Run in background with nohup
nohup node server.js > app.log 2>&1 &

# Or use screen/tmux
screen -S atex
node server.js
# Ctrl+A then D to detach
```

### PM2 Useful Commands
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

# View full logs
pm2 logs --lines 100
```

### Project Structure on VPS
```
~/atex-proposal-app/
├── server.js          # Main server file
├── package.json       # Dependencies
├── atex.db            # SQLite database (auto-created)
├── public/            # Static files
│   ├── index.html     # Main app
│   └── ...
├── product-image/     # Uploaded images
├── templates/         # PDF templates
└── ecosystem.config.js # PM2 configuration
```

### Backup & Restore

#### Backup
```bash
# Backup database
cp atex.db atex-backup-$(date +%Y%m%d).db

# Backup entire app
tar -czf atex-backup-$(date +%Y%m%d).tar.gz .
```

#### Restore
```bash
# Restore database
cp atex-backup-YYYYMMDD.db atex.db

# Or restore from tar
tar -xzf atex-backup-YYYYMMDD.tar.gz
```

### Troubleshooting

1. **App won't start**: Check logs with `pm2 logs atex-app`

2. **Database errors**: Ensure `atex.db` has write permissions

3. **Images not loading**: Check `product-image/` folder exists

4. **Can't login**: Reset admin password in database or recreate

5. **Port already in use**: Change PORT environment variable

6. **Nginx 502 Bad Gateway**: Check if Node.js app is running on port 8080

### Update Application

```bash
# Pull latest code
git pull

# Install updates
npm install

# Restart PM2
pm2 restart atex-app
```

### Docker Deployment (Alternative)

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

## 🔒 Security Roadmap (Next Phase)

### Current Security Status
- ✅ JWT-based authentication
- ✅ Password hashing with bcryptjs
- ✅ Role-based access control (admin/user)
- ✅ Input validation on API endpoints

### Planned Security Enhancements

#### Phase 1: Critical Security (Immediate)
- **Rate Limiting**: Implement rate limiting on authentication endpoints to prevent brute force attacks
- **Password Policy**: Enforce strong password requirements (min length, complexity)
- **Account Lockout**: Temporary account lockout after failed login attempts
- **Secure Headers**: Add security headers (CORS, CSP, X-Frame-Options, etc.)
- **Session Management**: JWT refresh token mechanism and session timeout
- **Input Sanitization**: Enhanced input validation and sanitization to prevent XSS/SQL injection

#### Phase 2: Data Protection
- **Data Encryption**: Encrypt sensitive data at rest (customer information, proposals)
- **Secure File Upload**: Validate and sanitize uploaded images (file type, size, content validation)
- **Audit Logging**: Track all user actions (create, update, delete) for compliance
- **Backup Encryption**: Encrypt database backups before storage

#### Phase 3: Advanced Security
- **Two-Factor Authentication (2FA)**: Optional 2FA for admin accounts
- **API Security**: API key authentication for external integrations
- **Web Application Firewall (WAF)**: Integrate WAF rules for additional protection
- **HTTPS Enforcement**: Force HTTPS connections in production
- **CORS Configuration**: Properly configure CORS for production domain

#### Phase 4: Compliance & Monitoring
- **Security Monitoring**: Implement security event monitoring and alerting
- **Compliance**: Ensure compliance with data protection regulations
- **Penetration Testing**: Regular security assessments and penetration testing
- **Security Updates**: Automated dependency vulnerability scanning and updates

### Security Best Practices to Implement

1. **Environment Variables**: Never commit sensitive data (JWT_SECRET, API keys)
2. **Database Backups**: Regular encrypted backups with retention policy
3. **Error Handling**: Don't expose sensitive information in error messages
4. **Logging**: Comprehensive logging without sensitive data
5. **Dependencies**: Keep all npm packages updated and scanned for vulnerabilities

### Security Checkpoints

- [ ] Change default admin password on first deployment
- [ ] Set strong JWT_SECRET in production
- [ ] Enable HTTPS with SSL certificate
- [ ] Configure firewall rules
- [ ] Set up automated backups
- [ ] Implement rate limiting
- [ ] Add security headers
- [ ] Regular security audits

### Recommended Security Tools

```bash
# Security audit for dependencies
npm audit
npm audit fix

# Helmet.js for security headers (to be added)
npm install helmet

# Rate limiting (to be added)
npm install express-rate-limit

# Input validation (to be added)
npm install joi
```

---

## 📊 Current Implementation Status

### ✅ Completed Features
- User authentication (JWT + bcrypt)
- CRUD operations for products, customers, proposals
- Proposal creation with multi-step wizard
- Real-time calculations (subtotal, discount, tax, total)
- PDF export (HTML templates)
- Product image upload
- Google Sheets import (CSV export) ✅ **FIXED**
- Category management (hierarchical)
- User management (admin only)
- Dashboard statistics
- Proposal duplication
- RTL Arabic interface
- Responsive design
- 4 proposal templates

### 🔄 In Progress / Planned
- Enhanced PDF templates (see README.md)
- Sales reports and analytics
- Product performance analytics
- Data export (Excel/CSV)
- Advanced search with barcode scanner
- Mobile app improvements
- Email notifications
- Multi-language support

---

## 🔑 Key Technical Decisions

### Database
- **SQLite via sql.js:** In-memory database with file persistence
- **Rationale:** Simple, no external dependencies, easy backup, sufficient for single-company usage

### Authentication
- **JWT Tokens:** Stateless, scalable, easy to implement
- **bcryptjs:** Secure password hashing

### Framework
- **Vanilla JS:** No build step, minimal dependencies, fast loading
- **Custom CSS:** shadcn-inspired design system for modern look

### Templates
- **HTML-based:** Easy to customize, no PDF library dependency
- **Print-to-PDF:** Browser's native print functionality

---

## 📝 Important Notes

### Product Images
- Stored in `product-image/` folder
- Naming convention: `{SKU}.png`
- Auto-detection: System looks for images matching product SKU
- Upload support: Via `/api/upload/image` endpoint

### Categories
- Stored in localStorage (not database)
- Default categories pre-loaded on first run
- Hierarchical structure with subcategories

### Proposal Numbers
- Format: `PO-YYYYMM-RANDOMHEX`
- Example: `PO-202601-A3F9D2`
- Auto-generated on creation

### Tax Rate
- Default: 15% (Saudi Arabia VAT)
- Configurable per proposal

### Currency
- Saudi Riyal (SAR)
- Symbol: ر.س with SVG icon

---

## 🐛 Known Limitations

1. **Database:** SQLite with sql.js (not concurrent-safe for high traffic)
2. **Images:** No image optimization or CDN
3. **PDF:** HTML-to-PDF via browser print (no server-side PDF generation)
4. **Email:** No email functionality implemented
5. **Real-time:** No WebSocket or real-time updates
6. **Scalability:** Single-server architecture, not distributed

---

## 🔄 Future Enhancements (Roadmap)

### Phase 1 (High Priority)
- Enhanced PDF templates with better styling
- Proposal duplication feature ✅ (completed)
- Improved Google Sheets import with preview

### Phase 2 (Medium Priority)
- Sales reports and analytics
- Product performance tracking
- Data export (Excel/CSV)
- Email notifications

### Phase 3 (Normal Priority)
- Mobile app improvements
- Advanced search with barcode scanning
- Multi-language support
- Payment integration

### Phase 4 (Future)
- Multi-tenant support
- Cloud database (PostgreSQL/MongoDB)
- Mobile app (React Native)
- Subscription system

---

## 📞 Support

- **Company:** ATEX (Advanced Technology Experts)
- **Email:** support@atex.sa
- **License:** MIT

---

## 📚 Quick Reference

### Default Credentials
```
Username: admin
Password: admin123
```

### API Base URL
```
http://localhost:8080/api
```

### Database File
```
./atex.db
```

### Common Commands
```bash
# Start server
npm start

# Start with PM2
pm2 start server.js --name atex-app

# View logs
pm2 logs atex-app

# Restart
pm2 restart atex-app

# Stop
pm2 stop atex-app
```

---

*Last Updated: January 2026*
*Document Version: 1.0.0*