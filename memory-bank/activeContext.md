# Active Context: Tutor Quality Scoring System

**Last Updated**: 2025-11-05

## Current Focus

### What We're Working On Right Now
**Phase 1 In Progress** - Database schema definition. Sessions and tutor_scores tables complete (Tasks 1.3-1.4). Next: flags and interventions tables (Tasks 1.5-1.6).

### Current Phase
**Phase 0 of 9: Project Setup** - ✅ COMPLETE (9/10 tasks - Husky deferred as P1 optional)

**Current Phase: Phase 1 - Core Infrastructure** (Estimated: 3-4 days) - IN PROGRESS

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
1. **Drizzle schema for tutor_scores table created** - Created tutor_scores table definition in src/lib/db/schema.ts with all fields, constraints, and indexes matching architecture.md - 2025-11-05
2. **Drizzle schema for sessions table created** - Created src/lib/db/schema.ts with sessions table definition matching architecture.md - 2025-11-05
3. **Supabase account and project created** - Supabase project initialized, connection strings configured in .env.local - 2025-11-05

---

## Next Steps

### Immediate (Next Session - Phase 1)
- [x] Create Supabase account and project (Task 1.1) ✅
- [x] Configure Supabase connection in .env.local (Task 1.2) ✅
- [x] Define database schema (sessions table) (Task 1.3) ✅
- [x] Define database schema (tutor_scores table) (Task 1.4) ✅
- [ ] Define database schema (flags table) (Task 1.5) - NEXT
- [ ] Define database schema (interventions table) (Task 1.6)
- [ ] Generate and run initial migrations (Task 1.8)
- [ ] Create database indexes (Task 1.9)

### Near-Term (This Week - Phase 1)
- [ ] Create database client setup (Task 1.11)
- [ ] Create TypeScript interfaces (SessionData, Tutor, Flag) (Tasks 1.12-1.14)
- [ ] Create utility functions (time, stats, validation) (Tasks 1.15-1.17)
- [ ] Write unit tests for utilities (Tasks 1.18-1.19)
- [ ] Set up Supabase Auth (Tasks 1.20-1.23)

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

- `src/lib/db/schema.ts` - Database schema definition (sessions and tutor_scores tables created)

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

### In Progress
- [ ] Remaining database schema tables (flags, interventions)

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

**Project Status**: Phase 1 in progress. Phase 0 complete (except optional Husky setup). Database schema partially implemented (sessions table done).

**Next Major Milestone**: Complete remaining database schema tables (tutor_scores, flags, interventions) and run initial migrations. This unblocks utility functions and auth setup.

**Risk Level**: LOW - Well-planned project with clear requirements, proven tech stack, and comprehensive documentation. Main risks are timeline management and maintaining code quality at pace.
