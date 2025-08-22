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
- **Database**: SQLite (dev) / PostgreSQL (prod)
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

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Environment Variables

Create a `.env.local` file with:

```bash
DATABASE_URL="file:./dev.db"                    # SQLite for development
NEXTAUTH_SECRET="your-secret-key"               # JWT secret (generate with openssl rand -base64 32)
NEXTAUTH_URL="http://localhost:3000"            # Auth callback URL
```

## Available Scripts

```bash
# Development
npm run dev              # Start dev server (stable)
npm run dev:turbo        # Start dev server with Turbopack (experimental)
npm run build           # Production build
npm run start           # Start production server

# Code Quality
npm run lint            # ESLint checking
npm run typecheck       # TypeScript validation
npm run format          # Prettier formatting
npm run format:check    # Check formatting

# Testing
npm run test            # Jest unit tests
npm run test:watch      # Jest in watch mode
npm run test:coverage   # Test coverage report
npm run test:e2e        # Playwright E2E tests
npm run test:e2e:ui     # Playwright with UI
npm run test:all        # Run all tests

# Database
npx prisma generate     # Generate Prisma client
npx prisma db push      # Push schema changes to DB
npx prisma studio       # Open database browser
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

#### LLM-Powered Invoice Matching
- **Gemini AI Integration**: Real-time invoice-to-estimate matching with 90%+ accuracy
- **Intelligent Batch Processing**: Process multiple invoices against project estimates in a single request
- **Three-Tier Fallback System**: 
  1. **Primary**: LLM-based matching with confidence scoring
  2. **Fallback**: Logic-based string similarity and semantic analysis  
  3. **Manual**: User-controlled override with dropdown selection
- **Cost Optimization**: Approximate $0.001 per request using Gemini 1.5 Flash

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
