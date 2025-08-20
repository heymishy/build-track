# BuildTrack - Production Specification

**Version:** 0.1.0  
**Updated:** 2025-01-20  
**Type:** Construction Project Management System

## Application Overview

BuildTrack is a comprehensive web-based construction project management system designed to track construction projects from initial estimates through completion. The application focuses on comparing estimated costs against actual expenditures, managing milestone payments, and providing detailed financial tracking for construction projects.

### Core Value Proposition
- **Cost Variance Tracking**: Monitor estimated vs actual costs in real-time
- **Invoice Processing**: Automated PDF invoice parsing and categorization
- **Milestone Management**: Track project milestones and progress payments
- **Multi-User Support**: Role-based access for different stakeholders
- **Financial Transparency**: Detailed cost breakdowns by trade and line items

## Technology Stack

### Frontend
- **Framework**: Next.js 15.4.7 (React 19.1.0)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 4.x
- **UI Components**: Headless UI, Heroicons, Radix UI
- **Forms**: React Hook Form with Zod validation
- **State Management**: React Context API with custom hooks
- **Notifications**: React Hot Toast

### Backend
- **Runtime**: Node.js with Next.js API Routes
- **Database**: SQLite (development) / PostgreSQL (production)
- **ORM**: Prisma 6.14.0
- **Authentication**: NextAuth.js 4.24.11
- **File Processing**: PDF.js for invoice parsing
- **Password Security**: bcrypt.js

### Development & Quality
- **Testing**: Jest, React Testing Library, Playwright E2E
- **Code Quality**: ESLint, Prettier, Husky pre-commit hooks
- **Package Manager**: npm
- **Development Server**: Next.js with Turbopack

## Core Features

### 1. Authentication & User Management
- **User Registration**: Email/password with role assignment (ADMIN, USER, VIEWER)
- **Secure Login**: bcrypt password hashing with session management
- **Role-Based Access**: Granular permissions for different user types
- **Session Management**: Persistent authentication state

### 2. Project Management
- **Project Creation**: Name, description, budget, timeline tracking
- **Project Status**: PLANNING, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED
- **Multi-User Projects**: Role-based access (OWNER, CONTRACTOR, VIEWER)
- **Budget Tracking**: Total budget with currency support (default NZD)
- **Timeline Management**: Start date, estimated end date, actual completion

### 3. Trade & Line Item Management
- **Trade Categories**: Organized by construction trades (Electrical, Plumbing, Framing, etc.)
- **Detailed Line Items**: Quantity, unit, material/labor/equipment costs
- **Cost Estimation**: Markup percentage, overhead calculations
- **Sortable Organization**: Custom ordering for trades and line items

### 4. Invoice Processing & Management
- **PDF Upload**: Drag-and-drop interface with 10MB size limit
- **Automated Parsing**: Extract invoice numbers, dates, vendors, amounts, line items
- **Invoice Tracking**: Status management (PENDING, APPROVED, PAID, DISPUTED, REJECTED)
- **GST/Tax Handling**: Automatic tax calculation and tracking
- **Invoice-to-Estimate Mapping**: Link actual costs to estimated line items

### 5. Milestone & Progress Tracking
- **Custom Milestones**: Foundation, framing, completion stages
- **Progress Payments**: Amount tracking and payment scheduling
- **Completion Tracking**: Percentage complete with status updates
- **Timeline Management**: Target vs actual completion dates

### 6. Financial Analytics
- **Cost Variance Analysis**: Estimated vs actual cost comparison
- **Real-time Dashboards**: Project overview with key metrics
- **Trade-Level Reporting**: Cost breakdown by construction category
- **Payment Tracking**: Outstanding invoices and payment history

## Database Schema

### Core Entities
- **Users**: Authentication, roles, profile information
- **Projects**: Project details, budget, timeline, status
- **ProjectUsers**: Many-to-many relationship with role assignments
- **Trades**: Construction categories within projects
- **LineItems**: Detailed cost estimates within trades
- **Invoices**: Supplier invoices with metadata
- **InvoiceLineItems**: Detailed invoice items linked to estimates
- **Milestones**: Project milestones with payment tracking

### Key Relationships
- Projects have multiple trades, each with multiple line items
- Invoices belong to projects and can have multiple line items
- Invoice line items can be mapped to estimate line items for comparison
- Users can belong to multiple projects with different roles

## API Specification

### Authentication Endpoints
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration

### Project Management
- `GET /api/projects` - List projects (with filtering and search)
- `POST /api/projects` - Create new project
- `GET /api/projects/[id]` - Get project details
- `PUT /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project

### Invoice Processing
- `POST /api/invoices/parse` - Upload and parse PDF invoices
- `GET /api/invoices` - List invoices for project
- `POST /api/invoices` - Create invoice manually
- `PUT /api/invoices/[id]` - Update invoice status

## PDF Invoice Processing

### Supported Formats
- PDF documents up to 10MB
- Multi-page invoice support
- Various invoice layouts and formats

### Extraction Capabilities
- **Invoice Metadata**: Number, date, vendor information
- **Financial Data**: Amounts, tax/GST, totals
- **Line Items**: Description, quantity, unit price, totals
- **Vendor Information**: Company names, ABN/tax IDs

### Parsing Intelligence
- Pattern matching for common invoice formats
- Date normalization across multiple formats
- Currency detection and standardization
- Line item structure recognition

## Security Features

### Authentication Security
- **Password Hashing**: bcrypt with salt rounds
- **Session Management**: Secure token-based authentication
- **Role-Based Access**: Granular permission system
- **Input Validation**: Zod schema validation for all inputs

### Data Protection
- **File Upload Security**: Type and size validation
- **SQL Injection Prevention**: Prisma ORM with parameterized queries
- **XSS Protection**: Input sanitization and output encoding
- **CSRF Protection**: Built-in Next.js CSRF protection

## Testing Strategy

### Unit Testing
- **Components**: React Testing Library for UI components
- **Utilities**: Jest for utility functions and business logic
- **API Routes**: Comprehensive endpoint testing
- **Hooks**: Custom React hooks testing

### Integration Testing
- **Database**: Prisma integration testing
- **API Flows**: End-to-end API workflow testing
- **Authentication**: Login/logout flow testing

### E2E Testing
- **User Workflows**: Playwright for complete user journeys
- **File Upload**: PDF processing integration testing
- **Cross-Browser**: Multi-browser compatibility testing

## Performance Considerations

### Frontend Optimization
- **Bundle Splitting**: Next.js automatic code splitting
- **Image Optimization**: Next.js built-in image optimization
- **Caching**: Browser caching for static assets
- **Lazy Loading**: Component-level lazy loading

### Backend Performance
- **Database Indexing**: Optimized queries with proper indexes
- **File Processing**: Efficient PDF parsing with memory management
- **Caching**: API response caching where appropriate
- **Connection Pooling**: Database connection optimization

## Deployment Architecture

### Development Environment
- **Database**: SQLite for local development
- **File Storage**: Local filesystem
- **Development Server**: Next.js dev server with Turbopack

### Production Considerations
- **Database**: PostgreSQL for production scalability
- **File Storage**: Cloud storage (Vercel Blob) for PDFs
- **CDN**: Static asset delivery optimization
- **Monitoring**: Application performance monitoring
- **Backup**: Database backup and recovery procedures

## Configuration Management

### Environment Variables
- `DATABASE_URL` - Database connection string
- `NEXTAUTH_SECRET` - Authentication secret
- `NEXTAUTH_URL` - Application URL for auth callbacks

### Development Scripts
- `npm run dev` - Development server with Turbopack
- `npm run build` - Production build
- `npm run test` - Unit test suite
- `npm run test:e2e` - End-to-end tests
- `npm run lint` - Code linting
- `npm run typecheck` - TypeScript validation

## Future Enhancements

### Phase 2 Features
- **Mobile App**: React Native mobile application
- **Advanced Reporting**: Custom report generation
- **Integration APIs**: External accounting system integration
- **Document Management**: Enhanced file storage and organization
- **Real-time Collaboration**: Live project updates and notifications

### Scalability Improvements
- **Microservices**: Service decomposition for large-scale deployment
- **Caching Layer**: Redis for session and data caching
- **File Processing**: Background job queue for large PDF processing
- **Multi-tenancy**: Organization-level data isolation

## Compliance & Standards

### Data Privacy
- **GDPR Compliance**: User data protection and right to deletion
- **Data Retention**: Configurable data retention policies
- **Audit Logging**: Comprehensive activity logging

### Industry Standards
- **Accessibility**: WCAG 2.1 AA compliance
- **Security**: OWASP security guidelines
- **Performance**: Core Web Vitals optimization
- **SEO**: Search engine optimization best practices

---

**Last Updated**: 2025-01-20  
**Document Version**: 1.0  
**Maintained By**: Development Team