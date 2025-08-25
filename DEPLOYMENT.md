# BuildTrack Production Deployment Guide

This guide covers deploying BuildTrack to production with security, performance, and reliability best practices.

## Pre-Deployment Checklist

### Environment Setup

- [ ] Production database (PostgreSQL) provisioned
- [ ] Environment variables configured
- [ ] API keys and secrets secured
- [ ] Domain name configured
- [ ] SSL certificate ready
- [ ] CDN configured (optional)

### Security Checklist

- [ ] JWT secrets generated and secured
- [ ] Database credentials secured
- [ ] API rate limiting configured
- [ ] CORS headers properly set
- [ ] Security headers implemented
- [ ] Sensitive data logging removed

### Performance Checklist

- [ ] Database indexes optimized
- [ ] Image optimization enabled
- [ ] Bundle size analyzed
- [ ] Caching strategies implemented
- [ ] CDN configured for static assets
- [ ] Database connection pooling enabled

## Environment Variables

### Production Environment (.env.production)

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/buildtrack_prod"
SHADOW_DATABASE_URL="postgresql://user:password@host:5432/buildtrack_shadow"

# Authentication
NEXTAUTH_SECRET="your-super-secure-secret-minimum-32-chars"
NEXTAUTH_URL="https://yourdomain.com"
JWT_SECRET="your-jwt-secret-different-from-nextauth"

# LLM Integration
GEMINI_API_KEY="your-gemini-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key" # Optional fallback

# File Storage
VERCEL_BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"

# Monitoring & Analytics
SENTRY_DSN="your-sentry-dsn" # Optional
ANALYTICS_ID="your-analytics-id" # Optional

# Feature Flags
NODE_ENV="production"
ENABLE_ANALYTICS="true"
ENABLE_TRAINING="true"
```

## Deployment Platforms

### Vercel (Recommended)

#### Quick Deploy

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy with automatic builds on push

#### Manual Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Login and link project
vercel login
vercel link

# Configure environment variables
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
# ... add all required env vars

# Deploy to production
vercel --prod
```

### Docker Deployment

#### Dockerfile

```dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npx prisma generate
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

#### Docker Compose (with PostgreSQL)

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/buildtrack
      - NEXTAUTH_SECRET=your-secret
      - NEXTAUTH_URL=http://localhost:3000
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=buildtrack
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Railway Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway link
railway up
```

## Database Migration

### PostgreSQL Setup

```sql
-- Create production database
CREATE DATABASE buildtrack_prod;
CREATE DATABASE buildtrack_shadow; -- For Prisma migrations

-- Create user with limited privileges
CREATE USER buildtrack_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE buildtrack_prod TO buildtrack_user;
GRANT ALL PRIVILEGES ON DATABASE buildtrack_prod TO buildtrack_user;
```

### Run Migrations

```bash
# Generate Prisma client
npx prisma generate

# Apply migrations to production
npx prisma db push --schema=./prisma/schema.prisma

# Or use migration files
npx prisma migrate deploy
```

## Performance Optimization

### Next.js Configuration

```javascript
// next.config.js
module.exports = {
  // Enable image optimization
  images: {
    domains: ['your-domain.com'],
    minimumCacheTTL: 86400, // 24 hours
  },

  // Compression
  compress: true,

  // Bundle analysis
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Bundle analyzer in production builds
      config.plugins.push(
        new (require('webpack-bundle-analyzer').BundleAnalyzerPlugin)({
          analyzerMode: 'static',
          openAnalyzer: false,
        })
      )
    }
    return config
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
}
```

### Database Optimization

```sql
-- Add indexes for performance
CREATE INDEX idx_projects_owner_id ON "Project"("ownerId");
CREATE INDEX idx_invoices_project_id ON "Invoice"("projectId");
CREATE INDEX idx_milestones_project_id ON "Milestone"("projectId");
CREATE INDEX idx_invoices_status ON "Invoice"("status");
CREATE INDEX idx_milestones_status ON "Milestone"("status");
CREATE INDEX idx_line_items_trade_id ON "LineItem"("tradeId");
```

## Monitoring & Observability

### Health Check Endpoint

The application includes a health check at `/api/system/info` that monitors:

- Database connectivity
- Memory usage
- System uptime
- Feature availability

### Logging Setup

```javascript
// lib/logger.js
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
})

export default logger
```

### Error Monitoring (Sentry)

```bash
npm install @sentry/nextjs
```

```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
})
```

## Security Configuration

### Content Security Policy

```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://api.anthropic.com https://generativelanguage.googleapis.com",
    ].join('; '),
  },
]
```

### API Rate Limiting

```javascript
// lib/rate-limit.js
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
})

export async function rateLimitMiddleware(request) {
  const ip = request.ip ?? '127.0.0.1'
  const { success } = await ratelimit.limit(ip)
  return success
}
```

## Backup Strategy

### Database Backup

```bash
# Daily backup script
#!/bin/bash
pg_dump $DATABASE_URL > "backup-$(date +%Y%m%d).sql"

# Upload to cloud storage
aws s3 cp "backup-$(date +%Y%m%d).sql" s3://your-backup-bucket/
```

### Automated Backup

```yaml
# .github/workflows/backup.yml
name: Database Backup
on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Backup Database
        run: |
          pg_dump ${{ secrets.DATABASE_URL }} > backup.sql
          # Upload to storage
```

## Rollback Strategy

### Blue-Green Deployment

1. Deploy to staging environment
2. Run smoke tests
3. Switch traffic to new version
4. Monitor for issues
5. Rollback if necessary

### Database Rollback

```bash
# Create migration rollback
npx prisma migrate diff --from-migrations ./prisma/migrations --to-schema-datamodel ./prisma/schema.prisma --script > rollback.sql

# Apply rollback if needed
psql $DATABASE_URL < rollback.sql
```

## Post-Deployment Verification

### Smoke Tests

```bash
# Run critical path tests
npm run test:e2e:production

# Check health endpoint
curl https://yourdomain.com/health

# Verify API endpoints
curl https://yourdomain.com/api/system/info
```

### Performance Monitoring

- Check Core Web Vitals
- Monitor response times
- Track error rates
- Verify database performance

## Maintenance

### Regular Tasks

- [ ] Monitor error logs weekly
- [ ] Review performance metrics monthly
- [ ] Update dependencies monthly
- [ ] Security audit quarterly
- [ ] Database maintenance quarterly

### Scaling Considerations

- Database read replicas for high traffic
- CDN for global performance
- Horizontal scaling with load balancers
- Database sharding for massive scale

## Troubleshooting

### Common Issues

#### Build Failures

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npx prisma generate
npm run build
```

#### Database Connection Issues

- Check connection string format
- Verify database server accessibility
- Confirm user permissions
- Check connection pooling limits

#### Memory Issues

- Increase function memory in vercel.json
- Optimize database queries
- Implement pagination for large datasets
- Add proper cleanup in API routes

### Debug Mode

```bash
# Enable debug logging
export DEBUG=true
export LOG_LEVEL=debug
npm start
```

## Support

### Documentation

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Production](https://www.prisma.io/docs/guides/deployment)
- [Vercel Deployment](https://vercel.com/docs)

### Monitoring Dashboard

Access monitoring at: `/api/system/info`

### Emergency Contacts

- Primary: [Your contact information]
- Secondary: [Backup contact]
- Database Admin: [DBA contact]
