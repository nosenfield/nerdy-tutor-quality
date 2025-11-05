# Technical Context: Tutor Quality Scoring System

**Last Updated**: 2025-11-04

## Tech Stack

### Frontend
- **Framework**: Next.js 14.0+ (App Router)
- **Language**: TypeScript 5.3+
- **UI Library**: React 18
- **Styling**: Tailwind CSS 3.4
- **Component Library**: shadcn/ui (Radix UI primitives)
- **Charts**: Recharts 2.x
- **State Management**:
  - Server State: TanStack Query (React Query)
  - Client State: Zustand (minimal UI state only)
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Next.js 14 API Routes (unified codebase)
- **Language**: TypeScript 5.3+
- **Job Queue**: Bull 4.x (Redis-backed)
- **Cron Jobs**: node-cron (for overnight batch processing)
- **Validation**: Zod (runtime + compile-time type safety)
- **Date/Time**: date-fns 3.x

### Database
- **Primary Database**: PostgreSQL 16 (Supabase managed)
- **Vector Extension**: pgvector (for Phase 2 embeddings)
- **ORM**: Drizzle ORM 0.29+
- **Migrations**: Drizzle Kit
- **Connection Pooling**: PgBouncer (built into Supabase)

### AI/ML Services (Phase 2)
- **LLM Provider**: OpenAI
- **Models**:
  - `gpt-3.5-turbo` - Fast analysis (90% of sessions)
  - `gpt-4-turbo` - Critical sessions (10% of sessions)
  - `text-embedding-ada-002` - Transcript embeddings
- **Alternative**: Anthropic Claude (for comparison testing)

### Infrastructure
- **Hosting**: Vercel (Frontend + API Routes + Edge Functions)
- **Database**: Supabase (managed PostgreSQL + Auth + Storage)
- **Redis**: Upstash Redis (serverless, pay-per-request)
- **Object Storage**: Supabase Storage (for future transcripts/videos)
- **CDN**: Vercel Edge Network (automatic)
- **Monitoring**: Sentry (errors) + Vercel Analytics (performance)
- **Logs**: Vercel Logs + Supabase Logs

### Testing
- **Unit Tests**: Vitest 1.x
- **Integration Tests**: Vitest + Supertest
- **E2E Tests**: Playwright 1.x
- **Coverage Tool**: Vitest coverage (c8)
- **Load Testing**: k6 or Artillery

### Development Tools
- **IDE**: Cursor IDE (AI-assisted development)
- **Package Manager**: pnpm 8.x (faster than npm, better monorepo support)
- **Linting**: ESLint 8.x + TypeScript ESLint
- **Formatting**: Prettier 3.x
- **Git Hooks**: Husky + lint-staged
- **Type Checking**: TypeScript strict mode
- **API Testing**: Hoppscotch or Bruno (Postman alternative)
- **Mock Data**: Faker.js 8.x

---

## Development Setup

### Prerequisites
```bash
- Node.js 20 LTS (https://nodejs.org/)
- pnpm 8+ (npm install -g pnpm)
- Git (https://git-scm.com/)
- Supabase account (https://supabase.com/)
- Upstash account (https://upstash.com/)
- OpenAI API key (Phase 2 only)
```

### Installation
```bash
# 1. Clone repository (once project is initialized)
cd tutor-quality

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your actual values

# 4. Run database migrations
pnpm db:generate  # Generate migration files
pnpm db:migrate   # Apply migrations to database

# 5. Seed mock data (for development)
pnpm seed         # Generates 100 tutors, 3,000 sessions

# 6. Start development server
pnpm dev

# Access at http://localhost:3000
# API routes at http://localhost:3000/api/*
# Dashboard at http://localhost:3000/dashboard
```

### Environment Variables
```bash
# ============================================
# REQUIRED (Must be set)
# ============================================

# Database (Supabase)
DATABASE_URL=postgresql://user:pass@host:5432/db
DIRECT_URL=postgresql://user:pass@host:5432/db
# Get from: Supabase Project Settings > Database > Connection String

# Redis (Upstash)
REDIS_URL=redis://default:password@host:6379
# Get from: Upstash Console > Redis > REST API > .env format

# Authentication (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
# Get from: Supabase Project Settings > API

# Webhook Security
WEBHOOK_SECRET=your-secure-random-string-here
# Generate with: openssl rand -base64 32

# ============================================
# OPTIONAL (Phase 2+)
# ============================================

# OpenAI (for NLP analysis)
OPENAI_API_KEY=sk-...
# Get from: https://platform.openai.com/api-keys

# Monitoring (Production)
SENTRY_DSN=https://...
VERCEL_ANALYTICS_ID=...

# Feature Flags
ENABLE_NLP_ANALYSIS=false       # Set to 'true' for Phase 2
ENABLE_DEEP_ANALYSIS=false      # Set to 'true' for Phase 3
ENABLE_REAL_TIME_UPDATES=false  # Set to 'true' for WebSocket

# ============================================
# SYSTEM (Auto-set by Vercel)
# ============================================
NODE_ENV=development
NEXT_PUBLIC_VERCEL_URL=...      # Auto-set by Vercel
```

---

## Dependencies

### Core Dependencies
```json
{
  "next": "^14.0.0",
  "react": "^18.2.0",
  "typescript": "^5.3.0",
  "drizzle-orm": "^0.29.0",
  "@supabase/supabase-js": "^2.39.0",
  "bull": "^4.12.0",
  "ioredis": "^5.3.2",
  "zod": "^3.22.4",
  "date-fns": "^3.0.0"
}
```

### UI Dependencies
```json
{
  "tailwindcss": "^3.4.0",
  "@radix-ui/react-*": "^1.0.0",
  "recharts": "^2.10.0",
  "lucide-react": "^0.292.0",
  "@tanstack/react-query": "^5.14.0",
  "zustand": "^4.4.7",
  "react-hook-form": "^7.49.0"
}
```

### AI/ML Dependencies (Phase 2)
```json
{
  "openai": "^4.20.0"
}
```

### Development Dependencies
```json
{
  "@types/node": "^20.0.0",
  "@types/react": "^18.2.0",
  "vitest": "^1.0.0",
  "playwright": "^1.40.0",
  "eslint": "^8.55.0",
  "prettier": "^3.1.0",
  "husky": "^8.0.3",
  "lint-staged": "^15.2.0",
  "drizzle-kit": "^0.20.0",
  "@faker-js/faker": "^8.3.0"
}
```

### Why We Chose These

**Next.js 14 (App Router)**:
- Unified frontend + backend in one codebase
- Excellent TypeScript support
- Built-in API routes (no separate Express server needed)
- Vercel deployment is zero-config
- App Router provides better performance than Pages Router

**Drizzle ORM**:
- Type-safe queries (catches errors at compile time)
- Faster than Prisma (benchmarked 2-3x faster)
- SQL-like syntax (easier for those who know SQL)
- Excellent TypeScript inference
- Lightweight (smaller bundle size)

**Bull + Redis**:
- Industry-standard job queue
- Robust retry logic and failure handling
- Built-in monitoring dashboard (Bull Board)
- Handles 3,000 jobs/day easily
- Upstash Redis is serverless (no infrastructure management)

**shadcn/ui**:
- Not a library (copy-paste components into codebase)
- Full control over styling and behavior
- Built on Radix UI (accessible primitives)
- Works perfectly with Tailwind CSS
- No bundle size bloat

**TanStack Query**:
- Best-in-class data fetching for React
- Automatic caching and refetching
- Optimistic updates for better UX
- Handles loading/error states automatically

---

## Technical Constraints

### Performance Requirements
- **Webhook Response**: <2 seconds (p95)
- **Tier 1 Processing**: <5 seconds (rules-based)
- **Tier 2 Processing**: <60 seconds (NLP) - Phase 2
- **Dashboard Load**: <2 seconds (p95)
- **API Response Time**: <500ms (p95)
- **Processing Volume**: 3,000 sessions/day (~125/hour peak)

### Platform Constraints
- **Browser Support**: Chrome, Firefox, Safari, Edge (last 2 versions)
- **Mobile Responsive**: Yes (tablet 768px+, phone 375px+)
- **Offline Support**: No (requires internet)
- **Screen Readers**: ARIA labels for accessibility

### Security Requirements
- **Authentication**: Supabase Auth (email/password for MVP)
- **Authorization**: Row-level security (RLS) in Supabase
- **Data Encryption**: At rest (Supabase) + in transit (HTTPS)
- **FERPA Compliance**: PII anonymization, audit logs
- **Webhook Validation**: HMAC-SHA256 signature verification

### Budget Constraints
- **OpenAI API**: <$30/day (~$900/month)
- **Supabase**: Free tier for development, Pro tier ($25/month) for production
- **Upstash Redis**: Free tier (10K requests/day), Pay-as-you-go for production
- **Vercel**: Free tier for development, Pro tier ($20/month) for production
- **Total Infrastructure**: <$100/month production

---

## Build & Deployment

### Build Process
```bash
# Development build
pnpm dev

# Production build
pnpm build

# Type check
pnpm type-check

# Lint check
pnpm lint

# Test suite
pnpm test

# Test coverage
pnpm test:coverage

# Database migrations
pnpm db:generate  # Generate SQL from schema
pnpm db:migrate   # Apply migrations
pnpm db:studio    # Visual database editor
```

### Deployment

#### Automatic Deployment (Recommended)
```bash
# 1. Connect GitHub repo to Vercel
# 2. Push to main branch
# 3. Vercel auto-builds and deploys

git push origin main
# → Vercel builds and deploys automatically
# → https://tutor-scoring.vercel.app
```

#### Manual Deployment
```bash
# Install Vercel CLI
pnpm install -g vercel

# Deploy to staging
vercel

# Deploy to production
vercel --prod
```

### Environments

- **Development**: `http://localhost:3000`
  - Local PostgreSQL or Supabase dev project
  - Local Redis or Upstash dev instance
  - Mock data enabled

- **Staging**: `https://tutor-scoring-staging.vercel.app`
  - Supabase staging project
  - Upstash staging Redis
  - Connected to GitHub `develop` branch

- **Production**: `https://tutor-scoring.nerdy.com` (custom domain)
  - Supabase production project
  - Upstash production Redis
  - Connected to GitHub `main` branch
  - Monitoring enabled (Sentry)

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml

on:
  push:
    branches: [main, develop]

jobs:
  test:
    - Type check
    - Lint check
    - Unit tests
    - Integration tests

  deploy:
    - Build Next.js app
    - Deploy to Vercel
    - Run smoke tests
    - Alert if deployment fails
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Database Connection Fails
**Symptoms**: `Error: connection refused` or timeout
**Solution**:
1. Check `DATABASE_URL` in `.env.local`
2. Verify Supabase project is active
3. Check if IP is whitelisted (Supabase > Project Settings > Database > Restrictions)
4. Try `DIRECT_URL` instead for local development

#### Issue 2: Redis Queue Not Processing Jobs
**Symptoms**: Jobs stay in "waiting" state, never complete
**Solution**:
1. Check `REDIS_URL` is correct
2. Verify Redis instance is running (Upstash Console)
3. Check if workers are running: `pnpm worker`
4. Check Redis connection limits (upgrade plan if needed)

#### Issue 3: Webhook Signature Verification Fails
**Symptoms**: `401 Unauthorized` on webhook endpoint
**Solution**:
1. Verify `WEBHOOK_SECRET` matches Nerdy's secret
2. Check request headers include `X-Signature` header
3. Test with: `pnpm test:webhook`

#### Issue 4: OpenAI API Rate Limit (Phase 2)
**Symptoms**: `429 Too Many Requests` from OpenAI
**Solution**:
1. Reduce batch size (process fewer sessions at once)
2. Add delay between requests
3. Upgrade OpenAI plan (if budget allows)
4. Switch to GPT-3.5 instead of GPT-4 (faster, cheaper)

#### Issue 5: Slow Dashboard Loading
**Symptoms**: Dashboard takes >5 seconds to load
**Solution**:
1. Check database indexes are created
2. Enable React Query devtools to see slow queries
3. Add pagination if loading too many records
4. Cache frequently accessed data in Redis

---

## Scripts Reference

```bash
# Development
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm start        # Run production build locally
pnpm lint         # Run ESLint
pnpm format       # Format with Prettier

# Database
pnpm db:generate  # Generate migrations
pnpm db:migrate   # Apply migrations
pnpm db:studio    # Visual DB editor
pnpm db:seed      # Seed mock data
pnpm db:reset     # Reset and re-seed

# Testing
pnpm test         # Run all tests
pnpm test:unit    # Unit tests only
pnpm test:integration  # Integration tests
pnpm test:e2e     # E2E tests (Playwright)
pnpm test:coverage     # Coverage report

# Utilities
pnpm type-check   # TypeScript check
pnpm worker       # Start job queue worker
pnpm webhook-test # Test webhook endpoint
pnpm analyze      # Bundle size analysis
```

---

## Notes

**Why TypeScript Strict Mode?**
Catches bugs at compile time, not runtime. Worth the extra type annotations.

**Why pnpm over npm?**
- 2-3x faster installs
- Saves disk space (shared dependencies)
- Better monorepo support (if we expand)
- Strict dependency management (no phantom dependencies)

**Why Vercel over AWS?**
- Zero-config deployment (push to GitHub = deploy)
- Automatic HTTPS, CDN, edge functions
- Best Next.js integration (made by same company)
- Free tier generous enough for MVP
- Can migrate to AWS later if needed

**Phase 2 Considerations:**
- OpenAI API key not needed for MVP (Phase 1 uses behavioral signals only)
- Add when ready for NLP analysis
- Budget $30/day for OpenAI (~$900/month)
