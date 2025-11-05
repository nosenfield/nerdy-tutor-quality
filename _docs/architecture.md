# Architecture: Tutor Quality Scoring System

## Document Purpose
This document defines the complete technical architecture, tech stack decisions, system design, and directory structure for Nerdy's Tutor Quality Scoring System.

**Optimized for:** AI agent consumption, Cursor IDE, human developers

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture Diagram](#architecture-diagram)
4. [Data Flow](#data-flow)
5. [Directory Structure](#directory-structure)
6. [Database Schema](#database-schema)
7. [API Design](#api-design)
8. [Component Breakdown](#component-breakdown)
9. [Deployment Strategy](#deployment-strategy)
10. [Performance Considerations](#performance-considerations)

---

## System Overview

### Purpose
Build an automated tutor quality scoring system that processes 3,000 daily sessions and provides actionable coaching insights within 1 hour of session completion.

### Key Requirements
- **Volume:** 3,000 sessions/day (~125/hour, ~2/minute)
- **SLA:** Actionable insights within 1 hour of completion
- **Detection:**
  - Poor first session experiences (24% churn driver)
  - High tutor reschedule rates (98.2% tutor-initiated)
  - No-show risk (16% of replacements)
- **Output:** Coach dashboard with tutor flags and intervention recommendations

### Design Principles
1. **Tiered Processing:** Instant flags → Fast analysis → Deep analysis
2. **Async by Default:** Use job queues for everything non-critical
3. **Observable:** Log everything, measure everything
4. **Fail Gracefully:** Degrade to simpler analysis if advanced fails
5. **Future-Proof:** Phase 1 (behavioral) → Phase 2 (NLP) → Phase 3 (video)

---

## Tech Stack

### Frontend
```yaml
Framework: Next.js 16.0.1 (App Router)
Language: TypeScript 5.9.3
UI Library: React 19.2.0
Styling: Tailwind CSS 4.1.16
Components: Headless UI 2.2.9
Charts: Recharts 3.3.0
State: Zustand 5.0.8 (minimal client state)
Data Fetching: TanStack Query 5.90.6 (React Query)
```

**Rationale:**
- Next.js: Best-in-class React framework, easy Vercel deployment
- TypeScript: Type safety critical for complex business logic
- Tailwind: Rapid UI development, small bundle size
- shadcn/ui: Pre-built accessible components
- Zustand: Lightweight state (only for UI state, not data)
- React Query: Handles caching, refetching, optimistic updates

---

### Backend
```yaml
Runtime: Node.js 20 LTS
Framework: Next.js API Routes
Language: TypeScript 5.3+
Validation: Zod
Job Queue: Bull (Redis-backed)
Cron Jobs: node-cron
Testing: Vitest + Playwright
```

**Rationale:**
- Next.js API Routes: Unified codebase, easy deployment
- Bull: Robust job queue with retry logic and monitoring
- Zod: Runtime type validation that matches TypeScript types
- Vitest: Fast, ESM-native testing (compatible with Next.js)

---

### Database
```yaml
Primary: PostgreSQL 16 (Supabase)
Vector Extension: pgvector
ORM: Drizzle ORM
Migrations: Drizzle Kit
Connection Pooling: PgBouncer (built into Supabase)
```

**Rationale:**
- PostgreSQL: Industry standard, excellent for time-series data
- Supabase: Managed Postgres + Auth + Storage + Realtime
- pgvector: Future-proof for transcript embeddings (Phase 2)
- Drizzle: Type-safe ORM with great DX, faster than Prisma

---

### AI/ML Services
```yaml
LLM Provider: OpenAI
Models:
  - GPT-3.5-Turbo: Fast analysis (90% of sessions)
  - GPT-4-Turbo: Critical sessions (10% of sessions)
  - text-embedding-ada-002: Transcript embeddings (Phase 2)
Alternative: Anthropic Claude (for comparison)
```

**Cost Estimates:**
```
Monthly API Costs (3,000 sessions/day):
- GPT-3.5-Turbo (2K tokens avg): $270/month
- GPT-4-Turbo (500 tokens avg): $540/month  
- Embeddings (cached 70%): $54/month
Total: ~$864/month
```

---

### Infrastructure
```yaml
Hosting: Vercel (Frontend + API Routes)
Database: Supabase (managed PostgreSQL)
Redis: Upstash Redis (serverless)
Object Storage: Supabase Storage (for future video/transcripts)
CDN: Vercel Edge Network
Monitoring: Sentry + Vercel Analytics
Logs: Vercel Logs + Supabase Logs
```

**Rationale:**
- Vercel: Zero-config deployment, excellent Next.js integration
- Upstash Redis: Serverless, pay-per-request (better for bursty load)
- Supabase: All-in-one (DB + Auth + Storage + Realtime)

---

### Development Tools
```yaml
IDE: Cursor IDE (AI-assisted)
Package Manager: pnpm
Linting: ESLint + Prettier
Type Checking: TypeScript strict mode
Git Hooks: Husky + lint-staged
CI/CD: GitHub Actions + Vercel
Mock Data: Faker.js
API Testing: Hoppscotch / Bruno
```

---

## Architecture Diagram

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     NERDY'S PLATFORM                        │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │   Session    │  ends   │   Webhook    │                 │
│  │  Recording   │────────>│   Trigger    │                 │
│  └──────────────┘         └──────┬───────┘                 │
│                                   │                          │
└───────────────────────────────────┼──────────────────────────┘
                                    │ POST /api/webhooks/session-completed
                                    │ { session_id, tutor_id, ... }
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│              TUTOR QUALITY SCORING SYSTEM                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API LAYER (Next.js)                     │  │
│  │                                                       │  │
│  │  /api/webhooks/session-completed ◄── Receives data  │  │
│  │  /api/sessions/[id] ◄────────────── View session    │  │
│  │  /api/tutors/[id]/score ◄────────── Get tutor score│  │
│  │  /api/flags ◄─────────────────────── List flags     │  │
│  └────────────┬──────────────────────────────────────────┘  │
│               │ Validates & queues job                      │
│               ▼                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           JOB QUEUE (Bull + Redis)                   │  │
│  │                                                       │  │
│  │  [Quick Flags] ──> Priority 1 (process immediately) │  │
│  │  [NLP Analysis] ─> Priority 2 (within 60 min)       │  │
│  │  [Deep Analysis]─> Priority 3 (overnight batch)     │  │
│  └────────┬──────────────────────────────────────────────┘  │
│           │                                                  │
│           ▼                                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         PROCESSING WORKERS (3 Tiers)                 │  │
│  │                                                       │  │
│  │  Tier 1: Rules Engine ────────────> 5s               │  │
│  │    - No-show detection                               │  │
│  │    - Lateness calculation                            │  │
│  │    - Reschedule rate check                           │  │
│  │    - Early end detection                             │  │
│  │                                                       │  │
│  │  Tier 2: NLP Analysis ─────────────> 60s             │  │
│  │    - GPT-3.5 feature extraction                      │  │
│  │    - Sentiment analysis                              │  │
│  │    - Pattern detection                               │  │
│  │                                                       │  │
│  │  Tier 3: Deep Analysis ────────────> 24h             │  │
│  │    - Historical trends                               │  │
│  │    - Peer comparisons                                │  │
│  │    - Predictive modeling                             │  │
│  └────────┬──────────────────────────────────────────────┘  │
│           │ Writes results                                  │
│           ▼                                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          DATABASE (PostgreSQL + pgvector)            │  │
│  │                                                       │  │
│  │  sessions ──────────── Raw session data              │  │
│  │  tutor_scores ──────── Aggregated scores             │  │
│  │  flags ────────────── Coaching alerts                │  │
│  │  interventions ─────── Actions taken                 │  │
│  └────────┬──────────────────────────────────────────────┘  │
│           │ Reads for display                               │
│           ▼                                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           COACH DASHBOARD (Next.js)                  │  │
│  │                                                       │  │
│  │  [Overview] ────> Today's flags, trends              │  │
│  │  [Tutor Detail]─> Performance timeline, flags        │  │
│  │  [Interventions]> Track coaching actions             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### Data Flow Sequence

```
1. SESSION ENDS
   Nerdy Platform → Session Recording Complete
   
2. WEBHOOK TRIGGER
   Nerdy → POST /api/webhooks/session-completed
   Payload: { session_id, tutor_id, student_id, timestamps, ratings, ... }
   
3. VALIDATION & STORAGE
   API validates payload with Zod
   → Stores raw session data in `sessions` table
   → Returns 200 OK quickly (< 2 seconds)
   
4. JOB QUEUING
   → Adds job to appropriate queue based on priority
   → First sessions → Priority 1 (high)
   → Regular sessions → Priority 2 (normal)
   → Deep analysis → Priority 3 (low)
   
5. TIER 1 PROCESSING (< 5 seconds)
   Worker picks up job
   → Runs rules-based checks:
      - Did tutor join? (no-show detection)
      - Was tutor late? (> 5 min late)
      - Did tutor end early? (> 10 min before scheduled end)
      - High reschedule rate? (> 15% in last 30 days)
   → If flags found → Write to `flags` table
   → If critical → Send email/Slack alert to coaches
   
6. TIER 2 PROCESSING (< 60 seconds)
   If session needs deeper analysis:
   → Fetch transcript or AI summary
   → Call GPT-3.5-Turbo for feature extraction
   → Calculate quality scores (1-100)
   → Update `tutor_scores` table
   → Create flags if thresholds exceeded
   
7. TIER 3 PROCESSING (overnight)
   Batch job runs at 2 AM daily:
   → Aggregate all tutors' historical data
   → Calculate trends (improving/declining)
   → Predict churn risk for next 30 days
   → Update `tutor_analytics` table
   
8. DASHBOARD DISPLAY
   Coach logs in → Dashboard fetches:
   → Latest flags (from `flags` table)
   → Tutor scores (from `tutor_scores` table)
   → Trend charts (from `tutor_analytics` table)
   → Displays in real-time (polls every 30s or uses SSE)
```

---

## Directory Structure

```
tutor-quality-scoring/
├── README.md
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── drizzle.config.ts
├── .env.local
├── .env.example
│
├── src/
│   ├── app/                          # Next.js 16 App Router
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Home/dashboard
│   │   ├── globals.css               # Global styles
│   │   │
│   │   ├── api/                      # API routes
│   │   │   ├── webhooks/
│   │   │   │   └── session-completed/
│   │   │   │       └── route.ts      # Webhook handler
│   │   │   ├── sessions/
│   │   │   │   ├── route.ts          # List sessions
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts      # Get session detail
│   │   │   ├── tutors/
│   │   │   │   ├── route.ts          # List tutors
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts      # Get tutor detail
│   │   │   │       └── score/
│   │   │   │           └── route.ts  # Get tutor score
│   │   │   ├── flags/
│   │   │   │   ├── route.ts          # List flags
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts      # Get flag detail
│   │   │   │       └── resolve/
│   │   │   │           └── route.ts  # Mark flag as resolved
│   │   │   └── cron/
│   │   │       └── daily-analysis/
│   │   │           └── route.ts      # Nightly batch job
│   │   │
│   │   ├── dashboard/                # Coach dashboard pages
│   │   │   ├── page.tsx              # Dashboard home
│   │   │   ├── tutors/
│   │   │   │   ├── page.tsx          # Tutors list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # Tutor detail
│   │   │   ├── flags/
│   │   │   │   ├── page.tsx          # Flags list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # Flag detail
│   │   │   └── analytics/
│   │   │       └── page.tsx          # Analytics & trends
│   │   │
│   │   └── login/
│   │       └── page.tsx              # Simple auth (demo only)
│   │
│   ├── components/                   # React components
│   │   ├── ui/                       # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   └── ... (other shadcn components)
│   │   │
│   │   ├── dashboard/
│   │   │   ├── flag-card.tsx         # Display a flag
│   │   │   ├── tutor-score-badge.tsx # Score visualization
│   │   │   ├── performance-chart.tsx # Recharts wrapper
│   │   │   └── stats-overview.tsx    # KPI cards
│   │   │
│   │   ├── tutors/
│   │   │   ├── tutor-list.tsx        # Table of tutors
│   │   │   ├── tutor-detail.tsx      # Detailed view
│   │   │   └── performance-timeline.tsx
│   │   │
│   │   └── sessions/
│   │       ├── session-list.tsx
│   │       └── session-detail.tsx
│   │
│   ├── lib/                          # Core business logic
│   │   ├── db/
│   │   │   ├── index.ts              # Database client
│   │   │   ├── schema.ts             # Drizzle schema definitions
│   │   │   └── migrations/           # SQL migrations
│   │   │
│   │   ├── queue/
│   │   │   ├── index.ts              # Bull queue setup
│   │   │   ├── workers.ts            # Job processors
│   │   │   └── jobs.ts               # Job definitions
│   │   │
│   │   ├── scoring/
│   │   │   ├── rules-engine.ts       # Tier 1: Rules-based scoring
│   │   │   ├── nlp-analysis.ts       # Tier 2: NLP features
│   │   │   ├── deep-analysis.ts      # Tier 3: Historical trends
│   │   │   ├── aggregator.ts         # Combine signals
│   │   │   └── thresholds.ts         # Scoring thresholds
│   │   │
│   │   ├── ai/
│   │   │   ├── openai.ts             # OpenAI client
│   │   │   ├── prompts.ts            # Prompt templates
│   │   │   └── embeddings.ts         # Embedding utilities (Phase 2)
│   │   │
│   │   ├── utils/
│   │   │   ├── time.ts               # Date/time helpers
│   │   │   ├── stats.ts              # Statistical calculations
│   │   │   └── validation.ts         # Zod schemas
│   │   │
│   │   └── types/
│   │       ├── session.ts            # SessionData interface
│   │       ├── tutor.ts              # Tutor interfaces
│   │       └── flag.ts               # Flag interfaces
│   │
│   └── scripts/                      # Utility scripts
│       ├── seed-mock-data.ts         # Generate mock sessions
│       ├── test-webhook.ts           # Test webhook endpoint
│       └── backfill-scores.ts        # Recalculate historical scores
│
├── tests/
│   ├── unit/
│   │   ├── scoring/
│   │   │   ├── rules-engine.test.ts
│   │   │   └── aggregator.test.ts
│   │   └── utils/
│   │       └── time.test.ts
│   │
│   ├── integration/
│   │   ├── api/
│   │   │   ├── webhooks.test.ts
│   │   │   └── sessions.test.ts
│   │   └── queue/
│   │       └── workers.test.ts
│   │
│   └── e2e/
│       └── dashboard.spec.ts         # Playwright tests
│
├── docs/
│   ├── required-reading.md           # (already created)
│   ├── technical-concerns.md         # (already created)
│   ├── architecture.md               # (this file)
│   ├── task-list.md                  # (next to create)
│   └── api-reference.md              # API documentation
│
└── public/
    ├── logo.svg
    └── favicon.ico
```

---

## Database Schema

### Core Tables

```sql
-- ============================================
-- SESSIONS TABLE
-- Raw session data from Nerdy webhooks
-- ============================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  session_id VARCHAR(255) UNIQUE NOT NULL,
  tutor_id VARCHAR(255) NOT NULL,
  student_id VARCHAR(255) NOT NULL,
  
  -- Timing (scheduled)
  session_start_time TIMESTAMPTZ NOT NULL,
  session_end_time TIMESTAMPTZ NOT NULL,
  
  -- Timing (actual - joins)
  tutor_join_time TIMESTAMPTZ,
  student_join_time TIMESTAMPTZ,
  
  -- Timing (actual - leaves)
  tutor_leave_time TIMESTAMPTZ,
  student_leave_time TIMESTAMPTZ,
  
  -- Content
  subjects_covered TEXT[] NOT NULL,
  is_first_session BOOLEAN NOT NULL DEFAULT false,
  session_type VARCHAR(50),
  
  -- Computed fields (for convenience)
  session_length_scheduled INTEGER, -- minutes
  session_length_actual INTEGER,    -- minutes
  
  -- Rescheduling
  was_rescheduled BOOLEAN NOT NULL DEFAULT false,
  rescheduled_by VARCHAR(20), -- 'tutor' | 'student' | 'system'
  reschedule_count INTEGER DEFAULT 0,
  
  -- Ratings
  tutor_feedback_rating INTEGER CHECK (tutor_feedback_rating BETWEEN 1 AND 5),
  tutor_feedback_description TEXT,
  student_feedback_rating INTEGER CHECK (student_feedback_rating BETWEEN 1 AND 5),
  student_feedback_description TEXT,
  
  -- Deep analysis (future)
  video_url TEXT,
  transcript_url TEXT,
  ai_summary TEXT,
  
  -- Outcomes
  student_booked_followup BOOLEAN,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_tutor_id (tutor_id),
  INDEX idx_student_id (student_id),
  INDEX idx_session_date (session_start_time),
  INDEX idx_first_session (is_first_session),
  INDEX idx_created_at (created_at)
);

-- ============================================
-- TUTOR_SCORES TABLE
-- Aggregated tutor performance metrics
-- ============================================
CREATE TABLE tutor_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id VARCHAR(255) NOT NULL,
  
  -- Time window for this score
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_start TIMESTAMPTZ NOT NULL, -- e.g., 30 days ago
  window_end TIMESTAMPTZ NOT NULL,   -- e.g., today
  
  -- Session counts
  total_sessions INTEGER NOT NULL DEFAULT 0,
  first_sessions INTEGER NOT NULL DEFAULT 0,
  
  -- Attendance metrics
  no_show_count INTEGER NOT NULL DEFAULT 0,
  no_show_rate DECIMAL(5,4),        -- 0.0000 to 1.0000
  late_count INTEGER NOT NULL DEFAULT 0,
  late_rate DECIMAL(5,4),
  avg_lateness_minutes DECIMAL(6,2),
  
  -- Completion metrics
  early_end_count INTEGER NOT NULL DEFAULT 0,
  early_end_rate DECIMAL(5,4),
  avg_early_end_minutes DECIMAL(6,2),
  
  -- Rescheduling
  reschedule_count INTEGER NOT NULL DEFAULT 0,
  reschedule_rate DECIMAL(5,4),
  tutor_initiated_reschedules INTEGER NOT NULL DEFAULT 0,
  
  -- Ratings
  avg_student_rating DECIMAL(3,2), -- 1.00 to 5.00
  avg_first_session_rating DECIMAL(3,2),
  rating_trend VARCHAR(20),         -- 'improving' | 'stable' | 'declining'
  
  -- Quality score (0-100)
  overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
  
  -- Confidence
  confidence_score DECIMAL(3,2),    -- 0.00 to 1.00
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(tutor_id, window_start, window_end),
  
  -- Indexes
  INDEX idx_tutor_scores_tutor (tutor_id),
  INDEX idx_tutor_scores_date (calculated_at),
  INDEX idx_overall_score (overall_score)
);

-- ============================================
-- FLAGS TABLE
-- Coaching alerts for at-risk tutors
-- ============================================
CREATE TABLE flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What triggered the flag
  tutor_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255), -- NULL for aggregate flags
  
  -- Flag details
  flag_type VARCHAR(50) NOT NULL, -- 'no_show' | 'chronic_lateness' | 'poor_first_session' | etc.
  severity VARCHAR(20) NOT NULL,  -- 'low' | 'medium' | 'high' | 'critical'
  
  -- Description
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Intervention recommendation
  recommended_action TEXT,
  
  -- Supporting data
  supporting_data JSONB, -- { sessions: [...], metrics: {...} }
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'open', -- 'open' | 'in_progress' | 'resolved' | 'dismissed'
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(255), -- coach_id
  resolution_notes TEXT,
  
  -- Coach agreement (for model validation)
  coach_agreed BOOLEAN,     -- Did coach agree this was a real issue?
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_flags_tutor (tutor_id),
  INDEX idx_flags_status (status),
  INDEX idx_flags_severity (severity),
  INDEX idx_flags_created (created_at)
);

-- ============================================
-- INTERVENTIONS TABLE
-- Track coaching actions taken
-- ============================================
CREATE TABLE interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  flag_id UUID REFERENCES flags(id),
  tutor_id VARCHAR(255) NOT NULL,
  
  -- What was done
  intervention_type VARCHAR(50) NOT NULL, -- 'coaching_session' | 'warning' | 'training' | etc.
  description TEXT NOT NULL,
  
  -- Who did it
  coach_id VARCHAR(255) NOT NULL,
  
  -- When
  intervention_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Outcome tracking
  follow_up_date TIMESTAMPTZ,
  outcome VARCHAR(20),      -- 'improved' | 'no_change' | 'worsened' | 'pending'
  outcome_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_interventions_tutor (tutor_id),
  INDEX idx_interventions_flag (flag_id),
  INDEX idx_interventions_date (intervention_date)
);

-- ============================================
-- TUTOR_ANALYTICS TABLE
-- Nightly batch processing results
-- ============================================
CREATE TABLE tutor_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  tutor_id VARCHAR(255) NOT NULL,
  analysis_date DATE NOT NULL,
  
  -- Historical trends
  performance_trend JSONB, -- { last_7d: {...}, last_30d: {...}, last_90d: {...} }
  
  -- Comparisons
  percentile_rank INTEGER CHECK (percentile_rank BETWEEN 0 AND 100),
  peer_group VARCHAR(50),  -- e.g., 'math_tutors' | 'new_tutors'
  
  -- Predictions
  churn_risk_30d DECIMAL(3,2), -- 0.00 to 1.00
  churn_risk_90d DECIMAL(3,2),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(tutor_id, analysis_date),
  
  -- Indexes
  INDEX idx_analytics_tutor (tutor_id),
  INDEX idx_analytics_date (analysis_date)
);
```

### Future Phase 2 Tables (NLP/Embeddings)

```sql
-- ============================================
-- TRANSCRIPT_EMBEDDINGS TABLE
-- For semantic search over session transcripts
-- ============================================
CREATE TABLE transcript_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL REFERENCES sessions(session_id),
  
  -- Vector storage
  embedding vector(1536), -- OpenAI ada-002 dimension
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_embeddings_session (session_id)
);

-- Enable vector similarity search
CREATE INDEX ON transcript_embeddings USING ivfflat (embedding vector_cosine_ops);
```

---

## API Design

### Webhook Endpoint

```typescript
// POST /api/webhooks/session-completed
// Called by Nerdy when a session ends

interface WebhookPayload {
  session_id: string;
  tutor_id: string;
  student_id: string;
  session_start_time: string; // ISO 8601
  session_end_time: string;
  tutor_join_time: string | null;
  student_join_time: string | null;
  tutor_leave_time: string | null;
  student_leave_time: string | null;
  subjects_covered: string[];
  is_first_session: boolean;
  was_rescheduled: boolean;
  rescheduled_by?: 'tutor' | 'student' | 'system';
  tutor_feedback?: {
    rating: 1 | 2 | 3 | 4 | 5;
    description: string;
  };
  student_feedback?: {
    rating: 1 | 2 | 3 | 4 | 5;
    description: string;
  };
  video_url?: string;
  transcript_url?: string;
  ai_summary?: string;
}

// Response
{
  "success": true,
  "session_id": "abc123",
  "queued": true,
  "estimated_processing_time": "60 seconds"
}
```

---

### REST API Endpoints

```typescript
// ============================================
// SESSIONS
// ============================================

// GET /api/sessions
// List all sessions (with filters)
interface SessionsQuery {
  tutor_id?: string;
  student_id?: string;
  start_date?: string;
  end_date?: string;
  is_first_session?: boolean;
  limit?: number;
  offset?: number;
}

// GET /api/sessions/[id]
// Get session detail
interface SessionResponse {
  session: SessionData;
  flags: Flag[];
  tutor_score: TutorScore;
}

// ============================================
// TUTORS
// ============================================

// GET /api/tutors
// List all tutors with scores
interface TutorsQuery {
  sort_by?: 'score' | 'name' | 'session_count';
  min_score?: number;
  max_score?: number;
  has_flags?: boolean;
  limit?: number;
  offset?: number;
}

// GET /api/tutors/[id]
// Get tutor detail
interface TutorResponse {
  tutor_id: string;
  current_score: TutorScore;
  recent_sessions: SessionData[];
  active_flags: Flag[];
  performance_history: TutorScore[];
  interventions: Intervention[];
}

// GET /api/tutors/[id]/score
// Get current tutor score
interface TutorScoreResponse {
  score: TutorScore;
  breakdown: {
    attendance: number;    // 0-100
    ratings: number;       // 0-100
    completion: number;    // 0-100
    reliability: number;   // 0-100
  };
  flags: Flag[];
}

// ============================================
// FLAGS
// ============================================

// GET /api/flags
// List all flags (with filters)
interface FlagsQuery {
  tutor_id?: string;
  status?: 'open' | 'in_progress' | 'resolved' | 'dismissed';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  limit?: number;
  offset?: number;
}

// GET /api/flags/[id]
// Get flag detail
interface FlagResponse {
  flag: Flag;
  tutor: {
    tutor_id: string;
    current_score: TutorScore;
  };
  related_sessions: SessionData[];
  interventions: Intervention[];
}

// POST /api/flags/[id]/resolve
// Mark flag as resolved
interface ResolveFlagRequest {
  resolution_notes: string;
  coach_agreed: boolean;
  intervention_type?: string;
  intervention_description?: string;
}

// ============================================
// ANALYTICS
// ============================================

// GET /api/analytics/overview
// Dashboard overview stats
interface AnalyticsOverviewResponse {
  today: {
    sessions_processed: number;
    flags_raised: number;
    tutors_flagged: number;
  };
  trends: {
    avg_score: number;
    avg_score_change: number; // vs. last week
    flag_rate: number;
    flag_rate_change: number;
  };
  top_issues: Array<{
    issue: string;
    count: number;
  }>;
}

// GET /api/analytics/trends
// Historical trends for charts
interface TrendsQuery {
  metric: 'avg_score' | 'flag_rate' | 'no_show_rate' | 'reschedule_rate';
  period: '7d' | '30d' | '90d' | '1y';
  group_by?: 'day' | 'week' | 'month';
}
```

---

## Component Breakdown

### Processing Workers

#### Tier 1: Rules Engine (< 5 seconds)
```typescript
// src/lib/scoring/rules-engine.ts

interface QuickFlag {
  flag_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
}

export async function checkRulesBasedFlags(
  session: SessionData
): Promise<QuickFlag[]> {
  const flags: QuickFlag[] = [];
  
  // Check 1: Tutor no-show
  if (!session.tutor_join_time) {
    flags.push({
      flag_type: 'tutor_no_show',
      severity: 'critical',
      title: 'Tutor No-Show',
      description: `Tutor did not join session ${session.session_id}`
    });
  }
  
  // Check 2: Chronic lateness
  if (session.tutor_join_time) {
    const lateMinutes = differenceInMinutes(
      new Date(session.tutor_join_time),
      new Date(session.session_start_time)
    );
    
    if (lateMinutes > 10) {
      flags.push({
        flag_type: 'tutor_late',
        severity: lateMinutes > 20 ? 'high' : 'medium',
        title: 'Tutor Late to Session',
        description: `Tutor was ${lateMinutes} minutes late`
      });
    }
  }
  
  // Check 3: Session ended early
  if (session.tutor_leave_time && session.session_end_time) {
    const earlyMinutes = differenceInMinutes(
      new Date(session.session_end_time),
      new Date(session.tutor_leave_time)
    );
    
    if (earlyMinutes > 10) {
      flags.push({
        flag_type: 'session_ended_early',
        severity: earlyMinutes > 20 ? 'high' : 'medium',
        title: 'Session Ended Early',
        description: `Tutor ended session ${earlyMinutes} minutes early`
      });
    }
  }
  
  // Check 4: Poor first session rating
  if (session.is_first_session && session.student_feedback_rating) {
    if (session.student_feedback_rating <= 2) {
      flags.push({
        flag_type: 'poor_first_session',
        severity: 'high',
        title: 'Poor First Session Experience',
        description: `Student gave ${session.student_feedback_rating}/5 rating on first session`
      });
    }
  }
  
  // Check 5: Aggregate checks (require DB query)
  const tutorStats = await getTutorStats(session.tutor_id, 30); // last 30 days
  
  if (tutorStats.reschedule_rate > 0.15) {
    flags.push({
      flag_type: 'high_reschedule_rate',
      severity: 'medium',
      title: 'High Reschedule Rate',
      description: `Tutor has rescheduled ${(tutorStats.reschedule_rate * 100).toFixed(1)}% of sessions in last 30 days`
    });
  }
  
  return flags;
}
```

#### Tier 2: NLP Analysis (< 60 seconds)
```typescript
// src/lib/scoring/nlp-analysis.ts

export async function analyzeSessionQuality(
  session: SessionData
): Promise<NLPFeatures> {
  // Only run if we have text to analyze
  if (!session.ai_summary && !session.transcript_url) {
    return { quality_score: null };
  }
  
  const text = session.ai_summary || await fetchTranscript(session.transcript_url);
  
  const prompt = `Analyze this tutoring session for quality indicators.
  
Session Summary:
${text}

Extract the following:
1. Tutor empathy score (0-100)
2. Explanation clarity score (0-100)
3. Student engagement signals (high/medium/low)
4. Red flags (if any)
5. Overall quality score (0-100)

Respond in JSON format.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3
  });
  
  const analysis = JSON.parse(response.choices[0].message.content);
  
  return {
    empathy_score: analysis.empathy_score,
    clarity_score: analysis.clarity_score,
    engagement: analysis.engagement,
    red_flags: analysis.red_flags,
    quality_score: analysis.quality_score
  };
}
```

#### Tier 3: Deep Analysis (overnight)
```typescript
// src/lib/scoring/deep-analysis.ts

export async function calculateTutorTrends(
  tutorId: string
): Promise<TutorAnalytics> {
  // Fetch all sessions for tutor in last 90 days
  const sessions = await db.query.sessions.findMany({
    where: eq(sessions.tutor_id, tutorId),
    where: gte(sessions.session_start_time, subDays(new Date(), 90))
  });
  
  // Calculate rolling averages
  const windows = [7, 30, 90];
  const trends = {};
  
  for (const window of windows) {
    const windowSessions = sessions.filter(s => 
      differenceInDays(new Date(), new Date(s.session_start_time)) <= window
    );
    
    trends[`last_${window}d`] = {
      avg_rating: calculateAverage(windowSessions.map(s => s.student_feedback_rating)),
      no_show_rate: windowSessions.filter(s => !s.tutor_join_time).length / windowSessions.length,
      late_rate: windowSessions.filter(s => isLate(s)).length / windowSessions.length,
      early_end_rate: windowSessions.filter(s => endedEarly(s)).length / windowSessions.length
    };
  }
  
  // Determine trend direction
  const ratingTrend = determineDirection([
    trends.last_7d.avg_rating,
    trends.last_30d.avg_rating,
    trends.last_90d.avg_rating
  ]);
  
  // Calculate percentile rank among peers
  const peerGroup = await determinePeerGroup(tutorId);
  const percentile = await calculatePercentile(tutorId, peerGroup);
  
  // Predict churn risk
  const churnRisk = await predictChurnRisk(trends, percentile);
  
  return {
    tutor_id: tutorId,
    performance_trend: trends,
    rating_trend: ratingTrend,
    percentile_rank: percentile,
    peer_group: peerGroup,
    churn_risk_30d: churnRisk.thirtyDay,
    churn_risk_90d: churnRisk.ninetyDay
  };
}
```

---

## Deployment Strategy

### Development
```bash
# Local development
pnpm install
pnpm dev

# Access at http://localhost:3000
# API routes at http://localhost:3000/api/*
```

### Staging
```yaml
Platform: Vercel (staging environment)
Database: Supabase (staging project)
Redis: Upstash (staging instance)
Branch: develop
URL: https://tutor-scoring-staging.vercel.app
```

### Production
```yaml
Platform: Vercel (production)
Database: Supabase (production project)
Redis: Upstash (production instance)
Branch: main
URL: https://tutor-scoring.nerdy.com (custom domain)
Monitoring: Sentry + Vercel Analytics
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml

name: Deploy
on:
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test
      - run: pnpm build
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## Performance Considerations

### Database Optimization

#### Indexing Strategy
```sql
-- High-traffic queries
CREATE INDEX CONCURRENTLY idx_sessions_tutor_date 
  ON sessions(tutor_id, session_start_time DESC);

CREATE INDEX CONCURRENTLY idx_flags_status_severity 
  ON flags(status, severity) WHERE status = 'open';

-- Partial indexes for common filters
CREATE INDEX CONCURRENTLY idx_first_sessions 
  ON sessions(tutor_id, session_start_time) 
  WHERE is_first_session = true;
```

#### Query Optimization
```typescript
// BAD: N+1 query
for (const tutor of tutors) {
  const score = await getScore(tutor.id); // DB query per tutor
}

// GOOD: Single query with JOIN
const tutorsWithScores = await db
  .select()
  .from(tutors)
  .leftJoin(tutor_scores, eq(tutors.id, tutor_scores.tutor_id))
  .where(/* filters */);
```

### Caching Strategy
```typescript
// Cache tutor scores (TTL: 1 hour)
const score = await redis.get(`tutor:${tutorId}:score`);
if (!score) {
  const computed = await computeScore(tutorId);
  await redis.setex(`tutor:${tutorId}:score`, 3600, JSON.stringify(computed));
  return computed;
}
return JSON.parse(score);
```

### API Rate Limiting
```typescript
// Protect webhook endpoint from spam
import rateLimit from 'express-rate-limit';

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please try again later'
});

app.post('/api/webhooks/session-completed', webhookLimiter, handler);
```

---

## Monitoring & Observability

### Key Metrics to Track
```typescript
// System health
- Webhook processing latency (p50, p95, p99)
- Job queue depth and wait time
- Database query performance
- API error rates

// Business metrics
- Sessions processed per hour
- Flags created per day
- False positive rate (coach disagreement)
- Intervention effectiveness

// Cost metrics
- OpenAI API costs per day
- Database storage growth
- Redis memory usage
```

### Alerting
```typescript
// Critical alerts (PagerDuty / Slack)
- Webhook endpoint down > 5 min
- Job queue backlog > 1000 jobs
- Database connection failures
- API error rate > 5%

// Warning alerts (Slack)
- Webhook processing > 10s average
- OpenAI API costs > $50/day
- Flag creation rate spike (> 2x normal)
```

---

## Security Considerations

### Webhook Validation
```typescript
// Verify webhook signature
import crypto from 'crypto';

function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### Environment Variables
```bash
# .env.example

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DIRECT_URL=postgresql://user:pass@host:5432/dbname

# Redis
REDIS_URL=redis://default:password@host:6379

# OpenAI
OPENAI_API_KEY=sk-...

# Webhook validation
WEBHOOK_SECRET=your-secret-key

# Monitoring
SENTRY_DSN=https://...
VERCEL_ANALYTICS_ID=...

# Feature flags
ENABLE_NLP_ANALYSIS=true
ENABLE_DEEP_ANALYSIS=false
```

---

## Next Steps

1. ✅ Review this architecture document
2. ⏭️ Proceed to task-list.md for implementation plan
3. 🚀 Begin development with mock data
4. 🧪 Test with realistic scenarios
5. 📊 Deploy to staging
6. 🎯 Integrate with Nerdy production

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-04  
**Status:** Ready for implementation
