# Active Context: Tutor Quality Scoring System

**Last Updated**: 2025-11-09 (Phase 1 complete, Phase 2 starting)

## Current Focus

### What We're Working On Right Now
**Phase 2: Production Deployment** - Starting pre-deployment testing and monitoring setup. Following recommended-path-cursor.md hybrid strategy. Phase 1 (Tutor Progression Visualization) is complete with tutor detail page, performance timeline, and all supporting components. Next: Task 8.12 (Run full test suite), Task 8.14 (Manual QA), Task 8.16 (Fix critical bugs), and Task 8.1-8.3 (Sentry setup).

### Current Phase
**Phase 0 of 9: Project Setup** - ✅ COMPLETE (9/10 tasks - Husky deferred as P1 optional)

**Phase 1 - Core Infrastructure** (Estimated: 3-4 days) - ✅ COMPLETE

**Phase 2 - Mock Data & Testing** (Estimated: 2-3 days) - ✅ COMPLETE

**Phase 3 - Rules Engine (Tier 1)** (Estimated: 3-4 days) - ✅ COMPLETE

**Phase 4 - Dashboard UI** (Estimated: 5-6 days) - ✅ COMPLETE (includes tutor detail page)

**Phase 5 - Job Queue & Workers** (Estimated: 3-4 days) - ✅ COMPLETE

**Phase 6 - API Routes** (Estimated: 3-4 days) - ✅ COMPLETE

**Phase 1: Tutor Progression Visualization** (Goal 1) - ✅ COMPLETE

Next phases:
- Phase 2: Production Deployment (Goal 2) ← CURRENT

### Active Decisions
- **Decision 1: Next.js 16 App Router** - Using Next.js 16 with React 19 for latest performance improvements and features. App Router provides better performance and simpler data fetching patterns. Next.js 16 requires React 19, which includes latest React features and optimizations.

- **Decision 2: Drizzle ORM over Prisma** - Chosen for 2-3x faster performance, SQL-like syntax, and better TypeScript inference. Lighter weight for our needs.

- **Decision 3: Supabase for PostgreSQL** - Managed PostgreSQL eliminates infrastructure headaches. Includes auth, storage, and realtime features we may need in Phase 2+. Free tier sufficient for development.

- **Decision 4: Upstash Redis (Serverless)** - Serverless Redis better for bursty workload (3,000 sessions/day isn't constant). Pay-per-request model more economical than always-on Redis instance.

- **Decision 5: pnpm over npm** - Faster installs, better disk usage, stricter dependency management. Standard for modern Next.js projects.

- **Decision 6: Headless UI over shadcn/ui** - Chose Headless UI instead of shadcn/ui due to Tailwind v4 compatibility. shadcn/ui has deprecation warnings and was built for Tailwind v3. Headless UI is officially maintained by Tailwind Labs, works perfectly with v4, and provides the same accessibility features. Minimal time difference in Phase 4 (6-7 days vs 5-6 days).

---

## Recent Changes

### Last 3 Significant Changes
1. **Phase 1 Complete - Tutor Detail Page Implementation** - Created complete tutor detail page (/dashboard/tutors/[id]) with all components: TutorHeader, ScoreBreakdown, PerformanceTimeline (line chart with flag/intervention markers), ActiveFlagsList, RecentSessionsTable, InterventionsHistory. Added navigation from flagged tutors table and tutor detail card to tutor detail page. Fixed API endpoint to calculate scores on-the-fly when missing. Fixed date range default to use date-fns functions for consistency. All components working correctly. Phase 1 (Tutor Progression Visualization) complete! - 2025-11-09
2. **Tasks 6.24-6.30 Complete - Analytics Endpoints and API Collection** - Created analytics endpoints: GET /api/analytics/overview (Task 6.24) with today's stats (sessions_processed, flags_raised, tutors_flagged), trends (avg_score, avg_score_change, flag_rate, flag_rate_change vs last week), and top_issues (most common flag types); GET /api/analytics/trends (Task 6.25) with time-series data for metrics (avg_score, flag_rate, no_show_rate, reschedule_rate), periods (7d, 30d, 90d, 1y), and grouping (day, week, month). Verified all existing integration tests are comprehensive (webhook, sessions, tutors, flags). Created Postman/Bruno collection (Task 6.30) with all endpoints, example requests, and environment variables. All endpoints include comprehensive integration tests, proper error handling, and transform database records to API format (snake_case). All tests passing. Phase 6 complete! - 2025-11-09
2. **Tasks 6.13-6.23 Complete - Tutor and Flag Endpoints** - Created complete tutor and flag API endpoints: GET /api/tutors (Task 6.13) with filtering, sorting, and pagination; GET /api/tutors/[id] (Task 6.14) for tutor detail with current score, recent sessions, active flags, performance history, and interventions; GET /api/tutors/[id]/score (Task 6.15) with score breakdown (attendance, ratings, completion, reliability) and flags; GET /api/flags (Task 6.19) with filtering (tutor_id, status, severity) and pagination; GET /api/flags/[id] (Task 6.20) for flag detail with tutor info, related sessions, and interventions; POST /api/flags/[id]/resolve (Task 6.21) to mark flags resolved with optional intervention creation. All endpoints include comprehensive integration tests, proper error handling (404 for not found, 400 for invalid params), and transform database records to API format (snake_case). All tests passing - 2025-11-09
2. **Tasks 6.9-6.12 Complete - Session Endpoints** - Created complete session API endpoints: GET /api/sessions (Task 6.9) with filtering (tutor_id, student_id, date range, is_first_session) and pagination (limit/offset, default: 50), GET /api/sessions/[id] (Task 6.10) for session detail by session_id, pagination (Task 6.11) and filtering (Task 6.12) already implemented in Task 6.9. All endpoints include query parameter validation, proper error handling (404 for not found, 400 for invalid params), transform database records to API format (camelCase to snake_case), and comprehensive integration tests (14 tests total). All tests passing - 2025-11-09
2. **Task 6.7 Complete - Rate Limiting** - Implemented rate limiting for webhook endpoint: created rate limiting utilities (`src/lib/utils/rate-limit.ts`) with `checkRateLimit` (sliding window algorithm using Redis, 100 req/min per IP), `extractIpAddress` (extracts IP from X-Real-IP, X-Forwarded-For, or request IP), integrated rate limiting into webhook endpoint (checks before signature verification to save compute, returns 429 Too Many Requests when exceeded), includes rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After), handles Redis errors gracefully (fail open - allows request if Redis unavailable), and comprehensive unit tests (12 tests) and integration tests covering all scenarios. All tests passing. Webhook endpoint now complete (Tasks 6.1-6.7) - 2025-11-09
2. **Task 6.3 Complete - HMAC Signature Verification** - Implemented HMAC-SHA256 signature verification for webhook security: created webhook security utilities (`src/lib/utils/webhook-security.ts`) with `verifyWebhookSignature` (uses crypto.timingSafeEqual for constant-time comparison), `extractSignatureFromHeader` (supports multiple header formats with/without prefix), and `getWebhookSecret` (reads from environment), integrated signature verification into webhook endpoint (verifies signature before parsing JSON, returns 401 for invalid/missing signatures), supports multiple header formats (X-Signature, X-Webhook-Signature, X-Hub-Signature-256), handles missing WEBHOOK_SECRET with 500 error, and comprehensive unit tests (17 tests) and integration tests (7 tests) covering all scenarios. All tests passing - 2025-11-09
2. **Task 6.2 Complete - Payload Validation** - Verified and enhanced webhook payload validation: created comprehensive unit tests for validation schema (28 tests covering valid payloads, invalid payloads, field types, enum values, feedback ratings, URL fields, and edge cases), verified validation schema is complete and correct, verified integration in webhook endpoint, and all tests passing. Validation schema properly validates all required fields, handles optional fields, and provides clear error messages - 2025-11-09
2. **Task 6.1 Complete - Webhook Endpoint** - Created webhook endpoint for session-completed events (`/api/webhooks/session-completed/route.ts`): implemented POST handler with Zod payload validation, transforms webhook payload (snake_case) to database format (camelCase), stores session in database with duplicate handling (409 Conflict), queues processing job with priority (high for first sessions, normal otherwise), returns 200 OK quickly (< 2 seconds) without awaiting job completion, includes structured logging and error handling, and created integration tests. This enables automatic flag generation when sessions arrive from Nerdy platform - 2025-11-09
2. **Phase 5 Complete - Job Queue & Workers** - Completed Phase 5 with Bull Board monitoring setup: installed Bull Board dependencies (@bull-board/api, @bull-board/express), created queue monitoring setup (monitoring.ts) with Bull Board configuration for all queues (session, high-priority, normal-priority, low-priority), created API route for queue status (`/api/admin/queue/status`) returning JSON status with queue metrics (waiting, active, completed, failed, delayed), created queue setup documentation (_docs/queue-setup.md) with Upstash Redis setup instructions, and documented environment variables. All queue infrastructure is complete and ready for production use - 2025-11-07
2. **IF-2, IF-3 Complete - Date Range Filtering & Responsive Plot Interactions** - Implemented URL param sync for date range filtering (IF-2): date range now syncs with URL params (startDate, endDate), making filters shareable via URL. Date range loads from URL on mount, updates URL when changed. Enhanced ScatterPlot with responsive interactions (IF-3): added touch support for mobile (pinch to zoom, two-finger pan), enhanced tooltip for desktop (shows tutor ID prominently, follows cursor, disabled on touch devices), optimized for different screen sizes (larger dots on mobile/tablet, responsive chart height), and tap to select works on mobile. All components update together when date range changes - 2025-11-07
3. **CC-10 Complete - Session History Modal** - Created `SessionHistoryModal` component using Headless UI Dialog for displaying detailed session history for a selected tutor. Modal opens on "View Session History" button click from TutorDetailCard, displays tutor header with ID and total sessions, shows session list table with all columns (Date/Time, Subject, Rating, Attendance Status, Rescheduled, First Session), includes filters (subject, session type), sorting (date, rating, status), pagination controls (rows per page, page navigation), and export functionality (CSV download). Full keyboard accessibility with ARIA labels and focus trap - 2025-11-07

---

## Next Steps

### Immediate (Next Session - Phase 2: Production Deployment)
- [ ] Task 8.12: Run full test suite and fix failures
- [ ] Task 8.14: Manual QA testing
- [ ] Task 8.16: Fix critical bugs found in testing
- [ ] Task 8.1-8.3: Sentry setup and error boundaries
- [ ] Task 8.4-8.5: Structured logging

### Near-Term (This Week - Phase 2)
- [ ] Task 8.7: Quick DB query audit (light check)
- [ ] Task 8.10: Quick dashboard load check
- [ ] Task 8.17-8.18: Vercel setup and configuration
- [ ] Task 8.19-8.21: Staging environment deployment
- [ ] Task 8.22: Production deployment

### Following Week (Phase 2 Post-Deployment)
- [ ] Task 8.24-8.25: Monitoring and alerts setup
- [ ] Task 8.15: Real traffic load testing
- [ ] Monitor production metrics and iterate

---

## Blockers / Open Questions

### Current Blockers
None - Project is greenfield, no blockers.

### Questions to Resolve
1. **Nerdy Webhook Integration** (Future) - Will need webhook documentation from Nerdy to finalize payload schema. Using educated guesses based on industry standards for now.

2. **Transcript Availability** (Phase 2) - What % of sessions have usable transcripts? What format? This affects NLP analysis feasibility. Can defer until Phase 2.

3. **Custom Domain Setup** (Production) - Will Nerdy provide `tutor-scoring.nerdy.com` subdomain or use Vercel default? Can decide at deployment time.

### Non-Blocking Questions
- Should we add Slack notifications for critical flags? (Can add post-MVP)
- Which coaches should have access in staging? (Can configure later)
- What's the coach review SLA for flags? (Informational only)

---

## Key Files Recently Modified

- `src/app/dashboard/tutors/[id]/page.tsx` - Tutor detail page (Phase 1) ← NEW
- `src/components/tutor-detail/TutorHeader.tsx` - Tutor header component (Phase 1) ← NEW
- `src/components/tutor-detail/ScoreBreakdown.tsx` - Score breakdown component (Phase 1) ← NEW
- `src/components/tutor-detail/PerformanceTimeline.tsx` - Performance timeline chart (Phase 1) ← NEW
- `src/components/tutor-detail/ActiveFlagsList.tsx` - Active flags list (Phase 1) ← NEW
- `src/components/tutor-detail/RecentSessionsTable.tsx` - Recent sessions table (Phase 1) ← NEW
- `src/components/tutor-detail/InterventionsHistory.tsx` - Interventions history (Phase 1) ← NEW
- `src/lib/hooks/useTutorDetailData.ts` - Tutor detail data hook (Phase 1) ← NEW
- `src/lib/hooks/useTutorScoreBreakdown.ts` - Score breakdown hook (Phase 1) ← NEW
- `src/app/api/tutors/[id]/route.ts` - Fixed to calculate scores on-the-fly when missing ← UPDATED
- `src/components/dashboard/TutorDetailCard.tsx` - Added clickable tutor ID link ← UPDATED
- `src/components/dashboard/FlaggedTutorsTable.tsx` - Added navigation to tutor detail page ← UPDATED
- `src/lib/stores/dashboardStore.ts` - Fixed default date range to use date-fns functions ← UPDATED
- `src/lib/utils/rate-limit.ts` - Rate limiting utilities (Task 6.7)
- `tests/unit/utils/rate-limit.test.ts` - Unit tests for rate limiting (Task 6.7)
- `src/app/api/webhooks/session-completed/route.ts` - Integrated rate limiting (Task 6.7)
- `tests/integration/webhooks/session-completed.test.ts` - Updated integration tests with rate limiting (Task 6.7)
- `src/lib/utils/webhook-security.ts` - HMAC signature verification utilities (Task 6.3)
- `tests/unit/utils/webhook-security.test.ts` - Unit tests for signature verification (Task 6.3)
- `tests/unit/utils/validation.test.ts` - Comprehensive unit tests for validation schema (Task 6.2)
- `src/app/api/webhooks/session-completed/route.ts` - Webhook endpoint for session-completed events (Task 6.1)
- `tests/integration/webhooks/session-completed.test.ts` - Integration tests for webhook endpoint
- `src/lib/queue/monitoring.ts` - Bull Board monitoring setup with queue status API
- `src/app/api/admin/queue/route.ts` - Queue monitoring API route
- `src/app/api/admin/queue/status/route.ts` - Queue status JSON API endpoint
- `_docs/queue-setup.md` - Queue setup guide with Upstash Redis instructions
- `src/lib/queue/index.ts` - Bull queue configuration and initialization
- `src/lib/queue/jobs.ts` - Job type definitions
- `src/lib/queue/workers.ts` - Worker implementations
- `src/lib/queue/process-session.ts` - Session processing logic
- `src/lib/queue/create-flags.ts` - Flag creation logic
- `src/scripts/process-sessions.ts` - Backfill script for processing existing sessions
- `src/scripts/start-worker.ts` - Worker startup script
- `tests/integration/queue/job-queuing.test.ts` - Integration tests for job queuing (Task 5.18)
- `tests/integration/queue/job-processing.test.ts` - Integration tests for job processing (Task 5.19)
- `tests/integration/queue/job-retry.test.ts` - Integration tests for retry logic (Task 5.20)
- `tests/integration/queue/job-priority.test.ts` - Integration tests for priority queuing (Task 5.21)
- `tests/integration/queue/job-load.test.ts` - Load tests for 100 concurrent jobs (Task 5.22)
- `src/components/dashboard/FlaggedTutorsTable.tsx` - Flagged tutors table with sorting, pagination, mini visualizations, and row highlighting (CC-7, CC-8)
- `src/components/dashboard/FullscreenPlotModal.tsx` - Fullscreen plot modal component with Headless UI Dialog (CC-9)
- `src/components/dashboard/SessionHistoryModal.tsx` - Session history modal component with filters, sorting, pagination, and export (CC-10)
- `src/components/dashboard/ScatterPlot.tsx` - Enhanced with touch support (pinch to zoom, two-finger pan), improved tooltip, and responsive optimizations (IF-3) ← UPDATED
- `src/app/dashboard/page.tsx` - Added URL param sync for date range filtering (IF-2), integrated FullscreenPlotModal and SessionHistoryModal ← UPDATED
- `src/app/dashboard/page.tsx` - Updated to include FlaggedTutorsTable component
- `src/lib/scoring/rules-engine.ts` - Complete rules engine with all detection rules (Tasks 3.2-3.10)
- `src/lib/scoring/aggregator.ts` - Scoring algorithm with all component scores (Tasks 3.11-3.17)
- `src/lib/scoring/thresholds.ts` - Configurable thresholds and quality tiers (Task 3.18)
- `src/lib/scoring/rules-engine.test.ts` - Comprehensive unit tests for rules (Tasks 3.19-3.20)
- `src/lib/scoring/aggregator.test.ts` - Comprehensive unit tests for aggregator (Tasks 3.21-3.22)
- `src/lib/db/schema.ts` - Database schema definition (all 4 core tables created)
- `src/lib/mock-data/scenarios.ts` - Scenario configurations for problem tutors
- `src/lib/mock-data/generators.ts` - Mock data generation with all overrides
- `src/lib/mock-data/validation.ts` - Updated to accept db/sessions as parameters (fixes import hoisting)
- `src/scripts/seed-mock-data.ts` - Seed script with dotenv + dynamic imports
- `src/scripts/reset-db.ts` - Database reset script with dotenv + dynamic imports
- `src/lib/db/test-connection.ts` - Database test script with dotenv + dynamic imports
- `drizzle.config.ts` - Added dotenv loading for migrations
- `package.json` - Added db:reset, db:seed, test:db scripts

---

## Development Environment Setup Status

### Completed
- [x] Template structure installed
- [x] Memory Bank populated
- [x] Documentation complete (_docs/)
- [x] Project requirements understood
- [x] Next.js 16 project initialized
- [x] Dependencies installed (all packages from package.json)
- [x] TypeScript configured with strict mode
- [x] ESLint + Prettier configured
- [x] Tailwind CSS v4 configured
- [x] Headless UI installed
- [x] @supabase/ssr installed (required for Next.js 16)
- [x] Supabase account created
- [x] Supabase project created
- [x] Database connection strings configured in .env.local
- [x] Git repository initialized
- [x] Directory structure created (all folders exist)
- [x] .env.example created
- [x] Drizzle ORM installed and configured
- [x] All database tables created (sessions, tutor_scores, flags, interventions)
- [x] Database migrations run and tracked
- [x] Mock data generation complete (3,150 sessions)
- [x] All problem tutor scenarios implemented
- [x] Database seeding scripts working (db:reset, db:seed, test:db)
- [x] Environment variable loading fixed in all scripts

### In Progress
- [x] Dashboard layout component (Phase 4, Task 4.1) - ✅ COMPLETE

### Pending
- [ ] Husky + lint-staged setup (P1 optional, can defer)
- [ ] Upstash account created (prerequisite for Phase 5)

---

## Important Context for AI Sessions

**For AI assistants starting a new session:**

1. **Read First**:
   - This file (activeContext.md)
   - memory-bank/progress.md
   - _docs/task-list.md (for specific task details)

2. **Key Project Facts**:
   - This is a **0-to-1 greenfield project** (no existing code)
   - Target: 6-8 weeks to MVP
   - Processing volume: 3,000 sessions/day
   - Critical SLA: 1-hour processing time
   - Current phase: Phase 0 (Project Setup)

3. **Architecture Principles**:
   - 3-tier processing (fast rules → NLP → deep analysis)
   - Event-driven with job queues
   - Behavioral signals only for MVP (no NLP needed yet)
   - Coach dashboard for intervention tracking

4. **Tech Stack** (refer to techContext.md for full details):
   - Next.js 16 + React 19 + TypeScript
   - PostgreSQL (Supabase) + Drizzle ORM
   - Bull + Redis job queue
   - Tailwind CSS v4 + Headless UI

5. **Task Workflow**:
   - Follow task-list.md phase-by-phase
   - Update this file after completing tasks
   - Update progress.md after completing phases
   - Run verify-context.sh weekly

---

## Notes

**Project Status**: Phase 1 (Tutor Progression Visualization) complete! Tutor detail page fully implemented with all components. Phase 6 (API Routes) complete. Moving to Phase 2 (Production Deployment) following recommended-path-cursor.md.

**Next Major Milestone**: Deploy to production with monitoring and error tracking. Complete pre-deployment testing, fix critical bugs, set up Sentry, deploy to staging, then production.

**Risk Level**: LOW - Well-planned project with clear requirements, proven tech stack, and comprehensive documentation. Phases 0-2 completed successfully. Main risks are timeline management and maintaining code quality at pace.

**Technical Note**: All scripts now use dotenv + dynamic imports pattern to ensure environment variables load before database connections. This pattern should be followed for any new scripts that need database access.
