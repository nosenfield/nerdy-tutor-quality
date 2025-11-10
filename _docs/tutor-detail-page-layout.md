# Tutor Detail Page Layout

**Date:** 2025-11-09  
**Page:** `/dashboard/tutors/[id]`  
**Purpose:** Visualize individual tutor progression and performance over time

---

## Layout Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HEADER (Dashboard Header)                                                  │
│  🚂 Tooter                                    [Logout]                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  BREADCRUMBS                                                                 │
│  Dashboard > Tutors > Tutor #12345                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TUTOR HEADER (Task 4.15)                                            │   │
│  │  ┌───────────────────────────────────────────────────────────────┐   │   │
│  │  │  Tutor Name: John Smith                    [← Back]          │   │   │
│  │  │  Tutor ID: #12345                                             │   │   │
│  │  │                                                               │   │   │
│  │  │  Overall Score: 72/100  [🟡]  Confidence: High              │   │   │
│  │  │                                                               │   │   │
│  │  │  Quick Stats:                                                │   │   │
│  │  │  • Total Sessions: 45                                        │   │   │
│  │  │  • Active Flags: 2                                           │   │   │
│  │  │  • Last Session: 2 days ago                                  │   │   │
│  │  └───────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SCORE BREAKDOWN (Task 4.16)                                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │   │
│  │  │Attendance│  │ Ratings  │  │Completion│  │Reliability│            │   │
│  │  │   85/100 │  │  78/100  │  │  65/100  │  │  70/100  │            │   │
│  │  │   [🟢↑]  │  │   [🟡→]  │  │   [🟡↓]  │  │   [🟡→]  │            │   │
│  │  │  ████████│  │  ███████ │  │  ██████  │  │  ███████  │            │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PERFORMANCE TIMELINE CHART (Task 4.17) ⭐ KEY                        │   │
│  │  ┌───────────────────────────────────────────────────────────────┐   │   │
│  │  │  Score Over Time (Last 90 Days)                               │   │   │
│  │  │                                                               │   │   │
│  │  │  100 ┤                                                         │   │   │
│  │  │   90 ┤                                    ╱───╲               │   │   │
│  │  │   80 ┤                          ╱───╲   ╱     ╲              │   │   │
│  │  │   70 ┤                 ╱───╲  ╱     ╲ ╱       ╲             │   │   │
│  │  │   60 ┤        ╱───╲   ╱     ╲╱       ╲         ╲            │   │   │
│  │  │   50 ┤   ╱───╱     ╲ ╱                 ╲         ╲            │   │   │
│  │  │   40 ┤  ╱            ╲                   ╲       ╲           │   │   │
│  │  │   30 ┤─╱              ╲                   ╲       ╲          │   │   │
│  │  │   20 ┤                 ╲                   ╲       ╲         │   │   │
│  │  │   10 ┤                  ╲                   ╲       ╲         │   │   │
│  │  │    0 └───────────────────────────────────────────────────────│   │   │
│  │  │       90d  75d  60d  45d  30d  15d  Today                    │   │   │
│  │  │                                                               │   │   │
│  │  │  Legend:                                                      │   │   │
│  │  │  • Overall Score ────                                         │   │   │
│  │  │  • Attendance Score ─ ─ ─                                     │   │   │
│  │  │  • Ratings Score ─ · ─                                       │   │   │
│  │  │                                                               │   │   │
│  │  │  Markers:                                                     │   │   │
│  │  │  🔴 Flag Raised    🟢 Intervention    📊 Score Calculated     │   │   │
│  │  │                                                               │   │   │
│  │  │  [Last 30 Days] [Last 60 Days] [Last 90 Days] [All Time]     │   │   │
│  │  └───────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌──────────────────────────────────────┐  ┌─────────────────────────────┐ │
│  │  ACTIVE FLAGS (Task 4.18)             │  │  INTERVENTIONS (Task 4.20)   │ │
│  │  ┌────────────────────────────────┐  │  │  ┌─────────────────────────┐ │ │
│  │  │ 🔴 High: Chronic Lateness       │  │  │  │ 2025-11-05              │ │ │
│  │  │    30% of sessions late         │  │  │  │ Coaching Call           │ │ │
│  │  │    Raised: 2 days ago            │  │  │  │ Discussed punctuality   │ │ │
│  │  │    [View Details]                │  │  │  │                         │ │ │
│  │  ├────────────────────────────────┤  │  │  ├─────────────────────────┤ │ │
│  │  │ 🟡 Medium: Declining Ratings   │  │  │  │ 2025-10-28              │ │ │
│  │  │    7d avg: 3.2, 30d avg: 3.8    │  │  │  │ Written Warning        │ │ │
│  │  │    Raised: 5 days ago            │  │  │  │ Performance review     │ │ │
│  │  │    [View Details]                │  │  │  │                         │ │ │
│  │  └────────────────────────────────┘  │  │  └─────────────────────────┘ │ │
│  │                                       │  │                               │ │
│  │  [View All Flags]                     │  │  [View All Interventions]     │ │
│  └──────────────────────────────────────┘  └─────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  RECENT SESSIONS (Task 4.19)                                          │   │
│  │  ┌───────────────────────────────────────────────────────────────┐   │   │
│  │  │ Date       │ Student │ Rating │ Status │ Duration │ Actions  │   │   │
│  │  ├───────────┼─────────┼────────┼────────┼──────────┼──────────┤   │   │
│  │  │ 2025-11-07│ #45678  │  4.5   │ ✅     │ 60 min   │ [View]   │   │   │
│  │  │ 2025-11-05│ #45679  │  3.0   │ ⚠️ Late│ 55 min   │ [View]   │   │   │
│  │  │ 2025-11-03│ #45680  │  5.0   │ ✅     │ 60 min   │ [View]   │   │   │
│  │  │ 2025-11-01│ #45681  │  2.5   │ ❌ No- │ 0 min    │ [View]   │   │   │
│  │  │           │         │        │  Show  │          │          │   │   │
│  │  │ 2025-10-30│ #45682  │  4.0   │ ✅     │ 60 min   │ [View]   │   │   │
│  │  │  ...      │  ...    │  ...   │  ...   │  ...     │  ...     │   │   │
│  │  └───────────────────────────────────────────────────────────────┘   │   │
│  │                                                                         │   │
│  │  [Show All Sessions]  [Export]  [Previous] [1] [2] [3] [Next]         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Header Section
- **Location:** Top of page (reused from dashboard)
- **Components:**
  - App title: "🚂 Tooter"
  - Logout button
- **Height:** ~64px

### 2. Breadcrumbs
- **Location:** Below header
- **Components:**
  - Dashboard > Tutors > [Tutor Name/ID]
- **Height:** ~40px

### 3. Tutor Header (Task 4.15)
- **Location:** Top of content area
- **Components:**
  - Tutor name and ID
  - Overall score (0-100) with color-coded badge
    - Red (0-50): 🔴
    - Yellow (51-80): 🟡
    - Green (81-100): 🟢
  - Confidence level indicator
  - Quick stats:
    - Total sessions
    - Active flags count
    - Last session date
  - Back button to dashboard
- **Height:** ~120px
- **Width:** Full width

### 4. Score Breakdown (Task 4.16)
- **Location:** Below tutor header
- **Components:**
  - Four score cards in a row:
    1. Attendance Score (0-100)
    2. Ratings Score (0-100)
    3. Completion Score (0-100)
    4. Reliability Score (0-100)
  - Each card shows:
    - Score value (X/100)
    - Trend indicator (↑ improving, ↓ declining, → stable)
    - Progress bar visualization
    - Color coding (red/yellow/green)
- **Height:** ~150px
- **Width:** Full width (4 columns on desktop, 2x2 on tablet, stacked on mobile)

### 5. Performance Timeline Chart (Task 4.17) ⭐ KEY
- **Location:** Below score breakdown
- **Components:**
  - Line chart showing:
    - Overall score over time (primary line)
    - Component scores (optional secondary lines)
    - Flag events as markers (🔴)
    - Intervention events as markers (🟢)
    - Score calculation points (📊)
  - Time period selector:
    - Last 30 Days
    - Last 60 Days
    - Last 90 Days
    - All Time
  - Legend showing all lines
  - Interactive tooltips on hover
- **Height:** ~400px
- **Width:** Full width
- **Implementation:** Recharts LineChart

### 6. Active Flags & Interventions (Tasks 4.18 & 4.20)
- **Location:** Below timeline chart
- **Layout:** Two columns (side by side)
- **Left Column - Active Flags:**
  - List of current flags
  - Each flag shows:
    - Severity badge (🔴 High, 🟡 Medium, 🟠 Low)
    - Flag type and description
    - When raised
    - [View Details] button
  - [View All Flags] link
- **Right Column - Interventions:**
  - List of past interventions
  - Each intervention shows:
    - Date
    - Type (Coaching Call, Written Warning, etc.)
    - Description
  - [View All Interventions] link
- **Height:** ~300px (each column)
- **Width:** 50% each (on desktop, stacked on mobile)

### 7. Recent Sessions Table (Task 4.19)
- **Location:** Bottom of page
- **Components:**
  - Table with columns:
    - Date
    - Student ID
    - Rating (0-5 stars)
    - Status (✅ Completed, ⚠️ Late, ❌ No-Show)
    - Duration
    - Actions ([View] button)
  - Pagination controls:
    - [Show All Sessions] button
    - [Export] button
    - Page navigation (Previous, 1, 2, 3, Next)
  - Sortable columns (optional)
- **Height:** ~400px (with pagination)
- **Width:** Full width

---

## Responsive Layout

### Desktop (> 1024px)
- Full width layout
- All components in single column
- Score breakdown: 4 columns
- Flags & Interventions: 2 columns side by side

### Tablet (768px - 1024px)
- Full width layout
- Score breakdown: 2x2 grid
- Flags & Interventions: Stacked (2 rows)
- Timeline chart: Full width

### Mobile (< 768px)
- Full width layout
- All components stacked vertically
- Score breakdown: 1 column (stacked)
- Flags & Interventions: Stacked
- Timeline chart: Full width (may need horizontal scroll)

---

## Color Scheme

### Score Colors
- **Red (0-50):** `bg-red-100 text-red-800 border-red-300`
- **Yellow (51-80):** `bg-yellow-100 text-yellow-800 border-yellow-300`
- **Green (81-100):** `bg-green-100 text-green-800 border-green-300`

### Flag Severity
- **Critical:** `bg-red-100 text-red-800`
- **High:** `bg-orange-100 text-orange-800`
- **Medium:** `bg-yellow-100 text-yellow-800`
- **Low:** `bg-blue-100 text-blue-800`

### Status Indicators
- **✅ Completed:** Green
- **⚠️ Late:** Yellow
- **❌ No-Show:** Red

---

## Data Sources

### API Endpoints
- **Tutor Data:** `GET /api/tutors/[id]`
  - Returns: `tutor`, `current_score`, `performance_history`, `active_flags`, `recent_sessions`, `interventions`
- **Score Breakdown:** `GET /api/tutors/[id]/score`
  - Returns: `score_breakdown` (attendance, ratings, completion, reliability)

### Data Structure
```typescript
interface TutorDetailPageData {
  tutor: {
    id: string;
    name: string;
    total_sessions: number;
    last_session_date: string;
  };
  current_score: {
    overall: number;
    confidence: "high" | "medium" | "low";
    breakdown: {
      attendance: number;
      ratings: number;
      completion: number;
      reliability: number;
    };
  };
  performance_history: Array<{
    date: string;
    overall_score: number;
    attendance_score: number;
    ratings_score: number;
    completion_score: number;
    reliability_score: number;
  }>;
  active_flags: Array<{
    id: string;
    type: string;
    severity: "critical" | "high" | "medium" | "low";
    description: string;
    raised_at: string;
  }>;
  recent_sessions: Array<{
    id: string;
    date: string;
    student_id: string;
    rating: number;
    status: "completed" | "late" | "no_show";
    duration: number;
  }>;
  interventions: Array<{
    id: string;
    date: string;
    type: string;
    description: string;
  }>;
}
```

---

## Implementation Notes

### Component Structure
```
src/app/dashboard/tutors/[id]/
  └── page.tsx (main page component)

src/components/tutor-detail/
  ├── TutorHeader.tsx (Task 4.15)
  ├── ScoreBreakdown.tsx (Task 4.16)
  ├── PerformanceTimeline.tsx (Task 4.17) ⭐ KEY
  ├── ActiveFlagsList.tsx (Task 4.18)
  ├── RecentSessionsTable.tsx (Task 4.19)
  └── InterventionsHistory.tsx (Task 4.20)
```

### Key Dependencies
- **Recharts:** Already installed (`recharts@3.3.0`)
- **TanStack Query:** Already configured
- **Date-fns:** Already installed for date formatting
- **Headless UI:** Already installed for UI components

### Styling
- Use Tailwind CSS v4 (already configured)
- Follow existing dashboard styling patterns
- Maintain consistent spacing (24px padding, 16px gaps)
- Use existing color scheme from dashboard

---

## Next Steps

1. **Create page structure** (`src/app/dashboard/tutors/[id]/page.tsx`)
2. **Build components in order:**
   - TutorHeader (Task 4.15)
   - ScoreBreakdown (Task 4.16)
   - PerformanceTimeline (Task 4.17) ⭐ KEY
   - ActiveFlagsList (Task 4.18)
   - RecentSessionsTable (Task 4.19)
   - InterventionsHistory (Task 4.20)
3. **Test with real data** from API endpoints
4. **Add responsive design** for mobile/tablet
5. **Add loading and error states**

---

**Document Status:** Ready for implementation  
**Next Action:** Begin Task 4.14 (Create `/dashboard/tutors/[id]` page)

