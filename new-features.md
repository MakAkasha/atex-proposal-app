# New Features Implementation Plan

**Version:** 2.0.0  
**Date:** January 2026  
**Status:** Implementation Plan

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [Database Schema Changes](#database-schema-changes)
3. [Number Series System](#number-series-system)
4. [API Endpoint Changes](#api-endpoint-changes)
5. [UI/UX Changes](#uiux-changes)
6. ["تعميد" (Send/Approve) Feature](#تعميد-sendapprove-feature)
7. [Client Preview Page](#client-preview-page)
8. [Settings Configuration](#settings-configuration)
9. [Implementation Steps](#implementation-steps)
10. [Testing Plan](#testing-plan)

---

## Feature Overview

This document outlines the implementation of three major features for the ATEX Q-System:

### 1. Custom Number Series System
- Auto-generated offer numbers in format: `{Prefix}-{YYMM}{Counter}`
- Example: `PO-2601001`
- Configurable prefix via Settings
- Auto-incrementing counter (no reset)

### 2. Rename "Proposals" → "Price Offers"
- Change all references from "Proposals" to "Price Offers" (عروض الأسعار)
- Update UI, API endpoints, and database references

### 3. Rename "Customers" → "Prospective Clients"
- Change all references from "Customers" to "Prospective Clients" (العملاء المحتملين)
- Update UI, API endpoints, and database references

### 4. "تعميد" (Send/Approve) Feature
- Download offer as PDF
- Generate shareable link for online preview
- Client can accept offer online
- Track acceptance status and timestamp

---

## Database Schema Changes

### New Columns for `proposals` Table

```sql
ALTER TABLE proposals ADD COLUMN share_token TEXT UNIQUE;
ALTER TABLE proposals ADD COLUMN accepted_at DATETIME;
ALTER TABLE proposals ADD COLUMN accepted_by TEXT;
```

**Column Descriptions:**

| Column | Type | Description |
|--------|------|-------------|
| `share_token` | TEXT | Unique token for client preview link (UUID) |
| `accepted_at` | DATETIME | Timestamp when client accepted the offer |
| `accepted_by` | TEXT | Client's name/email who accepted the offer |

### Indexes to Add

```sql
CREATE INDEX idx_proposals_share_token ON proposals(share_token);
CREATE INDEX idx_proposals_accepted_at ON proposals(accepted_at);
```

---

## Number Series System

### Number Format Specification

**Format:** `{Prefix}-{YYMM}{Counter}`

**Example:** `PO-2601001`

**Components:**

| Component | Description | Example |
|-----------|-------------|---------|
| `Prefix` | User-defined prefix (stored in localStorage) | PO, INV, OFFER |
| `YY` | Year (2 digits) | 26 = 2026 |
| `MM` | Month (2 digits) | 01 = January |
| `Counter` | Auto-incrementing number (3 digits) | 001, 002, 003 |

### Auto-Generation Logic

```javascript
function generateOfferNumber() {
    const now = new Date();
    const prefix = localStorage.getItem('atex_number_prefix') || 'PO';
    const counter = parseInt(localStorage.getItem('atex_number_counter') || '0') + 1;
    const year = now.getFullYear().toString().slice(-2); // YY
    const month = String(now.getMonth() + 1).padStart(2, '0'); // MM
    const counterStr = String(counter).padStart(3, '0'); // 001
    
    const offerNumber = `${prefix}-${year}${month}${counterStr}`;
    
    // Save new counter
    localStorage.setItem('atex_number_counter', counter.toString());
    
    return offerNumber;
}
```

### Number Series Configuration (localStorage)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `atex_number_prefix` | String | "PO" | Prefix for offer numbers |
| `atex_number_counter` | String | "0" | Current counter value |

### Examples

| Counter | Date | Generated Number |
|---------|------|------------------|
| 1 | Jan 2026 | PO-2601001 |
| 2 | Jan 2026 | PO-2601002 |
| 50 | Feb 2026 | PO-2602050 |
| 100 | Dec 2026 | PO-2612100 |

---

## API Endpoint Changes

### Renamed Endpoints

| Old Endpoint | New Endpoint | Description |
|--------------|--------------|-------------|
| `POST /api/customers` | `POST /api/prospects` | Create prospective client |
| `GET /api/customers` | `GET /api/prospects` | List all prospects |
| `GET /api/customers/:id` | `GET /api/prospects/:id` | Get single prospect |
| `PUT /api/customers/:id` | `PUT /api/prospects/:id` | Update prospect |
| `DELETE /api/customers/:id` | `DELETE /api/prospects/:id` | Delete prospect |
| `POST /api/proposals` | `POST /api/price-offers` | Create price offer |
| `GET /api/proposals` | `GET /api/price-offers` | List all price offers |
| `GET /api/proposals/:id` | `GET /api/price-offers/:id` | Get single price offer |
| `PUT /api/price-offers/:id` | `PUT /api/price-offers/:id` | Update price offer |
| `DELETE /api/price-offers/:id` | `DELETE /api/price-offers/:id` | Delete price offer |
| `PUT /api/proposals/:id/status` | `PUT /api/price-offers/:id/status` | Update offer status |
| `POST /api/proposals/:id/duplicate` | `POST /api/price-offers/:id/duplicate` | Duplicate price offer |
| `GET /api/proposals/:id/pdf` | `GET /api/price-offers/:id/pdf` | Export to PDF |

### New Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/price-offers/:id/share` | POST | Generate share token for client preview |
| `/preview/:token` | GET | Public client preview page |
| `/api/price-offers/:id/accept` | POST | Client accepts price offer |

---

## UI/UX Changes

### Navigation Menu Updates

| Old Text | New Text (Arabic) |
|----------|-------------------|
| لوحة التحكم | لوحة التحكم |
| العروض | عروض الأسعار |
| العملاء | العملاء المحتملين |
| المنتجات | المنتجات |
| إنشاء عرض | إنشاء عرض سعر |
| الإعدادات | الإعدادات |

### Page Titles Updates

| Old Title | New Title (Arabic) |
|-----------|-------------------|
| إدارة العروض | إدارة عروض الأسعار |
| إدارة العملاء | إدارة العملاء المحتملين |
| إنشاء عرض جديد | إنشاء عرض سعر جديد |

### Button Labels Updates

| Old Label | New Label (Arabic) |
|-----------|-------------------|
| عرض جديد | عرض سعر جديد |
| إضافة عميل | إضافة عميل محتمل |
| تعديل العميل | تعديل العميل المحتمل |
| حذف العميل | حذف العميل المحتمل |

### Sidebar Icons Updates

No changes to icons, only text labels.

---

## "تعميد" (Send/Approve) Feature

### Workflow

1. **User clicks "تعميد" button** on a price offer
2. **Modal opens** with two options:
   - 📥 Download as PDF
   - 🔗 Share for Online Preview
3. **User selects option:**
   - **Option A (PDF):** Download PDF file
   - **Option B (Share):** Generate unique share link
4. **For Share Option:**
   - System generates unique share token
   - Display shareable link: `http://yourdomain.com/preview/{token}`
   - User can copy link or share directly
   - Client views offer online without login
   - Client can click "Accept Offer" button
   - System records acceptance with timestamp

### Modal Structure

```html
<div class="modal-overlay" id="approveModal">
    <div class="modal">
        <div class="modal-header">
            <h3 class="modal-title">تعميد العرض</h3>
            <button class="modal-close" onclick="closeModal('approveModal')">&times;</button>
        </div>
        <div class="modal-body">
            <p>اختر طريقة إرسال العرض للعميل:</p>
            <div class="form-group">
                <label class="form-label">📥 تنزيل PDF</label>
                <p class="text-sm text-muted">تنزيل ملف PDF للعرض وإرساله يدوياً</p>
                <button class="btn btn-primary" onclick="downloadOfferPDF()">تنزيل PDF</button>
            </div>
            <div class="form-group">
                <label class="form-label">🔗 مشاركة للمعاينة عبر الإنترنت</label>
                <p class="text-sm text-muted">إنشاء رابط مشترك يمكن للعميل منه معاينة وقبول العرض</p>
                <button class="btn btn-primary" onclick="generateShareLink()">إنشاء رابط مشاركة</button>
            </div>
            <div id="shareLinkContainer" class="hidden">
                <div class="form-group">
                    <label class="form-label">رابط المعاينة:</label>
                    <input type="text" class="form-input" id="shareLink" readonly>
                    <button class="btn btn-secondary" onclick="copyShareLink()">نسخ الرابط</button>
                </div>
                <div id="acceptanceStatus" class="hidden">
                    <div class="alert alert-success">
                        ✓ تم قبول العرض من قبل العميل
                        <br>
                        <small>تم القبول في: <span id="acceptedAt"></span></small>
                        <br>
                        <small>من قبل: <span id="acceptedBy"></span></small>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
```

---

## Client Preview Page

### Page Structure

**URL:** `/preview/:token`

**Components:**

1. **Header**
   - ATEX Logo
   - Offer Number
   - Date

2. **Client Info**
   - Client Name
   - Company (if applicable)

3. **Offer Details**
   - Products table with images
   - Quantities and prices
   - Subtotal, discount, tax, total

4. **Accept Action**
   - "Accept Offer" button (only shown if not yet accepted)
   - Form to enter name/email (optional)
   - Acceptance confirmation message

### Acceptance Flow

```javascript
// Client clicks "Accept Offer" button
async function acceptOffer(token) {
    const name = prompt('أدخل اسمك:');
    const email = prompt('أدخل بريدك الإلكتروني:');
    
    const response = await fetch(`/api/price-offers/accept/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
    });
    
    if (response.success) {
        // Show success message
        // Disable accept button
        // Display acceptance info
    }
}
```

### Security

- Read-only access (no login required)
- Cannot modify offer data
- Can only accept once per offer
- Token-based authentication
- Expires after 30 days (optional)

---

## Settings Configuration

### New Section: Number Series

**Location:** Settings → Number Series (Number Series / ترقيم العروض)

**Form Fields:**

```html
<div class="settings-card">
    <div class="settings-card-header">
        <h3 class="settings-card-title">ترقيم العروض</h3>
        <p class="settings-card-description">تكوين تنسيق أرقام عروض الأسعار</p>
    </div>
    <div class="settings-card-content">
        <div class="form-group">
            <label class="form-label">البادئة (Prefix)</label>
            <input type="text" class="form-input" id="numberPrefix" value="PO">
            <p class="text-sm text-muted">مثال: PO, INV, OFFER</p>
        </div>
        <div class="form-group">
            <label class="form-label">العداد الحالي</label>
            <input type="text" class="form-input" id="numberCounter" value="1" readonly>
            <p class="text-sm text-muted">يتم زيادة العداد تلقائياً مع كل عرض جديد</p>
        </div>
        <div class="form-group">
            <label class="form-label">مثال الرقم</label>
            <div class="form-input" style="background: var(--muted);">
                PO-2601001
            </div>
            <p class="text-sm text-muted">
                البادئة + السنة والشهر + العداد<br>
                PO + 2601 + 001
            </p>
        </div>
        <button class="btn btn-danger" onclick="resetNumberCounter()">
            إعادة تعيين العداد
        </button>
        <button class="btn btn-primary" onclick="saveNumberSettings()">
            حفظ التغييرات
        </button>
    </div>
</div>
```

### Number Series Settings (localStorage)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `atex_number_prefix` | String | "PO" | Prefix for offer numbers |
| `atex_number_counter` | String | "0" | Current counter value |

### Reset Counter Function

```javascript
function resetNumberCounter() {
    if (confirm('هل أنت متأكد من إعادة تعيين العداد؟ سيبدأ من 1 مرة أخرى.')) {
        localStorage.setItem('atex_number_counter', '0');
        showNotification('تم إعادة تعيين العداد بنجاح', 'success');
        document.getElementById('numberCounter').value = '1';
    }
}
```

---

## Implementation Steps

### Phase 1: Documentation & Backup

- [ ] Create `new-features.md` documentation (this file)
- [ ] Commit current changes to git
- [ ] Push current version to GitHub (backup)

### Phase 2: Database Schema Updates

- [ ] Add `share_token` column to `proposals` table
- [ ] Add `accepted_at` column to `proposals` table
- [ ] Add `accepted_by` column to `proposals` table
- [ ] Create index on `share_token`
- [ ] Create index on `accepted_at`

### Phase 3: Backend API Updates

- [ ] Update endpoint: `/api/customers` → `/api/prospects`
- [ ] Update endpoint: `/api/proposals` → `/api/price-offers`
- [ ] Add endpoint: `POST /api/price-offers/:id/share`
- [ ] Add endpoint: `POST /api/price-offers/:id/accept`
- [ ] Update dashboard stats queries
- [ ] Add proposal number generation logic with YYMM format

### Phase 4: Frontend UI Updates

- [ ] Update navigation menu: "العروض" → "عروض الأسعار"
- [ ] Update navigation menu: "العملاء" → "العملاء المحتملين"
- [ ] Update all page titles
- [ ] Update all button labels
- [ ] Update all form labels
- [ ] Update all table headers

### Phase 5: Number Series Feature

- [ ] Create "Number Series" settings section in Settings
- [ ] Add prefix configuration input
- [ ] Add counter display (read-only)
- [ ] Add reset counter button
- [ ] Implement `generateOfferNumber()` function
- [ ] Implement auto-increment logic
- [ ] Update offer creation to use custom numbering
- [ ] Test number generation with various dates

### Phase 6: "تعميد" Modal

- [ ] Create "تعميد" modal HTML
- [ ] Add modal to offers list page
- [ ] Add download PDF option
- [ ] Add share link option
- [ ] Implement share link generation
- [ ] Implement share link copy functionality
- [ ] Show acceptance status in modal

### Phase 7: Client Preview Page

- [ ] Create `/preview/:token` route in server
- [ ] Create client preview page HTML
- [ ] Implement token validation
- [ ] Add offer display (read-only)
- [ ] Add "Accept Offer" button
- [ ] Add accept form (name/email)
- [ ] Implement accept API call
- [ ] Add success message display

### Phase 8: Testing & Verification

- [ ] Test number series generation
- [ ] Test all renamed endpoints
- [ ] Test "تعميد" modal functionality
- [ ] Test share link generation
- [ ] Test client preview page
- [ ] Test offer acceptance flow
- [ ] Test counter auto-increment
- [ ] Test counter reset

### Phase 9: Deployment

- [ ] Commit all changes to git
- [ ] Create comprehensive commit message
- [ ] Push to GitHub
- [ ] Test on production server
- [ ] Verify all features work correctly

---

## Testing Plan

### Test Case 1: Number Series Generation

**Steps:**
1. Open Settings → Number Series
2. Set prefix to "TEST"
3. Reset counter to 0
4. Create new price offer
5. Verify number format: `TEST-2601001`
6. Create second offer
7. Verify number format: `TEST-2601002`

**Expected Results:**
- Numbers follow format: `{Prefix}-{YYMM}{Counter}`
- Counter auto-increments correctly
- YYMM matches current date

### Test Case 2: Renamed Endpoints

**Steps:**
1. Try to access `/api/customers` (should fail or redirect)
2. Access `/api/prospects` (should work)
3. Try to access `/api/proposals` (should fail or redirect)
4. Access `/api/price-offers` (should work)

**Expected Results:**
- Old endpoints no longer work
- New endpoints function correctly
- All CRUD operations work with new endpoints

### Test Case 3: "تعميد" Modal - PDF Download

**Steps:**
1. Open price offer details
2. Click "تعميد" button
3. Select "Download PDF"
4. Verify PDF downloads correctly
5. Verify offer number appears in PDF

**Expected Results:**
- Modal opens with options
- PDF downloads successfully
- PDF includes correct offer number and format

### Test Case 4: "تعميد" Modal - Share Link

**Steps:**
1. Open price offer details
2. Click "تعميد" button
3. Select "Share for Online Preview"
4. Click "Create Share Link"
5. Copy the share link
6. Open link in incognito/private browser
7. Verify preview page loads
8. Click "Accept Offer"
9. Enter name and email
10. Verify acceptance recorded

**Expected Results:**
- Share link generated correctly
- Preview page loads without login
- Offer displays correctly
- Acceptance button works
- Acceptance recorded in database
- Status updated in original offer

### Test Case 5: Counter Reset

**Steps:**
1. Create 5 price offers (counter: 001-005)
2. Open Settings → Number Series
3. Click "Reset Counter"
4. Confirm reset
5. Create new price offer
6. Verify number: `PO-2601001`

**Expected Results:**
- Counter resets to 1
- New offer gets number ending with 001
- Previous offers unaffected

### Test Case 6: UI Renaming

**Steps:**
1. Check navigation menu items
2. Check page titles
3. Check button labels
4. Check form labels
5. Check table headers
6. Check all Arabic text

**Expected Results:**
- "Proposals" → "عروض الأسعار"
- "Customers" → "العملاء المحتملين"
- All instances renamed correctly
- No old text remains

---

## Rollback Plan

If issues occur after deployment:

1. **Git Rollback:**
   ```bash
   git log --oneline
   git checkout <previous-commit-hash>
   ```

2. **Database Rollback:**
   ```sql
   ALTER TABLE proposals DROP COLUMN share_token;
   ALTER TABLE proposals DROP COLUMN accepted_at;
   ALTER TABLE proposals DROP COLUMN accepted_by;
   ```

3. **Endpoint Rollback:**
   - Restore old server.js from git
   - Rename endpoints back to original

---

## Success Criteria

- ✅ All proposals renamed to "Price Offers"
- ✅ All customers renamed to "Prospective Clients"
- ✅ Number series works with format: `{Prefix}-{YYMM}{Counter}`
- ✅ Counter auto-increments without reset
- ✅ "تعميد" modal works for PDF download
- ✅ Share link generation works correctly
- ✅ Client preview page loads without login
- ✅ Client can accept offer online
- ✅ Acceptance is tracked and recorded
- ✅ All tests pass
- ✅ No breaking changes
- ✅ Git backup created and pushed

---

**Last Updated:** January 19, 2026  
**Document Version:** 1.0  
**Author:** ATEX Development Team