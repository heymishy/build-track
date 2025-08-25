# BuildTrack - Construction Project Management System

[![GitHub Actions CI](https://github.com/heymishy/build-track/workflows/CI/badge.svg)](https://github.com/heymishy/build-track/actions)
[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-brightgreen?logo=vercel)](https://build-track.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-15.4.7-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1.0-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.14.0-2D3748?logo=prisma)](https://prisma.io/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-45ba4b?logo=playwright)](https://playwright.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

A comprehensive web-based construction project management system designed to track construction projects from initial estimates through completion, with AI-powered invoice processing, automated project milestone tracking, and mobile-optimized interface.

## 🚀 Features

### 📊 Project Management

- **Real-time Dashboard** - Live budget tracking, health scoring, and progress monitoring
- **Milestone Management** - Payment schedules, progress tracking, and completion status
- **Multi-User Support** - Role-based access (Owner/Contractor/Viewer) with permissions
- **Project Health Scoring** - Automated health assessment based on budget, timeline, and milestones

### 🤖 AI-Powered Invoice Processing

- **LLM-Based Matching** - Gemini AI integration for intelligent invoice-to-estimate matching
- **Three-Tier Fallback System** - LLM → Logic-based → Manual override matching
- **Batch Processing** - Process multiple invoices against estimates in one request
- **PDF Parsing** - Automated extraction with visual verification and confidence scoring

### 📄 Document Management

- **PDF Upload & Viewer** - Drag-and-drop interface with side-by-side verification
- **Training Data Collection** - User corrections improve AI accuracy over time
- **Visual Approval Workflow** - Touch-friendly approval process with manual overrides

### 📈 Analytics & Reporting

- **Cost Analysis** - Budget variance, spending trends, and vendor insights
- **Performance Metrics** - Project completion rates, timeline adherence
- **Real-time Statistics** - Live budget utilization and milestone progress

### 📱 Mobile-First Design

- **Responsive Interface** - Optimized for construction site use with touch navigation
- **Progressive Web App** - Offline-ready capabilities and camera integration
- **Touch-Optimized** - Large buttons, swipe gestures, and finger-friendly controls

## Tech Stack

- **Frontend**: Next.js 15.4.7, React 19.1.0, TypeScript, Tailwind CSS 4.0
- **Backend**: Next.js API Routes, Prisma ORM 6.14.0, JWT Authentication
- **Database**: SQLite (dev) / PostgreSQL (prod via Supabase)
- **AI/ML**: Google Gemini 1.5 Flash, Custom LLM parsing orchestration
- **Testing**: Jest 30.0, React Testing Library 16.3, Playwright 1.54
- **Deployment**: Vercel with GitHub Actions CI/CD
- **Security**: bcryptjs, JWT tokens, role-based permissions

## Quick Start

1. **Clone and Install**

   ```bash
   git clone https://github.com/heymishy/build-track.git
   cd build-track
   npm install
   ```

2. **Environment Setup**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. **Database Setup**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Development Server**
   ```bash
   npm run dev
   ```

Open [http://localhost:3006](http://localhost:3006) to see the application (port configured in package.json).

## Environment Variables

Create a `.env.local` file with:

```bash
DATABASE_URL="file:./dev.db"                    # SQLite for development
NEXTAUTH_SECRET="your-secret-key"               # JWT secret (generate with openssl rand -base64 32)
NEXTAUTH_URL="http://localhost:3006"            # Auth callback URL
```

## Available Scripts

```bash
# Development
npm run dev              # Start dev server (port 3006, stable webpack)
npm run dev:turbo        # Start dev server with Turbopack (experimental)
npm run build           # Production build test
npm run start           # Start production server locally

# Code Quality (REQUIRED before commits)
npm run lint            # ESLint checking - must pass
npm run typecheck       # TypeScript validation - must pass  
npm run format          # Prettier formatting - auto-fix
npm run format:check    # Check formatting compliance

# Testing (REQUIRED before production deployment)
npm run test            # Jest unit tests - must pass
npm run test:watch      # Jest in watch mode for development
npm run test:coverage   # Test coverage report (target: 90%+)
npm run test:e2e        # Playwright E2E tests - critical paths
npm run test:e2e:ui     # Playwright with UI for debugging
npm run test:e2e:prod   # E2E tests against production build
npm run test:all        # Complete test suite - required for deployment

# Database Management
npx prisma generate     # Generate Prisma client (after schema changes)
npx prisma db push      # Push schema changes to database
npx prisma studio       # Open database browser interface
npx prisma migrate deploy  # Production database migrations

# Deployment Validation
npm run deploy:build    # Full pre-deployment validation
npm run deploy:test     # Test deployment readiness
npm run deploy:vercel   # Deploy to Vercel production
```

## 🏗️ Development Workflow

### Multi-Tier Architecture
This application operates across multiple deployment tiers with different characteristics:

| Aspect | Development (`localhost:3006`) | Production (Vercel) |
|--------|-------------------------------|-------------------|
| **Database** | SQLite (`prisma/dev.db`) | PostgreSQL (Supabase) |
| **File Storage** | Local filesystem | Vercel Blob storage |
| **Security** | Relaxed CORS policies | Strict CSP headers |
| **Performance** | Fast iteration, debug logging | Optimized builds, error tracking |
| **Environment** | `.env.local` configuration | Vercel environment variables |

### Change Management Process
Every code change must follow this workflow:

1. **🔍 Analysis**: Understand impact across development and production tiers
2. **📝 Planning**: Update relevant specifications and documentation  
3. **⚡ Implementation**: Code with tier-specific considerations
4. **🧪 Testing**: Validate functionality across both SQLite and PostgreSQL
5. **📚 Documentation**: Update CLAUDE.md, prod-spec.md, and README.md
6. **🚀 Deployment**: Staged rollout with monitoring and validation

### Pre-Commit Requirements
```bash
# These commands MUST pass before any commit:
npm run typecheck    # TypeScript compilation - zero errors
npm run lint        # ESLint validation - zero warnings  
npm run test        # Unit tests - 100% pass rate
npm run format:check # Code formatting - compliance required
```

### Pre-Deployment Requirements
```bash
# These commands MUST pass before production deployment:
npm run test:all     # Complete test suite - all tests passing
npm run deploy:build # Production build validation - no errors
npm run test:e2e:prod # E2E tests against production build - critical paths passing
```

## Deployment

### Vercel Deployment (Recommended)

1. **Connect Repository**
   - Fork this repository to your GitHub account
   - Connect your Vercel account to GitHub
   - Import the project in Vercel

2. **Environment Variables**
   Set these in Vercel dashboard:

   ```bash
   DATABASE_URL=postgresql://username:password@host:port/database
   NEXTAUTH_SECRET=your-production-secret
   NEXTAUTH_URL=https://your-domain.vercel.app
   ```

3. **GitHub Secrets**
   Add these to your repository secrets:

   ```bash
   VERCEL_TOKEN=your-vercel-token
   VERCEL_ORG_ID=your-org-id
   VERCEL_PROJECT_ID=your-project-id
   ```

4. **Database Migration**
   Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"  // Change from "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── analytics/     # Analytics data
│   │   ├── invoices/      # Invoice processing
│   │   └── projects/      # Project management
│   ├── dashboard/         # Main dashboard page
│   └── page.tsx          # Landing page
├── components/            # React components
│   ├── analytics/        # Analytics dashboards
│   ├── dashboard/        # Dashboard components
│   ├── invoices/         # Invoice processing UI
│   ├── mobile/           # Mobile-optimized components
│   └── projects/         # Project management UI
├── contexts/             # React Context providers
├── hooks/                # Custom React hooks
└── lib/                  # Utilities and configurations
```

## Key Features

### 🎯 Latest Features (v0.1.0)

#### 🆕 Complete Feature Implementation (August 2025)

**NEW PAGES IMPLEMENTED:**
- **🆕 Projects Management** (`/projects`): Complete project interface with statistics, CRUD operations, and budget tracking
- **🆕 Estimates Manager** (`/estimates`): Comprehensive cost management with accuracy analysis and variance tracking  
- **🆕 Analytics Dashboard** (`/analytics`): Financial insights, project health scoring, and performance reporting
- **🔧 Security Hardening**: Fixed critical API security vulnerabilities and enhanced middleware protection

#### LLM-Powered Invoice Matching with Intelligent Caching

- **Gemini AI Integration**: Real-time invoice-to-estimate matching with 90%+ accuracy
- **Smart Caching System**: Only processes unmatched items, avoiding unnecessary LLM calls
- **Instant Tab Loading**: No more 2-3 minute delays when reopening matching interface
- **Intelligent Batch Processing**: Process multiple invoices against project estimates efficiently
- **Three-Tier Fallback System**:
  1. **Primary**: LLM-based matching with confidence scoring
  2. **Fallback**: Logic-based string similarity and semantic analysis  
  3. **Manual**: User-controlled override with dropdown selection
- **Cost Optimization**: ~$0.001 per request, with cache hits costing nothing
- **Performance Improvements**:
  - ✅ **Fixed**: Eliminated unnecessary LLM calls on tab changes
  - ✅ **Fixed**: "Apply Matches" button now saves instantly without re-running AI
  - ✅ **Added**: Cache status indicators showing when AI processing was skipped

#### 🚧 Upcoming Feature: Supplier/Subcontractor Portal

**NEW REQUIREMENT**: Direct invoice upload portal for external suppliers
- **📧 Email-Based Access**: Simple authentication using approved supplier email lists
- **🏗️ Project Association**: Automatic invoice linking to correct projects
- **📱 Mobile-Optimized**: Field-ready interface for suppliers and subcontractors
- **🔒 Secure Portal**: Access without full system accounts, admin-managed supplier lists

#### Advanced Milestone Management

- **CRUD Operations**: Full create, read, update, delete functionality for project milestones
- **Payment Tracking**: Link payment amounts to milestone completion
- **Progress Visualization**: Real-time completion percentages and status tracking
- **Timeline Management**: Target dates, actual completion dates, and overdue alerts
- **Summary Statistics**: Automatic calculation of milestone completion rates

#### Enhanced User Experience

- **Fixed Manual Overrides**: Dropdown selections now persist properly without reverting
- **Real-time Updates**: Live synchronization of project data and milestone progress
- **Mobile-Optimized**: Touch-friendly controls for construction site use
- **Role-Based Permissions**: Granular access control for project management

#### Technical Improvements

- **API Robustness**: Comprehensive error handling and validation across all endpoints
- **TypeScript Coverage**: Full type safety with proper interfaces and validation
- **Authentication Security**: JWT-based auth with role-based route protection
- **Database Optimization**: Efficient queries with proper indexing and relationships

## 📊 Complete Feature Status

### ✅ **Fully Implemented Features**

| Feature | UI Page | API Endpoints | Status |
|---------|---------|---------------|--------|
| **Authentication** | `/login`, `/register` | `/api/auth/*` | ✅ Complete |
| **Projects** | `/projects` 🆕 | `/api/projects/*` | ✅ Complete |
| **Estimates** | `/estimates` 🆕 | `/api/estimates/*` | ✅ Complete |
| **Invoices** | `/invoices` | `/api/invoices/*` | ✅ Complete |
| **Analytics** | `/analytics` 🆕 | `/api/analytics/*` | ✅ Complete |
| **Documents** | `/documents` | `/api/documents/*` | ✅ Complete |
| **Settings** | `/settings` | `/api/settings/*` | ✅ Complete |
| **Dashboard** | `/dashboard` | Multiple APIs | ✅ Complete |

### 🚧 **Planned Features**

| Feature | Status | Priority |
|---------|--------|----------|
| **Supplier Portal** | 📋 Specified | High |
| **Supplier Management** | 📋 Specified | High |

### 🔧 **Security Status**

- **✅ Authentication**: JWT-based with HTTP-only cookies
- **✅ Authorization**: Role-based access control (ADMIN/USER/VIEWER)
- **✅ API Protection**: All endpoints use `withAuth` middleware
- **✅ Vulnerability Fixes**: Critical unprotected endpoints secured
- **✅ Password Security**: bcrypt with 12 salt rounds

## Testing

```bash
# Unit Tests
npm run test

# E2E Tests
npm run test:e2e

# Coverage Report
npm run test:coverage
```

Test files include:

- **Unit Tests**: `__tests__/` - API routes, components, utilities
- **E2E Tests**: `tests/e2e/` - Full user workflows with Playwright
- **PDF Testing**: Automated PDF generation and parsing validation

### Test Coverage Requirements
- **Unit Tests**: 90%+ coverage for business logic
- **Integration Tests**: All API endpoints tested
- **E2E Tests**: Critical user journeys covered
- **Security Tests**: Authentication and authorization flows validated

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:

- Create an issue in this repository
- Check the [CLAUDE.md](CLAUDE.md) file for development context

---

Built with ❤️ for the construction industry
