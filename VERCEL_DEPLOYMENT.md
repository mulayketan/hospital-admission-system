# 🚀 Vercel Deployment Guide

## Hospital Admission System - Zawar Hospital

This guide will help you deploy the Hospital Admission System to Vercel with Google Sheets as the database.

---

## 📋 Prerequisites

### 1. **Vercel Account**
- Create a free account at [vercel.com](https://vercel.com)
- Install Vercel CLI: `npm i -g vercel`

### 2. **Google Cloud Project Setup**
- Follow the complete setup in `GOOGLE_SHEETS_SETUP.md`
- Ensure you have:
  - Google Sheets ID
  - Service Account JSON key
  - Sheets properly initialized with data

### 3. **Repository**
- Push your code to GitHub/GitLab/Bitbucket
- Ensure all files are committed

---

## 🔧 Environment Variables Setup

### **Required Environment Variables for Vercel:**

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_SHEETS_ID` | Your Google Sheet ID | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Complete JSON service account key | `{"type":"service_account",...}` |
| `NEXTAUTH_SECRET` | Random secret for NextAuth | `your-super-secret-key-here` |
| `NEXTAUTH_URL` | Your production URL | `https://your-app.vercel.app` |
| `DEFAULT_ADMIN_EMAIL` | Default admin email | `admin@zawarhospital.com` |
| `DEFAULT_ADMIN_PASSWORD` | Default admin password | `SecurePassword123!` |

---

## 🚀 Deployment Steps

### **Step 1: Connect Repository to Vercel**

1. **Login to Vercel Dashboard**
   ```bash
   vercel login
   ```

2. **Import Project**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Select "Hospital Admission System" repository

### **Step 2: Configure Project Settings**

1. **Framework Detection**
   - Vercel should auto-detect Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

2. **Environment Variables**
   - In Vercel Dashboard → Project → Settings → Environment Variables
   - Add all required variables from the table above

### **Step 3: Add Environment Variables**

#### **Method 1: Vercel Dashboard (Recommended)**

1. Go to your project in Vercel Dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable:

```bash
# Google Sheets Configuration
GOOGLE_SHEETS_ID = 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms

# Service Account Key (paste entire JSON)
GOOGLE_SERVICE_ACCOUNT_KEY = {"type":"service_account","project_id":"your-project",...}

# NextAuth Configuration  
NEXTAUTH_SECRET = your-super-secret-key-here-make-it-long-and-random
NEXTAUTH_URL = https://your-app-name.vercel.app

# Default Admin Credentials
DEFAULT_ADMIN_EMAIL = admin@zawarhospital.com
DEFAULT_ADMIN_PASSWORD = SecurePassword123!
```

#### **Method 2: Vercel CLI**

```bash
# Navigate to your project directory
cd /path/to/AdmissionPaper

# Add environment variables
vercel env add GOOGLE_SHEETS_ID
vercel env add GOOGLE_SERVICE_ACCOUNT_KEY
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
vercel env add DEFAULT_ADMIN_EMAIL
vercel env add DEFAULT_ADMIN_PASSWORD
```

### **Step 4: Deploy**

#### **Option A: Automatic Deployment (GitHub Integration)**
- Push to your main branch
- Vercel will automatically deploy

#### **Option B: Manual Deployment**
```bash
# Deploy from local machine
vercel --prod
```

---

## ⚙️ Configuration Details

### **Vercel Configuration (`vercel.json`)**

```json
{
  "framework": "nextjs",
  "regions": ["bom1"],
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "nodejs18.x",
      "maxDuration": 30
    }
  },
  "env": {
    "GOOGLE_SHEETS_ID": "@google_sheets_id",
    "GOOGLE_SERVICE_ACCOUNT_KEY": "@google_service_account_key",
    "NEXTAUTH_SECRET": "@nextauth_secret",
    "NEXTAUTH_URL": "@nextauth_url",
    "DEFAULT_ADMIN_EMAIL": "@default_admin_email",
    "DEFAULT_ADMIN_PASSWORD": "@default_admin_password"
  }
}
```

### **Next.js Configuration (`next.config.js`)**

- **Standalone Output**: Optimized for serverless
- **Puppeteer Optimization**: External package handling
- **Environment Variables**: Proper exposure
- **Webpack Configuration**: Serverless optimization

---

## 🔒 Security Considerations

### **Environment Variables Security:**
- ✅ **Never commit `.env` files**
- ✅ **Use Vercel's encrypted environment variables**
- ✅ **Rotate secrets regularly**
- ✅ **Use strong passwords for admin accounts**

### **Google Service Account Security:**
- ✅ **Limit service account permissions**
- ✅ **Use dedicated service account for production**
- ✅ **Monitor API usage**
- ✅ **Enable audit logging**

---

## 🧪 Testing Deployment

### **1. Pre-Deployment Testing**
```bash
# Test build locally
npm run build
npm start

# Test environment variables
npm run check:env
```

### **2. Post-Deployment Verification**

1. **Access Application**
   - Visit your Vercel URL: `https://your-app.vercel.app`
   - Should see login page

2. **Test Authentication**
   - Login with default admin credentials
   - Verify dashboard loads

3. **Test Core Features**
   - Create a test patient admission
   - Generate PDF
   - Test user management (if admin)
   - Verify Google Sheets integration

4. **Test API Endpoints**
   ```bash
   # Test API health
   curl https://your-app.vercel.app/api/patients
   ```

---

## 🔧 Troubleshooting

### **Common Issues:**

#### **1. Environment Variables Not Loading**
```bash
# Check Vercel environment variables
vercel env ls

# Pull environment variables locally for testing
vercel env pull .env.local
```

#### **2. Google Sheets API Errors**
- Verify service account has access to the sheet
- Check Google Cloud Console for API quotas
- Ensure service account key is valid JSON

#### **3. Build Failures**
```bash
# Check build logs in Vercel Dashboard
# Common fixes:
npm install --legacy-peer-deps
```

#### **4. Puppeteer Issues**
- Puppeteer is configured as external package
- PDF generation should work on Vercel
- Check function timeout limits (30s max)

#### **5. NextAuth Issues**
- Ensure `NEXTAUTH_URL` matches your domain
- Verify `NEXTAUTH_SECRET` is set
- Check callback URLs

---

## 📊 Performance Optimization

### **Vercel Optimizations Applied:**
- ✅ **Standalone Output**: Faster cold starts
- ✅ **External Packages**: Puppeteer optimization
- ✅ **Function Timeout**: 30s for PDF generation
- ✅ **Regional Deployment**: Mumbai region (bom1)
- ✅ **Node.js 18.x**: Latest stable runtime

### **Monitoring:**
- Use Vercel Analytics for performance monitoring
- Monitor function execution times
- Track Google Sheets API usage

---

## 🎯 Production Checklist

### **Before Going Live:**

- [ ] **Environment Variables**: All set in Vercel
- [ ] **Google Sheets**: Properly configured and accessible
- [ ] **Admin Account**: Default credentials changed
- [ ] **Domain**: Custom domain configured (optional)
- [ ] **SSL**: Enabled (automatic with Vercel)
- [ ] **Monitoring**: Error tracking setup
- [ ] **Backup**: Google Sheets backup strategy
- [ ] **Testing**: All features tested in production

### **Post-Deployment:**

- [ ] **User Training**: Train hospital staff
- [ ] **Documentation**: Share user guides
- [ ] **Support**: Establish support process
- [ ] **Updates**: Plan for future updates
- [ ] **Security**: Regular security reviews

---

## 🆘 Support

### **Deployment Issues:**
1. Check Vercel Dashboard logs
2. Verify environment variables
3. Test Google Sheets connectivity
4. Review build logs

### **Application Issues:**
1. Check browser console for errors
2. Verify API responses
3. Test with different browsers
4. Check mobile compatibility

---

## 🎉 Success!

Once deployed, your Hospital Admission System will be available at:
**`https://your-app-name.vercel.app`**

### **Key Features Available:**
- ✅ **Patient Admission Management**
- ✅ **Bilingual PDF Generation**
- ✅ **User Management (Admin)**
- ✅ **Google Sheets Database**
- ✅ **Secure Authentication**
- ✅ **Responsive Design**
- ✅ **Real-time Updates**

**Your hospital staff can now access the system from anywhere with internet connectivity!** 🏥✨
