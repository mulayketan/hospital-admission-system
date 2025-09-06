# 📊 Google Sheets Migration Guide

This guide will help you migrate your Hospital Admission System from PostgreSQL to Google Sheets.

## 🚀 **Step 1: Create Google Cloud Project**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google Sheets API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

## 🔑 **Step 2: Create Service Account**

1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Fill in details:
   - **Name**: `hospital-sheets-service`
   - **Description**: `Service account for hospital admission system`
4. Click "Create and Continue"
5. Grant roles (optional): You can skip this step
6. Click "Done"

## 📋 **Step 3: Generate Service Account Key**

1. Click on your newly created service account
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key"
4. Select "JSON" format
5. Download the JSON file
6. **Keep this file secure!**

## 📊 **Step 4: Create Google Sheet**

1. Go to [Google Sheets](https://sheets.google.com/)
2. Create a new blank spreadsheet
3. Rename it to: `Hospital Admission System`
4. Copy the **Sheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/1WghaoNSVuxcNQ98n1B5c4Ve6cWjW-orYzttPaklwi8M/edit
   ```

## 🔗 **Step 5: Share Sheet with Service Account**

1. In your Google Sheet, click "Share" button
2. Add the service account email (from the JSON file):
   ```
   your-service-account@project-name.iam.gserviceaccount.com
   ```
3. Give it **Editor** permissions
4. Click "Send"

## ⚙️ **Step 6: Configure Environment Variables**

1. Copy your current `.env` file:
   ```bash
   cp .env .env.backup
   ```

2. Update your `.env` file with Google Sheets configuration:
   ```env
   # Google Sheets Configuration
   GOOGLE_SHEETS_ID="your-sheet-id-from-step-4"
   GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project-id",...}'
   
   # NextAuth (keep existing)
   NEXTAUTH_SECRET="your-secret-key-here"
   NEXTAUTH_URL="http://localhost:3000"
   
   # Default Admin Credentials (keep existing)
   DEFAULT_ADMIN_EMAIL="admin@hospital.com"
   DEFAULT_ADMIN_PASSWORD="admin123"
   ```

   **Note**: The `GOOGLE_SERVICE_ACCOUNT_KEY` should be the entire JSON content from Step 3, on a single line.

## 🏗️ **Step 7: Install Dependencies**

The required dependencies are already installed. If you need to reinstall:

```bash
npm install googleapis
```

## 🎯 **Step 8: Initialize Google Sheets Structure**

Run the setup script to create the proper sheet structure:

```bash
npx tsx scripts/setup-sheets.ts
```

This will:
- Create 4 tabs in your Google Sheet: Users, Patients, WardCharges, Admissions
- Add proper headers to each sheet
- Create default admin and staff users
- Add sample patient data
- Initialize ward charges

## 🧪 **Step 9: Test the Migration**

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:3000

3. Try logging in with default credentials:
   - **Admin**: admin@hospital.com / admin123
   - **Staff**: staff@hospital.com / staff123

4. Test patient operations:
   - Search for patients
   - Create new patient
   - Generate PDF
   - Delete patient

## 📊 **Step 10: Verify Google Sheets**

Check your Google Sheet to see:

### **Users Tab**:
| id | email | password | name | role | createdAt | updatedAt |
|----|-------|----------|------|------|-----------|-----------|
| ... | admin@hospital.com | [hashed] | Administrator | ADMIN | ... | ... |

### **Patients Tab**:
| id | ipdNo | firstName | middleName | surname | phoneNo | age | sex | ... |
|----|-------|-----------|------------|---------|---------|-----|-----|-----|
| ... | IPD001 | राम | विष्णू | शर्मा | 9876543210 | 45 | M | ... |

### **WardCharges Tab**:
| id | wardType | bedCharges | doctorCharges | nursingCharges | ... |
|----|----------|------------|---------------|----------------|-----|
| ward1 | GENERAL | 800 | 400 | 300 | ... |

## 🗑️ **Step 11: Remove PostgreSQL Dependencies (Optional)**

Once everything is working, you can remove PostgreSQL:

```bash
# Remove Prisma and PostgreSQL packages
npm uninstall prisma @prisma/client pg @types/pg

# Remove Prisma files
rm -rf prisma/
rm -f lib/db.ts
```

## 🔧 **Troubleshooting**

### **Authentication Errors**
- Verify service account JSON is correctly formatted in `.env`
- Check that the sheet is shared with the service account email
- Ensure Google Sheets API is enabled

### **Sheet Not Found**
- Verify the `GOOGLE_SHEETS_ID` in your `.env` file
- Make sure the sheet exists and is accessible

### **Permission Errors**
- Ensure service account has Editor permissions on the sheet
- Check that the service account email is correct

### **API Quota Exceeded**
- Google Sheets API has usage limits
- For production, consider implementing caching or request batching

## 🎉 **Benefits of Google Sheets Migration**

✅ **Easy Collaboration**: Multiple staff can view/edit data directly in Google Sheets  
✅ **No Database Setup**: No need for PostgreSQL installation or maintenance  
✅ **Automatic Backups**: Google Drive handles backups automatically  
✅ **Real-time Updates**: Changes in sheets reflect immediately in your app  
✅ **Cost Effective**: No database hosting costs  
✅ **Familiar Interface**: Staff can use familiar spreadsheet interface  

## 📈 **Scaling Considerations**

- **Data Limits**: Google Sheets supports up to 5 million cells
- **API Limits**: 300 requests per minute per project
- **Concurrent Users**: Best for small to medium teams (< 50 users)
- **Performance**: Suitable for < 10,000 patient records

For larger scale operations, consider hybrid approach or dedicated database.

## 🆘 **Support**

If you encounter issues:

1. Check the console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test the Google Sheets API connection independently
4. Ensure proper permissions are set

---

**🎯 Your Hospital Admission System is now powered by Google Sheets!**
