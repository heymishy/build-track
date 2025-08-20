# BuildTrack - Construction Project Management System

**Version:** 0.1.0  
**Stack:** Next.js 15.4.7, React 19.1.0, TypeScript, Prisma, Tailwind CSS  
**Database:** SQLite (dev) / PostgreSQL (prod)

## Quick Start Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack
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

## Architecture Overview

### Core Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── invoices/      # Invoice management
│   │   └── projects/      # Project management
│   ├── dashboard/         # Main dashboard page
│   └── page.tsx          # Landing page
├── components/            # React components
│   ├── invoices/         # Invoice-related UI
│   └── projects/         # Project-related UI
├── contexts/             # React Context providers
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and configurations
└── generated/            # Auto-generated files (Prisma)
```

### Key Design Patterns

- **App Router**: Next.js 13+ routing with server components
- **Context + Hooks**: State management with React Context API
- **Form Handling**: React Hook Form + Zod validation
- **Database**: Prisma ORM with type-safe queries
- **Authentication**: JWT tokens with custom middleware
- **PDF Processing**: PDF.js for invoice parsing
- **Testing**: Jest + RTL for units, Playwright for E2E

## Database Schema

### Core Entities

- **Users**: Authentication, roles (ADMIN/USER/VIEWER)
- **Projects**: Construction projects with budgets and timelines
- **ProjectUsers**: Many-to-many with role assignments (OWNER/CONTRACTOR/VIEWER)
- **Trades**: Construction categories (Electrical, Plumbing, etc.)
- **LineItems**: Detailed cost estimates within trades
- **Invoices**: Supplier invoices with PDF parsing support
- **InvoiceLineItems**: Invoice details mapped to estimates
- **Milestones**: Progress tracking with payment milestones

### Key Relationships

- Projects → Trades → LineItems (hierarchical cost structure)
- Invoices → InvoiceLineItems → LineItems (actual vs estimate mapping)
- Users ↔ Projects (many-to-many with roles)

## Authentication System

### Implementation

- **Middleware**: `src/lib/middleware.ts` with `withAuth` wrapper
- **JWT Tokens**: HTTP-only cookies for session management
- **Password Security**: bcrypt hashing with salt rounds
- **Role-Based Access**: Three-tier system (User/Project levels)

### Protected Routes

```typescript
// API Route Protection
export const POST = withAuth(async (request: NextRequest) => {
  // Handler implementation
})

// Middleware checks JWT tokens and sets user context
```

## PDF Invoice Processing

### Core Functionality

- **File Upload**: 10MB limit with drag-and-drop UI
- **PDF Parsing**: PDF.js extraction of text and metadata
- **Data Extraction**: Invoice numbers, dates, vendors, amounts, line items
- **Project Assignment**: Link invoices to specific projects
- **Status Tracking**: PENDING → APPROVED → PAID workflow

### Parser Intelligence

- Pattern matching for common invoice formats
- Date normalization (multiple format support)
- Currency detection and standardization
- Line item structure recognition with confidence scoring

## Testing Infrastructure

### Unit Tests (Jest + RTL)

```bash
# Located in __tests__/
__tests__/
├── api/                  # API route tests
├── components/           # Component tests
├── hooks/               # Custom hook tests
└── utils/               # Utility function tests
```

### E2E Tests (Playwright)

```bash
# Located in tests/e2e/
tests/
├── e2e/
│   ├── pdf-parsing.spec.ts      # PDF upload and parsing
│   └── pdf-upload-basic.spec.ts # Basic upload functionality
└── fixtures/
    └── generate-test-pdfs.js    # Test PDF generation
```

### Test Data Attributes

Components include `data-testid` attributes for reliable E2E testing:

- `data-testid="parsed-invoices"` - Invoice list container
- `data-testid="project-selector"` - Project dropdown
- `data-testid="invoice-item"` - Individual invoice items

## Development Patterns

### Component Structure

```typescript
// Standard component pattern
interface ComponentProps {
  // Props definition
}

export function Component({ props }: ComponentProps) {
  // Hooks and state
  // Event handlers
  // JSX return
}
```

### API Route Pattern

```typescript
import { withAuth } from '@/lib/middleware'

export const GET = withAuth(async (request: NextRequest) => {
  try {
    // Implementation
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Message' }, { status: 500 })
  }
})
```

### Context Usage

```typescript
// Access authenticated user
const { user } = useAuth()

// Get projects for current user
const { projects, loading } = useProjects()
```

## Common Issues & Solutions

### Database Connection

- **Issue**: Prisma client not generated
- **Solution**: Run `npx prisma generate` after schema changes

### Authentication Middleware

- **Issue**: Unauthorized access to protected routes
- **Solution**: Ensure JWT token is set and valid in cookies

### PDF Parsing

- **Issue**: PDF text extraction failures
- **Solution**: Check PDF format compatibility and file size limits

### Test Setup

- **Issue**: Playwright browser not installed
- **Solution**: Run `npx playwright install` to download browsers

## Environment Setup

### Required Environment Variables

```bash
# .env.local
DATABASE_URL="file:./dev.db"                    # SQLite for development
NEXTAUTH_SECRET="your-secret-key"               # JWT secret
NEXTAUTH_URL="http://localhost:3000"            # Auth callback URL
```

### Development Database

```bash
# Initialize database
npx prisma db push

# Seed data (if seed script exists)
npx prisma db seed
```

## Production Considerations

### Database Migration

- Change `provider = "sqlite"` to `provider = "postgresql"` in schema.prisma
- Update DATABASE_URL for PostgreSQL connection
- Run `npx prisma db push` to apply schema

### File Storage

- Configure Vercel Blob for PDF storage in production
- Update file upload handlers to use cloud storage

### Performance

- Enable Next.js image optimization
- Configure database connection pooling
- Implement API response caching where appropriate

## Key Files to Understand

1. **`src/contexts/AuthContext.tsx`** - Authentication state management
2. **`src/lib/middleware.ts`** - Route protection and JWT handling
3. **`src/lib/pdf-parser.ts`** - PDF text extraction logic
4. **`prisma/schema.prisma`** - Database schema and relationships
5. **`src/components/invoices/InvoiceAssignmentModal.tsx`** - Core invoice processing UI
6. **`prod-spec.md`** - Complete feature specification and requirements

This codebase follows Next.js best practices with TypeScript, comprehensive testing, and a focus on construction project cost management with automated invoice processing.
