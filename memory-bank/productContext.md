# Product Context: Tutor Quality Scoring System

**Last Updated**: 2025-11-04

## Why This Project Exists

### Problem Statement
Nerdy (NYSE: NRDY, $463.6M revenue) operates a high-volume tutoring platform with 3,000 daily sessions. They face three critical quality issues:

1. **24% of churned students** had poor first session experiences - These students never return after one bad session
2. **98.2% of rescheduling is tutor-initiated** - Indicates tutor reliability problems, not student issues
3. **16% of tutor replacements** are due to no-shows - Severe attendance problems going undetected

Currently, quality monitoring is **manual, reactive, and slow**. By the time a coach reviews a tutor's performance, multiple students may have already had poor experiences and churned.

### User Pain Points

**For Coach Operations Team:**
1. **Information Overload** - 3,000 sessions/day, impossible to review manually
2. **Reactive Mode** - Only learn about problems after multiple complaints
3. **No Prioritization** - Can't distinguish urgent issues from minor ones
4. **Missing Context** - When a tutor gets flagged, don't have full behavioral history
5. **Intervention Uncertainty** - Don't know which coaching actions actually work

**For Tutor Success Managers:**
1. **New Tutor Blindness** - Can't identify struggling new tutors until damage is done
2. **Pattern Blindness** - Can't see trends across tutors (e.g., "Math tutors struggle with first sessions")
3. **No Early Warning** - Find out about at-risk tutors too late for preventive coaching

**For Nerdy Business:**
1. **Churn Cost** - Losing 24% of new students is expensive (acquisition cost wasted)
2. **Reputation Risk** - Poor first sessions damage brand and word-of-mouth
3. **Tutor Retention** - Can't coach tutors effectively without data

### Our Solution
An **automated quality scoring system** that:
- Processes every session within 1 hour of completion
- Flags at-risk tutors with specific, actionable issues
- Provides coaches a prioritized dashboard of interventions needed
- Tracks intervention effectiveness over time
- Catches problems **before** they lead to churn

**Key Insight**: Most quality issues follow detectable patterns (chronic lateness, poor first sessions, high reschedule rates). We can catch these with behavioral signals alone, no need for complex NLP in MVP.

---

## Target Users

### Primary User Persona
- **Name**: Sarah Chen, Coach Operations Lead
- **Role**: Oversees team of 10 coaches responsible for 500 tutors
- **Goals**:
  - Identify at-risk tutors quickly
  - Prioritize coaching interventions
  - Reduce first-session churn
  - Track tutor improvement over time
- **Frustrations**:
  - Can't manually review 3,000 sessions/day
  - Hears about problems through student complaints (too late)
  - Doesn't know which tutors need urgent attention vs. general check-ins
  - Can't prove coaching ROI (no before/after metrics)
- **Tech Savviness**: Intermediate (comfortable with dashboards, not technical)
- **Daily Workflow**:
  1. Morning: Check for overnight flags
  2. Review tutor performance trends
  3. Reach out to flagged tutors for coaching
  4. Document interventions
  5. Track follow-up effectiveness

### Secondary User Persona
- **Name**: Marcus Johnson, Tutor Success Manager
- **Role**: Onboards and coaches new tutors (first 90 days)
- **Goals**:
  - Identify struggling new tutors early
  - Provide targeted training
  - Graduate tutors from onboarding successfully
- **Frustrations**:
  - New tutors have limited data (hard to assess)
  - Doesn't know which tutors need extra support
  - Can't compare new tutor performance to established tutors
- **Tech Savviness**: Beginner-Intermediate (uses dashboards, prefers simple UI)
- **Use Case**: Filters dashboard to show "new tutors only" (< 10 sessions), focuses on first-session quality

---

## Key User Flows

### Flow 1: Morning Flag Review (Primary Journey)
1. **Coach logs into dashboard** at 8 AM
2. **System shows** "5 new high-priority flags overnight"
3. **Coach clicks** on "Tutor No-Show" flag (critical severity)
4. **System displays**:
   - Tutor profile with overall score (45/100 - declining)
   - Specific issue: "3 no-shows in last 14 days (21% no-show rate)"
   - Recent sessions table showing pattern
   - Recommended action: "Immediate check-in required - possible burnout"
5. **Coach documents** intervention in system
6. **System tracks** follow-up date and monitors improvement
7. **Result**: At-risk tutor gets timely coaching before more students affected

### Flow 2: Tutor Deep Dive
1. **Coach searches** for specific tutor by name/ID
2. **System shows** tutor detail page with:
   - Overall quality score (0-100) with confidence level
   - Score breakdown (attendance, ratings, reliability, completion)
   - Performance timeline chart (last 30 days)
   - All active flags with severity
   - Recent sessions table (last 20 sessions)
   - Intervention history
3. **Coach identifies** declining trend (score dropped from 85 to 68 over 2 weeks)
4. **Coach clicks** "Create Intervention"
5. **System prompts** for intervention type and notes
6. **Result**: Documented coaching action with tracking

### Flow 3: Flag Resolution
1. **Coach reviews** "Poor First Session" flag
2. **System shows** supporting evidence (student rating, timing data, feedback)
3. **Coach determines** if flag is valid:
   - **If valid**: Marks as "Resolved - Coaching provided" with notes
   - **If false positive**: Marks as "Dismissed - Technical issue" with reason
4. **System uses** coach feedback to improve future flagging (validation loop)
5. **Result**: Cleaner flag list, better model over time

---

## Product Goals

### Short-term (MVP - 8 weeks)
- Process 3,000 sessions/day with <1 hour SLA (95% compliance)
- Catch 100% of critical issues (no-shows, severe lateness, poor first sessions)
- Achieve <20% false positive rate (80%+ coach agreement)
- Provide actionable insights (every flag has "recommended action")
- Enable basic intervention tracking

### Long-term (Phase 2+)
- Add NLP analysis for transcript insights (empathy, clarity, engagement)
- Predict churn risk 30/90 days ahead (proactive coaching)
- Automate intervention suggestions (ML-powered recommendations)
- Track coaching ROI (measure impact of interventions on scores)
- Integrate with Nerdy's existing coach tools (Salesforce, Slack)
- Video analysis for engagement signals (Phase 3)
- Real-time alerts (WebSocket push notifications)

---

## Success Metrics

### User Engagement (Coach Adoption)
- **Daily Active Coaches**: Target 90%+ of ops team uses dashboard daily
- **Flag Review Rate**: Target 80%+ of flags reviewed within 24 hours
- **Intervention Documentation**: Target 70%+ of flags have documented interventions
- **Dashboard Session Time**: Target 15-20 min/day per coach

### Business Impact
- **First-Session Churn Reduction**: Target 24% → 17% (30% reduction)
- **No-Show Rate**: Target 16% → 8% (50% reduction)
- **Reschedule Rate**: Target 12% → 9% (25% reduction)
- **Coach Time Saved**: Target 5 hours/week per coach (vs. manual review)

### Technical Performance
- **Processing SLA**: 95% of sessions processed within 1 hour
- **Dashboard Load Time**: <2 seconds (p95)
- **Uptime**: 99.9% availability
- **False Positive Rate**: <20%
- **API Cost**: <$30/day ($900/month)

### Model Quality (Validation Metrics)
- **Precision**: 80%+ (coach agrees with flag)
- **Recall**: 90%+ (catches actual problems)
- **F1 Score**: >0.85
- **Coach Satisfaction**: >4/5 (dashboard usability survey)

---

## Competitive Landscape

**Current State**: Nerdy has no automated quality scoring system. This is **net new capability**.

**Alternatives Considered**:
1. **Manual Review** - Current approach, doesn't scale
2. **Off-the-shelf LMS analytics** - Not specific to 1-on-1 tutoring patterns
3. **Build vs. Buy** - No existing products solve this specific problem

**Our Advantage**: Custom-built for Nerdy's specific patterns (first-session churn, tutor-initiated rescheduling, no-shows).

---

## Product Principles

1. **Actionable Over Informational** - Every insight must have a clear "what to do" recommendation
2. **Fast Over Perfect** - 80% accuracy in 5 seconds beats 90% accuracy in 5 minutes
3. **Explainable Over Black Box** - Coaches must understand WHY a flag was raised
4. **Progressive Enhancement** - Start simple (behavioral signals), add complexity (NLP, video) later
5. **Coach Trust First** - False positives damage trust; better to under-flag than over-flag

---

## Notes

**Philosophy**: This is not a "tutor surveillance system" - it's a **coaching enablement tool**. The goal is to help tutors improve, not to punish them. Flags are opportunities for coaching, not automatic penalties.

**Cultural Fit**: Aligns with Nerdy's "Live + AI" strategy - combining human expertise (coaches) with AI insights (automated scoring).