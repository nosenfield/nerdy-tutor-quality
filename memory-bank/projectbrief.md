# Project Brief: Tutor Quality Scoring System

**Version**: 1.0
**Last Updated**: 2025-11-04

## Project Overview

### What We're Building
An automated tutor quality scoring system for Nerdy (Varsity Tutors) that processes 3,000 daily tutoring sessions and provides actionable coaching insights within 1 hour of session completion. The system uses behavioral signals, ratings data, and NLP analysis to detect at-risk tutors and flag problematic patterns before they lead to student churn.

### Core Problem
Nerdy loses 24% of students after poor first session experiences, struggles with 98.2% tutor-initiated rescheduling, and faces 16% of tutor replacements due to no-shows. Currently, quality monitoring is manual, reactive, and unable to catch problems before they impact retention. Coaches need automated, proactive flagging of at-risk tutors with specific intervention recommendations.

### Target Users
**Primary**: Nerdy Coach Operations Team - Responsible for tutor performance monitoring, coaching interventions, and quality assurance across the tutoring platform.

**Secondary**: Tutor Success Managers - Use insights to guide new tutor onboarding and provide targeted coaching.

### Success Criteria
- Detect 100% of "problem tutor" test scenarios (no-shows, chronic lateness, poor first sessions)
- False positive rate < 20% (coaches agree with 80%+ of flags)
- Processing SLA: 95% of critical insights delivered within 1 hour of session end
- 70% reduction in first-session churn through early intervention
- Coach satisfaction score > 4/5 for dashboard usability

---

## MVP Scope

### Must Have
- [x] Webhook endpoint for session completion events
- [x] Rules-based scoring engine (Tier 1: <5 seconds)
  - No-show detection
  - Lateness tracking (>5 min late = flag)
  - Early-end detection (>10 min early = flag)
  - Reschedule rate monitoring (>15% = flag)
  - Poor first session alerts (rating ≤2 = flag)
- [x] Coach dashboard with:
  - Real-time flag alerts
  - Tutor performance scores (0-100)
  - Performance timeline charts
  - Flag detail views with context
  - Flag resolution workflow
- [x] Async job queue for processing (Bull + Redis)
- [x] PostgreSQL database with proper schema
- [x] Basic authentication for coaches
- [x] Mock data generation for testing (realistic distributions)

### Phase 2 (Nice to Have - Can Defer)
- [ ] NLP analysis of session transcripts (Tier 2: <60 seconds)
  - Empathy scoring
  - Clarity assessment
  - Engagement detection
  - Red flag detection
- [ ] Deep historical analysis (Tier 3: overnight batch)
  - Trend detection (improving/declining)
  - Peer comparisons
  - Churn risk prediction

### Explicitly Out of Scope (MVP)
- Video analysis (Phase 3+ only)
- Real-time dashboard updates via WebSocket (polling is sufficient)
- Mobile app for coaches (web-only MVP)
- Integration with Nerdy's existing coach tools
- Automated email/Slack notifications (manual dashboard checks)
- Multi-language support (English only)
- Advanced ML churn prediction models (Phase 3+)

---

## Technical Constraints

### Performance Targets
- **Webhook Response**: <2 seconds (p95)
- **Tier 1 Processing**: <5 seconds (rules-based flags)
- **Tier 2 Processing**: <60 seconds (NLP analysis) - Phase 2
- **Dashboard Load**: <2 seconds (p95)
- **Processing Volume**: 3,000 sessions/day (~125/hour peak)
- **Uptime**: 99.9% availability

### Platform Requirements
- **Web Dashboard**: Modern browsers (Chrome, Firefox, Safari, Edge - last 2 versions)
- **Mobile Responsive**: Yes (tablet and phone views)
- **Offline Support**: No (requires internet connection)
- **Database**: PostgreSQL 16+ with pgvector extension
- **Node Runtime**: Node.js 20 LTS

### Dependencies
- **Nerdy Platform**: Webhook integration for session completion events
- **OpenAI API**: GPT-3.5/4 for NLP analysis (Phase 2)
- **Supabase**: Managed PostgreSQL + Authentication
- **Upstash Redis**: Serverless Redis for job queue
- **Vercel**: Hosting and edge network

### Budget Constraints
- **OpenAI API**: Target <$30/day (~$900/month)
  - GPT-3.5-Turbo for 90% of sessions
  - GPT-4 only for critical sessions (first sessions, flagged)
- **Infrastructure**: Free tiers sufficient for development, <$100/month production

---

## Project Timeline

- **MVP Target**: 6-8 weeks from kickoff
- **Key Milestones**:
  - Week 1: Foundation (Project setup + Core infrastructure)
  - Week 2: Data & Rules (Mock data + Rules engine)
  - Week 3-4: Dashboard UI (Complete coach interface)
  - Week 5: Backend Processing (Job queue + API routes)
  - Week 6: Polish & Production (Testing + Deployment)
  - Week 7-8: Handoff & Documentation

### Phase Breakdown
- **Phase 0**: Project Setup (1 day)
- **Phase 1**: Core Infrastructure (3-4 days)
- **Phase 2**: Mock Data & Testing (2-3 days)
- **Phase 3**: Rules Engine (3-4 days)
- **Phase 4**: Dashboard UI (5-6 days)
- **Phase 5**: Job Queue & Workers (3-4 days)
- **Phase 6**: API Routes (3-4 days)
- **Phase 7**: NLP Analysis - Optional (2-3 days)
- **Phase 8**: Polish & Production (3-4 days)
- **Phase 9**: Handoff & Documentation (2-3 days)

---

## Risk Mitigation

### High-Risk Items
1. **1-hour SLA compliance**: Mitigated via 3-tier processing architecture
2. **Mock data realism**: Mitigated via seeded personas with validated distributions
3. **False positive rate**: Requires careful threshold tuning and multi-signal confirmation
4. **OpenAI costs**: Mitigated via aggressive caching and GPT-3.5 for 90% of volume

### Dependencies
- Nerdy webhook integration (requires API documentation)
- Transcript availability (Phase 2 - not required for MVP)

---

## Notes

This is a **0-to-1 project** - building from scratch with no existing codebase. The system is designed to be extended (Phase 2: NLP, Phase 3: Video analysis) but MVP focuses on behavioral signals only, which are always available and sufficient for catching critical issues.

**Core Philosophy**: Fast, actionable, explainable. Coaches must understand WHY a tutor was flagged and WHAT to do about it.