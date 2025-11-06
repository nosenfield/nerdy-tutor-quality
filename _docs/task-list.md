# Task List: Tutor Quality Scoring System (0 to 1)

## Document Purpose
This task list breaks down the complete implementation into manageable tasks with time estimates, priorities, and dependencies.

**Total Estimated Time:** 6-8 weeks (1 developer, full-time)

---

## Table of Contents
1. [Phase 0: Project Setup](#phase-0-project-setup)
2. [Phase 1: Core Infrastructure](#phase-1-core-infrastructure)
3. [Phase 2: Mock Data & Testing](#phase-2-mock-data--testing)
4. [Phase 3: Rules Engine (Tier 1)](#phase-3-rules-engine-tier-1)
5. [Phase 4: Dashboard UI](#phase-4-dashboard-ui)
6. [Phase 5: Job Queue & Workers](#phase-5-job-queue--workers)
7. [Phase 6: NLP Analysis (Tier 2)](#phase-6-nlp-analysis-tier-2)
8. [Phase 7: Polish & Production](#phase-7-polish--production)
9. [Phase 8: Handoff & Documentation](#phase-8-handoff--documentation)

---

## Legend

**Status:**
- ⬜ Not started
- 🟦 In progress
- ✅ Complete
- ❌ Blocked

---

## Phase 0: Project Setup
**Goal:** Initialize project with proper tooling and configuration
**Duration:** 1 day
**Prerequisites:** None

### Tasks

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 0.1 | Create Next.js 16 project with TypeScript | ✅ | `npx create-next-app@latest` |
| 0.2 | Install and configure Tailwind CSS | ✅ | Official Next.js + Tailwind guide |
| 0.3 | Set up Headless UI component library | ✅ | `pnpm add @headlessui/react` |
| 0.4 | Configure ESLint + Prettier | ✅ | Strict mode, auto-format on save |
| 0.5 | Set up Husky + lint-staged | ⬜ | Pre-commit hooks (deferred - P1 optional) |
| 0.6 | Configure TypeScript strict mode | ✅ | `"strict": true` in tsconfig.json |
| 0.7 | Install Drizzle ORM + dependencies | ✅ | `drizzle-orm`, `drizzle-kit` |
| 0.8 | Create `.env.example` with all required vars | ✅ | Document all environment variables |
| 0.9 | Set up GitHub repository | ✅ | Initialize with README |
| 0.10 | Create basic directory structure | ✅ | Follow architecture.md structure |

**Completion Criteria:**
- ✅ `pnpm dev` runs without errors
- ✅ Tailwind styles working
- ✅ TypeScript compiles with no errors
- ✅ Git repository initialized

---

## Phase 1: Core Infrastructure
**Goal:** Set up database, authentication, and core utilities
**Duration:** 3-4 days
**Prerequisites:** Phase 0 complete

### Database Setup

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 1.1 | Create Supabase account and project | ✅ | Free tier is sufficient for dev |
| 1.2 | Configure Supabase connection in `.env.local` | ✅ | Get connection strings |
| 1.3 | Create Drizzle schema for `sessions` table | ✅ | Use SessionData interface |
| 1.4 | Create Drizzle schema for `tutor_scores` table | ✅ | Aggregated metrics |
| 1.5 | Create Drizzle schema for `flags` table | ✅ | Coaching alerts |
| 1.6 | Create Drizzle schema for `interventions` table | ✅ | Track coaching actions |
| 1.7 | Create Drizzle schema for `tutor_analytics` table | ⬜ | For Phase 7 (deferred - optional) |
| 1.8 | Generate and run initial migration | ✅ | `drizzle-kit generate` + `migrate` |
| 1.9 | Create database indexes | ✅ | Follow architecture.md index strategy |
| 1.10 | Test database connection | ✅ | `pnpm test:db` |

### Core Utilities

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 1.11 | Create `src/lib/db/index.ts` - database client | ✅ | Drizzle + connection pooling |
| 1.12 | Create `src/lib/types/session.ts` - SessionData interface | ✅ | Match database schema |
| 1.13 | Create `src/lib/types/tutor.ts` - Tutor interfaces | ✅ | TutorScore, TutorAnalytics |
| 1.14 | Create `src/lib/types/flag.ts` - Flag interfaces | ✅ | Flag types and severities |
| 1.15 | Create `src/lib/utils/time.ts` - date/time helpers | ✅ | differenceInMinutes, etc. |
| 1.16 | Create `src/lib/utils/stats.ts` - statistical helpers | ✅ | averages, percentiles, trends |
| 1.17 | Create `src/lib/utils/validation.ts` - Zod schemas | ✅ | Validate webhook payloads |
| 1.18 | Write unit tests for time utilities | ⬜ | Vitest (deferred) |
| 1.19 | Write unit tests for stats utilities | ⬜ | Vitest (deferred) |

### Authentication (Simple)

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 1.20 | Set up Supabase Auth | ⬜ | Email/password for demo (deferred to Phase 4) |
| 1.21 | Create login page (`/login`) | ⬜ | Simple form (deferred to Phase 4) |
| 1.22 | Create auth middleware | ⬜ | Protect dashboard routes (deferred to Phase 4) |
| 1.23 | Add logout functionality | ⬜ | Clear session (deferred to Phase 4) |

**Completion Criteria:**
- ✅ Database tables created and migrated
- ✅ Can insert and query sessions
- ✅ Utility functions tested and working
- ⬜ Basic auth flow working (deferred to Phase 4)

---

## Phase 2: Mock Data & Testing
**Goal:** Generate realistic mock data for development and testing
**Duration:** 2-3 days
**Prerequisites:** Phase 1 complete

### Mock Data Generation

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 2.1 | Install Faker.js | ✅ | `@faker-js/faker` |
| 2.2 | Create tutor persona types | ✅ | Excellent, good, average, struggling, problematic |
| 2.3 | Create `generateMockTutor()` function | ✅ | Generate tutors with realistic stats |
| 2.4 | Create `generateMockStudent()` function | ✅ | Students with varying rating patterns |
| 2.5 | Create `generateMockSession()` function | ✅ | Realistic sessions based on tutor persona |
| 2.6 | Add realistic rating distributions | ✅ | Left-skewed (mostly 4-5 stars) |
| 2.7 | Add realistic timing patterns | ✅ | Lateness, early ends, no-shows |
| 2.8 | Add first session vs. ongoing logic | ✅ | First sessions have lower ratings |
| 2.9 | Add reschedule patterns | ✅ | 98.2% tutor-initiated |
| 2.10 | Create "problem tutor" seed scenarios | ✅ | Specific tutors with known issues |
| 2.11 | Create seed script (`scripts/seed-mock-data.ts`) | ✅ | `pnpm db:seed` - generates 105 tutors, 3,150 sessions |
| 2.12 | Validate mock data distributions | ✅ | Check averages match reality |
| 2.13 | Create script to reset database | ✅ | `pnpm db:reset` - clears all tables |

### Test Data Scenarios

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 2.14 | Create "chronic no-show tutor" scenario | ✅ | 16% no-show rate |
| 2.15 | Create "always late tutor" scenario | ✅ | Avg 15 min late |
| 2.16 | Create "poor first sessions tutor" scenario | ✅ | 2.1 avg first session rating |
| 2.17 | Create "frequent rescheduler tutor" scenario | ✅ | 30% reschedule rate |
| 2.18 | Create "ends sessions early tutor" scenario | ✅ | Avg 20 min early |
| 2.19 | Create "excellent tutor" scenario | ✅ | For comparison |

**Completion Criteria:**
- ✅ Can generate 3,150 realistic sessions with one command
- ✅ Data distributions match industry benchmarks
- ✅ "Problem tutors" exhibit expected patterns
- ✅ Can reset database and re-seed easily

---

## Phase 3: Rules Engine (Tier 1)
**Goal:** Build fast, rules-based quality scoring  
**Duration:** 3-4 days  
**Prerequisites:** Phase 2 complete

### Core Rules Implementation

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 3.1 | Create `src/lib/scoring/rules-engine.ts` | ⬜ | Main rules engine file |
| 3.2 | Implement no-show detection | ⬜ | `tutor_join_time === null` |
| 3.3 | Implement lateness detection | ⬜ | > 5 min late = flag |
| 3.4 | Implement early-end detection | ⬜ | Ended > 10 min early = flag |
| 3.5 | Implement poor first session detection | ⬜ | First session rating ≤ 2 = flag |
| 3.6 | Create `getTutorStats()` function | ⬜ | Aggregate last 30/60/90 days |
| 3.7 | Implement high reschedule rate detection | ⬜ | > 15% in 30 days = flag |
| 3.8 | Implement chronic lateness detection | ⬜ | > 30% sessions late = flag |
| 3.9 | Implement declining rating trend detection | ⬜ | 7d < 30d < 90d avg |
| 3.10 | Create flag severity logic | ⬜ | Critical, high, medium, low |

### Scoring Algorithm

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 3.11 | Create `src/lib/scoring/aggregator.ts` | ⬜ | Combine signals into score |
| 3.12 | Implement attendance score (0-100) | ⬜ | Based on no-shows, lateness |
| 3.13 | Implement ratings score (0-100) | ⬜ | Based on avg ratings |
| 3.14 | Implement completion score (0-100) | ⬜ | Based on early ends |
| 3.15 | Implement reliability score (0-100) | ⬜ | Based on reschedules |
| 3.16 | Calculate overall score (weighted average) | ⬜ | 0-100 composite score |
| 3.17 | Implement confidence scoring | ⬜ | Bayesian average for new tutors |
| 3.18 | Create `src/lib/scoring/thresholds.ts` | ⬜ | Configurable thresholds |

### Testing

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 3.19 | Write unit tests for no-show detection | ⬜ | Edge cases |
| 3.20 | Write unit tests for lateness detection | ⬜ | Timezone handling |
| 3.21 | Write unit tests for aggregator | ⬜ | Score calculations |
| 3.22 | Write unit tests for confidence scoring | ⬜ | New tutor handling |
| 3.23 | Test with mock "problem tutors" | ⬜ | Should catch all issues |
| 3.24 | Test with mock "excellent tutors" | ⬜ | Should not flag |

**Completion Criteria:**
- ✅ Rules engine catches all "problem tutor" scenarios
- ✅ Excellent tutors get scores > 80
- ✅ Problem tutors get scores < 50
- ✅ All unit tests passing
- ✅ Confidence scoring handles new tutors correctly

---

## Phase 4: Dashboard UI
**Goal:** Build coach dashboard for viewing scores and flags  
**Duration:** 5-6 days  
**Prerequisites:** Phase 3 complete

### Dashboard Home

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 4.1 | Create `/dashboard` layout component | ⬜ | Sidebar + header |
| 4.2 | Create dashboard home page | ⬜ | Overview stats |
| 4.3 | Create stats overview component | ⬜ | KPI cards (today's flags, etc.) |
| 4.4 | Install and configure Recharts | ⬜ | For charts |
| 4.5 | Create performance trend chart | ⬜ | Line chart of avg scores |
| 4.6 | Create flags breakdown chart | ⬜ | Bar chart by flag type |
| 4.7 | Create recent flags list | ⬜ | Table of latest flags |

### Tutors List Page

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 4.8 | Create `/dashboard/tutors` page | ⬜ | List all tutors |
| 4.9 | Create tutors table component | ⬜ | sortable, filterable |
| 4.10 | Add score badge component | ⬜ | Color-coded (red/yellow/green) |
| 4.11 | Add filters (score range, has flags) | ⬜ | Client-side filtering |
| 4.12 | Add sorting (by score, name, sessions) | ⬜ | Click headers to sort |
| 4.13 | Add pagination | ⬜ | 20 tutors per page |

### Tutor Detail Page

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 4.14 | Create `/dashboard/tutors/[id]` page | ⬜ | Tutor detail view |
| 4.15 | Create tutor header component | ⬜ | Name, ID, overall score |
| 4.16 | Create score breakdown component | ⬜ | Attendance, ratings, etc. |
| 4.17 | Create performance timeline chart | ⬜ | Line chart over time |
| 4.18 | Create active flags list | ⬜ | Current issues |
| 4.19 | Create recent sessions table | ⬜ | Last 20 sessions |
| 4.20 | Create interventions history | ⬜ | Past coaching actions |

### Flags Page

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 4.21 | Create `/dashboard/flags` page | ⬜ | All flags list |
| 4.22 | Create flags table component | ⬜ | Sortable by severity, date |
| 4.23 | Add status filters (open/resolved) | ⬜ | Filter tabs |
| 4.24 | Add severity filters | ⬜ | Critical, high, medium, low |
| 4.25 | Create flag card component | ⬜ | Display flag details |

### Flag Detail Page

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 4.26 | Create `/dashboard/flags/[id]` page | ⬜ | Flag detail view |
| 4.27 | Show flag details and context | ⬜ | All flag metadata |
| 4.28 | Show related sessions | ⬜ | Sessions that triggered flag |
| 4.29 | Create "resolve flag" form | ⬜ | Mark as resolved with notes |
| 4.30 | Create intervention form | ⬜ | Record coaching action |

### Responsive Design & Polish

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 4.31 | Make dashboard mobile-responsive | ⬜ | Tablet and phone views |
| 4.32 | Add loading states | ⬜ | Skeletons for async data |
| 4.33 | Add error states | ⬜ | Friendly error messages |
| 4.34 | Add empty states | ⬜ | "No flags" illustrations |
| 4.35 | Implement dark mode | ⬜ | Optional, nice to have |

**Completion Criteria:**
- ✅ Dashboard shows all tutors with scores
- ✅ Can drill down to tutor detail
- ✅ Can view and filter flags
- ✅ Can resolve flags with notes
- ✅ UI is polished and intuitive

---

## Phase 5: Job Queue & Workers
**Goal:** Set up async processing for webhooks  
**Duration:** 3-4 days  
**Prerequisites:** Phase 3 complete

### Queue Setup

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 5.1 | Create Upstash Redis account | ⬜ | Serverless Redis |
| 5.2 | Install Bull and dependencies | ⬜ | `bull`, `ioredis` |
| 5.3 | Create `src/lib/queue/index.ts` | ⬜ | Bull queue config |
| 5.4 | Create priority queues | ⬜ | High, normal, low priority |
| 5.5 | Configure retry logic | ⬜ | Exponential backoff |
| 5.6 | Set up queue monitoring | ⬜ | Bull Board for UI |

### Job Definitions

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 5.7 | Create `src/lib/queue/jobs.ts` | ⬜ | Job type definitions |
| 5.8 | Define `process-session` job | ⬜ | Main processing job |
| 5.9 | Define `calculate-tutor-score` job | ⬜ | Aggregate tutor stats |
| 5.10 | Define `send-alert` job | ⬜ | Email/Slack notifications |
| 5.11 | Define `daily-analysis` job | ⬜ | Overnight batch |

### Workers Implementation

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 5.12 | Create `src/lib/queue/workers.ts` | ⬜ | Job processors |
| 5.13 | Implement `processSession` worker | ⬜ | Tier 1 processing |
| 5.14 | Implement `calculateTutorScore` worker | ⬜ | Update tutor_scores table |
| 5.15 | Implement `sendAlert` worker | ⬜ | Email/Slack integration |
| 5.16 | Add error handling to workers | ⬜ | Catch and log errors |
| 5.17 | Add logging to workers | ⬜ | Structured logs |

### Integration Testing

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 5.18 | Test job queuing | ⬜ | Jobs added to queue |
| 5.19 | Test job processing | ⬜ | Jobs execute correctly |
| 5.20 | Test retry logic | ⬜ | Failed jobs retry |
| 5.21 | Test priority queuing | ⬜ | High priority first |
| 5.22 | Load test with 100 concurrent jobs | ⬜ | Simulate peak load |

**Completion Criteria:**
- ✅ Jobs can be added to queue
- ✅ Workers process jobs successfully
- ✅ Failed jobs retry automatically
- ✅ Can monitor queue status
- ✅ High-priority jobs processed first

---

## Phase 6: API Routes
**Goal:** Build REST API for webhook and dashboard  
**Duration:** 3-4 days  
**Prerequisites:** Phase 5 complete

### Webhook Endpoint

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 6.1 | Create `/api/webhooks/session-completed/route.ts` | ⬜ | Webhook handler |
| 6.2 | Implement payload validation with Zod | ⬜ | Validate SessionData |
| 6.3 | Implement signature verification | ⬜ | HMAC-SHA256 |
| 6.4 | Store session in database | ⬜ | Insert into sessions table |
| 6.5 | Queue processing job | ⬜ | Add to Bull queue |
| 6.6 | Return 200 quickly (< 2s) | ⬜ | Don't block on processing |
| 6.7 | Add rate limiting | ⬜ | 100 req/min per IP |
| 6.8 | Add error handling | ⬜ | Return appropriate errors |

### Session Endpoints

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 6.9 | Create `GET /api/sessions` endpoint | ⬜ | List sessions with filters |
| 6.10 | Create `GET /api/sessions/[id]` endpoint | ⬜ | Get session detail |
| 6.11 | Add pagination to sessions list | ⬜ | limit/offset params |
| 6.12 | Add filtering (tutor, date range) | ⬜ | Query params |

### Tutor Endpoints

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 6.13 | Create `GET /api/tutors` endpoint | ⬜ | List tutors with scores |
| 6.14 | Create `GET /api/tutors/[id]` endpoint | ⬜ | Get tutor detail |
| 6.15 | Create `GET /api/tutors/[id]/score` endpoint | ⬜ | Get current score |
| 6.16 | Add pagination to tutors list | ⬜ | limit/offset params |
| 6.17 | Add sorting (by score, name) | ⬜ | sort_by param |
| 6.18 | Add filtering (min_score, has_flags) | ⬜ | Query params |

### Flag Endpoints

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 6.19 | Create `GET /api/flags` endpoint | ⬜ | List flags with filters |
| 6.20 | Create `GET /api/flags/[id]` endpoint | ⬜ | Get flag detail |
| 6.21 | Create `POST /api/flags/[id]/resolve` endpoint | ⬜ | Mark flag resolved |
| 6.22 | Add status filtering (open/resolved) | ⬜ | Query params |
| 6.23 | Add severity filtering | ⬜ | Query params |

### Analytics Endpoints

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 6.24 | Create `GET /api/analytics/overview` endpoint | ⬜ | Dashboard stats |
| 6.25 | Create `GET /api/analytics/trends` endpoint | ⬜ | Time-series data |

### API Testing

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 6.26 | Write integration tests for webhook | ⬜ | Test happy path |
| 6.27 | Write integration tests for sessions API | ⬜ | CRUD operations |
| 6.28 | Write integration tests for tutors API | ⬜ | Filters and sorting |
| 6.29 | Write integration tests for flags API | ⬜ | Resolve workflow |
| 6.30 | Create Postman/Bruno collection | ⬜ | Manual testing |

**Completion Criteria:**
- ✅ Webhook accepts valid payloads
- ✅ All CRUD endpoints working
- ✅ Filtering and pagination work correctly
- ✅ Integration tests passing
- ✅ API documented

---

## Phase 7: NLP Analysis (Tier 2) - OPTIONAL
**Goal:** Add GPT-powered quality analysis  
**Duration:** 2-3 days  
**Prerequisites:** Phase 6 complete

**Note:** This phase is OPTIONAL for MVP. Can be deferred to Phase 2 of the project.

### OpenAI Integration

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 7.1 | Create OpenAI account and get API key | ⬜ | Set budget limits |
| 7.2 | Install OpenAI SDK | ⬜ | `openai` package |
| 7.3 | Create `src/lib/ai/openai.ts` client | ⬜ | OpenAI config |
| 7.4 | Create prompt templates | ⬜ | `src/lib/ai/prompts.ts` |

### NLP Features

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 7.5 | Create `src/lib/scoring/nlp-analysis.ts` | ⬜ | NLP scoring file |
| 7.6 | Implement empathy score extraction | ⬜ | From AI summary |
| 7.7 | Implement clarity score extraction | ⬜ | Explanation quality |
| 7.8 | Implement engagement detection | ⬜ | Student participation |
| 7.9 | Implement red flag detection | ⬜ | Problematic language |
| 7.10 | Add NLP scores to overall score | ⬜ | Weight with behavioral |

### Cost Optimization

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 7.11 | Implement response caching | ⬜ | Cache in Redis |
| 7.12 | Use GPT-3.5 for most sessions | ⬜ | 90% of volume |
| 7.13 | Use GPT-4 only for critical sessions | ⬜ | First sessions, flags |
| 7.14 | Add cost tracking | ⬜ | Monitor API spend |

**Completion Criteria:**
- ✅ NLP analysis running on sessions with summaries
- ✅ Quality scores improve model accuracy
- ✅ API costs under $30/day
- ✅ Can disable NLP with feature flag

---

## Phase 8: Polish & Production
**Goal:** Production readiness and deployment  
**Duration:** 3-4 days  
**Prerequisites:** Phase 6 complete

### Error Handling & Monitoring

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 8.1 | Set up Sentry account | ⬜ | Error tracking |
| 8.2 | Integrate Sentry in Next.js | ⬜ | Add middleware |
| 8.3 | Add error boundaries to React | ⬜ | Catch component errors |
| 8.4 | Set up structured logging | ⬜ | Pino or Winston |
| 8.5 | Configure log levels | ⬜ | Debug/Info/Warn/Error |
| 8.6 | Add request tracing | ⬜ | Trace ID per request |

### Performance Optimization

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 8.7 | Add database query optimization | ⬜ | Check slow queries |
| 8.8 | Implement Redis caching | ⬜ | Cache tutor scores |
| 8.9 | Add cache invalidation | ⬜ | Clear on updates |
| 8.10 | Optimize dashboard load time | ⬜ | Code splitting |
| 8.11 | Add image optimization | ⬜ | Next.js Image component |

### Testing & QA

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 8.12 | Run full test suite | ⬜ | All unit + integration |
| 8.13 | Write E2E tests for dashboard | ⬜ | Playwright |
| 8.14 | Manual QA testing | ⬜ | Test all features |
| 8.15 | Test with realistic load | ⬜ | 3,000 sessions/day |
| 8.16 | Fix critical bugs | ⬜ | From QA testing |

### Deployment

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 8.17 | Create Vercel account | ⬜ | Connect to GitHub |
| 8.18 | Configure production environment variables | ⬜ | All secrets |
| 8.19 | Set up staging environment | ⬜ | Test before prod |
| 8.20 | Deploy to staging | ⬜ | Test live |
| 8.21 | Run smoke tests on staging | ⬜ | Verify all features |
| 8.22 | Deploy to production | ⬜ | Go live! |
| 8.23 | Set up custom domain (if needed) | ⬜ | tutor-scoring.nerdy.com |

### Monitoring & Alerts

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 8.24 | Configure Sentry alerts | ⬜ | Email on errors |
| 8.25 | Set up Uptime monitoring | ⬜ | Ping every 5 min |
| 8.26 | Create ops dashboard | ⬜ | System health metrics |
| 8.27 | Set up cost alerts | ⬜ | Alert if > $50/day |

**Completion Criteria:**
- ✅ Zero critical bugs
- ✅ All tests passing
- ✅ Deployed to production
- ✅ Monitoring and alerts configured
- ✅ Performance acceptable (< 2s page load)

---

## Phase 9: Handoff & Documentation
**Goal:** Prepare for Nerdy integration  
**Duration:** 2-3 days  
**Prerequisites:** Phase 8 complete

### Documentation

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 9.1 | Write API reference documentation | ⬜ | All endpoints |
| 9.2 | Create webhook integration guide | ⬜ | For Nerdy devs |
| 9.3 | Write deployment guide | ⬜ | How to deploy |
| 9.4 | Create admin user guide | ⬜ | How coaches use it |
| 9.5 | Document environment variables | ⬜ | All required vars |
| 9.6 | Create troubleshooting guide | ⬜ | Common issues |
| 9.7 | Write runbook for ops | ⬜ | Incident response |

### Code Quality

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 9.8 | Code review and refactoring | ⬜ | Clean up tech debt |
| 9.9 | Add inline code comments | ⬜ | Document complex logic |
| 9.10 | Update README.md | ⬜ | Project overview |
| 9.11 | Create CONTRIBUTING.md | ⬜ | How to contribute |
| 9.12 | Add LICENSE file | ⬜ | MIT or Apache 2.0 |

### Training & Handoff

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 9.13 | Create demo video | ⬜ | Loom walkthrough |
| 9.14 | Prepare presentation slides | ⬜ | Architecture overview |
| 9.15 | Schedule handoff meeting with Nerdy | ⬜ | Live demo |
| 9.16 | Create FAQ document | ⬜ | Common questions |
| 9.17 | Provide 30-day support plan | ⬜ | Post-launch support |

### Final Testing

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 9.18 | End-to-end system test | ⬜ | Full workflow |
| 9.19 | Load test with 10K sessions | ⬜ | Stress test |
| 9.20 | Security audit | ⬜ | Check vulnerabilities |
| 9.21 | Performance audit | ⬜ | Lighthouse score |

**Completion Criteria:**
- ✅ All documentation complete
- ✅ Demo video created
- ✅ Handoff meeting successful
- ✅ Nerdy can integrate webhook
- ✅ Support plan in place

---

## Summary: Timeline & Milestones

### Week-by-Week Breakdown

**Week 1: Foundation**
- Phase 0: Project Setup (Day 1)
- Phase 1: Core Infrastructure (Days 2-5)

**Week 2: Data & Rules**
- Phase 2: Mock Data & Testing (Days 1-3)
- Phase 3: Rules Engine (Days 4-5)

**Week 3-4: Dashboard**
- Phase 4: Dashboard UI (Weeks 3-4)

**Week 5: Backend Processing**
- Phase 5: Job Queue & Workers (Days 1-3)
- Phase 6: API Routes (Days 4-5)

**Week 6: Polish**
- Phase 7: NLP Analysis (Optional, Days 1-3)
- Phase 8: Polish & Production (Days 4-5)

**Week 7-8: Launch**
- Phase 8: Production Deployment (Week 7)
- Phase 9: Handoff & Documentation (Week 8)

### Critical Path

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 5 → Phase 6 → Phase 8 → Phase 9
                              ↓
                          Phase 4 (parallel)
```

**Minimum Viable Product (MVP):** Phases 0-6, 8-9 (6 weeks)  
**Full Feature Set:** All phases (8 weeks)

---

## Risk Mitigation

### High-Risk Tasks
1. **Mock Data Realism (2.1-2.19)** - Critical for testing
   - Mitigation: Validate against industry benchmarks early
   
2. **Rules Engine Accuracy (3.1-3.18)** - Core value proposition
   - Mitigation: Test with known "problem tutors" continuously
   
3. **Job Queue Performance (5.1-5.22)** - Must handle 3K sessions/day
   - Mitigation: Load test early and often
   
4. **Dashboard UX (4.1-4.35)** - Must be intuitive for coaches
   - Mitigation: Get feedback from mock users

### Dependencies
- **Supabase availability** - Use local Postgres as backup
- **OpenAI API costs** - Set strict budget limits
- **Vercel deployment** - Have AWS deployment guide as backup

---

## Success Metrics

### Technical Metrics
- ✅ Webhook processing < 2 seconds (p95)
- ✅ Rules engine processing < 5 seconds (p95)
- ✅ Dashboard page load < 2 seconds
- ✅ Zero data loss (all sessions persisted)
- ✅ 99.9% uptime

### Business Metrics
- ✅ Catches 100% of "problem tutor" test scenarios
- ✅ False positive rate < 20%
- ✅ Coach satisfaction score > 4/5
- ✅ Time to intervention < 1 hour

---

## Next Steps After Completion

### Phase 2 Enhancements (Future)
1. Advanced NLP with transcript analysis
2. Video analysis for engagement detection
3. Predictive churn modeling (ML)
4. Real-time dashboard updates (WebSocket)
5. Mobile app for coaches
6. Integration with Nerdy's existing coach tools

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-04  
**Status:** Ready for implementation  
**Estimated Completion:** 6-8 weeks
