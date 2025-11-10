# Recommended Path Forward: Tutor Quality System

**Date:** 2025-11-09
**Current State:** Solid SPA for identifying tutors, ready for progression visualization and production deployment
**Timeline:** 5-6 days to achieve both primary goals

---

## Executive Decision: Hybrid Approach

After reviewing both task list analyses (Cursor and Claude), I recommend a **Hybrid Approach** that combines:
- **Cursor's thoroughness** for testing and quality assurance
- **Claude's pragmatism** for deployment speed and flexibility

**Why Hybrid?**
- You have an **internal tool** (coaches, not customers) → Lower risk
- You want to **ship quickly** but **responsibly** → 5-6 days is perfect
- You have **comprehensive API tests** already → Lower deployment risk
- You can **monitor and iterate** post-deployment → Agile approach

---

## The Plan: 2 Weeks, 2 Goals

### Week 1: Goal 1 - Individual Tutor Progression (3 days)
**Build the tutor detail page with performance timeline**

### Week 2: Goal 2 - Production Deployment (2-3 days)
**Deploy to production with proper testing and monitoring**

**Total: 5-6 working days**

---

## Week 1: Tutor Progression Visualization

### Day 1-2: Core Infrastructure (Tasks 4.14-4.16)

#### Day 1 Morning: Page Structure (3 hours)
**Task 4.14: Create `/dashboard/tutors/[id]` page**

```bash
# Create the page file
touch src/app/dashboard/tutors/[id]/page.tsx

# Create component directory
mkdir -p src/components/tutor-detail
```

**Deliverables:**
- [ ] Dynamic route setup with `[id]` parameter
- [ ] Basic page layout with header/sidebar
- [ ] Fetch tutor data from `/api/tutors/[id]` endpoint
- [ ] Loading and error states
- [ ] Breadcrumb navigation (Dashboard → Tutors → [Tutor Name])

**Reference:**
- Reuse layout from `src/app/dashboard/page.tsx`
- Reuse data fetching patterns from existing dashboard
- API already returns all needed data (from progress.md line 171)

---

#### Day 1 Afternoon: Header Component (2 hours)
**Task 4.15: Create tutor header component**

```bash
touch src/components/tutor-detail/TutorHeader.tsx
```

**Deliverables:**
- [ ] Tutor name and ID display
- [ ] Current overall score (0-100) with color-coded badge
  - Red (0-50), Yellow (51-80), Green (81-100)
- [ ] Confidence level indicator
- [ ] Quick stats (total sessions, active flags, last session date)
- [ ] Back button to dashboard

**Data Source:** `/api/tutors/[id]` response

---

#### Day 2 Morning: Score Breakdown (3 hours)
**Task 4.16: Create score breakdown component**

```bash
touch src/components/tutor-detail/ScoreBreakdown.tsx
```

**Deliverables:**
- [ ] Four score components displayed:
  - Attendance Score (0-100)
  - Ratings Score (0-100)
  - Completion Score (0-100)
  - Reliability Score (0-100)
- [ ] Visual breakdown (progress bars or circular progress)
- [ ] Trend indicators (↑ improving, ↓ declining, → stable)
- [ ] Tooltips explaining what each score measures

**Data Source:** `/api/tutors/[id]/score` endpoint

---

#### Day 2 Afternoon: Performance Timeline Chart (4 hours) ⭐ **KEY TASK**
**Task 4.17: Create performance timeline chart**

```bash
touch src/components/tutor-detail/PerformanceTimeline.tsx
```

**Deliverables:**
- [ ] Line chart showing overall score over time (last 90 days)
- [ ] Multiple lines for component scores (attendance, ratings, completion, reliability)
- [ ] Time range selector (30/60/90 days)
- [ ] Flag events marked on timeline (vertical markers)
- [ ] Intervention events marked on timeline (different color markers)
- [ ] Tooltips on hover showing exact values and dates
- [ ] Responsive design (mobile/tablet)

**Implementation:**
- Use Recharts `LineChart` component (already installed: `recharts@3.3.0`)
- Data from `performance_history` array in `/api/tutors/[id]` response
- Show trend direction (improving/declining/stable)

**Example Chart Features:**
- X-axis: Time (days)
- Y-axis: Score (0-100)
- Lines: Overall score (bold), component scores (lighter)
- Markers: Flags (red dots), Interventions (blue dots)

---

### Day 3: Supporting Components (Tasks 4.18-4.20)

#### Morning: Active Flags List (2 hours)
**Task 4.18: Create active flags list**

```bash
touch src/components/tutor-detail/ActiveFlags.tsx
```

**Deliverables:**
- [ ] Table/list of current active flags
- [ ] Flag severity badges (Critical, High, Medium, Low)
- [ ] Flag type (No-show, Late, Poor Rating, etc.)
- [ ] Date flagged
- [ ] Quick action button ("Resolve Flag")
- [ ] Empty state if no flags

**Data Source:** `active_flags` from `/api/tutors/[id]`

---

#### Midday: Recent Sessions Table (2 hours)
**Task 4.19: Create recent sessions table**

```bash
touch src/components/tutor-detail/RecentSessions.tsx
```

**Deliverables:**
- [ ] Table of last 20 sessions
- [ ] Columns: Date, Student, Rating, Duration, Status (completed/no-show/rescheduled)
- [ ] Sortable by date/rating
- [ ] Highlight problematic sessions (no-shows, poor ratings)
- [ ] Link to session detail modal (reuse existing `SessionHistoryModal`)
- [ ] Pagination if > 20 sessions

**Data Source:** `recent_sessions` from `/api/tutors/[id]`

---

#### Afternoon: Interventions History (2 hours)
**Task 4.20: Create interventions history**

```bash
touch src/components/tutor-detail/InterventionsHistory.tsx
```

**Deliverables:**
- [ ] Timeline of coaching interventions
- [ ] Intervention type (coaching call, email, training)
- [ ] Date and coach name
- [ ] Notes/description
- [ ] Outcome/status
- [ ] Correlation with performance changes (visual indicator)

**Data Source:** `interventions` from `/api/tutors/[id]`

---

### Day 3 End: Integration & Testing (1 hour)
- [ ] Test all components together on tutor detail page
- [ ] Verify data loading correctly
- [ ] Test responsiveness (mobile/tablet/desktop)
- [ ] Fix any bugs or layout issues
- [ ] Manual QA with different tutor profiles

**End of Week 1 Deliverable:** Fully functional tutor detail page with progression visualization ✅

---

## Week 2: Production Deployment

### Day 4: Pre-Deployment Testing (Full Day)

#### Morning: Test Suite & QA (4 hours)
**Tasks 8.12, 8.14, 8.16: Testing and Bug Fixes**

```bash
# Run all tests
npm run test

# Run type checking
npm run type-check

# Run linting
npm run lint

# Build for production (test build)
npm run build
```

**Deliverables:**
- [ ] **Task 8.12:** All unit tests passing
- [ ] **Task 8.12:** All integration tests passing (API endpoints)
- [ ] **Task 8.14:** Manual QA checklist completed:
  - [ ] Login/logout works
  - [ ] Dashboard loads with scatter plots
  - [ ] Tutor detail page loads for multiple tutors
  - [ ] Performance timeline chart renders correctly
  - [ ] Flagged tutors table works (sorting, pagination)
  - [ ] Session history modal works
  - [ ] All API endpoints return expected data
  - [ ] No console errors
  - [ ] Responsive design works on mobile/tablet
- [ ] **Task 8.16:** Critical bugs identified and fixed

**Skip for now:**
- ⏭️ E2E tests (can add post-deployment if issues arise)
- ⏭️ Load testing (will test with real traffic)

---

#### Afternoon: Error Tracking & Logging (3 hours)
**Tasks 8.1-8.5: Sentry and Logging Setup**

**Step 1: Sentry Setup (1.5 hours)**
```bash
# Create Sentry account
# - Go to sentry.io
# - Create free account
# - Create new project (Next.js)
# - Get DSN key

# Install Sentry
npm install @sentry/nextjs

# Initialize Sentry
npx @sentry/wizard@latest -i nextjs
```

**Deliverables:**
- [ ] **Task 8.1:** Sentry account created
- [ ] **Task 8.2:** Sentry SDK installed and configured
  - [ ] `sentry.client.config.ts` created
  - [ ] `sentry.server.config.ts` created
  - [ ] `NEXT_PUBLIC_SENTRY_DSN` in `.env.local`
- [ ] **Task 8.3:** Error boundaries added to React components
  - [ ] Root error boundary in `app/error.tsx`
  - [ ] Dashboard error boundary in `app/dashboard/error.tsx`
  - [ ] Tutor detail error boundary in `app/dashboard/tutors/[id]/error.tsx`

**Step 2: Structured Logging (1.5 hours)**
```bash
# Install Winston or Pino
npm install winston winston-daily-rotate-file
```

**Deliverables:**
- [ ] **Task 8.4:** Logging library installed (Winston)
- [ ] **Task 8.5:** Log levels configured (DEBUG, INFO, WARN, ERROR)
- [ ] Logging added to:
  - [ ] API routes (request/response logging)
  - [ ] Queue workers (job processing logs)
  - [ ] Error handlers (error details)

**Configuration:**
- Development: Console logging (DEBUG level)
- Production: File logging + Sentry (INFO level)

---

#### Quick Performance Audit (1 hour)
**Tasks 8.7, 8.10: Quick Performance Checks**

**NOT full optimization - just quick audit:**

```bash
# Check database query performance
# - Review slow query logs in Supabase dashboard
# - Check if any queries take > 1 second

# Check dashboard load time
# - Open dashboard in incognito browser
# - Measure time to interactive (should be < 3s)
# - Check Network tab for slow requests
```

**Deliverables:**
- [ ] **Task 8.7:** Quick DB query audit (no slow queries > 1s)
- [ ] **Task 8.10:** Quick dashboard load check (< 3s on good connection)
- [ ] Document any performance issues (fix post-deployment if minor)

**If major issues found (> 5s load time):**
- Investigate and fix before deployment
- Otherwise, document and defer to post-deployment optimization

---

### Day 5: Deployment Day

#### Morning: Vercel Setup & Staging (3 hours)
**Tasks 8.17-8.21: Staging Deployment**

**Step 1: Vercel Account Setup (30 min)**
```bash
# Create Vercel account
# - Go to vercel.com
# - Sign up with GitHub
# - Import tutor-quality repository

# Install Vercel CLI
npm install -g vercel
```

**Deliverables:**
- [ ] **Task 8.17:** Vercel account created and linked to GitHub repo

---

**Step 2: Environment Variables (30 min)**

**Deliverables:**
- [ ] **Task 8.18:** Production environment variables configured in Vercel:
  - [ ] `DATABASE_URL` (production Supabase connection string)
  - [ ] `REDIS_URL` (production Upstash Redis URL)
  - [ ] `WEBHOOK_SECRET` (HMAC secret for webhook signature verification)
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` (Supabase project URL)
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase anon key)
  - [ ] `NEXT_PUBLIC_SENTRY_DSN` (Sentry DSN for client-side errors)
  - [ ] `SENTRY_AUTH_TOKEN` (if needed for source maps)
  - [ ] Any other secrets from `.env.local`

**Important:** Use production database and Redis instances (not development)

---

**Step 3: Staging Environment (1 hour)**

```bash
# Create staging branch
git checkout -b staging
git push origin staging

# Deploy to Vercel staging
vercel --prod=false
```

**Deliverables:**
- [ ] **Task 8.19:** Staging environment created in Vercel
  - [ ] Separate deployment from production
  - [ ] Staging URL generated (e.g., `tutor-quality-staging.vercel.app`)
  - [ ] Staging environment variables configured (can use same as prod or separate staging DB)

---

**Step 4: Staging Smoke Tests (1 hour)**

**Deliverables:**
- [ ] **Task 8.20:** Deployed to staging successfully
- [ ] **Task 8.21:** Smoke tests passed on staging:
  - [ ] App loads without errors
  - [ ] Login works
  - [ ] Dashboard displays data
  - [ ] Tutor detail page loads
  - [ ] Performance timeline chart renders
  - [ ] API endpoints respond correctly
  - [ ] No console errors in production build
  - [ ] Database connections work
  - [ ] Queue workers process jobs (if deployed)
  - [ ] Sentry error tracking works (trigger test error)

**If any smoke tests fail:**
- Fix issues in staging
- Re-deploy and re-test
- Do NOT proceed to production until all tests pass

---

#### Afternoon: Production Deployment (1-2 hours)
**Task 8.22: Deploy to Production**

**Step 1: Final Checks (15 min)**
- [ ] All staging smoke tests passed
- [ ] No critical bugs found
- [ ] Environment variables verified
- [ ] Database migrations applied (if any)
- [ ] Git main branch is clean and up-to-date

**Step 2: Production Deployment (15 min)**

```bash
# Merge staging to main
git checkout main
git merge staging
git push origin main

# Vercel auto-deploys main branch to production
# Or manually deploy:
vercel --prod
```

**Deliverables:**
- [ ] **Task 8.22:** Deployed to production
  - [ ] Production URL live (e.g., `tutor-quality.vercel.app`)
  - [ ] All features working in production
  - [ ] No errors in Sentry dashboard
  - [ ] Database queries performing well

---

**Step 3: Post-Deployment Validation (30 min)**
- [ ] Verify production deployment successful
- [ ] Test login in production
- [ ] Load dashboard with real data
- [ ] Open tutor detail page
- [ ] Check performance timeline chart
- [ ] Trigger webhook endpoint (test with mock payload)
- [ ] Check Sentry for any errors
- [ ] Monitor queue workers (if applicable)

---

#### Late Afternoon: Monitoring Setup (1-2 hours)
**Tasks 8.24-8.25: Monitoring and Alerts**

**Step 1: Sentry Alerts (30 min)**

**Deliverables:**
- [ ] **Task 8.24:** Sentry alerts configured
  - [ ] Email alerts for critical errors
  - [ ] Slack integration (if available)
  - [ ] Alert thresholds set (> 10 errors/hour = critical)
  - [ ] Test alert triggered successfully

**Step 2: Uptime Monitoring (30 min)**

```bash
# Options:
# 1. Vercel built-in monitoring (free)
# 2. UptimeRobot (free tier: uptimerobot.com)
# 3. Better Uptime (free tier: betterstack.com/uptime)
```

**Deliverables:**
- [ ] **Task 8.25:** Uptime monitoring configured
  - [ ] Ping dashboard URL every 5 minutes
  - [ ] Email alert if down > 5 minutes
  - [ ] Test alert triggered successfully

**Optional (defer if time-constrained):**
- ⏭️ **Task 8.26:** Create ops dashboard (can use Bull Board for queue monitoring)
- ⏭️ **Task 8.27:** Set up cost alerts (Vercel/Supabase dashboards)

---

### Day 6 (Post-Deployment): Monitoring & Optimization

#### Load Testing with Real Traffic (Optional)
**Task 8.15: Test with realistic load**

- [ ] Monitor production for 24 hours
- [ ] Check metrics:
  - [ ] Dashboard load time (< 2s target)
  - [ ] API response times (< 500ms target)
  - [ ] Database query performance
  - [ ] Error rate (< 1% target)
  - [ ] Queue processing time (< 5s target)

**If performance issues found:**
- [ ] **Task 8.8-8.9:** Add Redis caching for frequently accessed data
- [ ] Optimize slow database queries
- [ ] Add indexes if needed

**If no issues:**
- ✅ Performance is acceptable, defer optimization

---

## Success Criteria

### Goal 1: Tutor Progression Visualization ✅
- [ ] Tutor detail page exists at `/dashboard/tutors/[id]`
- [ ] Performance timeline chart shows score trends over time
- [ ] Coaches can see individual tutor progression
- [ ] Flags and interventions visible in context
- [ ] All components responsive and polished

### Goal 2: Production Deployment ✅
- [ ] Application deployed to Vercel production
- [ ] Staging environment available for testing
- [ ] Error tracking configured (Sentry)
- [ ] Monitoring configured (uptime checks)
- [ ] No critical bugs in production
- [ ] Performance acceptable (< 2s dashboard load)
- [ ] Real coach users can access and use the system

---

## Timeline Summary

| Day | Focus | Deliverables |
|-----|-------|--------------|
| **Day 1** | Page infrastructure & header | Tasks 4.14, 4.15 |
| **Day 2** | Score breakdown & timeline chart | Tasks 4.16, 4.17 ⭐ |
| **Day 3** | Supporting components | Tasks 4.18, 4.19, 4.20 |
| **Day 4** | Testing & monitoring setup | Tasks 8.1-8.5, 8.7, 8.10, 8.12, 8.14, 8.16 |
| **Day 5** | Staging & production deployment | Tasks 8.17-8.22, 8.24-8.25 |
| **Day 6** | Post-deployment monitoring | Task 8.15 (optional) |

**Total: 5-6 working days**

---

## Risk Mitigation

### Potential Blockers & Solutions:

**Blocker 1: Performance timeline chart is complex**
- **Solution:** Start with simple line chart, add features incrementally
- **Fallback:** Show table of scores over time if chart fails

**Blocker 2: Staging smoke tests fail**
- **Solution:** Debug in staging, do NOT deploy to production until fixed
- **Timeline buffer:** Add 1 day if major issues found

**Blocker 3: Production issues after deployment**
- **Solution:** Sentry alerts notify immediately, rollback if critical
- **Monitoring:** Watch Sentry dashboard for first 24 hours

**Blocker 4: Database performance issues in production**
- **Solution:** Add caching (Task 8.8-8.9) post-deployment
- **Quick fix:** Increase Supabase tier if needed

---

## Post-Deployment (Week 3+)

### Phase 3: Polish & Iteration (Optional)
After both goals achieved, consider:

**High Priority:**
- [ ] **Task 9.1-9.3:** Create API documentation for Nerdy integration
- [ ] **Task 9.13-9.15:** Demo video, handoff meeting with Nerdy team
- [ ] User feedback from coaches (iterate based on real usage)

**Medium Priority:**
- [ ] **Task 4.1-4.7:** Dashboard home improvements (aggregate trends)
- [ ] **Tasks 8.8-8.9:** Redis caching (if performance needs it)
- [ ] **Task 8.13:** E2E tests (Playwright)

**Low Priority:**
- [ ] **Tasks 4.31-4.35:** Mobile responsiveness polish, dark mode
- [ ] **Phase 7:** NLP analysis (future enhancement)

---

## Daily Standup Questions

Each day, ask yourself:

1. **What did I complete yesterday?** (check off deliverables)
2. **What am I working on today?** (reference this plan)
3. **Any blockers?** (see Risk Mitigation section)
4. **Am I on track for 5-6 day timeline?** (adjust if falling behind)

---

## Key Decision Points

### Decision 1: Skip performance optimization pre-deployment?
**Recommendation:** YES - Quick audit only, optimize post-deployment if needed
**Reasoning:** API tests are comprehensive, small user base, can monitor and fix

### Decision 2: Use staging environment?
**Recommendation:** YES - Absolutely use staging
**Reasoning:** Catches deployment issues before production, adds only 1 hour

### Decision 3: Skip E2E tests?
**Recommendation:** YES - Defer to post-deployment
**Reasoning:** API tests + manual QA sufficient, can add E2E later if issues arise

### Decision 4: Skip load testing pre-deployment?
**Recommendation:** YES - Test with real traffic
**Reasoning:** Synthetic load tests don't reflect real usage, monitor in production

---

## What Could Go Wrong? (And How to Recover)

### Scenario 1: Week 1 takes 4-5 days instead of 3
**Recovery:** Simplify Week 2 - skip performance audit, go straight to deployment
**Impact:** Total timeline becomes 6-7 days (still acceptable)

### Scenario 2: Critical bug found in production
**Recovery:** Sentry alerts immediately, rollback deployment, fix in staging, re-deploy
**Impact:** 1-2 hour downtime (acceptable for internal tool)

### Scenario 3: Performance is terrible in production
**Recovery:** Add Redis caching immediately (Tasks 8.8-8.9)
**Impact:** 2-4 hours to implement caching

### Scenario 4: Coaches don't like the tutor detail page
**Recovery:** Gather feedback, iterate in Week 3
**Impact:** Additional polish time, but core functionality exists

---

## Success Metrics (Check After Week 2)

### Technical Success:
- ✅ Application deployed to production (Goal 2 complete)
- ✅ Tutor detail page with timeline chart live (Goal 1 complete)
- ✅ Zero critical bugs in production
- ✅ Dashboard load time < 3s
- ✅ Error rate < 1%

### Business Success:
- ✅ Coaches can access individual tutor progression
- ✅ Performance trends visualized over time
- ✅ Flags and interventions visible in context
- ✅ System ready for real coach usage

---

## Final Checklist (Before Calling It Done)

- [ ] Both primary goals achieved:
  - [ ] **Goal 1:** Individual tutor progression visualization ✅
  - [ ] **Goal 2:** Production deployment ✅
- [ ] All critical tasks completed (Tasks 4.14-4.20, 8.1-8.5, 8.12, 8.14, 8.16, 8.17-8.22, 8.24-8.25)
- [ ] No critical bugs in production
- [ ] Monitoring and alerts configured
- [ ] Documentation updated (README, API docs)
- [ ] Handoff to Nerdy team scheduled

---

**Document Status:** Ready for execution
**Next Action:** Begin Day 1 - Task 4.14 (Create tutor detail page)
**Timeline:** 5-6 working days to achieve both primary goals

**Good luck! 🚀**
