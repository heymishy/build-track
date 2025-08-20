# BuildTrack - Construction Project Management System

A comprehensive web-based construction project management system designed to track construction projects from initial estimates through completion, with automated PDF invoice processing and mobile-optimized interface.

## Features

- **📊 Project Management Dashboard** - Real-time budget tracking, health scoring, and milestone management
- **📄 Invoice Approval Workflow** - PDF viewer with visual verification and training data collection
- **📈 Analytics & Reporting** - Cost analysis, spending trends, and vendor insights
- **📱 Mobile-Responsive Design** - Optimized for construction site use with touch-friendly interface
- **🤖 AI-Powered PDF Processing** - Automated invoice parsing with continuous model improvement

## Tech Stack

- **Frontend**: Next.js 15.4.7, React 19.1.0, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM, JWT Authentication
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Testing**: Jest, React Testing Library, Playwright E2E
- **Deployment**: Vercel with GitHub Actions CI/CD

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
npm run dev              # Start dev server with Turbopack
npm run build           # Production build
npm run start           # Start production server

# Code Quality
npm run lint            # ESLint checking
npm run typecheck       # TypeScript validation
npm run format          # Prettier formatting

# Testing
npm run test            # Jest unit tests
npm run test:e2e        # Playwright E2E tests
npm run test:all        # Run all tests

# Database
npx prisma generate     # Generate Prisma client
npx prisma db push      # Push schema changes
npx prisma studio       # Database browser
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

### Invoice Processing

- **PDF Upload**: Drag-and-drop interface with 10MB limit
- **AI Parsing**: Automated extraction of invoice data with confidence scoring
- **Visual Approval**: Side-by-side PDF viewer with field verification
- **Training Data**: User corrections improve AI accuracy over time

### Project Management

- **Budget Tracking**: Real-time budget vs actual cost monitoring
- **Health Scoring**: Automated project health assessment
- **Milestone Management**: Progress tracking with payment schedules
- **Multi-User Support**: Role-based access (Owner/Contractor/Viewer)

### Analytics & Reporting

- **Cost Analysis**: Budget variance and spending trends
- **Vendor Insights**: Top vendors and spending categorization
- **Performance Metrics**: Project completion rates and timelines
- **Mobile Dashboard**: Touch-optimized charts and metrics

### Mobile Experience

- **Responsive Design**: Optimized for construction site use
- **Touch Navigation**: Bottom tab bar and swipe gestures
- **Offline-Ready**: Progressive Web App capabilities
- **Camera Upload**: Direct camera integration for invoice capture

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
