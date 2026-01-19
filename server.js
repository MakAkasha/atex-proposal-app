const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'atex-secret-key-change-in-production';
const DB_FILE = path.join(__dirname, 'atex.db');

let db;

// Initialize SQLite database
async function initDatabase() {
    try {
        const SQL = await initSqlJs();
        
        // Load existing database or create new one
        if (fs.existsSync(DB_FILE)) {
            const buffer = fs.readFileSync(DB_FILE);
            db = new SQL.Database(buffer);
        } else {
            db = new SQL.Database();
        }
        console.log('✅ Database connected');
        
        // Create tables
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                email TEXT UNIQUE,
                role TEXT DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        db.run(`
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                company TEXT,
                address TEXT,
                tax_number TEXT,
                notes TEXT,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);
        
        db.run(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sku TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                price REAL DEFAULT 0,
                cost REAL DEFAULT 0,
                category TEXT,
                unit TEXT DEFAULT 'قطعة',
                image_url TEXT,
                stock INTEGER DEFAULT 0,
                active INTEGER DEFAULT 1,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);
        
        db.run(`
            CREATE TABLE IF NOT EXISTS proposals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                proposal_number TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                customer_id INTEGER,
                status TEXT DEFAULT 'draft',
                subtotal REAL DEFAULT 0,
                discount_percent REAL DEFAULT 0,
                discount_amount REAL DEFAULT 0,
                tax_percent REAL DEFAULT 15,
                tax_amount REAL DEFAULT 0,
                total REAL DEFAULT 0,
                notes TEXT,
                terms TEXT,
                valid_days INTEGER DEFAULT 30,
                template TEXT DEFAULT 'professional',
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);
        
        db.run(`
            CREATE TABLE IF NOT EXISTS proposal_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                proposal_id INTEGER NOT NULL,
                product_id INTEGER,
                description TEXT NOT NULL,
                quantity REAL DEFAULT 1,
                unit_price REAL DEFAULT 0,
                discount_percent REAL DEFAULT 0,
                total REAL DEFAULT 0,
                notes TEXT,
                sort_order INTEGER DEFAULT 0,
                FOREIGN KEY (proposal_id) REFERENCES proposals(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        `);
        
        console.log('✅ Database tables created');
        
        // Create default admin user if not exists
        const adminCheck = db.exec("SELECT id FROM users WHERE username = 'admin'");
        if (adminCheck.length === 0 || adminCheck[0].values.length === 0) {
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            db.run("INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)", ['admin', hashedPassword, 'admin@atex.sa', 'admin']);
            console.log('✅ Default admin user created (username: admin, password: admin123)');
        }
        
        saveDatabase();
        
    } catch (err) {
        console.error('❌ Database initialization failed:', err.message);
        process.exit(1);
    }
}

// Save database to file
function saveDatabase() {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
}

// Template rendering functions
function renderTemplate(templateName, data) {
    const templatePath = path.join(__dirname, 'templates', templateName + '.html');
    
    try {
        let html = fs.readFileSync(templatePath, 'utf8');
        
        // Helper function to format currency
        const formatCurrency = (amount) => {
            return parseFloat(amount || 0).toLocaleString('en-US', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            }) + ' <img src="/sar_symbol.svg" alt="SAR" style="height:0.9em;vertical-align:middle;margin-right:2px;">';
        };
        
        // Prepare data
        const proposalData = {
            proposal_number: data.proposal_number || 'PO-0000',
            date: new Date(data.created_at || Date.now()).toLocaleDateString('en-US'),
            valid_until: data.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US'),
            valid_days: data.valid_days || 30,
            subtotal: data.subtotal || 0,
            discount_percent: data.discount_percent || 0,
            discount_amount: data.discount_amount || 0,
            tax_percent: data.tax_percent || 15,
            tax_amount: data.tax_amount || 0,
            total: data.total || 0,
            notes: data.notes || '',
            terms: data.terms || '',
            customer: data.customer || null,
            items: (data.items || []).map(item => ({
                ...item,
                image: item.image_url || (item.sku ? `/product-image/${item.sku}.png` : ''),
                formatCurrency: formatCurrency
            }))
        };
        
        // Replace simple variables
        html = html.replace(/\{\{proposal_number\}\}/g, proposalData.proposal_number);
        html = html.replace(/\{\{date\}\}/g, proposalData.date);
        html = html.replace(/\{\{valid_until\}\}/g, proposalData.valid_until);
        html = html.replace(/\{\{valid_days\}\}/g, proposalData.valid_days);
        html = html.replace(/\{\{subtotal\}\}/g, formatCurrency(proposalData.subtotal));
        html = html.replace(/\{\{discount_percent\}\}/g, proposalData.discount_percent);
        html = html.replace(/\{\{discount_amount\}\}/g, formatCurrency(proposalData.discount_amount));
        html = html.replace(/\{\{tax_percent\}\}/g, proposalData.tax_percent);
        html = html.replace(/\{\{tax_amount\}\}/g, formatCurrency(proposalData.tax_amount));
        html = html.replace(/\{\{total\}\}/g, formatCurrency(proposalData.total));
        
        // Handle notes
        if (proposalData.notes) {
            html = html.replace(/\{\{#if notes\}\}[\s\S]*?\{\{\/if\}\}/g, proposalData.notes);
        } else {
            html = html.replace(/\{\{#if notes\}\}[\s\S]*?\{\{\/if\}\}/g, '');
        }
        
        // Handle terms
        if (proposalData.terms) {
            const termsList = proposalData.terms.split('\n').filter(t => t.trim()).map(t => `<li>${t.trim()}</li>`).join('\n');
            html = html.replace(/\{\{#if terms\}\}[\s\S]*?\{\{\/if\}\}/g, `
                <div class="section">
                    <div class="section-header">الشروط والأحكام</div>
                    <div class="terms-box">
                        <h4>شروط وأحكام العرض</h4>
                        <ul>${termsList}</ul>
                    </div>
                </div>
            `);
            html = html.replace(/\{\{\{terms\}\}\}/g, proposalData.terms);
            html = html.replace(/\{\{\{terms_list\}\}\}/g, termsList);
        } else {
            html = html.replace(/\{\{#if terms\}\}[\s\S]*?\{\{\/if\}\}/g, '');
        }
        
        // Handle customer
        if (proposalData.customer) {
            html = html.replace(/\{\{#if customer\}\}[\s\S]*?\{\{\/if\}\}/g, (match) => {
                return match
                    .replace(/\{\{#if customer\}\}/g, '')
                    .replace(/\{\{\/if\}\}/g, '')
                    .replace(/\{\{customer\.name\}\}/g, proposalData.customer.name || '')
                    .replace(/\{\{customer\.company\}\}/g, proposalData.customer.company || '')
                    .replace(/\{\{customer\.email\}\}/g, proposalData.customer.email || '')
                    .replace(/\{\{customer\.phone\}\}/g, proposalData.customer.phone || '')
                    .replace(/\{\{customer\.address\}\}/g, proposalData.customer.address || '')
                    .replace(/\{\{customer\.tax\}\}/g, proposalData.customer.tax || '')
                    .replace(/\{\{#if customer\.company\}\}[\s\S]*?\{\{\/if\}\}/g, proposalData.customer.company ? match : '');
            });
        } else {
            html = html.replace(/\{\{#if customer\}\}[\s\S]*?\{\{\/if\}\}/g, '');
        }
        
        // Handle items
        let itemsHtml = '';
        proposalData.items.forEach((item, index) => {
            const imageHtml = item.image ? `<img src="${item.image}" class="item-image" alt="${item.name}">` : '';
            itemsHtml += `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        <div class="item-header">
                            ${imageHtml ? `<div style="width:50px;">${imageHtml}</div>` : ''}
                            <div class="item-info">
                                <div class="item-name">${item.name}</div>
                                <div class="item-sku">${item.sku || ''}</div>
                                ${item.description ? `<div class="item-desc">${item.description}</div>` : ''}
                            </div>
                        </div>
                    </td>
                    <td class="qty-col">${item.quantity}</td>
                    <td class="price-col">${formatCurrency(item.unit_price)}</td>
                    <td class="total-col">${formatCurrency(item.total)}</td>
                </tr>
            `;
        });
        
        // Replace items table
        const itemsPattern = /\{\{#each items\}\}[\s\S]*?\{\{\/each\}\}/;
        html = html.replace(itemsPattern, itemsHtml);
        
        // Replace {{formatCurrency}} in template with actual function
        html = html.replace(/\{\{formatCurrency\s+([^}]+)\}\}/g, (match, varName) => {
            return formatCurrency(proposalData[varName.trim()] || 0);
        });
        
        // Add formatCurrency function to template
        html = html.replace(/<script>[\s\S]*?<\/script>/, '');
        
        return html;
    } catch (e) {
        console.error('Template render error:', e);
        return `<html><body><h1>Error rendering template: ${e.message}</h1></body></html>`;
    }
}

// Helper functions
function sendJSON(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data, null, 2));
}

function sendError(res, message, status = 400) {
    sendJSON(res, { success: false, error: message }, status);
}

function queryOne(sql, params = []) {
    try {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
        }
        stmt.free();
        return null;
    } catch (e) {
        console.error('Database queryOne error:', e.message);
        console.error('SQL:', sql);
        console.error('Params:', params);
        throw e;
    }
}

function queryAll(sql, params = []) {
    try {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    } catch (e) {
        console.error('Database queryAll error:', e.message);
        console.error('SQL:', sql);
        console.error('Params:', params);
        throw e;
    }
}

  function run(sql, params = []) {
    try {
      db.run(sql, params);
      saveDatabase();
      const result = db.exec("SELECT last_insert_rowid()");
      if (result.length > 0 && result[0].values.length > 0) {
        return { lastInsertRowid: result[0].values[0][0] };
      }
      return { lastInsertRowid: null };
    } catch (e) {
      console.error('Database run error:', e.message);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw e;
    }
  }

function generateProposalNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `PO-${year}${month}-${random}`;
}

function authenticate(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.substring(7);
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return null;
    }
}

function requireAuth(req, res) {
    const user = authenticate(req);
    if (!user) {
        sendError(res, 'Unauthorized', 401);
        return null;
    }
    return user;
}

// Request body parser
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });
}

// Parse multipart form data for file uploads
function parseMultipartForm(req) {
    return new Promise((resolve, reject) => {
        const contentType = req.headers['content-type'] || '';
        const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
        
        if (!boundaryMatch) {
            reject(new Error('No boundary found in content-type'));
            return;
        }
        
        const boundary = boundaryMatch[1] || boundaryMatch[2];
        let body = Buffer.alloc(0);
        
        req.on('data', chunk => {
            body = Buffer.concat([body, chunk]);
        });
        
        req.on('end', () => {
            try {
                const formData = {};
                const parts = body.toString('binary').split('--' + boundary);
                
                for (const part of parts) {
                    if (!part || part === '--\r\n' || part === '--') continue;
                    
                    const sectionEnd = part.indexOf('\r\n\r\n');
                    if (sectionEnd === -1) continue;
                    
                    const header = part.substring(0, sectionEnd);
                    const content = part.substring(sectionEnd + 4);
                    
                    // Parse Content-Disposition header
                    const nameMatch = header.match(/name="([^"]+)"/i);
                    const filenameMatch = header.match(/filename="([^"]+)"/i);
                    
                    if (!nameMatch) continue;
                    
                    const fieldName = nameMatch[1];
                    
                    // Check if it's a file upload
                    if (filenameMatch) {
                        const filename = filenameMatch[1];
                        const fileEnd = content.lastIndexOf('\r\n');
                        const fileContent = fileEnd > -1 ? content.substring(0, fileEnd) : content;
                        formData[fieldName] = {
                            filename: filename,
                            data: Buffer.from(fileContent, 'binary')
                        };
                    } else {
                        // Regular field
                        formData[fieldName] = content.replace(/\r\n$/, '');
                    }
                }
                
                resolve(formData);
            } catch (e) {
                reject(e);
            }
        });
        
        req.on('error', reject);
    });
}

// Get image extension from buffer
function getImageExtension(buffer) {
    if (!buffer || buffer.length < 8) return null;
    
    // Check magic bytes for different image formats
    const signatures = {
        'image/png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
        'image/jpeg': [0xFF, 0xD8, 0xFF],
        'image/gif': [0x47, 0x49, 0x46, 0x38],
        'image/webp': [0x52, 0x49, 0x46, 0x46]
    };
    
    const hex = buffer.toString('hex', 0, 8).toLowerCase();
    
    if (hex.startsWith('89504e470d0a1a0a')) return '.png';
    if (hex.startsWith('ffd8ff')) return '.jpg';
    if (hex.startsWith('47494638')) return '.gif';
    if (hex.startsWith('52494646')) return '.webp';
    
    // Also check from start as string
    const str = buffer.toString('binary', 0, 8);
    if (str.startsWith('\x89PNG\r\n\x1a\n')) return '.png';
    if (str.startsWith('\xff\xd8\xff')) return '.jpg';
    if (str.startsWith('GIF87a') || str.startsWith('GIF89a')) return '.gif';
    if (str.startsWith('RIFF')) return '.webp';
    
    return null;
}

// MIME types for static files
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf'
};

// Serve static file
function serveStaticFile(res, filePath) {
    try {
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath);
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(fs.readFileSync(filePath));
            return true;
        }
    } catch (err) {
        console.error('Static file error:', err.message);
    }
    return false;
}

// HTTP Server
const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const pathname = req.url.split('?')[0];
    const method = req.method;

    // Log request
    console.log(`${method} ${pathname}`);

    try {
        // Static files from public folder
        if (method === 'GET' && !pathname.startsWith('/api')) {
            let filePath = pathname === '/' ? '/index.html' : pathname;
            if (filePath.startsWith('/')) filePath = filePath.substring(1);
            
            // Check public folder first
            const publicPath = path.join(__dirname, 'public', filePath);
            if (serveStaticFile(res, publicPath)) {
                return;
            }
            
            // Check product-image folder
            if (pathname.startsWith('/product-image/')) {
                const imagePath = path.join(__dirname, pathname);
                if (serveStaticFile(res, imagePath)) {
                    return;
                }
            }
        }

        // ============ AUTH ROUTES ============
        
        // POST /api/auth/login
        if (method === 'POST' && pathname === '/api/auth/login') {
            const data = await parseBody(req);
            const user = queryOne('SELECT * FROM users WHERE username = ?', [data.username]);
            if (!user || !bcrypt.compareSync(data.password, user.password)) {
                sendError(res, 'Invalid credentials', 401);
                return;
            }
            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            sendJSON(res, { 
                success: true, 
                token, 
                user: { id: user.id, username: user.username, email: user.email, role: user.role } 
            });
            return;
        }

        // POST /api/auth/register
        if (method === 'POST' && pathname === '/api/auth/register') {
            const data = await parseBody(req);
            if (!data.username || !data.password) {
                sendError(res, 'Username and password required', 400);
                return;
            }
            const hashedPassword = bcrypt.hashSync(data.password, 10);
            try {
                run("INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)", [data.username, hashedPassword, data.email || null, 'user']);
                sendJSON(res, { success: true }, 201);
            } catch (e) {
                sendError(res, 'Username already exists', 409);
            }
            return;
        }

        // GET /api/auth/me
        if (method === 'GET' && pathname === '/api/auth/me') {
            const user = requireAuth(req, res);
            if (!user) return;
            const dbUser = queryOne('SELECT id, username, email, role FROM users WHERE id = ?', [user.id]);
            sendJSON(res, { success: true, user: dbUser });
            return;
        }

        // POST /api/auth/change-password
        if (method === 'POST' && pathname === '/api/auth/change-password') {
            const user = requireAuth(req, res);
            if (!user) return;
            const data = await parseBody(req);
            const dbUser = queryOne('SELECT password FROM users WHERE id = ?', [user.id]);
            if (!bcrypt.compareSync(data.currentPassword, dbUser.password)) {
                sendError(res, 'Current password incorrect', 400);
                return;
            }
            const hashedPassword = bcrypt.hashSync(data.newPassword, 10);
            run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);
            sendJSON(res, { success: true });
            return;
        }

        // ============ PRODUCTS ROUTES ============

        // GET /api/products
        if (method === 'GET' && pathname === '/api/products') {
            const user = requireAuth(req, res);
            if (!user) return;
            const products = queryAll('SELECT * FROM products WHERE active = 1 ORDER BY name');
            sendJSON(res, products);
            return;
        }

        // GET /api/products/:id
        if (method === 'GET' && pathname.match(/^\/api\/products\/\d+$/)) {
            const user = requireAuth(req, res);
            if (!user) return;
            const id = pathname.split('/').pop();
            const product = queryOne('SELECT * FROM products WHERE id = ?', [id]);
            if (!product) {
                sendError(res, 'Product not found', 404);
                return;
            }
            sendJSON(res, product);
            return;
        }

        // POST /api/products/sync - Batch sync (insert or update)
        if (method === 'POST' && pathname === '/api/products/sync') {
            const user = requireAuth(req, res);
            if (!user) return;
            const data = await parseBody(req);
            
            if (!data.products || !Array.isArray(data.products) || data.products.length === 0) {
                sendError(res, 'Products array required', 400);
                return;
            }
            
            const results = {
                created: 0,
                updated: 0,
                failed: 0,
                errors: []
            };
            
            for (const product of data.products) {
                if (!product.sku || !product.name) {
                    results.failed++;
                    results.errors.push({
                        sku: product.sku || 'unknown',
                        error: 'SKU and name required'
                    });
                    continue;
                }
                
                try {
                    // Check if product exists
                    const existing = queryOne('SELECT id FROM products WHERE sku = ?', [product.sku]);
                    
                    if (existing) {
                        // Update existing product
                        run(
                            'UPDATE products SET name = ?, description = ?, price = ?, cost = ?, category = ?, unit = ?, image_url = ?, stock = ?, active = 1 WHERE sku = ?',
                            [
                                product.name,
                                product.description || '',
                                product.price || 0,
                                product.cost || 0,
                                product.category || '',
                                product.unit || 'قطعة',
                                product.image_url || '',
                                product.stock || 0,
                                product.sku
                            ]
                        );
                        results.updated++;
                    } else {
                        // Insert new product
                        run(
                            'INSERT INTO products (sku, name, description, price, cost, category, unit, image_url, stock, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            [
                                product.sku,
                                product.name,
                                product.description || '',
                                product.price || 0,
                                product.cost || 0,
                                product.category || '',
                                product.unit || 'قطعة',
                                product.image_url || '',
                                product.stock || 0,
                                user.id
                            ]
                        );
                        results.created++;
                    }
                } catch (e) {
                    results.failed++;
                    results.errors.push({
                        sku: product.sku,
                        error: e.message || 'Unknown error'
                    });
                }
            }
            
            sendJSON(res, {
                success: true,
                ...results,
                total: data.products.length
            });
            return;
        }

        // POST /api/products/check-duplicates - Check which SKUs already exist
        if (method === 'POST' && pathname === '/api/products/check-duplicates') {
            const user = requireAuth(req, res);
            if (!user) return;
            const data = await parseBody(req);
            
            if (!data.skus || !Array.isArray(data.skus)) {
                sendError(res, 'SKUs array required', 400);
                return;
            }
            
            const duplicates = [];
            const newSkus = [];
            
            for (const sku of data.skus) {
                if (!sku || !sku.trim()) continue;
                const existing = queryOne('SELECT sku, name, price FROM products WHERE sku = ? AND active = 1', [sku.trim()]);
                if (existing) {
                    duplicates.push({
                        sku: existing.sku,
                        name: existing.name,
                        price: existing.price
                    });
                } else {
                    newSkus.push(sku.trim());
                }
            }
            
            sendJSON(res, {
                success: true,
                duplicates,
                newSkus,
                totalChecked: data.skus.length,
                duplicatesCount: duplicates.length,
                newCount: newSkus.length
            });
            return;
        }

        // POST /api/products
        if (method === 'POST' && pathname === '/api/products') {
            const user = requireAuth(req, res);
            if (!user) return;
            const data = await parseBody(req);
            if (!data.sku || !data.name) {
                sendError(res, 'SKU and name required', 400);
                return;
            }
            try {
                run(
                    'INSERT INTO products (sku, name, description, price, cost, category, unit, image_url, stock, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [data.sku, data.name, data.description || '', data.price || 0, data.cost || 0, data.category || '', data.unit || 'قطعة', data.image_url || '', data.stock || 0, user.id]
                );
                sendJSON(res, { success: true }, 201);
            } catch (e) {
                sendError(res, `Product with SKU "${data.sku}" already exists`, 409);
            }
            return;
        }

        // PUT /api/products/:id
        if (method === 'PUT' && pathname.match(/^\/api\/products\/\d+$/)) {
            const user = requireAuth(req, res);
            if (!user) return;
            const id = pathname.split('/').pop();
            const data = await parseBody(req);
            const existing = queryOne('SELECT id FROM products WHERE id = ?', [id]);
            if (!existing) {
                sendError(res, 'Product not found', 404);
                return;
            }
            run(
                'UPDATE products SET sku = ?, name = ?, description = ?, price = ?, cost = ?, category = ?, unit = ?, image_url = ?, stock = ?, active = ? WHERE id = ?',
                [data.sku, data.name, data.description, data.price, data.cost, data.category, data.unit, data.image_url, data.stock, data.active !== false ? 1 : 0, id]
            );
            const updated = queryOne('SELECT * FROM products WHERE id = ?', [id]);
            sendJSON(res, { success: true, product: updated });
            return;
        }

        // DELETE /api/products/:id
        if (method === 'DELETE' && pathname.match(/^\/api\/products\/\d+$/)) {
            const user = requireAuth(req, res);
            if (!user) return;
            const id = pathname.split('/').pop();
            run('UPDATE products SET active = 0 WHERE id = ?', [id]);
            sendJSON(res, { success: true });
            return;
        }

        // ============ CUSTOMERS ROUTES ============

        // GET /api/customers
        if (method === 'GET' && pathname === '/api/customers') {
            const user = requireAuth(req, res);
            if (!user) return;
            const customers = queryAll('SELECT * FROM customers ORDER BY name');
            sendJSON(res, customers);
            return;
        }

        // POST /api/customers
        if (method === 'POST' && pathname === '/api/customers') {
            const user = requireAuth(req, res);
            if (!user) return;
            const data = await parseBody(req);
            if (!data.name) {
                sendError(res, 'Customer name required', 400);
                return;
            }
            run(
                'INSERT INTO customers (name, email, phone, company, address, tax_number, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    data.name,
                    data.email || null,
                    data.phone || null,
                    data.company || null,
                    data.address || null,
                    data.tax_number || null,
                    data.notes || null,
                    user.id
                ]
            );
            sendJSON(res, { success: true }, 201);
            return;
        }

        // PUT /api/customers/:id
        if (method === 'PUT' && pathname.match(/^\/api\/customers\/\d+$/)) {
            const user = requireAuth(req, res);
            if (!user) return;
            const id = pathname.split('/').pop();
            const data = await parseBody(req);
            run(
                'UPDATE customers SET name = ?, email = ?, phone = ?, company = ?, address = ?, tax_number = ?, notes = ? WHERE id = ?',
                [data.name, data.email, data.phone, data.company, data.address, data.tax_number, data.notes, id]
            );
            const updated = queryOne('SELECT * FROM customers WHERE id = ?', [id]);
            sendJSON(res, { success: true, customer: updated });
            return;
        }

        // DELETE /api/customers/:id
        if (method === 'DELETE' && pathname.match(/^\/api\/customers\/\d+$/)) {
            const user = requireAuth(req, res);
            if (!user) return;
            const id = pathname.split('/').pop();
            run('DELETE FROM customers WHERE id = ?', [id]);
            sendJSON(res, { success: true });
            return;
        }

        // ============ PROPOSALS ROUTES ============

        // GET /api/proposals
        if (method === 'GET' && pathname === '/api/proposals') {
            const user = requireAuth(req, res);
            if (!user) return;
            const proposals = queryAll(`
                SELECT p.*, c.name as customer_name, c.company as customer_company
                FROM proposals p
                LEFT JOIN customers c ON p.customer_id = c.id
                ORDER BY p.created_at DESC
            `);
            sendJSON(res, proposals);
            return;
        }

        // GET /api/proposals/:id
        if (method === 'GET' && pathname.match(/^\/api\/proposals\/\d+$/)) {
            const user = requireAuth(req, res);
            if (!user) return;
            const id = pathname.split('/').pop();
            const proposal = queryOne(`
                SELECT p.*, c.name as customer_name, c.company as customer_company, c.email as customer_email, c.phone as customer_phone, c.address as customer_address, c.tax_number as customer_tax
                FROM proposals p
                LEFT JOIN customers c ON p.customer_id = c.id
                WHERE p.id = ?
            `, [id]);
            if (!proposal) {
                sendError(res, 'Proposal not found', 404);
                return;
            }
            const items = queryAll('SELECT * FROM proposal_items WHERE proposal_id = ? ORDER BY sort_order', [id]);
            sendJSON(res, { ...proposal, items });
            return;
        }

        // POST /api/proposals
        if (method === 'POST' && pathname === '/api/proposals') {
            const user = requireAuth(req, res);
            if (!user) return;
            const data = await parseBody(req);
            if (!data.title) {
                sendError(res, 'Proposal title required', 400);
                return;
            }
            const proposalNumber = generateProposalNumber();
            const result = run(
                'INSERT INTO proposals (proposal_number, title, customer_id, status, subtotal, discount_percent, discount_amount, tax_percent, tax_amount, total, notes, terms, valid_days, template, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [proposalNumber, data.title, data.customer_id, data.status || 'draft', data.subtotal || 0, data.discount_percent || 0, data.discount_amount || 0, data.tax_percent || 15, data.tax_amount || 0, data.total || 0, data.notes, data.terms, data.valid_days || 30, data.template || 'professional', user.id]
            );
            
            const proposalId = result.lastInsertRowid;
            
            if (data.items && Array.isArray(data.items)) {
                data.items.forEach((item, index) => {
                    run(
                        'INSERT INTO proposal_items (proposal_id, product_id, description, quantity, unit_price, discount_percent, total, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [proposalId, item.product_id, item.description, item.quantity, item.unit_price, item.discount_percent || 0, item.total, item.notes, index]
                    );
                });
            }
            
            const proposal = queryOne('SELECT * FROM proposals WHERE id = ?', [proposalId]);
            sendJSON(res, { success: true, proposal }, 201);
            return;
        }

        // PUT /api/proposals/:id
        if (method === 'PUT' && pathname.match(/^\/api\/proposals\/\d+$/)) {
            const user = requireAuth(req, res);
            if (!user) return;
            const id = pathname.split('/').pop();
            const data = await parseBody(req);
            
            run(
                'UPDATE proposals SET title = ?, customer_id = ?, status = ?, subtotal = ?, discount_percent = ?, discount_amount = ?, tax_percent = ?, tax_amount = ?, total = ?, notes = ?, terms = ?, valid_days = ?, template = ? WHERE id = ?',
                [data.title, data.customer_id, data.status, data.subtotal, data.discount_percent, data.discount_amount, data.tax_percent, data.tax_amount, data.total, data.notes, data.terms, data.valid_days, data.template, id]
            );
            
            if (data.items && Array.isArray(data.items)) {
                run('DELETE FROM proposal_items WHERE proposal_id = ?', [id]);
                data.items.forEach((item, index) => {
                    run(
                        'INSERT INTO proposal_items (proposal_id, product_id, description, quantity, unit_price, discount_percent, total, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [id, item.product_id, item.description, item.quantity, item.unit_price, item.discount_percent || 0, item.total, item.notes, index]
                    );
                });
            }
            
            const proposal = queryOne('SELECT * FROM proposals WHERE id = ?', [id]);
            sendJSON(res, { success: true, proposal });
            return;
        }

        // PUT /api/proposals/:id/status
        if (method === 'PUT' && pathname.match(/^\/api\/proposals\/\d+\/status$/)) {
            const user = requireAuth(req, res);
            if (!user) return;
            const id = pathname.split('/').pop();
            const data = await parseBody(req);
            
            const validStatuses = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'];
            if (!validStatuses.includes(data.status)) {
                sendError(res, 'Invalid status', 400);
                return;
            }
            
            run('UPDATE proposals SET status = ? WHERE id = ?', [data.status, id]);
            sendJSON(res, { success: true });
            return;
        }

        // DELETE /api/proposals/:id
        if (method === 'DELETE' && pathname.match(/^\/api\/proposals\/\d+$/)) {
            const user = requireAuth(req, res);
            if (!user) return;
            const id = pathname.split('/').pop();
            run('DELETE FROM proposal_items WHERE proposal_id = ?', [id]);
            run('DELETE FROM proposals WHERE id = ?', [id]);
            sendJSON(res, { success: true });
            return;
        }

        // ============ DASHBOARD ROUTES ============

        // GET /api/dashboard/stats
        if (method === 'GET' && pathname === '/api/dashboard/stats') {
            const user = requireAuth(req, res);
            if (!user) return;
            
            const totalProposals = queryOne('SELECT COUNT(*) as count FROM proposals');
            const draftProposals = queryOne('SELECT COUNT(*) as count FROM proposals WHERE status = ?', ['draft']);
            const sentProposals = queryOne('SELECT COUNT(*) as count FROM proposals WHERE status = ?', ['sent']);
            const viewedProposals = queryOne('SELECT COUNT(*) as count FROM proposals WHERE status = ?', ['viewed']);
            const acceptedProposals = queryOne('SELECT COUNT(*) as count FROM proposals WHERE status = ?', ['accepted']);
            const rejectedProposals = queryOne('SELECT COUNT(*) as count FROM proposals WHERE status = ?', ['rejected']);
            const totalUsers = queryOne('SELECT COUNT(*) as count FROM users');
            const totalCustomers = queryOne('SELECT COUNT(*) as count FROM customers');
            const totalProducts = queryOne('SELECT COUNT(*) as count FROM products WHERE active = 1');
            const totalRevenue = queryOne('SELECT COALESCE(SUM(total), 0) as total FROM proposals WHERE status = ?', ['accepted']);
            
            sendJSON(res, {
                total_proposals: totalProposals?.count || 0,
                draft_proposals: draftProposals?.count || 0,
                sent_proposals: sentProposals?.count || 0,
                viewed_proposals: viewedProposals?.count || 0,
                accepted_proposals: acceptedProposals?.count || 0,
                rejected_proposals: rejectedProposals?.count || 0,
                total_users: totalUsers?.count || 0,
                total_customers: totalCustomers?.count || 0,
                total_products: totalProducts?.count || 0,
                total_revenue: totalRevenue?.total || 0
            });
            return;
        }

        // ============ USERS ROUTES ============

        // GET /api/users
        if (method === 'GET' && pathname === '/api/users') {
            const user = requireAuth(req, res);
            if (!user) return;
            
            // Only admins can view all users
            if (user.role !== 'admin') {
                sendError(res, 'Unauthorized', 403);
                return;
            }
            
            const users = queryAll('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC');
            sendJSON(res, users);
            return;
        }

        // POST /api/users
        if (method === 'POST' && pathname === '/api/users') {
            const user = requireAuth(req, res);
            if (!user) return;
            
            // Only admins can create users
            if (user.role !== 'admin') {
                sendError(res, 'Unauthorized', 403);
                return;
            }
            
            const data = await parseBody(req);
            if (!data.username || !data.password) {
                sendError(res, 'Username and password required', 400);
                return;
            }
            
            if (data.password.length < 6) {
                sendError(res, 'Password must be at least 6 characters', 400);
                return;
            }
            
            const hashedPassword = bcrypt.hashSync(data.password, 10);
            try {
                run(
                    'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
                    [data.username, hashedPassword, data.email || null, data.role || 'user']
                );
                sendJSON(res, { success: true, message: 'User created successfully' }, 201);
            } catch (e) {
                if (e.message.includes('UNIQUE constraint')) {
                    sendError(res, 'Username already exists', 409);
                } else {
                    sendError(res, 'Failed to create user', 500);
                }
            }
            return;
        }

        // PUT /api/users/:id
        if (method === 'PUT' && pathname.match(/^\/api\/users\/\d+$/)) {
            const currentUser = requireAuth(req, res);
            if (!currentUser) return;
            
            const id = parseInt(pathname.split('/').pop());
            
            // Users can only edit themselves, admins can edit anyone
            if (id !== currentUser.id && currentUser.role !== 'admin') {
                sendError(res, 'Unauthorized', 403);
                return;
            }
            
            const data = await parseBody(req);
            const existing = queryOne('SELECT id FROM users WHERE id = ?', [id]);
            if (!existing) {
                sendError(res, 'User not found', 404);
                return;
            }
            
            // Only admins can change roles
            if (data.role && currentUser.role !== 'admin') {
                delete data.role;
            }
            
            if (data.role) {
                run('UPDATE users SET role = ? WHERE id = ?', [data.role, id]);
            }
            if (data.email !== undefined) {
                run('UPDATE users SET email = ? WHERE id = ?', [data.email, id]);
            }
            
            sendJSON(res, { success: true, message: 'User updated successfully' });
            return;
        }

        // POST /api/users/:id/reset-password
        if (method === 'POST' && pathname.match(/^\/api\/users\/\d+\/reset-password$/)) {
            const currentUser = requireAuth(req, res);
            if (!currentUser) return;
            
            // Only admins can reset passwords
            if (currentUser.role !== 'admin') {
                sendError(res, 'Unauthorized', 403);
                return;
            }
            
            const id = parseInt(pathname.split('/').pop());
            const data = await parseBody(req);
            
            if (!data.password || data.password.length < 6) {
                sendError(res, 'Password must be at least 6 characters', 400);
                return;
            }
            
            const hashedPassword = bcrypt.hashSync(data.password, 10);
            run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
            
            sendJSON(res, { success: true, message: 'Password reset successfully' });
            return;
        }

        // DELETE /api/users/:id
        if (method === 'DELETE' && pathname.match(/^\/api\/users\/\d+$/)) {
            const currentUser = requireAuth(req, res);
            if (!currentUser) return;
            
            // Only admins can delete users
            if (currentUser.role !== 'admin') {
                sendError(res, 'Unauthorized', 403);
                return;
            }
            
            const id = parseInt(pathname.split('/').pop());
            
            // Cannot delete yourself
            if (id === currentUser.id) {
                sendError(res, 'Cannot delete your own account', 400);
                return;
            }
            
            // Cannot delete the main admin
            const targetUser = queryOne('SELECT role FROM users WHERE id = ?', [id]);
            if (targetUser?.role === 'admin') {
                sendError(res, 'Cannot delete admin account', 400);
                return;
            }
            
            run('DELETE FROM users WHERE id = ?', [id]);
            sendJSON(res, { success: true, message: 'User deleted successfully' });
            return;
        }

        // ============ PROPOSAL PDF EXPORT ============
        
        // GET /api/proposals/:id/pdf
        if (method === 'GET' && pathname.match(/^\/api\/proposals\/\d+\/pdf$/)) {
            const user = requireAuth(req, res);
            if (!user) return;
            const id = pathname.split('/').pop();
            const proposal = queryOne(`
                SELECT p.*, c.name as customer_name, c.company as customer_company, c.email as customer_email, c.phone as customer_phone, c.address as customer_address, c.tax_number as customer_tax
                FROM proposals p
                LEFT JOIN customers c ON p.customer_id = c.id
                WHERE p.id = ?
            `, [id]);
            
            if (!proposal) {
                sendError(res, 'Proposal not found', 404);
                return;
            }
            
            const items = queryAll('SELECT * FROM proposal_items WHERE proposal_id = ? ORDER BY sort_order', [id]);
            
            // Prepare customer data
            const customer = proposal.customer_name ? {
                name: proposal.customer_name,
                company: proposal.customer_company,
                email: proposal.customer_email,
                phone: proposal.customer_phone,
                address: proposal.customer_address,
                tax: proposal.customer_tax
            } : null;
            
            // Prepare proposal data for template
            const proposalData = {
                ...proposal,
                customer,
                items: items.map(item => ({
                    ...item,
                    sku: item.description?.split(' - ')[0] || '',
                    name: item.description,
                    unit_price: item.unit_price,
                    quantity: item.quantity,
                    total: item.total
                }))
            };
            
            // Get template name
            const templateName = proposal.template || 'professional';
            
            // Render template
            const html = renderTemplate(templateName, proposalData);
            
            res.writeHead(200, { 
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Disposition': `attachment; filename="proposal-${proposal.proposal_number}.html"`
            });
            res.end(html);
            return;
        }

        // ============ DUPLICATE PROPOSAL ============
        
        // POST /api/proposals/:id/duplicate
        if (method === 'POST' && pathname.match(/^\/api\/proposals\/\d+\/duplicate$/)) {
            const user = requireAuth(req, res);
            if (!user) return;
            const id = pathname.split('/').pop();
            
            // Get original proposal
            const original = queryOne(`
                SELECT p.*, c.name as customer_name, c.company as customer_company, c.email as customer_email, c.phone as customer_phone, c.address as customer_address, c.tax_number as customer_tax
                FROM proposals p
                LEFT JOIN customers c ON p.customer_id = c.id
                WHERE p.id = ?
            `, [id]);
            
            if (!original) {
                sendError(res, 'Proposal not found', 404);
                return;
            }
            
            const items = queryAll('SELECT * FROM proposal_items WHERE proposal_id = ?', [id]);
            
            // Generate new proposal number
            const newProposalNumber = generateProposalNumber();
            const newTitle = `نسخة من ${original.title}`;
            
            // Insert new proposal
            const result = run(
                'INSERT INTO proposals (proposal_number, title, customer_id, status, subtotal, discount_percent, discount_amount, tax_percent, tax_amount, total, notes, terms, valid_days, template, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [newProposalNumber, newTitle, original.customer_id, 'draft', original.subtotal, original.discount_percent, original.discount_amount, original.tax_percent, original.tax_amount, original.total, original.notes, original.terms, original.valid_days, original.template, user.id]
            );
            
            const newId = result.lastInsertRowid;
            
            // Copy items
            if (items.length > 0) {
                items.forEach((item, index) => {
                    run(
                        'INSERT INTO proposal_items (proposal_id, product_id, description, quantity, unit_price, discount_percent, total, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [newId, item.product_id, item.description, item.quantity, item.unit_price, item.discount_percent, item.total, item.notes, index]
                    );
                });
            }
            
            const newProposal = queryOne('SELECT * FROM proposals WHERE id = ?', [newId]);
            sendJSON(res, { 
                success: true, 
                proposal: newProposal,
                message: 'Proposal duplicated successfully'
            }, 201);
            return;
        }

        // ============ IMAGE UPLOAD ============
        
        // POST /api/upload/image
        if (method === 'POST' && pathname === '/api/upload/image') {
            const user = requireAuth(req, res);
            if (!user) return;
            
            const contentType = req.headers['content-type'] || '';
            if (!contentType.includes('multipart/form-data')) {
                sendError(res, 'Content-Type must be multipart/form-data', 400);
                return;
            }
            
            try {
                const formData = await parseMultipartForm(req);
                
                if (!formData.file) {
                    sendError(res, 'No file uploaded', 400);
                    return;
                }
                
                const imageBuffer = formData.file;
                const ext = getImageExtension(imageBuffer);
                if (!ext) {
                    sendError(res, 'Invalid image format. Only PNG, JPG, JPEG, GIF, WebP are allowed', 400);
                    return;
                }
                
                const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
                const uploadDir = path.join(__dirname, 'product-image');
                
                // Create directory if not exists
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                
                const filePath = path.join(uploadDir, filename);
                fs.writeFileSync(filePath, imageBuffer);
                
                const imageUrl = `/product-image/${filename}`;
                sendJSON(res, { 
                    success: true, 
                    filename, 
                    url: imageUrl,
                    message: 'Image uploaded successfully'
                });
            } catch (e) {
                console.error('Upload error:', e);
                sendError(res, 'Upload failed: ' + e.message, 500);
            }
            return;
        }

        // ============ HEALTH CHECK ============
        
        if (pathname === '/health') {
            sendJSON(res, { status: 'ok', timestamp: new Date().toISOString() });
            return;
        }

        // API Documentation
        if (pathname === '/api' || pathname === '/api/') {
            sendJSON(res, {
                name: 'ATEX Proposal Generator API',
                version: '1.0.0',
                endpoints: {
                    auth: ['POST /api/auth/login', 'POST /api/auth/register', 'GET /api/auth/me'],
                    products: ['GET/POST /api/products', 'GET/PUT/DELETE /api/products/:id'],
                    customers: ['GET/POST /api/customers', 'PUT/DELETE /api/customers/:id'],
                    proposals: ['GET/POST /api/proposals', 'GET/PUT/DELETE /api/proposals/:id', 'PUT /api/proposals/:id/status'],
                    dashboard: ['GET /api/dashboard/stats']
                }
            });
            return;
        }

        sendError(res, 'Not found', 404);

    } catch (e) {
        console.error('Server error:', e.message);
        sendError(res, 'Server error', 500);
    }
});

// Initialize and start server
initDatabase().then(() => {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🚀 ATEX Server running at http://localhost:${PORT}`);
        console.log(`📚 API docs: http://localhost:${PORT}/api`);
        console.log(`🔐 Login: admin / admin123\n`);
    });
}).catch(err => {
    console.error('Failed to start:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    if (db) saveDatabase();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});