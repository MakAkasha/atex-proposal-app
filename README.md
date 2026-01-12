# ATEX Proposal Generator

<div align="center">

![ATEX Logo](public/ATEX-logo.svg)

**Professional Proposal Management System for Smart Home & Building Systems**

[English](#english) | [العربية](#العربية)

</div>

---

## 📋 Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [License](#license)

---

## About

ATEX Proposal Generator is a comprehensive web-based system for creating and managing professional price proposals for smart home and building automation systems. Built with simplicity in mind, it offers a complete solution for businesses to streamline their proposal workflow.

### 🇸🇦 العربية

مولد عروض ATEX هو نظام ويب متكامل لإنشاء وإدارة عروض الأسعار لأنظمة المنازل والمباني الذكية. تم تطويره خصيصاً لأنظمة التحكم الذكي ويتميز بدعم كامل للغة العربية وواجهة مستخدم عصرية.

---

## Features

### Core Features
- ✅ **Proposal Management** - Create, edit, duplicate, and manage proposals
- ✅ **Product Catalog** - Manage products with images, categories, and pricing
- ✅ **Customer Database** - Store and manage customer information
- ✅ **PDF Export** - Export proposals to PDF with multiple templates
- ✅ **Multi-language** - Full Arabic (RTL) and English support
- ✅ **Dashboard** - Overview statistics and analytics

### Technical Features
- 🔐 **Authentication** - Secure JWT-based authentication
- 📊 **REST API** - Complete RESTful API for integrations
- 💾 **SQLite Database** - Lightweight, file-based database
- 🖼️ **Image Upload** - Product image management
- 📱 **Responsive Design** - Works on desktop and tablets

### PDF Templates
| Template | Description |
|----------|-------------|
| `professional` | Full A4 professional design (default) |
| `compact` | Single-page condensed layout |
| `invoice` | Invoice-style format |
| `detailed` | Detailed specifications layout |

---

## Tech Stack

- **Runtime:** Node.js 18+
- **Database:** SQLite (sql.js)
- **Authentication:** JWT + bcryptjs
- **Frontend:** Vanilla HTML/CSS/JavaScript
- **Server:** Native HTTP module (no framework)
- **Features:** REST API, File uploads, PDF templates

---

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or pnpm

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-repo/atex-proposal-app.git
cd atex-proposal-app

# Install dependencies
npm install

# Start the server
npm start

# Access the application
# Open http://localhost:8080
```

### Development Mode

```bash
npm run dev
```

---

## Usage

### Default Login

After first run, a default admin user is created:

```
Username: admin
Password: admin123
```

**Important:** Change the default password after first login!

### Creating a Proposal

1. Login to the dashboard
2. Navigate to "Proposals" → "New Proposal"
3. Select or create a customer
4. Add products from the catalog
5. Configure discounts and taxes
6. Choose a PDF template
7. Save and export

---

## API Documentation

### Authentication

```bash
# Login
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

# Response
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": 1, "username": "admin", "email": "admin@atex.sa", "role": "admin" }
}
```

### Products

```bash
# Get all products
GET /api/products

# Get single product
GET /api/products/:id

# Create product
POST /api/products
{
  "sku": "FT-300",
  "name": "Smart Controller",
  "price": 450,
  "category": "Controllers",
  "description": "Advanced smart home controller"
}

# Update product
PUT /api/products/:id

# Delete product
DELETE /api/products/:id
```

### Customers

```bash
# Get all customers
GET /api/customers

# Create customer
POST /api/customers
{
  "name": "John Doe",
  "company": "ABC Corporation",
  "email": "john@abc.com",
  "phone": "05xxxxxxxx",
  "address": "Riyadh, Saudi Arabia",
  "tax_number": "3xxxxxxxxxx"
}

# Update customer
PUT /api/customers/:id

# Delete customer
DELETE /api/customers/:id
```

### Proposals

```bash
# Get all proposals
GET /api/proposals

# Get single proposal with items
GET /api/proposals/:id

# Create proposal
POST /api/proposals
{
  "title": "Villa ABC Proposal",
  "customer_id": 1,
  "template": "professional",
  "discount_percent": 10,
  "tax_percent": 15,
  "valid_days": 30,
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "unit_price": 450,
      "description": "Smart Controller - FT-300"
    }
  ]
}

# Update proposal
PUT /api/proposals/:id

# Update proposal status
PUT /api/proposals/:id/status
{
  "status": "accepted"  // draft, sent, viewed, accepted, rejected, expired
}

# Duplicate proposal
POST /api/proposals/:id/duplicate

# Export to PDF (HTML format)
GET /api/proposals/:id/pdf

# Delete proposal
DELETE /api/proposals/:id
```

### Dashboard

```bash
# Get dashboard statistics
GET /api/dashboard/stats

# Response
{
  "total_proposals": 150,
  "draft_proposals": 25,
  "sent_proposals": 45,
  "viewed_proposals": 30,
  "accepted_proposals": 40,
  "rejected_proposals": 10,
  "total_customers": 85,
  "total_products": 120,
  "total_revenue": 1250000.00
}
```

### Image Upload

```bash
# Upload product image
POST /api/upload/image
Content-Type: multipart/form-data

# Response
{
  "success": true,
  "filename": "1701234567890-abc123.png",
  "url": "/product-image/1701234567890-abc123.png"
}
```

---

## Production Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Server Port
PORT=8080

# JWT Secret - IMPORTANT: Generate a strong random string
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Node Environment
NODE_ENV=production
```

**Security Best Practices:**

1. **Generate a strong JWT secret:**
   ```bash
   # Linux/Mac
   openssl rand -base64 32
   
   # Windows (PowerShell)
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Min 0 -Max 255 }))
   ```

2. **Change default credentials immediately after first deployment**

3. **Use HTTPS in production** (via Nginx + Let's Encrypt)

4. **Regular database backups** (see [DEPLOYMENT.md](DEPLOYMENT.md))

### Performance Optimizations

The application includes built-in optimizations:

| Feature | Description |
|---------|-------------|
| **Rate Limiting** | 100 requests per 15-minute window per IP |
| **Compression** | Gzip compression for responses |
| **Security Headers** | CSP, XSS protection, HSTS, etc. |
| **Request Logging** | Structured logging for monitoring |

### Monitoring

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs atex-app

# Monitor resources
pm2 monit

# Check application health
curl http://localhost:8080/health
```

Expected health response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Project Structure

```
atex-proposal-app/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── README.md              # This file
├── DEPLOYMENT.md          # Deployment guide
├── .env.example           # Environment variables example
├── atex.db                # SQLite database (auto-generated)
├── product-image/         # Uploaded product images
│   ├── AR-G1.png
│   ├── DR-02.png
│   └── ...
├── public/                # Static frontend files
│   ├── index.html         # Main application
│   ├── ATEX-logo.svg      # Company logo
│   ├── ATEX Slogan.svg    # Company slogan
│   └── sar_symbol.svg     # SAR currency symbol
└── templates/             # PDF templates
    ├── professional.html  # Professional template (default)
    ├── compact.html       # Compact template
    ├── invoice.html       # Invoice template
    └── detailed.html      # Detailed template
```

---

## Deployment

### Quick Deploy with PM2

```bash
# Connect to your server
ssh user@vps-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone and setup
git clone https://github.com/your-repo/atex-proposal-app.git
cd atex-proposal-app
npm install

# Start with PM2
pm2 start server.js --name atex-app -- --production

# Setup startup script
pm2 startup
pm2 save

# Check status
pm2 status
```

### Using Nginx

```bash
sudo apt install nginx

# Create nginx config
sudo nano /etc/nginx/sites-available/atex-app
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Static files caching
    location ~* \.(jpg|png|svg|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/atex-app /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

### SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
```

```bash
docker build -t atex-app .
docker run -d -p 8080:8080 --name atex atex-app
```

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Screenshots

> Add your screenshots here

| Dashboard | Create Proposal | PDF Preview |
|-----------|-----------------|-------------|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Create Proposal](docs/screenshots/create-proposal.png) | ![PDF Preview](docs/screenshots/pdf-preview.png) |

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

For support and inquiries:
- Email: support@atex.sa
- Website: https://atex.sa

---

<div align="center">

**Built with ❤️ by ATEX**

</div>