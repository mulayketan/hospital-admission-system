# Hospital Admission Management System

A comprehensive web application for managing patient admissions at Zawar Hospital, featuring bilingual support (English/Marathi), PDF generation, and secure authentication.

## 🏥 Features

### Core Functionality
- **Patient Registration & Admission**: Complete patient intake with all required fields
- **Bilingual Support**: Full English and Marathi language support
- **PDF Generation**: Automatic generation of admission forms in both languages
- **Patient Search**: Advanced search and prefill functionality for returning patients
- **User Management**: Admin and staff role management
- **Secure Authentication**: Protected routes with role-based access control

### Technical Features
- **Modern Tech Stack**: Next.js 14, TypeScript, Google Sheets API
- **Responsive Design**: Mobile-friendly interface using Tailwind CSS
- **Real-time Validation**: Form validation with immediate feedback
- **Professional PDF Output**: Pixel-perfect admission forms matching hospital templates
- **Cloud Database**: Google Sheets integration for easy data management
- **Production Ready**: Optimized for Vercel deployment

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Google Cloud Project with Sheets API enabled
- npm or yarn

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AdmissionPaper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup Google Sheets**
   - Follow the complete guide in `GOOGLE_SHEETS_SETUP.md`
   - Create service account and download JSON key
   - Create Google Sheet and note the ID

4. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Update `.env.local` with your configuration:
   ```env
   GOOGLE_SHEETS_ID="your-google-sheet-id"
   GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
   NEXTAUTH_SECRET="your-secret-key-here"
   NEXTAUTH_URL="http://localhost:3000"
   DEFAULT_ADMIN_EMAIL="admin@hospital.com"
   DEFAULT_ADMIN_PASSWORD="admin123"
   ```

5. **Initialize Google Sheets**
   ```bash
   npm run setup:sheets
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Access the application**
   - Open [http://localhost:3000](http://localhost:3000)
   - Login with: `admin@hospital.com` / `admin123`

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Test Coverage
- **Component Tests**: Form validation, user interactions, language switching
- **API Tests**: CRUD operations, authentication, error handling
- **PDF Generation Tests**: Template rendering, data inclusion, language support
- **Integration Tests**: End-to-end user workflows

## 📋 Usage Guide

### For Receptionists

1. **Adding New Patients**
   - Click "Registration cum Admission" tab
   - Fill in patient details (all required fields marked)
   - Ward charges are automatically calculated
   - Submit to save and generate IPD number

2. **Finding Existing Patients**
   - Use the search bar to find patients by name, phone, or IPD number
   - Click on search results to prefill the form
   - Update information as needed

3. **Language Support**
   - Toggle between English and मराठी using the language button
   - All forms and PDFs support both languages

4. **PDF Generation**
   - Access "Patient Records" tab
   - Click "PDF" button for English version
   - Click "मराठी" button for Marathi version

### For Administrators

1. **User Management**
   - Access "User Management" tab (admin only)
   - Add new staff members with appropriate roles
   - Manage user permissions

2. **System Administration**
   - Monitor patient records
   - Export data for reporting
   - Manage system settings

## 🏗️ Architecture

### Frontend
- **Next.js 14**: App Router, Server Components
- **TypeScript**: Type safety throughout
- **Tailwind CSS**: Utility-first styling
- **React Hook Form**: Form state management
- **Zod**: Runtime type validation
- **Radix UI**: Accessible component primitives

### Backend
- **Next.js API Routes**: RESTful API endpoints
- **Prisma ORM**: Type-safe database operations
- **PostgreSQL**: Reliable data storage
- **NextAuth.js**: Authentication system
- **bcryptjs**: Password hashing

### PDF Generation
- **Puppeteer**: Headless browser PDF generation
- **Custom HTML Templates**: Pixel-perfect form reproduction
- **Font Support**: Marathi Devanagari fonts included

## 🚀 Deployment to Vercel

### Automatic Deployment

1. **Connect to Vercel**
   ```bash
   npx vercel
   ```

2. **Set Environment Variables in Vercel Dashboard**
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `NEXTAUTH_SECRET`: Random secret for session encryption
   - `NEXTAUTH_URL`: Your production URL

3. **Deploy**
   ```bash
   npm run build
   vercel --prod
   ```

### Database Setup for Production

1. **Create PostgreSQL Database**
   - Use services like Neon, Supabase, or Railway
   - Get the connection string

2. **Run Migrations**
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

### Environment Variables for Production
```env
DATABASE_URL="postgresql://user:password@host:5432/database"
NEXTAUTH_SECRET="your-production-secret"
NEXTAUTH_URL="https://your-app.vercel.app"
```

## 📁 Project Structure

```
AdmissionPaper/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Main application pages
│   ├── login/            # Authentication pages
│   ├── globals.css       # Global styles
│   └── layout.tsx        # Root layout
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── admission-form.tsx # Main admission form
│   ├── patient-list.tsx  # Patient management
│   └── user-management.tsx # Admin panel
├── lib/                   # Utility libraries
│   ├── auth.ts           # Authentication config
│   ├── db.ts             # Database connection
│   ├── pdf-generator.ts  # PDF generation
│   ├── translations.ts   # Bilingual content
│   ├── utils.ts          # Helper functions
│   └── validations.ts    # Form schemas
├── prisma/               # Database schema and migrations
├── __tests__/            # Test suites
└── public/               # Static assets
```

## 🔧 Configuration

### Ward Types and Charges
The system includes predefined ward types with automatic charge calculation:
- **General Ward**: ₹1700/day
- **Semi-Private**: ₹2500/day  
- **Special (without AC)**: ₹3500/day
- **Special with AC (Deluxe)**: ₹4000/day
- **ICU**: ₹3700/day

### User Roles
- **ADMIN**: Full system access, user management
- **STAFF**: Patient management, form access

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify DATABASE_URL format
   - Check PostgreSQL server status
   - Ensure database exists

2. **PDF Generation Issues**
   - Verify Puppeteer installation
   - Check server memory limits
   - Ensure fonts are available

3. **Authentication Problems**
   - Verify NEXTAUTH_SECRET is set
   - Check NEXTAUTH_URL matches deployment
   - Clear browser cookies

### Performance Optimization

1. **Database**
   - Index frequently searched fields
   - Use database connection pooling
   - Implement query optimization

2. **Frontend**
   - Enable image optimization
   - Implement lazy loading
   - Use service workers for caching

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📞 Support

For technical support or feature requests:
- Create an issue in the repository
- Contact the development team
- Check the documentation for common solutions

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ for Zawar Hospital**

*A modern, secure, and user-friendly solution for hospital admission management.*
