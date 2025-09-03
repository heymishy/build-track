# BuildTrack - Construction Project Management System

**Version:** 0.1.0  
**Stack:** Next.js 15.4.7, React 19.1.0, TypeScript, Prisma, Tailwind CSS  
**Database:** SQLite (dev) / PostgreSQL (prod via Supabase)  
**Deployment:** Vercel (prod) / Local (dev)

## 🏗️ Multi-Tier Architecture

### Development Environment

- **Database**: SQLite (`prisma/dev.db`) via `prisma/schema.prisma` for rapid development
- **Port**: 3006 (configured in package.json)
- **Domain**: `http://localhost:3006`
- **Features**: Hot reload, debug logging, Turbopack (experimental)

### Production Environment

- **Platform**: Vercel deployment with Supabase PostgreSQL
- **Database**: PostgreSQL via Supabase connection using `prisma/schema.prod.prisma`
- **Domain**: `https://buildtrack.vercel.app` (configured in vercel.json)
- **Features**: CDN, edge functions, auto-scaling, security headers

### Key Differences Between Tiers

| Aspect       | Development      | Production            |
| ------------ | ---------------- | --------------------- |
| Database     | SQLite file      | PostgreSQL (Supabase) |
| Performance  | Fast iteration   | Optimized for scale   |
| Logging      | Verbose debug    | Error tracking only   |
| Security     | Relaxed CORS     | Strict CSP headers    |
| File Storage | Local filesystem | Vercel Blob storage   |
| Environment  | `.env.local`     | Vercel env variables  |

## 🗄️ Dual-Environment Database Architecture

### **Critical Design Decision**: Separate Database Providers

**Problem Solved**: Prisma doesn't support dynamic database providers in a single schema file. Production requires PostgreSQL (Supabase), but local development benefits from SQLite simplicity.

**Solution**: Environment-specific schema files with automated switching during build process.

### Database Configuration

#### Development Environment

```bash
# .env.local / .env.development
DATABASE_URL="file:./dev.db"
```

- **Schema File**: `prisma/schema.prisma` (SQLite provider)
- **Database**: Local SQLite file (`prisma/dev.db`)
- **Benefits**: No external dependencies, instant setup, fast development
- **Setup**: `npx prisma generate && npx prisma db push`

#### Production Environment

```bash
# Vercel Environment Variables
DATABASE_URL="postgresql://user:password@host:port/database"
```

- **Schema File**: `prisma/schema.prod.prisma` (PostgreSQL provider)
- **Database**: Supabase PostgreSQL with connection pooling
- **Benefits**: Scalable, robust, production-grade performance
- **Build Process**: Automatically copies production schema before build

### Build Process Automation

#### Development Build

```bash
npm run dev          # Uses prisma/schema.prisma (SQLite)
npx prisma generate  # Generates client with SQLite provider
```

#### Production Build (Vercel)

```bash
# vercel.json buildCommand:
cp prisma/schema.prod.prisma prisma/schema.prisma && npx prisma generate && npm run build
```

**Key Process**:

1. Copy production schema over development schema
2. Generate Prisma client with PostgreSQL provider
3. Build application with production database configuration

### Schema File Management

#### `prisma/schema.prisma` (Development - SQLite)

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

#### `prisma/schema.prod.prisma` (Production - PostgreSQL)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Important**: Both files maintain identical model definitions. Only the datasource provider differs.

### Migration Strategy

#### Development Migrations

```bash
npx prisma db push              # Apply schema changes to SQLite
npx prisma generate            # Update client
```

#### Production Migrations

```bash
# During deployment, Vercel automatically:
# 1. Copies schema.prod.prisma to schema.prisma
# 2. Generates client with PostgreSQL provider
# 3. Applies migrations to Supabase database
```

### **⚠️ Critical Maintenance Rules**

1. **Schema Synchronization**: Both `schema.prisma` and `schema.prod.prisma` must have identical models
2. **Test Compatibility**: Changes must work with both SQLite and PostgreSQL
3. **Migration Validation**: Test schema changes locally before production deployment
4. **Environment Variables**: Ensure DATABASE_URL matches expected provider in each environment

## 🚀 Quick Start Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack (port 3006)
npm run dev:turbo        # Alternative Turbopack mode
npm run build           # Production build test
npm run start           # Start production server locally

# Code Quality (REQUIRED before commits)
npm run lint            # ESLint checking
npm run typecheck       # TypeScript validation
npm run format          # Prettier formatting
npm run format:check    # Check formatting compliance

# Testing (REQUIRED before production deployment)
npm run test            # Jest unit tests
npm run test:watch      # Jest in watch mode
npm run test:coverage   # Test coverage report (90%+ required)
npm run test:e2e        # Playwright E2E tests
npm run test:e2e:ui     # Playwright with UI debugging
npm run test:e2e:prod   # E2E tests against production build
npm run test:all        # Complete test suite

# Database Management
npx prisma generate     # Generate Prisma client (required after schema changes)
npx prisma db push      # Push schema changes to database
npx prisma studio       # Open database browser
npx prisma migrate deploy  # Production migrations

# Deployment
npm run deploy:build    # Full pre-deployment validation
npm run deploy:test     # Test deployment readiness
npm run deploy:vercel   # Deploy to Vercel production
```

## 📐 Architecture Overview

### App Router Structure

```
src/
├── app/                      # Next.js 15 App Router
│   ├── api/                  # Server-side API routes
│   │   ├── auth/            # JWT authentication system
│   │   ├── invoices/        # Invoice management + AI matching
│   │   │   ├── matching/    # LLM-powered invoice matching
│   │   │   └── uploads/     # Supplier portal uploads management
│   │   ├── portal/          # PUBLIC supplier portal endpoints
│   │   │   ├── validate/    # Email validation for supplier access
│   │   │   └── upload/      # Invoice file upload + history
│   │   ├── projects/        # Project CRUD + analytics
│   │   │   └── [id]/       # Dynamic project routes
│   │   ├── settings/        # System configuration
│   │   ├── suppliers/       # Supplier access management (admin)
│   │   └── system/         # Health checks + monitoring
│   ├── dashboard/          # Main application dashboard
│   ├── invoices/          # Invoice management UI
│   ├── login/             # Authentication pages
│   ├── portal/            # PUBLIC supplier portal page
│   └── globals.css        # Global styling
├── components/             # Reusable React components
│   ├── auth/              # Login/register forms
│   ├── dashboard/         # Dashboard widgets
│   ├── invoices/          # Invoice processing UI
│   │   └── InvoiceMatchingInterface.tsx  # AI matching UI
│   ├── projects/          # Project management UI
│   ├── suppliers/         # Supplier management interface
│   └── ui/               # Base UI components
├── contexts/              # React Context providers
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
│   ├── llm-parsers/      # AI integration layer
│   ├── middleware.ts     # Auth + request handling
│   └── prisma.ts        # Database connection
└── types/               # TypeScript definitions
```

### Key Design Patterns

- **App Router**: Next.js 15 with React Server Components
- **State Management**: React Context + Custom Hooks pattern
- **Form Handling**: React Hook Form + Zod validation
- **Database**: Prisma ORM with type-safe queries
- **Authentication**: JWT tokens via HTTP-only cookies
- **AI Integration**: Multi-provider LLM system (Gemini primary)
- **Testing**: Jest + RTL (unit) + Playwright (E2E)
- **File Processing**: PDF.js for invoice parsing

## 🔐 Authentication & Security

### Multi-Layer Security

- **JWT Tokens**: HTTP-only cookies with secure headers
- **Role-Based Access**: ADMIN/USER/VIEWER with granular permissions
- **API Protection**: `withAuth` middleware on all protected routes
- **Password Security**: bcrypt with salt rounds
- **CORS**: Strict origin policies in production
- **CSP Headers**: Content Security Policy via vercel.json

### Protected Routes Pattern

```typescript
import { withAuth } from '@/lib/middleware'

export const GET = withAuth(
  async (request: NextRequest, user: AuthUser) => {
    // Route automatically has user context and permission validation
    return NextResponse.json(data)
  },
  {
    resource: 'projects',
    action: 'read',
    requireAuth: true,
  }
)
```

## 🤖 AI-Powered Invoice Matching

### Smart Matching Architecture

- **Primary**: Google Gemini 1.5 Flash for intelligent analysis
- **Fallback**: Logic-based string similarity matching
- **Override**: Manual user selection with persistent state
- **Caching**: Results cached to avoid re-runs on tab changes
- **Cost Optimization**: Batch processing, ~$0.001 per request

### Critical Performance Issue & Solution

**Problem**: Invoice matching tab triggers LLM on every open
**Root Cause**: API route runs LLM matching on every GET request
**Solution**: Implement result caching and conditional LLM execution

### API Endpoints

- `GET /api/invoices/matching?projectId={id}` - Smart matching with caching
- `POST /api/invoices/matching` - Apply selected matches
- `POST /api/invoices/approve` - Batch invoice approval

### Key Files

- `src/lib/simple-llm-matcher.ts` - AI matching service
- `src/app/api/invoices/matching/route.ts` - Matching API endpoint
- `src/components/invoices/InvoiceMatchingInterface.tsx` - Matching UI

## 🗄️ Database Schema

### Core Entities & Relationships

```mermaid
erDiagram
    User ||--o{ ProjectUser : has
    Project ||--o{ ProjectUser : belongs_to
    Project ||--o{ Trade : contains
    Trade ||--o{ LineItem : has
    Project ||--o{ Invoice : belongs_to
    Invoice ||--o{ InvoiceLineItem : contains
    LineItem ||--o{ InvoiceLineItem : matches
    Project ||--o{ Milestone : tracks
```

### Key Models

- **Users**: Authentication, roles (ADMIN/USER/VIEWER)
- **Projects**: Construction projects with budgets, timelines
- **ProjectUsers**: Many-to-many with role assignments
- **Trades**: Construction categories (Electrical, Plumbing, etc.)
- **LineItems**: Detailed cost estimates within trades
- **Invoices**: Supplier invoices with AI parsing
- **InvoiceLineItems**: Invoice details mapped to estimates
- **Milestones**: Progress tracking with payment milestones

## 🧪 Testing Strategy & Requirements

### Test Coverage Requirements

- **Unit Tests**: 90%+ coverage for business logic
- **Integration Tests**: All API endpoints tested
- **E2E Tests**: Critical user journeys covered
- **Performance Tests**: API response times < 200ms

### Pre-Commit Requirements

```bash
# MANDATORY before any commit
npm run typecheck    # Must pass without errors
npm run lint        # Must pass without warnings
npm run test        # All unit tests must pass
npm run format:check # Code must be formatted
```

### Pre-Deployment Requirements

```bash
# MANDATORY before production deployment
npm run test:all     # Complete test suite
npm run deploy:build # Build validation
npm run test:e2e:prod # E2E against production build
```

### Testing Tiers

1. **Unit Tests** (`__tests__/`): Business logic, utilities, hooks
2. **Integration Tests** (`__tests__/integration/`): API workflows
3. **E2E Tests** (`tests/e2e/`): Complete user journeys
4. **Production Tests**: Smoke tests against live environment

### Test Data Attributes

Components must include `data-testid` attributes:

- `data-testid="invoice-matching-interface"`
- `data-testid="project-selector"`
- `data-testid="apply-matches-button"`

## 🔧 Development Workflow

### Change Management Process

1. **Analysis**: Understand impact across all tiers
2. **Planning**: Update specifications and documentation
3. **Implementation**: Code with tier-specific considerations
4. **Testing**: Validate across development and production builds
5. **Documentation**: Update CLAUDE.md, prod-spec.md, README.md
6. **Deployment**: Staged rollout with monitoring

### Tier-Aware Development

- **Database Changes**: Test SQLite → PostgreSQL compatibility
- **Environment Variables**: Ensure dev/prod configuration alignment
- **API Endpoints**: Validate CORS and security headers
- **File Storage**: Test local → Vercel Blob migration paths
- **Performance**: Profile both development and production builds

### Critical Considerations

- **Database Provider Switch**: SQLite (dev) vs PostgreSQL (prod)
- **File Storage Switch**: Local filesystem vs Vercel Blob
- **Security Context**: Relaxed dev vs strict production policies
- **Performance Impact**: Development speed vs production optimization

## 📚 Documentation Standards

### Required Updates for Every Change

1. **CLAUDE.md**: Architecture and development impact
2. **prod-spec.md**: Feature specifications and requirements
3. **README.md**: User-facing setup and usage instructions
4. **API Documentation**: OpenAPI spec updates for API changes
5. **Test Documentation**: Test coverage and strategy updates

### Documentation Tiers

- **CLAUDE.md**: Technical architecture and development guide
- **prod-spec.md**: Product requirements and specifications
- **README.md**: Quick start and user documentation
- **DEPLOYMENT.md**: Production deployment procedures
- **TESTING_STRATEGY.md**: Comprehensive testing approaches

## ⚡ Performance & Monitoring

### Performance Targets

- **Page Load**: < 3s on 3G networks
- **API Response**: < 200ms for standard operations
- **LLM Processing**: < 30s for batch matching operations
- **Database Queries**: < 100ms for standard operations

### Monitoring Stack

- **Health Endpoint**: `/api/system/info` for system status
- **Error Tracking**: Sentry integration (production)
- **Performance**: Vercel Analytics and Core Web Vitals
- **Database**: Query performance monitoring via Prisma

### Optimization Strategies

- **Bundle Splitting**: Automatic code splitting via Next.js
- **Image Optimization**: Next.js built-in optimization
- **Database**: Proper indexing and connection pooling
- **Caching**: API response caching with intelligent invalidation

## 🚀 Deployment Configuration

### Vercel Configuration (`vercel.json`)

- **Regions**: Sydney (syd1) for optimal NZ performance
- **Functions**: 30s timeout, 1GB memory for LLM processing
- **Security Headers**: Comprehensive security header configuration
- **Redirects**: Authenticated user redirect to dashboard
- **Cron Jobs**: Daily cleanup tasks

### Environment Management

- **Development**: `.env.local` for local configuration
- **Production**: Vercel environment variables with secrets
- **Staging**: Separate environment for pre-production testing

## 🏢 Supplier Portal System

### Overview

Email-based authentication portal allowing suppliers and subcontractors to upload invoices directly to projects without requiring full system accounts.

### Architecture

- **Public Access**: `/portal` page accessible without authentication
- **Email Validation**: Validates against approved supplier email list
- **File Upload**: PDF-only uploads with 10MB size limit
- **Project Assignment**: Optional project linking for organization
- **Upload Tracking**: Complete audit trail for all submissions

### Database Schema

```typescript
// Supplier access whitelist (admin-managed)
model SupplierAccess {
  id          String       @id @default(cuid())
  email       String       @unique
  name        String       // Company/contractor name
  type        SupplierType // SUPPLIER | SUBCONTRACTOR
  isActive    Boolean      @default(true)
  createdBy   String       // Admin who added supplier
  createdAt   DateTime     @default(now())

  invoiceUploads InvoiceUpload[]
}

// Invoice uploads via portal
model InvoiceUpload {
  id            String       @id @default(cuid())
  supplierEmail String       // Links to SupplierAccess.email
  projectId     String?      // Optional project assignment
  fileName      String       // Original filename
  fileUrl       String       // Storage URL
  fileSize      Int         // File size validation
  supplierName  String?     // Override company name
  notes         String?     // Supplier notes
  status        UploadStatus // PENDING | PROCESSED | REJECTED
  processedAt   DateTime?   // When converted to Invoice
  invoiceId     String?     // Reference to created Invoice
  createdAt     DateTime    @default(now())
}
```

### API Endpoints

#### Public Portal APIs (No Authentication)

- `POST /api/portal/validate` - Validate supplier email access
- `POST /api/portal/upload` - Upload invoice file
- `GET /api/portal/upload?email=...` - Get upload history

#### Admin Management APIs (Authenticated)

- `GET /api/suppliers` - List all suppliers
- `POST /api/suppliers` - Add new supplier
- `PATCH /api/suppliers/[id]` - Update supplier
- `DELETE /api/suppliers/[id]` - Remove supplier
- `GET /api/invoices/uploads` - View all uploads
- `PATCH /api/invoices/uploads` - Update upload status
- `POST /api/invoices/uploads` - Convert to full invoice

### Security Features

- **Email Whitelist**: Only approved emails can access portal
- **File Validation**: PDF-only, size limits, malware scanning
- **Upload Tracking**: Complete audit trail with timestamps
- **Admin Controls**: Activate/deactivate supplier access
- **Project Isolation**: Optional project assignment for security

### Admin Workflow

1. **Supplier Management**: Add/remove suppliers via Settings → Supplier Portal
2. **Upload Review**: Monitor uploads via admin interface
3. **Processing**: Convert uploads to full invoices when ready
4. **Project Assignment**: Link uploads to specific projects
5. **Status Updates**: Mark as processed/rejected with notes

### Supplier Workflow

1. **Email Validation**: Enter approved email at `/portal`
2. **File Upload**: Select PDF invoice, optional project/notes
3. **Confirmation**: Receive upload confirmation with ID
4. **Tracking**: View upload history and status updates

### Production Considerations

- **File Storage**: Integrate with Vercel Blob or AWS S3
- **Notifications**: Email alerts for new uploads
- **Backup Strategy**: Secure file backup and recovery
- **Audit Compliance**: Maintain complete upload logs
- **Performance**: Optimize for mobile/field usage

### Integration Points

- **Settings Page**: Supplier management interface
- **Invoice Management**: View/process uploaded files
- **Project Dashboard**: Show pending uploads per project
- **Analytics**: Track supplier upload patterns

## 🛠️ Common Issues & Solutions

### LLM Integration Issues

- **Problem**: API runs LLM on every tab open
- **Solution**: Implement result caching and conditional execution
- **Prevention**: Cache results, check for existing matches

### Database Migration Issues

#### **Fixed: Dual-Environment Database Architecture**

- **Old Problem**: Single schema file caused provider mismatches between SQLite (dev) and PostgreSQL (prod)
- **Symptoms**:
  - Production: `Invalid prisma.project.findMany() invocation: the URL must start with the protocol 'file:'`
  - Development: `Can't reach database server at localhost:5432` when using PostgreSQL schema
- **Root Cause**: Prisma doesn't support dynamic database providers in single schema
- **Solution Implemented**: Dual schema file approach
  - `prisma/schema.prisma` → SQLite for development
  - `prisma/schema.prod.prisma` → PostgreSQL for production
  - Automated schema switching during Vercel build process
- **Prevention**:
  - **Always maintain both schema files** with identical models
  - **Test changes locally** with SQLite before production deployment
  - **Verify schema synchronization** between development and production files
  - **Use build process validation** to ensure correct schema is used per environment

#### **Migration Workflow**

**Development Changes**:

1. Modify `prisma/schema.prisma` (SQLite version)
2. Run `npx prisma db push` to apply to local SQLite database
3. Copy identical model changes to `prisma/schema.prod.prisma` (PostgreSQL version)
4. Test locally to ensure changes work with SQLite
5. Deploy to trigger production build with PostgreSQL schema

**Production Validation**:

- Vercel automatically uses `schema.prod.prisma` during build
- PostgreSQL compatibility validated during deployment
- Monitor production logs for database connection issues

### Authentication Issues

- **Problem**: JWT token validation across tiers
- **Solution**: Consistent middleware configuration
- **Prevention**: Validate auth flow in both environments

### File Upload Issues

- **Problem**: Local filesystem vs Vercel Blob storage
- **Solution**: Abstract file storage layer with environment detection
- **Prevention**: Test file operations across both storage systems

### Supplier Portal Security

- **Problem**: Email-only authentication for external suppliers
- **Solution**: Validate email against whitelist, track all uploads
- **Prevention**: Regular audit of supplier access, file validation

### Database Provider Configuration Issues

#### **Issue**: Wrong Database Provider in Environment

**Symptoms**:

- Development: `Can't reach database server at localhost:5432`
- Production: `Invalid prisma.project.findMany() invocation: the URL must start with the protocol 'file:'`
- Mixed environment errors with database connections

**Root Cause**: Using wrong Prisma schema file for environment or mismatched DATABASE_URL

**Diagnosis**:

```bash
# Check which schema is active
cat prisma/schema.prisma | grep provider

# Check DATABASE_URL configuration
echo $DATABASE_URL  # or check .env files

# Verify schema files exist
ls -la prisma/schema*.prisma
```

**Solutions**:

1. **Development Environment Issues**:

   ```bash
   # Ensure using SQLite schema
   cp prisma/schema.prisma prisma/schema.backup.prisma
   # Verify provider is "sqlite" in prisma/schema.prisma

   # Set correct DATABASE_URL
   echo 'DATABASE_URL="file:./dev.db"' > .env.local

   # Regenerate client and apply schema
   npx prisma generate
   npx prisma db push
   ```

2. **Production Environment Issues**:

   ```bash
   # Verify PostgreSQL schema exists
   ls -la prisma/schema.prod.prisma

   # Check Vercel build command in vercel.json
   grep "buildCommand" vercel.json

   # Should include: cp prisma/schema.prod.prisma prisma/schema.prisma
   ```

3. **Schema File Synchronization**:

   ```bash
   # Compare model definitions (should be identical)
   diff prisma/schema.prisma prisma/schema.prod.prisma | grep -v "provider"

   # If differences found, synchronize models:
   # 1. Copy models from development to production schema
   # 2. Keep only datasource provider different
   ```

**Prevention**:

- **Never modify schema providers directly** - use established dual-file approach
- **Always maintain both schema files** when making model changes
- **Test locally before production deployment**
- **Validate build commands** in vercel.json include schema switching

## 📝 Change Validation Checklist

### For Every Code Change

- [ ] **Functionality**: Works in both dev and production environments
- [ ] **Tests**: Unit tests updated and passing
- [ ] **Types**: TypeScript compilation successful
- [ ] **Lint**: ESLint rules followed
- [ ] **Format**: Code properly formatted with Prettier
- [ ] **Documentation**: Relevant docs updated

### For API Changes

- [ ] **Authentication**: Proper middleware applied
- [ ] **Validation**: Input validation with Zod schemas
- [ ] **Error Handling**: Comprehensive error responses
- [ ] **Performance**: Response time within targets
- [ ] **Security**: CORS and security headers configured

### For Database Changes

- [ ] **Dual Schema Update**: Both `prisma/schema.prisma` (SQLite) and `prisma/schema.prod.prisma` (PostgreSQL) updated with identical models
- [ ] **Local Testing**: Changes tested with SQLite using `npx prisma db push`
- [ ] **Model Compatibility**: Models work correctly with both SQLite and PostgreSQL data types
- [ ] **Schema Synchronization**: Verified both schema files have identical model definitions (only datasource provider differs)
- [ ] **Indexes**: Performance indexes compatible with both database providers
- [ ] **Production Deployment**: Tested that Vercel build process uses correct production schema
- [ ] **Rollback Strategy**: Both development and production rollback procedures defined

### For UI Changes

- [ ] **Responsiveness**: Mobile and desktop compatibility
- [ ] **Accessibility**: WCAG 2.1 AA compliance
- [ ] **Performance**: Core Web Vitals maintained
- [ ] **Testing**: E2E tests cover new functionality

## 🎯 Next Steps & Priorities

### Immediate Issues

1. **Fix LLM Caching**: Prevent unnecessary API calls on tab changes
2. **Performance Optimization**: Implement result caching strategies
3. **Test Coverage**: Achieve 90%+ coverage for critical paths
4. **Documentation**: Ensure all specs reflect current architecture

### Architecture Improvements

1. **Caching Layer**: Redis for session and API response caching
2. **Background Jobs**: Queue system for LLM processing
3. **Monitoring**: Enhanced observability and alerting
4. **Security**: Additional security hardening measures

---

This codebase follows Next.js 15 best practices with TypeScript, comprehensive multi-tier testing, and a focus on construction project cost management with AI-powered automation. Every change must be validated across development and production tiers to ensure functionality integrity.

**Critical**: This application uses a dual-environment database architecture with SQLite for development (`prisma/schema.prisma`) and PostgreSQL for production (`prisma/schema.prod.prisma`). Always:

1. **Maintain both schema files** with identical model definitions
2. **Test changes locally** with SQLite before production deployment
3. **Verify schema synchronization** between development and production files
4. **Validate functionality** works consistently across both database providers
5. **Monitor build process** ensures correct schema is used per environment

**Never modify database providers directly** - use the established dual-file approach to prevent environment mismatches.
