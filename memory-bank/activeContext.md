# Active Context: Tutor Quality Scoring System

**Last Updated**: 2025-11-04

## Current Focus

### What We're Working On Right Now
**Project Initialization** - Setting up the tutor quality scoring system from scratch. Currently in Phase 0 (Project Setup), preparing to initialize Next.js 14 project with all required tooling and configurations.

### Current Phase
**Phase 0 of 9: Project Setup** (Estimated: 1 day)

Next phases:
- Phase 1: Core Infrastructure (Database + utilities)
- Phase 2: Mock Data & Testing
- Phase 3: Rules Engine (Tier 1 processing)
- Phase 4: Dashboard UI

### Active Decisions
- **Decision 1: Next.js 14 App Router** - Using latest App Router instead of Pages Router for better performance and simpler data fetching patterns. App Router is now stable and recommended by Next.js team.

- **Decision 2: Drizzle ORM over Prisma** - Chosen for 2-3x faster performance, SQL-like syntax, and better TypeScript inference. Lighter weight for our needs.

- **Decision 3: Supabase for PostgreSQL** - Managed PostgreSQL eliminates infrastructure headaches. Includes auth, storage, and realtime features we may need in Phase 2+. Free tier sufficient for development.

- **Decision 4: Upstash Redis (Serverless)** - Serverless Redis better for bursty workload (3,000 sessions/day isn't constant). Pay-per-request model more economical than always-on Redis instance.

- **Decision 5: pnpm over npm** - Faster installs, better disk usage, stricter dependency management. Standard for modern Next.js projects.

---

## Recent Changes

### Last 3 Significant Changes
1. **Memory Bank templates filled in** - Populated all project context files from comprehensive architecture documentation - 2025-11-04
2. **Template structure installed** - AI development template with Cursor rules, Memory Bank structure, test patterns, and automation scripts ready - 2025-11-04
3. **Complete project documentation created** - Architecture, task list, technical concerns, and required reading all documented in _docs/ - 2025-11-04

---

## Next Steps

### Immediate (This Session)
- [ ] Initialize Next.js 14 project (Task 0.1)
- [ ] Install and configure Tailwind CSS (Task 0.2)
- [ ] Set up shadcn/ui component library (Task 0.3)
- [ ] Configure ESLint + Prettier (Task 0.4)
- [ ] Set up TypeScript strict mode (Task 0.6)

### Near-Term (This Week)
- [ ] Install Drizzle ORM + dependencies (Task 0.7)
- [ ] Create directory structure (Task 0.10)
- [ ] Create Supabase account and project (Task 1.1)
- [ ] Define database schema (Tasks 1.3-1.7)
- [ ] Generate and run initial migrations (Task 1.8)
- [ ] Create utility functions (time, stats, validation) (Tasks 1.15-1.17)

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

None yet - project not initialized. After Phase 0, expect:
- `src/app/layout.tsx` - Root layout
- `src/app/page.tsx` - Landing page
- `src/lib/db/schema.ts` - Database schema
- `drizzle.config.ts` - Drizzle configuration
- `tailwind.config.ts` - Tailwind configuration
- `.env.local` - Environment variables
- `package.json` - Dependencies

---

## Development Environment Setup Status

### Completed
- [x] Template structure installed
- [x] Memory Bank populated
- [x] Documentation complete (_docs/)
- [x] Project requirements understood

### In Progress
- [ ] Node.js 20 installed (prerequisite)
- [ ] pnpm installed (prerequisite)
- [ ] Supabase account created (prerequisite)
- [ ] Upstash account created (prerequisite)

### Pending
- [ ] Next.js project initialized
- [ ] Dependencies installed
- [ ] Database configured
- [ ] Development server running

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
   - Next.js 14 + TypeScript
   - PostgreSQL (Supabase) + Drizzle ORM
   - Bull + Redis job queue
   - Tailwind + shadcn/ui

5. **Task Workflow**:
   - Follow task-list.md phase-by-phase
   - Update this file after completing tasks
   - Update progress.md after completing phases
   - Run verify-context.sh weekly

---

## Notes

**Project Status**: Pre-development phase. Architecture fully designed, ready to begin implementation.

**Next Major Milestone**: Complete Phase 0 (Project Setup) by end of day. This unblocks Phase 1 (Core Infrastructure) tomorrow.

**Risk Level**: LOW - Well-planned project with clear requirements, proven tech stack, and comprehensive documentation. Main risks are timeline management and maintaining code quality at pace.
