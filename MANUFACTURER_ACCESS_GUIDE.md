# 🎯 How to Access Manufacturer Dashboard

Your Green Passport Platform is live on AWS! Here's how to access the manufacturer dashboard.

---

## 🌐 Live Application URL

```
http://gp-frontend-prod-2026.s3-website-us-east-1.amazonaws.com
```

---

## 📍 Access Points

### 1. **Manufacturer Login Page**
```
http://gp-frontend-prod-2026.s3-website-us-east-1.amazonaws.com/login
```

### 2. **Manufacturer Dashboard** (after login)
```
http://gp-frontend-prod-2026.s3-website-us-east-1.amazonaws.com/dashboard
```

### 3. **Consumer Landing Page** (current page)
```
http://gp-frontend-prod-2026.s3-website-us-east-1.amazonaws.com/
```

---

## 🔑 Login Credentials

```
Email:    manufacturer@greenpassport.com
Password: Test123!
```

---

## 🚀 Step-by-Step Guide

### Step 1: Go to Login Page
Open this URL in your browser:
```
http://gp-frontend-prod-2026.s3-website-us-east-1.amazonaws.com/login
```

### Step 2: Enter Credentials
- **Email:** manufacturer@greenpassport.com
- **Password:** Test123!

### Step 3: Click Sign In
You'll be redirected to the manufacturer dashboard.

### Step 4: Access Dashboard Features
Once logged in, you can access:
- **Dashboard** - View statistics and activity
- **Create DPP** - Create new digital product passports
- **Products** - View and manage all products
- **QR Management** - Generate and download QR codes
- **Settings** - Update manufacturer profile

---

## 📱 All Available Routes

### Public Routes (No Login Required)
```
/                    - Consumer landing page (current)
/product/:serialId   - View specific product details
/login               - Manufacturer login page
```

### Protected Routes (Login Required)
```
/dashboard           - Manufacturer dashboard
/create-dpp          - Create new product
/products            - View all products
/qr-management       - Generate QR codes
/auditor             - Auditor view
/settings            - Manufacturer settings
```

---

## 🎯 Quick Navigation

### From Consumer Page to Manufacturer Dashboard

**Option 1: Direct URL**
1. Copy this URL: `http://gp-frontend-prod-2026.s3-website-us-east-1.amazonaws.com/login`
2. Paste in browser address bar
3. Press Enter
4. Login with credentials above

**Option 2: Using Navigation**
1. Look for a "Login" or "Manufacturer" link on the consumer page
2. Click it to go to login page
3. Login with credentials above

---

## 🔐 Authentication Flow

1. **User enters credentials** on `/login` page
2. **Cognito authenticates** the user
3. **JWT token is generated** and stored
4. **User is redirected** to `/dashboard`
5. **Protected routes** verify JWT token
6. **Dashboard loads** with user data

---

## 📊 Manufacturer Dashboard Features

### Dashboard Page (`/dashboard`)
- View product statistics
- See recent activity
- Monitor system status
- Quick access to all features

### Create DPP Page (`/create-dpp`)
- Multi-step product creation form
- Add product information
- Define lifecycle stages
- Calculate carbon footprint
- Generate QR codes

### Products Page (`/products`)
- View all products
- Filter and search
- Edit product details
- Delete products
- View product analytics

### QR Management Page (`/qr-management`)
- Generate QR codes for products
- Download QR codes
- Batch QR generation
- QR code management

### Settings Page (`/settings`)
- Update manufacturer profile
- Change company information
- Manage account settings
- View account details

---

## 🧪 Testing the Application

### Test Consumer View
1. Open: `http://gp-frontend-prod-2026.s3-website-us-east-1.amazonaws.com/`
2. Scan QR code or enter serial number
3. View product details

### Test Manufacturer View
1. Open: `http://gp-frontend-prod-2026.s3-website-us-east-1.amazonaws.com/login`
2. Login with credentials
3. Create new products
4. Generate QR codes
5. View dashboard

---

## 🔗 API Integration

### Frontend to Backend Connection
- **Frontend URL:** http://gp-frontend-prod-2026.s3-website-us-east-1.amazonaws.com
- **API Gateway:** https://325xzv9pli.execute-api.us-east-1.amazonaws.com/prod
- **Authentication:** Cognito JWT tokens
- **Database:** DynamoDB

### API Endpoints Used
```
POST   /products              - Create new product
GET    /products              - List all products
GET    /products/{productId}  - Get product details
PUT    /products/{productId}  - Update product
POST   /qr/generate           - Generate QR codes
POST   /calculate/emission    - Calculate carbon footprint
GET    /manufacturer          - Get manufacturer profile
PUT    /manufacturer          - Update manufacturer profile
GET    /verify/{serialId}     - Verify product (public)
```

---

## 🐛 Troubleshooting

### Can't Access Login Page
1. Check URL: `http://gp-frontend-prod-2026.s3-website-us-east-1.amazonaws.com/login`
2. Clear browser cache (Ctrl+Shift+R)
3. Try incognito/private mode

### Login Fails
1. Verify credentials are correct
2. Check browser console for errors (F12)
3. Verify API Gateway is accessible
4. Check internet connection

### Dashboard Not Loading
1. Verify you're logged in
2. Check browser console for errors
3. Verify JWT token is valid
4. Try refreshing the page

### API Calls Failing
1. Check network tab in browser (F12)
2. Verify API Gateway endpoint is correct
3. Check JWT token is included
4. Verify CORS is enabled

---

## 📈 System Status

| Component | Status | Details |
|-----------|--------|---------|
| **Frontend** | 🟢 LIVE | S3 Website |
| **API** | 🟢 OPERATIONAL | API Gateway |
| **Database** | 🟢 ACTIVE | DynamoDB |
| **Auth** | 🟢 READY | Cognito |

---

## 🎉 You're All Set!

Your Green Passport Platform is ready to use!

### Quick Links
- **Consumer Page:** http://gp-frontend-prod-2026.s3-website-us-east-1.amazonaws.com/
- **Login Page:** http://gp-frontend-prod-2026.s3-website-us-east-1.amazonaws.com/login
- **Dashboard:** http://gp-frontend-prod-2026.s3-website-us-east-1.amazonaws.com/dashboard

### Credentials
- **Email:** manufacturer@greenpassport.com
- **Password:** Test123!

---

**Status:** ✅ LIVE AND OPERATIONAL  
**Ready for:** Production Use, Testing, Demo

Start creating products and managing your digital product passports! 🚀

