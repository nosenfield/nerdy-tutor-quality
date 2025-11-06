# Active Context: Tutor Quality Scoring System

**Last Updated**: 2025-11-05

## Current Focus

### What We're Working On Right Now
**Phase 2 In Progress** - Mock Data & Testing. All problem tutor scenarios complete (Tasks 2.14-2.19). Ready for Phase 3: Rules Engine.

### Current Phase
**Phase 0 of 9: Project Setup** - ✅ COMPLETE (9/10 tasks - Husky deferred as P1 optional)

**Current Phase: Phase 1 - Core Infrastructure** (Estimated: 3-4 days) - ✅ COMPLETE

**Current Phase: Phase 2 - Mock Data & Testing** (Estimated: 2-3 days) - IN PROGRESS

Next phases:
- Phase 1: Core Infrastructure (Database + utilities)
- Phase 2: Mock Data & Testing
- Phase 3: Rules Engine (Tier 1 processing)
- Phase 4: Dashboard UI

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
1. **All problem tutor scenarios implemented** - Completed Tasks 2.14-2.19: chronic no-show, always late, poor first sessions, frequent rescheduler, ends early, and excellent tutor scenarios - 2025-11-05
2. **Always late tutor scenario implemented** - Added avgLatenessMinutes override support, implemented 15 min average lateness for always late tutor (Task 2.15) - 2025-11-05
3. **Chronic no-show tutor scenario implemented** - Created scenario system with configurable overrides, implemented 16% no-show rate for chronic no-show tutor (Task 2.14) - 2025-11-05

---

## Next Steps

### Immediate (Next Session - Phase 2)
- [x] Install Faker.js (Task 2.1) ✅
- [x] Create tutor persona types (Task 2.2) ✅
- [x] Create mock data generators (Tasks 2.3-2.11) ✅
- [x] Create seed script (Task 2.11) ✅
- [x] Validate mock data distributions (Task 2.12) ✅
- [x] Create database reset script (Task 2.13) ✅
- [x] Create chronic no-show tutor scenario (Task 2.14) ✅
- [x] Create always late tutor scenario (Task 2.15) ✅
- [x] Create poor first sessions tutor scenario (Task 2.16) ✅
- [x] Create frequent rescheduler tutor scenario (Task 2.17) ✅
- [x] Create ends early tutor scenario (Task 2.18) ✅
- [x] Create excellent tutor scenario (Task 2.19) ✅
- [ ] Begin Phase 3: Rules Engine - NEXT

### Near-Term (Week 2)
- [ ] Generate realistic mock data (Phase 2)
- [ ] Build rules engine for tutor scoring (Phase 3)
- [ ] Begin dashboard UI development (Phase 4)

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

## Key Files Currently Modified

- `src/lib/db/schema.ts` - Database schema definition (all 4 core tables created: sessions, tutor_scores, flags, interventions)
- `src/lib/mock-data/scenarios.ts` - Scenario configurations for problem tutors
- `src/lib/mock-data/generators.ts` - Mock data generation (updated with noShowRate override)
- `src/scripts/seed-mock-data.ts` - Seed script with scenario validation

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
- [x] Sessions table schema created
- [x] Tutor_scores table schema created
- [x] Flags table schema created
- [x] Interventions table schema created

### In Progress
- [ ] Remaining problem tutor scenario definitions (Tasks 2.15-2.19)

### Pending
- [ ] Husky + lint-staged setup (P1 optional, can defer)
- [ ] Database migrations run
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

**Project Status**: Phase 2 in progress. Core mock data generation complete. Seed script ready to generate 3,000 sessions with realistic distributions.

**Next Major Milestone**: Complete individual problem tutor scenarios, then move to Phase 3 (Rules Engine).

**Risk Level**: LOW - Well-planned project with clear requirements, proven tech stack, and comprehensive documentation. Main risks are timeline management and maintaining code quality at pace.
