# Pre-Production Deployment Checklist

**Date:** 2025-01-09  
**Status:** Phase 1 Complete ✅ | Phase 2 In Progress 🚧  
**Based on:** `recommended-path-cursor.md` hybrid strategy

---

## Current Status

### ✅ Phase 1: Tutor Progression Visualization (COMPLETE)
- [x] Tutor detail page (`/dashboard/tutors/[id]`)
- [x] Performance timeline chart
- [x] Tutor header with score breakdown
- [x] Active flags list
- [x] Recent sessions table
- [x] Interventions history

### 🚧 Phase 2: Production Deployment (IN PROGRESS)
All tasks below are **NOT YET COMPLETE**

---

## Pre-Deployment Requirements (2-3 days)

### ⭐ CRITICAL: Testing & Bug Fixes

#### 1. Task 8.12: Run Full Test Suite ⭐ **CRITICAL**
**Status:** ⚠️ **FAILING** - Tests need to be fixed  
**Time:** 2 hours  
**Priority:** P0 (Must Have)

**Current Issues:**
- Pattern tests failing (6 failed in `crud.test.ts`)
- Async tests failing (1 failed in `async.test.ts`)
- Score validation tests may have issues (need to verify)
- Analytics overview test may have type issues (need to verify)

**Action Items:**
- [ ] Fix failing pattern tests
- [ ] Fix failing async tests
- [ ] Verify all integration tests pass
- [ ] Fix any score validation test failures
- [ ] Fix analytics overview type issues
- [ ] Ensure all tests pass before proceeding

#### 2. Task 8.14: Manual QA Testing ⭐ **CRITICAL**
**Status:** ⬜ **NOT STARTED**  
**Time:** 4 hours  
**Priority:** P0 (Must Have)

**Test Checklist:**
- [ ] **Dashboard Features:**
  - [ ] Login/logout flow
  - [ ] Scatter plot interaction (click dots)
  - [ ] Tutor detail card display
  - [ ] Flagged tutors table (sorting, pagination)
  - [ ] Date range filter functionality
  - [ ] New students filter
  - [ ] Data health indicator
  - [ ] Fullscreen modal for scatter plot
  
- [ ] **Tutor Detail Page:**
  - [ ] Navigation from dashboard to tutor page
  - [ ] Breadcrumb navigation
  - [ ] Tutor header with score breakdown
  - [ ] Performance timeline chart (all date ranges)
  - [ ] Active flags list
  - [ ] Recent sessions table
  - [ ] Interventions history
  - [ ] Date range filter on tutor page
  - [ ] Score cards display correctly
  
- [ ] **API Endpoints:**
  - [ ] `/api/dashboard/tutors` (with filters)
  - [ ] `/api/tutors/[id]` (with date range)
  - [ ] `/api/tutors/[id]/score` (with date range)
  - [ ] `/api/webhooks/sessions` (webhook endpoint)
  - [ ] `/api/queue/status` (queue monitoring)
  
- [ ] **Error Handling:**
  - [ ] Invalid tutor ID handling
  - [ ] Missing data handling
  - [ ] Network error handling
  - [ ] Empty state displays

#### 3. Task 8.16: Fix Critical Bugs ⭐ **CRITICAL**
**Status:** ⬜ **PENDING** (depends on 8.12 and 8.14)  
**Time:** Variable  
**Priority:** P0 (Must Have)

**Action Items:**
- [ ] Document all bugs found in testing
- [ ] Prioritize blocking bugs
- [ ] Fix critical bugs before deployment
- [ ] Document non-critical bugs for post-deployment

---

### 🔧 Essential Monitoring Setup

#### 4. Task 8.1-8.2: Sentry Setup and Integration
**Status:** ⬜ **NOT STARTED**  
**Time:** 2 hours  
**Priority:** P0 (Must Have)

**Action Items:**
- [ ] Create Sentry account (sentry.io)
- [ ] Install `@sentry/nextjs` package
- [ ] Run Sentry wizard: `npx @sentry/wizard@latest -i nextjs`
- [ ] Configure `sentry.client.config.ts`
- [ ] Configure `sentry.server.config.ts`
- [ ] Add `NEXT_PUBLIC_SENTRY_DSN` to environment variables
- [ ] Test error capture (trigger test error)
- [ ] Verify errors appear in Sentry dashboard

**Environment Variables Needed:**
- `NEXT_PUBLIC_SENTRY_DSN` (client-side errors)
- `SENTRY_AUTH_TOKEN` (optional, for source maps)

#### 5. Task 8.3: Add Error Boundaries
**Status:** ⬜ **NOT STARTED**  
**Time:** 1 hour  
**Priority:** P0 (Must Have)

**Action Items:**
- [ ] Create root error boundary (`app/error.tsx`)
- [ ] Create dashboard error boundary (`app/dashboard/error.tsx`)
- [ ] Create tutor detail error boundary (`app/dashboard/tutors/[id]/error.tsx`)
- [ ] Test error boundaries (trigger errors)
- [ ] Ensure graceful error display

#### 6. Task 8.4-8.5: Structured Logging
**Status:** ⬜ **NOT STARTED**  
**Time:** 2 hours  
**Priority:** P0 (Must Have)

**Action Items:**
- [ ] Install logging library (Winston or Pino)
  ```bash
  npm install winston winston-daily-rotate-file
  # OR
  npm install pino pino-pretty
  ```
- [ ] Create logging utility (`src/lib/logger.ts`)
- [ ] Configure log levels (DEBUG, INFO, WARN, ERROR)
- [ ] Add logging to API routes (request/response)
- [ ] Add logging to queue workers (job processing)
- [ ] Add logging to error handlers
- [ ] Configure development vs production logging
  - Development: Console logging (DEBUG level)
  - Production: File logging + Sentry (INFO level)

**Note:** Logging guidelines already exist in `.cursor/rules/logging-guidelines.mdc`

---

### 📊 Light Performance Checks (SHOULD DO)

#### 7. Task 8.7: Quick DB Query Audit
**Status:** ⬜ **NOT STARTED**  
**Time:** 2 hours  
**Priority:** P1 (Should Have)

**Action Items:**
- [ ] Review Supabase dashboard for slow query logs
- [ ] Check if any queries take > 1 second
- [ ] Document findings (don't optimize yet)
- [ ] Create baseline performance metrics

#### 8. Task 8.10: Quick Dashboard Load Check
**Status:** ⬜ **NOT STARTED**  
**Time:** 1 hour  
**Priority:** P1 (Should Have)

**Action Items:**
- [ ] Open dashboard in incognito browser
- [ ] Measure time to interactive (should be < 3s)
- [ ] Check Network tab for slow requests
- [ ] Document baseline (optimize later if needed)

---

## Deployment Requirements (1 day)

### 🚀 Staging Environment

#### 9. Task 8.19-8.21: Staging Environment Setup
**Status:** ⬜ **NOT STARTED**  
**Time:** 4 hours  
**Priority:** P0 (Must Have)

**Action Items:**
- [ ] Set up Vercel staging branch (e.g., `staging` branch)
- [ ] Configure staging environment variables
- [ ] Deploy to staging environment
- [ ] Run smoke tests on staging:
  - [ ] Login works
  - [ ] Dashboard loads
  - [ ] Tutor detail page loads
  - [ ] API endpoints respond
  - [ ] No console errors
- [ ] Verify staging deployment successful

**Staging Environment Variables:**
- `DATABASE_URL` (staging Supabase - separate from production)
- `REDIS_URL` (staging Upstash - can use same or separate)
- `WEBHOOK_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SENTRY_DSN`

### 🌐 Production Deployment

#### 10. Task 8.17-8.18: Vercel Setup
**Status:** ⬜ **NOT STARTED**  
**Time:** 1 hour  
**Priority:** P0 (Must Have)

**Action Items:**
- [ ] Create Vercel account (if not exists)
- [ ] Link GitHub repository to Vercel
- [ ] Configure production environment variables:
  - `DATABASE_URL` (production Supabase)
  - `REDIS_URL` (production Upstash)
  - `WEBHOOK_SECRET`
  - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `SENTRY_AUTH_TOKEN` (if using source maps)
  - Any other required vars
- [ ] Configure build settings
- [ ] Set up custom domain (optional)

#### 11. Task 8.22: Deploy to Production
**Status:** ⬜ **NOT STARTED**  
**Time:** 1 hour  
**Priority:** P0 (Must Have)

**Prerequisites:**
- ✅ All pre-deployment tasks complete
- ✅ Staging deployment validated
- ✅ All tests passing
- ✅ No critical bugs

**Action Items:**
- [ ] Merge staging to main (or deploy main branch)
- [ ] Deploy to production via Vercel
- [ ] Verify deployment successful
- [ ] Test production deployment:
  - [ ] Login works
  - [ ] Dashboard loads
  - [ ] Tutor detail page loads
  - [ ] API endpoints respond
  - [ ] No console errors
  - [ ] Check Sentry for errors

---

## Post-Deployment Requirements (1 day)

### 📈 Monitoring and Alerts

#### 12. Task 8.24-8.25: Monitoring and Alerts
**Status:** ⬜ **NOT STARTED**  
**Time:** 3 hours  
**Priority:** P0 (Must Have)

**Action Items:**
- [ ] Configure Sentry alerts:
  - [ ] Email alerts for critical errors
  - [ ] Slack integration (if available)
  - [ ] Alert thresholds (> 10 errors/hour = critical)
  - [ ] Test alert triggered successfully
  
- [ ] Set up uptime monitoring:
  - [ ] Use Vercel built-in monitoring (free)
  - [ ] OR use UptimeRobot (free tier)
  - [ ] OR use Better Uptime (free tier)
  - [ ] Ping dashboard URL every 5 minutes
  - [ ] Email alert if down > 5 minutes
  - [ ] Test alert triggered successfully

#### 13. Task 8.15: Real Traffic Load Testing
**Status:** ⬜ **NOT STARTED**  
**Time:** 2 hours  
**Priority:** P1 (Should Have)

**Action Items:**
- [ ] Monitor production metrics (first 24-48 hours)
- [ ] Identify bottlenecks
- [ ] Document findings
- [ ] Plan optimizations if needed

---

## Summary

### Total Time Estimate: ~25 hours (~3-4 days)

| Phase | Tasks | Time | Status |
|-------|-------|------|--------|
| **Pre-Deployment** | 8 tasks | ~14 hours | 🚧 In Progress |
| **Deployment** | 3 tasks | ~6 hours | ⬜ Not Started |
| **Post-Deployment** | 2 tasks | ~5 hours | ⬜ Not Started |
| **Total** | 13 tasks | ~25 hours | 🚧 0% Complete |

### Critical Path (Must Complete Before Production)

1. ✅ **Fix test suite** (Task 8.12) - Currently failing
2. ✅ **Manual QA testing** (Task 8.14)
3. ✅ **Fix critical bugs** (Task 8.16)
4. ✅ **Sentry setup** (Tasks 8.1-8.3)
5. ✅ **Structured logging** (Tasks 8.4-8.5)
6. ✅ **Staging deployment** (Tasks 8.19-8.21)
7. ✅ **Vercel setup** (Tasks 8.17-8.18)
8. ✅ **Production deployment** (Task 8.22)
9. ✅ **Monitoring setup** (Tasks 8.24-8.25)

### Optional (Can Defer)

- ⏭️ Task 8.7: Full DB optimization (light check only)
- ⏭️ Task 8.10: Full dashboard optimization (light check only)
- ⏭️ Task 8.15: Load testing (use real traffic post-deployment)
- ⏭️ Tasks 8.8-8.9: Redis caching (add if monitoring shows need)
- ⏭️ Task 8.13: E2E tests (add if issues arise)

---

## Next Steps

### Immediate (Today)
1. [ ] Fix failing tests (Task 8.12)
2. [ ] Begin manual QA testing (Task 8.14)
3. [ ] Set up Sentry account (Task 8.1)

### This Week
1. [ ] Complete all pre-deployment tasks
2. [ ] Deploy to staging
3. [ ] Validate staging deployment
4. [ ] Deploy to production
5. [ ] Set up monitoring and alerts

---

**Last Updated:** 2025-01-09  
**Next Review:** After test suite fixes


