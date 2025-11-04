# Technical Concerns & Hurdles: Tutor Quality Scoring System

## Document Purpose
This document outlines technical challenges, risks, and mitigation strategies identified during project planning.

---

## 🔴 CRITICAL CONCERNS (Must Address Before Development)

### Concern 1: Processing 3,000 Sessions/Day Within 1-Hour SLA

**The Challenge:**
- Requirement: "Provide actionable insights within 1 hour of session completion"
- Volume: 3,000 sessions/day = ~125 sessions/hour = ~2 sessions/minute
- Each session needs: Feature extraction, NLP analysis, scoring, dashboard updates

**Math:**
```
Available time per session: 60 minutes ÷ 2 sessions = 30 minutes/session
But processing must be async (sessions end at different times)

Peak load scenario (end of school day):
- 500 sessions end between 4-5 PM
- Must process 500 sessions in 60 minutes
- = 7.2 seconds per session average
```

**Bottlenecks:**
1. **OpenAI API calls** - GPT-4 can take 5-15 seconds per request
2. **Database writes** - Transaction locks at high concurrency
3. **Embedding generation** - Text-embedding-ada-002 ~2 seconds per call

**Mitigation Strategies:**

#### Strategy 1: Async Job Queue with Priority
```typescript
// High-priority queue for real-time alerts
const alertQueue = new Bull('tutor-alerts', {
  redis: redisConfig,
  limiter: {
    max: 100,      // 100 jobs per
    duration: 1000  // second
  }
});

// Lower-priority queue for analytics
const analyticsQueue = new Bull('tutor-analytics', {
  redis: redisConfig
});

// On session end webhook
await alertQueue.add('check-critical-flags', {
  sessionId,
  priority: session.is_first_session ? 1 : 3
}, {
  priority: session.is_first_session ? 1 : 3
});
```

**Why this works:**
- First sessions get priority (24% churn risk)
- Non-critical analysis can take up to 24 hours
- Redis queue handles concurrency automatically

---

#### Strategy 2: Tiered Processing Pipeline
```typescript
// Tier 1: INSTANT (< 5 seconds)
// - Rules-based flags only
// - No API calls, pure computation
checkRulesBasedFlags(session); // no-show, reschedule rate, etc.

// Tier 2: FAST (< 60 seconds)
// - Limited NLP analysis
// - Cached embeddings where possible
if (needsDeepAnalysis(session)) {
  await fastNLPAnalysis(session);
}

// Tier 3: DEEP (< 24 hours)
// - Full transcript analysis
// - Cross-session pattern detection
// - Runs overnight in batch
scheduleDeepAnalysis(session);
```

**Implementation:**
```typescript
async function processSession(sessionId: string) {
  // Tier 1: Immediate flags (no API calls)
  const quickFlags = await checkQuickFlags(sessionId);
  if (quickFlags.length > 0) {
    await alertCoaches(quickFlags); // < 5 seconds total
  }
  
  // Tier 2: Queue NLP analysis if needed
  if (session.is_first_session || quickFlags.includes('high_risk')) {
    await nlpQueue.add({ sessionId }, { priority: 1 });
  }
  
  // Tier 3: Queue deep analysis for overnight
  await deepAnalysisQueue.add({ sessionId }, { 
    delay: 3600000 // 1 hour delay
  });
}
```

**Result:** 
- Critical alerts within 5 seconds ✅
- Most insights within 1 hour ✅
- Deep analysis overnight ✅

---

#### Strategy 3: OpenAI API Cost & Latency Optimization
```typescript
// Problem: GPT-4 costs $0.03/1K tokens input
// 3,000 sessions × 2K tokens = 6M tokens/day = $180/day = $5,400/month

// Solution 1: Use GPT-3.5-Turbo for most analysis
// Cost: $0.0015/1K tokens = $9/day = $270/month (95% savings)

// Solution 2: Batch processing
const sessions = await getUnprocessedSessions(100);
const batchPrompt = sessions.map(s => 
  `Session ${s.id}: ${s.transcript_summary}`
).join('\n\n');

// One API call for 100 sessions instead of 100 calls
const results = await openai.chat.completions.create({
  model: "gpt-3.5-turbo",
  messages: [{
    role: "user",
    content: `Analyze these ${sessions.length} tutoring sessions for quality issues...`
  }]
});

// Solution 3: Cache embeddings aggressively
const embeddingCache = new Map<string, number[]>();

async function getEmbedding(text: string) {
  const hash = crypto.createHash('sha256').update(text).digest('hex');
  
  if (embeddingCache.has(hash)) {
    return embeddingCache.get(hash);
  }
  
  const embedding = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text
  });
  
  embeddingCache.set(hash, embedding.data[0].embedding);
  return embedding.data[0].embedding;
}
```

**Cost Projections:**
```
Optimized Approach:
- GPT-3.5-Turbo for 90% of sessions: $270/month
- GPT-4 for critical 10% only: $540/month
- Embeddings (cached 70%): $54/month
Total: ~$864/month

vs. Naive Approach: $5,400/month
Savings: 84%
```

**Risk Level:** 🟡 **MEDIUM** (mitigated with proper architecture)

---

### Concern 2: Mock Data Realism

**The Challenge:**
Without real Nerdy data, our mock data might not reflect actual patterns:
- Real rating distributions (not uniform random)
- Realistic tutor behavior clusters (good tutors vs. struggling tutors)
- Temporal patterns (exam seasons, holidays)
- Subject-specific differences (math tutors vs. English tutors)

**Impact:**
- Model might not work with real data
- False positive/negative rates unknown
- Thresholds need retuning in production

**Mitigation Strategy:**

#### Seeded Mock Data with Realistic Distributions
```typescript
// Based on industry research and common patterns
const REALISTIC_DISTRIBUTIONS = {
  // Most tutors are good (80/20 rule)
  tutor_quality: {
    excellent: 0.20,  // 20% are excellent
    good: 0.50,       // 50% are good
    average: 0.20,    // 20% are average
    struggling: 0.08, // 8% are struggling
    problematic: 0.02 // 2% have serious issues
  },
  
  // Rating distribution (left-skewed, most ratings are high)
  rating_distribution: {
    5: 0.45,  // 45% five-star
    4: 0.35,  // 35% four-star
    3: 0.12,  // 12% three-star
    2: 0.05,  // 5% two-star
    1: 0.03   // 3% one-star
  },
  
  // First session is harder to get right
  first_session_ratings: {
    5: 0.30,  // Lower than ongoing
    4: 0.35,
    3: 0.20,  // Higher than ongoing
    2: 0.10,
    1: 0.05
  },
  
  // Realistic no-show/reschedule rates
  tutor_behaviors: {
    no_show_rate: 0.03,      // 3% of tutors no-show occasionally
    reschedule_rate: 0.12,   // 12% of sessions get rescheduled
    tutor_initiated: 0.982,  // 98.2% of reschedules are tutor-initiated
    late_rate: 0.15,         // 15% of tutors are occasionally late
    end_early_rate: 0.08     // 8% of tutors occasionally end early
  }
};

// Generate tutors with realistic personas
function generateMockTutor(type: TutorQualityType) {
  switch(type) {
    case 'excellent':
      return {
        avg_rating: faker.number.float({ min: 4.7, max: 5.0 }),
        no_show_rate: 0.0,
        reschedule_rate: faker.number.float({ min: 0.0, max: 0.03 }),
        late_rate: faker.number.float({ min: 0.0, max: 0.05 }),
        end_early_rate: 0.0
      };
      
    case 'problematic':
      return {
        avg_rating: faker.number.float({ min: 2.0, max: 3.2 }),
        no_show_rate: faker.number.float({ min: 0.08, max: 0.20 }),
        reschedule_rate: faker.number.float({ min: 0.25, max: 0.40 }),
        late_rate: faker.number.float({ min: 0.30, max: 0.50 }),
        end_early_rate: faker.number.float({ min: 0.20, max: 0.35 })
      };
      
    // ... other types
  }
}
```

#### Validation Against Industry Benchmarks
```typescript
// After generating mock data, validate it
function validateMockData(sessions: SessionData[]) {
  const stats = calculateStats(sessions);
  
  const checks = {
    avg_rating: stats.avgRating >= 4.0 && stats.avgRating <= 4.5,
    no_show_rate: stats.noShowRate >= 0.02 && stats.noShowRate <= 0.05,
    reschedule_rate: stats.rescheduleRate >= 0.10 && stats.rescheduleRate <= 0.15,
    first_session_churn: stats.firstSessionChurn >= 0.20 && stats.firstSessionChurn <= 0.28
  };
  
  if (!Object.values(checks).every(Boolean)) {
    throw new Error('Mock data does not match realistic distributions');
  }
}
```

**Risk Level:** 🟢 **LOW** (mitigated with seeded, validated data)

---

### Concern 3: Cold Start Problem for New Tutors

**The Challenge:**
New tutors have no historical data. How do we score them?

**Scenarios:**
```
Tutor A: 100 sessions, avg rating 4.8
Tutor B: 3 sessions, avg rating 5.0
Tutor C: 1 session, avg rating 2.0

Question: Is Tutor C bad, or did they just have one unlucky session?
```

**Impact:**
- Unfairly flagging new tutors (false positives)
- Missing actual problems until enough data accumulates
- New tutor anxiety about being judged too quickly

**Mitigation Strategy:**

#### Confidence-Weighted Scoring
```typescript
function calculateTutorScore(tutor: Tutor) {
  const sessionCount = tutor.sessions.length;
  const avgRating = tutor.averageRating;
  const globalAverage = 4.2; // Platform average
  
  // Bayesian average: blend personal avg with global avg
  // Weight increases as session count grows
  const confidence = Math.min(sessionCount / 10, 1.0); // Full confidence at 10 sessions
  
  const weightedScore = 
    (confidence * avgRating) + 
    ((1 - confidence) * globalAverage);
  
  return {
    score: weightedScore,
    confidence: confidence,
    flag: sessionCount < 5 ? 'new_tutor' : null
  };
}

// Example outputs:
// Tutor A (100 sessions, 4.8): score=4.8, confidence=1.0
// Tutor B (3 sessions, 5.0): score=4.74, confidence=0.3
// Tutor C (1 session, 2.0): score=3.88, confidence=0.1, flag='new_tutor'
```

#### Minimum Session Threshold
```typescript
const SCORING_RULES = {
  minimum_sessions_for_full_score: 10,
  minimum_sessions_for_coaching_flag: 5,
  minimum_sessions_for_termination_flag: 20
};

function shouldFlagTutor(tutor: Tutor, issue: string) {
  if (tutor.sessionCount < SCORING_RULES.minimum_sessions_for_coaching_flag) {
    // Don't flag new tutors unless it's a critical issue
    return issue === 'no_show' || issue === 'severe_misconduct';
  }
  
  return true;
}
```

**Risk Level:** 🟢 **LOW** (standard ML practice)

---

## 🟡 HIGH PRIORITY CONCERNS (Should Address)

### Concern 4: Transcript & Video Availability for Deep Analysis

**The Challenge:**
We're assuming transcripts and videos exist for all sessions. Reality:
- Sessions might not have transcripts (technical issues)
- Auto-generated transcripts have errors
- Some sessions might be video-only (no audio)
- Privacy concerns with storing transcripts/videos
- Video analysis requires significantly more compute

**Impact:**
Our NLP-based and video-based features won't work without good source data.

**Schema Includes (for future use):**
```typescript
{
  video_url?: string,      // S3/CDN URL to session recording
  transcript_url?: string, // S3/CDN URL to transcript file
}
```

**Note:** For mock data phase, these will be NULL/undefined. In production, these enable:
- **Transcript Analysis:** Sentiment, empathy, clarity, explanation quality
- **Video Analysis:** Body language, whiteboard usage, engagement signals
- **Combined Analysis:** Does tutor behavior match transcript tone?

**Questions for Nerdy:**
1. What % of sessions have usable transcripts?
2. What's the transcript format? (VTT, JSON, plain text)
3. Are transcripts already cleaned/formatted?
4. How long are transcripts stored?
5. What % of sessions have video recordings?
6. Video format and resolution?

**Fallback Strategy (Tiered Analysis):**
```typescript
async function extractFeatures(session: SessionData) {
  // Tier 1: Full transcript analysis (best quality)
  if (session.transcript_url && await isTranscriptAvailable(session.transcript_url)) {
    return await deepNLPAnalysis(session.transcript_url);
  }
  
  // Tier 2: AI summary analysis (Nerdy already generates these)
  if (session.ai_summary) {
    return await summaryAnalysis(session.ai_summary);
  }
  
  // Tier 3: Behavioral signals only (always available)
  return await behavioralAnalysis(session); // ratings, timing, etc.
}

// Future: Video analysis (Phase 2+)
async function analyzeVideo(session: SessionData) {
  if (!session.video_url) return null;
  
  // Extract frames at key moments
  // Analyze tutor engagement, whiteboard usage
  // Detect student attention signals
  // Compare to transcript for consistency
  
  return await videoAnalysisService.analyze(session.video_url);
}
```

**Mock Data Approach:**
```typescript
// In mock data, these will be null/undefined
const mockSession: SessionData = {
  session_id: "abc123",
  // ... other fields
  video_url: undefined,      // Not mocking video content
  transcript_url: undefined, // Not mocking transcripts
  
  // Instead, we'll use synthetic quality signals
  tutor_feedback: { rating: 4, description: "Good session" },
  student_feedback: { rating: 5, description: "Very helpful!" }
};
```

**Future Enhancement Path:**
```typescript
// Phase 1 (MVP): Behavioral signals only
// - Timing, ratings, reschedules, no-shows

// Phase 2: Transcript analysis
// - Sentiment, empathy, clarity
// - Requires transcript_url to be populated

// Phase 3: Video analysis (advanced)
// - Engagement signals, whiteboard usage
// - Requires video_url + significant compute

// Phase 4: Multimodal analysis
// - Combine transcript + video insights
// - Most accurate quality assessment
```

**Risk Level:** 🟡 **MEDIUM** (Phase 1 doesn't need these, future phases do)

---

### Concern 5: Dashboard Real-Time Updates

**The Challenge:**
Coaches need to see updates without manually refreshing.

**Requirements:**
- New flags appear immediately (< 5 seconds)
- Session counts update live
- Multiple coaches viewing same dashboard

**Implementation Options:**

#### Option 1: WebSocket Connection
```typescript
// Server broadcasts updates
io.on('connection', (socket) => {
  socket.join('coaches');
  
  socket.on('subscribe', (coachId) => {
    socket.join(`coach_${coachId}`);
  });
});

// When new flag created
io.to('coaches').emit('new_flag', {
  tutorId,
  flag: 'poor_first_session',
  severity: 'high'
});
```

**Pros:** True real-time, low latency
**Cons:** More complex infrastructure, WebSocket management

---

#### Option 2: Server-Sent Events (SSE)
```typescript
// Simpler than WebSockets, one-way communication
app.get('/api/flags/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  
  const sendUpdate = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  // Subscribe to flag updates
  flagEmitter.on('new_flag', sendUpdate);
});
```

**Pros:** Simpler than WebSockets, built into browsers
**Cons:** One-way only (fine for notifications)

---

#### Option 3: Polling (Simplest)
```typescript
// Frontend polls every 30 seconds
useEffect(() => {
  const interval = setInterval(async () => {
    const newFlags = await fetch('/api/flags/new').then(r => r.json());
    setFlags(prev => [...prev, ...newFlags]);
  }, 30000);
  
  return () => clearInterval(interval);
}, []);
```

**Pros:** Dead simple, no special infrastructure
**Cons:** 30-second delay, more server load

**Recommendation:** Start with polling (Option 3), upgrade to SSE if needed.

**Risk Level:** 🟢 **LOW** (can iterate)

---

### Concern 6: False Positive Management

**The Challenge:**
Flagging good tutors damages morale and wastes coaching time.

**Example False Positives:**
```
Scenario 1: Technical Issue
- Student's internet dies 10 minutes in
- Session ends early
- System flags tutor for "ending early"
- Reality: Not tutor's fault

Scenario 2: Difficult Student
- Student is disengaged (parent-forced tutoring)
- Gives low rating despite good tutoring
- System flags tutor
- Reality: Student motivation issue, not tutor quality

Scenario 3: Subject Difficulty
- AP Physics sessions naturally have lower ratings than basic math
- Tutor gets flagged for "low ratings"
- Reality: Subject difficulty, not tutor quality
```

**Mitigation Strategies:**

#### Strategy 1: Context-Aware Scoring
```typescript
function adjustScoreForContext(rawScore: number, session: SessionData) {
  let adjusted = rawScore;
  
  // Adjust for subject difficulty
  const subjectDifficulty = SUBJECT_DIFFICULTY_MAP[session.subject];
  adjusted += subjectDifficulty * 0.3; // Easier subjects get penalty
  
  // Adjust for session type
  if (session.is_first_session) {
    adjusted += 0.2; // First sessions are harder
  }
  
  // Adjust for student history
  if (session.student_avg_rating < 3.0) {
    adjusted += 0.3; // Student rates everyone low
  }
  
  return adjusted;
}
```

#### Strategy 2: Multi-Signal Confirmation
```typescript
function shouldFlagTutor(tutor: Tutor, signals: Signal[]) {
  // Require multiple independent signals
  const criticalSignals = signals.filter(s => s.severity === 'high');
  const mediumSignals = signals.filter(s => s.severity === 'medium');
  
  // Rules for flagging:
  // - 2+ critical signals, OR
  // - 1 critical + 3+ medium signals, OR
  // - 5+ medium signals
  
  if (criticalSignals.length >= 2) return true;
  if (criticalSignals.length >= 1 && mediumSignals.length >= 3) return true;
  if (mediumSignals.length >= 5) return true;
  
  return false;
}
```

#### Strategy 3: Coach Review Queue
```typescript
// Don't auto-flag, queue for human review
interface FlagCandidate {
  tutorId: string;
  signals: Signal[];
  confidence: number; // 0-1
  autoFlag: boolean;  // Only if confidence > 0.9
}

// High confidence (>0.9): Auto-flag
// Medium confidence (0.7-0.9): Queue for review
// Low confidence (<0.7): Log but don't show
```

**Risk Level:** 🟡 **MEDIUM** (requires careful tuning)

---

## 🟠 MEDIUM PRIORITY CONCERNS (Monitor)

### Concern 7: Privacy & Compliance

**FERPA Requirements:**
- Can't share student PII with unauthorized personnel
- Transcripts contain student names, age, school info
- Must audit all data access

**Implementation:**
```typescript
// Anonymize transcripts before analysis
function anonymizeTranscript(transcript: string): string {
  // Replace student names with [STUDENT]
  // Replace school names with [SCHOOL]
  // Replace ages with [AGE]
  
  return transcript
    .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[STUDENT]')
    .replace(/\b\d{1,2} years old\b/g, '[AGE]')
    .replace(/\b[A-Z][a-z]+ (Elementary|Middle|High) School\b/g, '[SCHOOL]');
}

// Audit log for all access
await auditLog.create({
  userId: coach.id,
  action: 'view_session',
  sessionId,
  timestamp: new Date(),
  ipAddress: req.ip
});
```

**Risk Level:** 🟠 **MEDIUM** (standard compliance practice)

---

### Concern 8: Tutor Gaming the System

**The Challenge:**
Once tutors know they're being scored, they might game it:
- Rescheduling sessions to avoid difficult students
- Ending sessions right at time limit (not overtime)
- Asking students to rate highly

**Detection Strategies:**
```typescript
// Detect suspicious patterns
function detectGaming(tutor: Tutor) {
  const flags = [];
  
  // Pattern 1: Selective rescheduling
  const rescheduleRate = tutor.reschedules / tutor.totalSessions;
  const avgStudentDifficulty = calculateAvgDifficulty(tutor.students);
  
  if (rescheduleRate > 0.2 && avgStudentDifficulty < globalAvg) {
    flags.push('selective_rescheduling');
  }
  
  // Pattern 2: Suspiciously consistent ratings
  const ratingVariance = calculateVariance(tutor.ratings);
  if (ratingVariance < 0.1 && tutor.avgRating > 4.8) {
    flags.push('suspicious_rating_consistency');
  }
  
  // Pattern 3: Always ends exactly on time
  const endTimeVariance = calculateVariance(tutor.sessionEndDeltas);
  if (endTimeVariance < 30) { // seconds
    flags.push('robotic_timing');
  }
  
  return flags;
}
```

**Risk Level:** 🟢 **LOW** (edge case, detectable)

---

## 🟢 LOW PRIORITY CONCERNS (Future Consideration)

### Concern 9: Scalability Beyond 3,000 Sessions/Day

**Future Growth:**
If Nerdy grows to 10,000+ sessions/day:
- Current architecture can handle it (with horizontal scaling)
- Job queue can distribute across multiple workers
- Database will need partitioning (shard by date or tutor_id)

**Mitigation:**
- Design with horizontal scaling in mind
- Use stateless services (easy to replicate)
- Database reads can use replicas

**Risk Level:** 🟢 **LOW** (not immediate concern)

---

### Concern 10: Model Drift Over Time

**The Challenge:**
Initial model thresholds might become outdated as:
- Platform changes (new features, policies)
- Tutor behavior adapts
- Student expectations evolve

**Mitigation:**
```typescript
// Monitor model performance over time
async function trackModelPerformance() {
  const stats = await db.query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as flags_raised,
      COUNT(*) FILTER (WHERE coach_agreed = true) as true_positives,
      COUNT(*) FILTER (WHERE coach_agreed = false) as false_positives
    FROM flags
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
  `);
  
  // Alert if precision drops below 70%
  const precision = stats.true_positives / stats.flags_raised;
  if (precision < 0.7) {
    await alertDataScience('Model precision degraded to ${precision}');
  }
}
```

**Risk Level:** 🟢 **LOW** (standard ML operations)

---

## Summary: Risk Matrix

| Concern | Severity | Likelihood | Mitigation Status |
|---------|----------|------------|-------------------|
| 1-hour SLA | 🔴 Critical | High | ✅ Mitigated (tiered processing) |
| Mock data realism | 🔴 Critical | Medium | ✅ Mitigated (seeded data) |
| Cold start problem | 🔴 Critical | High | ✅ Mitigated (Bayesian scoring) |
| Transcript availability | 🟡 High | Medium | ⚠️ Needs Nerdy confirmation |
| Dashboard real-time | 🟡 High | Low | ✅ Mitigated (polling start) |
| False positives | 🟡 High | High | ⚠️ Requires tuning |
| Privacy/FERPA | 🟠 Medium | Medium | ✅ Standard practice |
| System gaming | 🟠 Medium | Low | ✅ Detectable |
| Scalability | 🟢 Low | Low | ✅ Designed for scale |
| Model drift | 🟢 Low | Medium | ✅ Monitoring in place |

---

## Action Items Before Development

### Must Have (Blockers):
- [ ] Finalize session data schema with Nerdy
- [ ] Confirm transcript availability and format
- [ ] Set up Redis for job queue
- [ ] Design tiered processing pipeline

### Should Have (Important):
- [ ] Create realistic mock data with seeded personas
- [ ] Define false positive tolerance (precision target)
- [ ] Set up basic monitoring/alerting
- [ ] Design coach review workflow

### Nice to Have (Future):
- [ ] Real-time dashboard updates (WebSocket/SSE)
- [ ] Advanced gaming detection
- [ ] Model performance tracking

---

## Questions for Nerdy (If We Had Direct Access)

1. **Transcript Data:**
   - What % of sessions have transcripts?
   - What's the average transcript length (tokens)?
   - Format: VTT, JSON, plain text?

2. **Infrastructure:**
   - Do you have Redis or similar for job queues?
   - Can we add database indexes?
   - What's your preferred deployment (AWS, Docker)?

3. **Privacy:**
   - FERPA compliance requirements?
   - Data retention policies?
   - PII handling guidelines?

4. **Business Logic:**
   - What's an acceptable false positive rate?
   - Who reviews flagged tutors?
   - What interventions exist currently?

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-04  
**Status:** Ready for architecture design
