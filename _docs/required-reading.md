# Required Reading List: Tutor Quality Scoring System

## Document Purpose
This reading list provides essential knowledge for building Nerdy's Tutor Quality Scoring System. Each section includes context on WHY it matters and WHAT to focus on.

---

## PRIORITY 1: Critical Foundation (Read First)

### 1.1 Project Requirements & Business Context

**Read:** Option B Requirements (from original brief)
```
Key Metrics to Internalize:
- 3,000 daily sessions to process
- 1-hour processing deadline (actionable insights within 1 hour of completion)
- 24% of churners had poor first session experiences
- 98.2% of reschedules are tutor-initiated
- 16% of tutor replacements due to no-shows

Success Criteria:
- Detect patterns leading to poor first sessions
- Flag tutors with high rescheduling rates
- Identify tutors at risk of no-shows
- Provide actionable insights for coaching interventions
```

**Why it matters:** These metrics drive every architectural decision. The 1-hour SLA is critical.

---

### 1.2 Understanding Nerdy's Existing Platform

**Company Research:**
- ✅ Already completed (see research above)
- Nerdy (NYSE: NRDY), $463.6M revenue, 6,313 employees
- Existing tech: Rails, React, PHP, PostgreSQL, TensorFlow, ChatGPT integration
- Already processing sessions with AI summaries
- Already have session recordings and transcripts

**Key Insight:** We're extending an existing pipeline, not building from scratch.

**Read More:**
- Nerdy careers page: https://careers.nerdy.com/
- Their AI announcement: https://www.businesswire.com/news/home/20230203005313/en/

**Focus on:** Understanding their "Live + AI™" platform philosophy

---

### 1.3 Machine Learning for Tutor Quality Assessment

**Core Concepts to Understand:**

#### A. Feature Engineering for Education Data
**Read:** 
- "Feature Engineering for Machine Learning" (Alice Zheng) - Chapters 2-4
- Focus: Converting unstructured session data into meaningful features

**Key Features for Tutor Scoring:**
```
Behavioral Features:
- Response time to student questions
- Session preparation indicators
- Engagement signals (questions asked, activities used)
- Time management (pacing, breaks, overtime)

Historical Features:
- Reschedule rate (trailing 30/60/90 days)
- No-show history
- Rating trends (improving vs. declining)
- Subject expertise signals

First Session Specific:
- Icebreaker effectiveness
- Goal setting clarity
- Student comfort indicators
- Parent satisfaction (if present)
```

**Why it matters:** Good features = accurate predictions. Garbage in, garbage out.

#### B. Classification Models for Risk Prediction
**Read:**
- Scikit-learn documentation: https://scikit-learn.org/stable/supervised_learning.html
- Focus on: Logistic Regression, Random Forests, Gradient Boosting

**Models to Consider:**
```yaml
Phase 1 (Rules-Based):
  - No ML needed, just threshold-based flags
  - Fast to implement, easy to explain
  - Example: if reschedule_rate > 0.15 → flag

Phase 2 (ML-Based):
  - Logistic Regression (baseline, interpretable)
  - Random Forest (handles non-linear patterns)
  - XGBoost (highest accuracy, production-ready)
  
Evaluation Metrics:
  - Precision: When we flag a tutor, are they actually at risk?
  - Recall: Are we catching all at-risk tutors?
  - F1-Score: Balance between false positives and false negatives
```

**Why it matters:** Wrong model = wasted coaching time or missed at-risk tutors.

#### C. Time Series Analysis for Trend Detection
**Read:**
- "Practical Time Series Analysis" (Nielsen) - Chapter 3
- Focus: Detecting declining performance over time

**Patterns to Detect:**
```
Declining Performance:
- Rating trends (moving average over 10 sessions)
- Increasing reschedule frequency
- Decreasing session completion rate

Seasonal Patterns:
- Back-to-school stress periods
- Exam season burnout
- Holiday availability changes
```

**Why it matters:** Catching problems early prevents tutor churn.

---

## PRIORITY 2: Technical Implementation

### 2.1 Natural Language Processing for Session Transcripts

**Why NLP matters:** Session transcripts contain rich signals about tutor quality.

**Read:**
- OpenAI Embeddings documentation: https://platform.openai.com/docs/guides/embeddings
- Focus: Using embeddings for semantic similarity

**NLP Features to Extract:**
```
Sentiment Analysis:
- Student sentiment (positive, neutral, negative)
- Tutor empathy signals
- Frustration detection

Conversation Dynamics:
- Turn-taking balance (tutor talking vs. student talking)
- Question-asking frequency
- Confirmation checks ("Does that make sense?")

Content Quality:
- Explanation clarity (similarity to high-quality examples)
- Use of examples and analogies
- Scaffolding techniques
```

**Quick Implementation:**
```python
# Example: Detect tutor empathy using embeddings
from openai import OpenAI

client = OpenAI()

empathy_phrases = [
    "That's a great question",
    "I understand that's confusing",
    "Let's work through this together"
]

def score_empathy(transcript):
    # Get embeddings
    response = client.embeddings.create(
        model="text-embedding-ada-002",
        input=transcript
    )
    # Compare similarity to empathy examples
    # Return score 0-1
```

**Why it matters:** Transcripts reveal HOW tutors teach, not just outcomes.

---

### 2.2 Real-Time Data Pipelines

**Read:**
- "Designing Data-Intensive Applications" (Kleppmann) - Chapter 11
- Focus: Stream processing for the 1-hour SLA requirement

**Architecture Patterns:**
```
Event-Driven Processing:
1. Session completes → Webhook triggered
2. Transcript generated → Processing starts
3. Features extracted → Model runs
4. Score computed → Dashboard updates
5. Alerts sent → Coaches notified

Target: Total pipeline < 1 hour
```

**Technologies to Understand:**
- **Message Queues:** Redis, RabbitMQ (for async processing)
- **Job Processors:** Bull (Node.js), Celery (Python)
- **Webhooks:** How to receive and validate them

**Read:**
- Bull documentation: https://github.com/OptimalBits/bull
- Webhook best practices: https://webhooks.fyi/

**Why it matters:** 3,000 daily sessions = robust async processing required.

---

### 2.3 Dashboard Design for Actionable Insights

**Read:**
- "Designing with Data" (Rochelle King) - Chapters 3-5
- Focus: Ops dashboards that drive action

**Dashboard Must-Haves:**
```
Daily Overview:
- Tutors flagged today (count, severity)
- Trending issues (spikes in reschedules, rating drops)
- First session failure rate

Tutor Detail View:
- Performance timeline (last 30 days)
- Specific flags with context
- Recommended interventions
- Session examples (good and bad)

Intervention Tracking:
- Coaching actions taken
- Before/after performance comparison
- ROI metrics (prevented churn)
```

**UI/UX Principles:**
```
1. Scannable: Coaches see problems in <5 seconds
2. Actionable: Every flag has a "What to do" recommendation
3. Contextual: Show WHY a tutor was flagged (not just that they were)
4. Prioritized: Most urgent issues at the top
```

**Why it matters:** Best model in the world is useless if coaches don't act on it.

---

## PRIORITY 3: Domain-Specific Knowledge

### 3.1 Education Technology & Learning Science

**Read:**
- "How Learning Works" (Ambrose et al.) - Chapter 1
- Focus: What makes a good tutoring session

**Quality Indicators:**
```
Effective Tutoring Practices:
- Clear learning objectives set at start
- Frequent comprehension checks
- Scaffolding (breaking complex into simple)
- Student-centered (student talks >40% of time)
- Positive reinforcement

Red Flags:
- Tutor monologuing (>80% tutor talk time)
- No comprehension checks
- Skipping ahead when student is lost
- Dismissive language ("This is easy")
```

**Why it matters:** Model needs to understand GOOD tutoring to detect BAD tutoring.

---

### 3.2 Churn Analysis & Retention Strategies

**Read:**
- "The Membership Economy" (Baxter) - Chapter 6
- Focus: Why customers leave subscription services

**Churn Patterns in Tutoring:**
```
Immediate Churn (24% - first session):
- Caused by: Poor tutor match, bad experience, unmet expectations
- Prevention: Better first session quality control

Early Churn (Days 7-30):
- Caused by: Lack of progress, scheduling issues, price sensitivity
- Prevention: Proactive check-ins, progress tracking

Late Churn (90+ days):
- Caused by: Goal achieved, life changes, budget constraints
- Prevention: Goal expansion, relationship building
```

**Why it matters:** Understanding WHY students churn informs WHAT to measure.

---

## PRIORITY 4: Technical Stack Deep Dives

### 4.1 PostgreSQL + pgvector for Embeddings

**Read:**
- pgvector documentation: https://github.com/pgvector/pgvector
- Focus: Storing and querying embeddings efficiently

**Use Cases:**
```sql
-- Store transcript embeddings
CREATE TABLE session_embeddings (
  session_id UUID PRIMARY KEY,
  transcript_embedding vector(1536),
  created_at TIMESTAMP
);

-- Find similar sessions (for comparison)
SELECT session_id, transcript_embedding <=> query_embedding AS distance
FROM session_embeddings
ORDER BY distance
LIMIT 10;
```

**Why it matters:** Fast semantic search over 3,000 daily sessions.

---

### 4.2 OpenAI API for Feature Extraction

**Read:**
- OpenAI API documentation: https://platform.openai.com/docs/api-reference
- Focus: Function calling, embeddings, completion APIs

**Key APIs:**
```python
# 1. Embeddings for semantic similarity
embeddings = openai.Embedding.create(
    model="text-embedding-ada-002",
    input=transcript
)

# 2. Structured extraction with function calling
completion = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[{
        "role": "user",
        "content": f"Extract quality signals from: {transcript}"
    }],
    functions=[{
        "name": "extract_signals",
        "parameters": {
            "type": "object",
            "properties": {
                "empathy_score": {"type": "number"},
                "clarity_score": {"type": "number"},
                "red_flags": {"type": "array"}
            }
        }
    }]
)
```

**Cost Optimization:**
```
Embeddings: $0.0001 / 1K tokens
  - 3,000 sessions/day × 2K tokens = 6M tokens/day = $0.60/day
  
GPT-4: $0.03 / 1K tokens (input)
  - Use only for complex analysis (not all sessions)
  - Batch process to reduce costs
```

**Why it matters:** Budget and latency constraints require smart API usage.

---

### 4.3 Next.js API Routes for Webhook Processing

**Read:**
- Next.js API Routes: https://nextjs.org/docs/pages/building-your-application/routing/api-routes
- Focus: Webhook validation, async job queuing

**Pattern:**
```typescript
// pages/api/webhooks/session-completed.ts
export default async function handler(req, res) {
  // 1. Validate webhook signature
  if (!validateSignature(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // 2. Queue job for processing (don't block response)
  await queue.add('process-session', {
    sessionId: req.body.session_id
  });
  
  // 3. Respond quickly (< 5 seconds)
  res.status(200).json({ received: true });
}
```

**Why it matters:** Webhooks must respond fast or they timeout.

---

## PRIORITY 5: Production Readiness

### 5.1 Monitoring & Observability

**Read:**
- "Observability Engineering" (Majors et al.) - Chapters 1-3
- Focus: What to measure in ML systems

**Key Metrics:**
```
System Health:
- Webhook processing latency (p50, p95, p99)
- Job queue depth and wait time
- API error rates

Model Performance:
- Prediction accuracy (daily)
- False positive rate (flagged tutors who were fine)
- False negative rate (missed at-risk tutors)

Business Impact:
- Coaching interventions triggered
- Tutor retention improvement
- First session success rate
```

**Tools:**
- Sentry (error tracking)
- Vercel Analytics (API performance)
- Custom dashboard (business metrics)

**Why it matters:** Can't improve what you don't measure.

---

### 5.2 Security & Privacy

**Read:**
- FERPA Compliance Guide: https://www2.ed.gov/policy/gen/guid/fpco/ferpa/index.html
- Focus: Handling student education records

**Critical Requirements:**
```
Data Protection:
- Encrypt transcripts at rest and in transit
- Anonymize student names in logs
- Restrict access to authorized personnel only

PII Handling:
- Don't store unnecessary personal info
- Audit logs for all data access
- Data retention policies (30/60/90 days)

Compliance:
- FERPA (US education records)
- GDPR (if serving EU students)
- COPPA (if serving under-13 students)
```

**Why it matters:** One data breach = loss of trust + legal consequences.

---

## Quick Reference: Reading Time Estimates

```
PRIORITY 1 (Critical Foundation):
  - Project requirements: 30 minutes
  - Nerdy research: 1 hour
  - ML concepts: 3-4 hours
  Total: ~5 hours

PRIORITY 2 (Technical Implementation):
  - NLP basics: 2 hours
  - Data pipelines: 2 hours
  - Dashboard design: 1 hour
  Total: ~5 hours

PRIORITY 3 (Domain Knowledge):
  - Learning science: 2 hours
  - Churn analysis: 1 hour
  Total: ~3 hours

PRIORITY 4 (Stack Deep Dives):
  - PostgreSQL/pgvector: 1 hour
  - OpenAI API: 2 hours
  - Next.js patterns: 1 hour
  Total: ~4 hours

PRIORITY 5 (Production):
  - Monitoring: 2 hours
  - Security: 2 hours
  Total: ~4 hours

GRAND TOTAL: ~21 hours of reading
```

---

## AI Agent Consumption Notes

**For Cursor IDE / AI Assistants:**

This document provides context for:
1. **Feature extraction logic** - what signals to look for in transcripts
2. **Model selection** - which ML approaches to use
3. **Architecture patterns** - how to process 3,000 sessions/day
4. **Dashboard design** - what coaches need to see
5. **Production concerns** - security, monitoring, compliance

**When prompting AI:**
```
"Reference required-reading.md for context on tutor quality signals"
"Use the feature engineering patterns from required-reading.md"
"Follow the dashboard principles outlined in required-reading.md"
```

---

## Next Steps After Reading

1. ✅ Review architecture.md (Task 4)
2. ✅ Review task-list.md (Task 5)
3. ✅ Begin implementation with clear context

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-04  
**Optimized for:** AI consumption + human learning
