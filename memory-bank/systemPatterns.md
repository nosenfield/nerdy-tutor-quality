# System Patterns: Tutor Quality Scoring System

**Last Updated**: 2025-11-04

## Architecture Overview

### System Design
**Event-driven, tiered processing architecture** with async job queues. Separates webhook ingestion (fast) from processing (slower) to meet 1-hour SLA without blocking.

```
┌─────────────────────────────────────────────────────────────┐
│                     NERDY'S PLATFORM                        │
│                    Session Completed                         │
└──────────────────────────┬──────────────────────────────────┘
                           │ Webhook POST
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              TUTOR QUALITY SCORING SYSTEM                   │
│                                                              │
│  API Layer (Next.js)                                        │
│    → Validates webhook                                      │
│    → Stores session                                         │
│    → Queues job (< 2s)                                     │
│    → Returns 200 OK                                         │
│                           │                                  │
│                           ▼                                  │
│  Job Queue (Bull + Redis)                                   │
│    → Priority 1: Critical flags                             │
│    → Priority 2: NLP analysis                               │
│    → Priority 3: Deep analysis                              │
│                           │                                  │
│                           ▼                                  │
│  Workers (3 Tiers)                                          │
│    ┌─────────────────────────────────┐                     │
│    │ Tier 1: Rules Engine (< 5s)    │                     │
│    │  - No-show detection            │                     │
│    │  - Lateness calculation         │                     │
│    │  - Reschedule rate check        │                     │
│    │  - Poor first session alert     │                     │
│    └──────────────┬──────────────────┘                     │
│                   │                                          │
│    ┌──────────────▼──────────────────┐                     │
│    │ Tier 2: NLP (< 60s) - Phase 2  │                     │
│    │  - GPT-3.5 feature extraction   │                     │
│    │  - Empathy/clarity scoring      │                     │
│    └──────────────┬──────────────────┘                     │
│                   │                                          │
│    ┌──────────────▼──────────────────┐                     │
│    │ Tier 3: Deep (24h) - Phase 2+  │                     │
│    │  - Historical trends            │                     │
│    │  - Peer comparisons             │                     │
│    └──────────────┬──────────────────┘                     │
│                   │                                          │
│                   ▼                                          │
│  Database (PostgreSQL)                                      │
│    → sessions, tutor_scores, flags, interventions          │
│                   │                                          │
│                   ▼                                          │
│  Dashboard (Next.js + React)                                │
│    → Coach views flags                                      │
│    → Tutor performance analysis                             │
│    → Intervention tracking                                  │
└─────────────────────────────────────────────────────────────┘
```

### Module Structure
```
src/
├── app/                    # Next.js 14 App Router
│   ├── api/                # API routes (webhooks, REST endpoints)
│   ├── dashboard/          # Dashboard pages (flags, tutors, analytics)
│   └── login/              # Authentication
│
├── components/             # React components
│   ├── ui/                 # shadcn/ui base components
│   ├── dashboard/          # Dashboard-specific components
│   ├── tutors/             # Tutor-related components
│   └── sessions/           # Session-related components
│
├── lib/                    # Core business logic
│   ├── db/                 # Database (Drizzle ORM + schema)
│   ├── queue/              # Job queue (Bull workers)
│   ├── scoring/            # Scoring logic (rules, NLP, aggregation)
│   ├── ai/                 # OpenAI integration (Phase 2)
│   ├── utils/              # Utilities (time, stats, validation)
│   └── types/              # TypeScript interfaces
│
└── scripts/                # Utility scripts (seed data, testing)
```

---

## Design Patterns

### Pattern 1: Tiered Processing Pipeline
**When to use**: High-volume data processing with strict SLA requirements

**Why**: Different analysis depths require different processing times. Tier 1 (rules) is fast enough for real-time, Tier 2 (NLP) needs async queue, Tier 3 (historical) can wait overnight.

**Example**:
```typescript
// Tier 1: Immediate flags (< 5 seconds)
async function processTier1(session: SessionData) {
  const quickFlags = await checkRulesBasedFlags(session);
  if (quickFlags.length > 0) {
    await saveFlagsToDatabase(quickFlags);
    // Critical flags handled immediately
  }
}

// Tier 2: Queue for deeper analysis
if (session.is_first_session || hasHighRiskSignals(session)) {
  await nlpQueue.add({ sessionId: session.id }, { priority: 1 });
}

// Tier 3: Queue for overnight batch
await deepAnalysisQueue.add(
  { sessionId: session.id },
  { delay: 3600000 } // 1 hour delay
);
```

### Pattern 2: Confidence-Weighted Scoring (Bayesian Average)
**When to use**: Scoring entities with varying amounts of historical data (cold start problem)

**Why**: New tutors with 1-2 sessions shouldn't be scored the same as tutors with 100 sessions. Blend personal average with platform average based on confidence.

**Example**:
```typescript
function calculateTutorScore(tutor: Tutor) {
  const sessionCount = tutor.sessions.length;
  const personalAvg = tutor.averageRating;
  const platformAvg = 4.2;

  // Full confidence at 10 sessions
  const confidence = Math.min(sessionCount / 10, 1.0);

  const score =
    (confidence * personalAvg) +
    ((1 - confidence) * platformAvg);

  return {
    score,
    confidence,
    flag: sessionCount < 5 ? 'insufficient_data' : null
  };
}
```

### Pattern 3: Multi-Signal Flag Confirmation
**When to use**: Reducing false positives in automated flagging systems

**Why**: Single signals can be noisy (technical issues, difficult students). Require multiple independent signals before raising a flag.

**Example**:
```typescript
function shouldFlagTutor(signals: Signal[]): boolean {
  const critical = signals.filter(s => s.severity === 'critical');
  const high = signals.filter(s => s.severity === 'high');
  const medium = signals.filter(s => s.severity === 'medium');

  // Flagging rules:
  // - 2+ critical signals, OR
  // - 1 critical + 3+ high signals, OR
  // - 5+ high signals

  return (
    critical.length >= 2 ||
    (critical.length >= 1 && high.length >= 3) ||
    high.length >= 5
  );
}
```

### Pattern 4: Job Queue Priority Levels
**When to use**: Processing work with varying urgency levels

**Why**: Critical issues (no-shows, poor first sessions) need immediate attention. Non-critical analysis can wait.

**Example**:
```typescript
const queue = new Bull('tutor-processing', { redis });

// Priority 1 (high): First sessions, critical flags
await queue.add('process', { sessionId }, { priority: 1 });

// Priority 2 (normal): Regular sessions
await queue.add('process', { sessionId }, { priority: 3 });

// Priority 3 (low): Deep analysis, trends
await queue.add('process', { sessionId }, { priority: 5 });
```

---

## Key Invariants

### Invariant 1: All Sessions Must Be Persisted
**Rule**: Every webhook call must save the session to database before returning 200 OK.

**Why**: If processing fails, we can retry. If we don't save first, data is lost.

**Enforcement**:
```typescript
// Webhook handler
try {
  // 1. Save session FIRST
  await db.insert(sessions).values(sessionData);

  // 2. Queue processing SECOND
  await queue.add('process', { sessionId });

  // 3. Return success
  return res.status(200).json({ received: true });
} catch (error) {
  // Even if queue fails, session is saved
  logger.error('Queue failed but session persisted', { sessionId });
  return res.status(200).json({ received: true, queued: false });
}
```

### Invariant 2: Scores Always Include Confidence
**Rule**: Never show a tutor score without confidence level.

**Why**: New tutors with 1 session at 5.0 stars shouldn't look better than veterans at 4.8 stars.

**Enforcement**:
```typescript
interface TutorScore {
  score: number;        // 0-100
  confidence: number;   // 0.0-1.0
  sessionCount: number; // For transparency
}

// UI shows: "Score: 4.8 ⭐ (95% confidence, 50 sessions)"
```

### Invariant 3: Flags Must Be Actionable
**Rule**: Every flag must include `recommended_action` field.

**Why**: Coaches need to know WHAT to do, not just WHAT the problem is.

**Enforcement**:
```typescript
interface Flag {
  flag_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommended_action: string; // REQUIRED - never null
  supporting_data: object;
}

// Example
{
  flag_type: 'tutor_no_show',
  severity: 'critical',
  title: 'Tutor No-Show',
  description: 'Tutor did not join 3 sessions in last 14 days',
  recommended_action: 'Immediate check-in required. Assess for burnout or scheduling conflicts.'
}
```

---

## Data Flow

### Request/Response Cycle (Webhook)
1. **Nerdy POST** webhook to `/api/webhooks/session-completed`
2. **Validate** signature + payload with Zod schema
3. **Store** session in `sessions` table (transaction)
4. **Queue** job in Bull (`process-session` job type)
5. **Return** 200 OK with `{ received: true, sessionId }` (< 2 seconds)
6. **Worker picks up** job from queue (async)
7. **Process** Tier 1 rules (< 5 seconds)
8. **Save** flags to `flags` table
9. **Update** `tutor_scores` table (aggregated metrics)
10. **Dashboard** polls or receives update (< 30 seconds)

### State Management
**Server State** (TanStack Query):
- Dashboard data (flags, tutors, sessions)
- Automatic caching with 30-second stale time
- Optimistic updates on flag resolution

**Client State** (Zustand):
- UI state only (sidebar open/closed, filters, sort order)
- No business data in client state

**Why**: Keeps single source of truth in database, prevents stale data issues.

---

## Integration Points

### External Service 1: Nerdy Platform (Webhook)
- **Purpose**: Receives session completion events
- **How we use it**: Webhook POST to `/api/webhooks/session-completed`
- **Failure handling**:
  - Return 200 OK even if processing fails (data is saved)
  - Retry processing via job queue
  - Alert if webhook endpoint is down >5 min

### External Service 2: OpenAI API (Phase 2)
- **Purpose**: NLP analysis of session transcripts/summaries
- **How we use it**:
  - GPT-3.5-Turbo for feature extraction (90% of sessions)
  - GPT-4 for critical sessions only (10% of sessions)
  - text-embedding-ada-002 for semantic search
- **Failure handling**:
  - Retry with exponential backoff (3 attempts)
  - If all fail, degrade to Tier 1 (behavioral signals only)
  - Alert if error rate >5%

### External Service 3: Supabase (PostgreSQL)
- **Purpose**: Managed database + authentication
- **How we use it**:
  - PostgreSQL 16 with pgvector extension
  - Drizzle ORM for type-safe queries
  - Connection pooling via PgBouncer
- **Failure handling**:
  - Connection pool retries
  - Read replicas for high-traffic queries
  - Alert if connection failures >1%

---

## Performance Considerations

### Optimization Strategy
1. **Database Indexes**: High-traffic queries optimized with indexes
   - `(tutor_id, session_start_time)` for tutor history
   - `(status, severity)` for active flags
   - Partial index on `is_first_session = true`

2. **N+1 Query Prevention**: Use JOINs and Drizzle's relational queries
   ```typescript
   // BAD: N+1 query
   for (const tutor of tutors) {
     const score = await getScore(tutor.id);
   }

   // GOOD: Single query with JOIN
   const tutorsWithScores = await db
     .select()
     .from(tutors)
     .leftJoin(tutor_scores, eq(tutors.id, tutor_scores.tutor_id));
   ```

3. **Selective Field Loading**: Only fetch fields needed for view
   ```typescript
   // List view: Only need ID, name, score
   // Detail view: Load everything
   ```

### Caching Strategy
**Redis Caching**:
- Tutor scores (TTL: 1 hour)
- Dashboard aggregates (TTL: 5 minutes)
- OpenAI responses (TTL: 7 days)

**React Query Caching**:
- Stale time: 30 seconds
- Cache time: 5 minutes
- Refetch on window focus

### Scaling Approach
**Horizontal Scaling** (for 10K+ sessions/day):
- Stateless API routes (easy to replicate)
- Job queue workers (add more workers)
- Database read replicas (separate read/write)
- Redis cluster (if needed)

**Current architecture supports 10X scale** with minimal changes.

---

## Testing Strategy

### Unit Tests
- **Coverage target**: >80% for business logic
- **Focus**: Scoring algorithms, flag detection, utilities
- **Tool**: Vitest

### Integration Tests
- **Focus**: API endpoints, job queue, database operations
- **Tool**: Vitest + Supertest

### E2E Tests
- **Focus**: Critical user flows (flag review, tutor detail)
- **Tool**: Playwright

### Load Tests
- **Scenario**: 100 concurrent sessions, 3,000 sessions/hour
- **Tool**: k6 or Artillery
- **Success criteria**: <2s webhook response, <5s processing

---

## Security Considerations

1. **Webhook Signature Verification**: HMAC-SHA256 validation
2. **PII Protection**: Anonymize student data in logs
3. **FERPA Compliance**: Audit all data access
4. **SQL Injection Prevention**: Drizzle ORM parameterized queries
5. **Rate Limiting**: 100 requests/min per IP on webhook endpoint
6. **Authentication**: Supabase Auth with row-level security

---

## Notes

**Design Philosophy**: "Make the common case fast, make the rare case correct."

- 90% of sessions need basic rules checking (Tier 1) - optimize for this
- 10% need deep analysis - can be slower
- Critical flags (no-shows) need immediate attention - priority queue
- Historical trends can wait overnight - batch processing

**Future-Proofing**: Architecture supports adding video analysis, predictive ML models, and real-time updates without major refactoring.
