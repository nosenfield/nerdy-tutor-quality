# Tutor Assessment Dashboard - Implementation Task List

**Project:** Tutor Quality Scoring System - Coach Dashboard UI  
**Version:** 1.1  
**Created:** 2025-11-07  
**Last Updated:** 2025-11-07  
**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Tailwind CSS 4.1, Recharts 3.3, Zustand 5.0, TanStack Query 5.90

**Note:** This replaces the previous Phase 4 dashboard implementation. The scatter plot dashboard is the primary view after login.

---

## 📋 Table of Contents
1. [Project Setup](#project-setup)
2. [Data Layer](#data-layer)
3. [Core Components](#core-components)
4. [Interactive Features](#interactive-features)
5. [Responsive Design](#responsive-design)
6. [Testing & Quality](#testing--quality)
7. [Performance Optimization](#performance-optimization)
8. [Documentation](#documentation)

---

## 🚀 Project Setup

### PS-0: Codebase Review & Migration
- [x] Review existing frontend codebase
- [x] Identify existing components to reuse:
  - `src/components/auth/LogoutButton.tsx` - Can be reused in dashboard header
  - `src/app/login/page.tsx` - Already redirects to `/dashboard` on success
  - `src/middleware.ts` - Already protects `/dashboard` routes
- [ ] Remove empty `/src/app/dashboard/analytics/` directory (if exists)
- [ ] Verify existing dependencies (see PS-1)

**Existing Infrastructure:**
- ✅ Authentication: Supabase Auth with middleware protection
- ✅ Login page: Redirects to `/dashboard` on success
- ✅ Logout component: Available for reuse
- ✅ Middleware: Protects all `/dashboard/*` routes

---

### PS-1: Initialize Dashboard Module
- [ ] Create main dashboard page at `/src/app/dashboard/page.tsx`
- [ ] Set up TanStack Query provider in root layout or dashboard layout
  ```typescript
  // /src/app/dashboard/layout.tsx or /src/app/layout.tsx
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
  ```
- [ ] Configure Tailwind CSS custom theme with approved color palette
  ```typescript
  // Update /src/app/globals.css (Tailwind v4 uses @theme inline)
  @theme inline {
    --color-safe: #10B981;
    --color-warning: #F59E0B;
    --color-risk: #EF4444;
    --color-neutral: #6B7280;
    --color-background: #F9FAFB;
  }
  ```
- [ ] Verify dependencies are installed (already in package.json):
  - ✅ `recharts@3.3.0` - Already installed
  - ✅ `@tanstack/react-query@5.90.6` - Already installed
  - ✅ `zustand@5.0.8` - Already installed
  - ✅ `@headlessui/react@2.2.9` - Already installed
  - ✅ `date-fns@4.1.0` - Already installed (for date handling)
  - ✅ `lucide-react@0.552.0` - Already installed (for icons)
- [ ] Set up TypeScript interfaces for dashboard state (see PS-2)

**Acceptance Criteria:**
- Clean build with no TypeScript errors
- Dashboard route accessible at `/dashboard` (protected by middleware)
- Tailwind colors properly configured and available
- TanStack Query provider wraps dashboard components

---

### PS-2: TypeScript Interfaces
- [ ] Create `/src/lib/types/dashboard.ts` with core interfaces:
  ```typescript
  export interface DateRange {
    start: Date;
    end: Date;
  }
  
  export interface TutorSummary {
    tutorId: string;
    totalSessions: number;
    attendancePercentage: number;
    keptSessionsPercentage: number;
    avgRating: number;
    firstSessionAvgRating?: number;
    daysOnPlatform: number;
    riskFlags: string[];
  }
  
  export interface ScatterPlotDataPoint {
    x: number; // Session count
    y: number; // Percentage metric
    tutorId: string;
  }
  
  export interface TutorDetail {
    tutorId: string;
    totalSessions: number;
    daysOnPlatform: number;
    avgRating: number;
    firstSessionAvgRating?: number;
    attendancePercentage: number;
    keptSessionsPercentage: number;
    riskFlags: Array<{
      type: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      message: string;
    }>;
  }
  ```

**Acceptance Criteria:**
- All interfaces properly typed
- Interfaces match API response structures
- No TypeScript errors

---

## 📊 Data Layer

### DL-1: API Integration
- [ ] Create API client at `/src/lib/api/dashboard.ts`
- [ ] Implement TanStack Query hooks at `/src/lib/hooks/useDashboardData.ts`:
  ```typescript
  // /src/lib/hooks/useDashboardData.ts
  - useTutorSessions(dateRange: DateRange)
  - useTutorScores(dateRange: DateRange)
  - useFlaggedTutors(dateRange: DateRange)
  - useTutorDetail(tutorId: string)
  - useTutorSessionHistory(tutorId: string, dateRange?: DateRange)
  ```
- [ ] Set up QueryClient with cache configuration:
  ```typescript
  // Default config in QueryClient
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
  retry: 2,
  retryDelay: 1000,
  ```
- [ ] Implement error handling and retry logic
- [ ] Add loading states for all data fetching

**API Endpoints Required:**
- `GET /api/dashboard/tutors` - Returns aggregated tutor data for plots
  - Query params: `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- `GET /api/dashboard/tutors/[id]` - Returns detailed tutor data
- `GET /api/dashboard/tutors/[id]/sessions` - Returns session history
  - Query params: `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&page=1&limit=50`
- `GET /api/dashboard/flagged` - Returns list of flagged tutors
  - Query params: `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

**Note:** These endpoints may need to be created. Check existing `/src/app/api/` structure.

**Acceptance Criteria:**
- All API calls use TanStack Query
- Proper TypeScript types for all responses
- Loading and error states handled gracefully

---

### DL-2: State Management
- [ ] Create Zustand store at `/src/lib/stores/dashboardStore.ts`
  - **Note:** Use `/src/lib/stores/` directory (create if needed)
- [ ] Implement UI-only state (no data caching in Zustand):
  ```typescript
  import { DateRange } from '@/lib/types/dashboard';
  
  interface DashboardStore {
    // Date range filter
    dateRange: DateRange;
    setDateRange: (range: DateRange) => void;
    
    // Selected tutor
    selectedTutorId: string | null;
    setSelectedTutor: (id: string | null) => void;
    
    // Table state
    tableSort: { column: string; direction: 'asc' | 'desc' } | null;
    setTableSort: (column: string | null) => void;
    tablePage: number;
    setTablePage: (page: number) => void;
    rowsPerPage: 10 | 25 | 50 | 100;
    setRowsPerPage: (rows: number) => void;
    
    // Modal state
    fullscreenPlot: 'attendance' | 'reschedules' | 'quality' | null;
    setFullscreenPlot: (plot: 'attendance' | 'reschedules' | 'quality' | null) => void;
    
    // Session history modal
    sessionHistoryTutorId: string | null;
    setSessionHistoryModal: (id: string | null) => void;
    
    // First session quality toggle (for quality plot)
    qualityView: 'all' | 'first';
    setQualityView: (view: 'all' | 'first') => void;
  }
  ```
- [ ] Sync dateRange with URL search params (for shareable links)

**Acceptance Criteria:**
- State persists during component re-renders
- No data stored in Zustand (only UI state)
- State changes trigger appropriate re-renders

---

### DL-3: Mock Data Generator
- [ ] Create mock data generator at `/src/lib/mock-data/dashboard.ts`
  - **Note:** Use existing `/src/lib/mock-data/` directory structure
  - Leverage existing mock data generators if possible
- [ ] Generate 100-200 mock tutors with realistic distributions:
  - 70% safe zone (>90% attendance)
  - 20% warning zone (70-90% attendance)
  - 10% risk zone (<70% attendance)
- [ ] Include edge cases:
  - New tutors (5-10 sessions)
  - Veteran tutors (100+ sessions)
  - Mixed performance profiles
- [ ] Export mock data for development and testing
- [ ] Create mock API route handlers for development (optional):
  - `/src/app/api/dashboard/tutors/route.ts` (mock)
  - `/src/app/api/dashboard/flagged/route.ts` (mock)

**Acceptance Criteria:**
- Mock data matches `SessionData` interface
- Realistic distributions for all metrics
- Reproducible seed for consistent testing

---

## 🎨 Core Components

### CC-1: Page Layout
- [ ] Create main dashboard page at `/src/app/dashboard/page.tsx`
- [ ] Add dashboard header component with:
  - Page title: "Tutor Assessment Dashboard"
  - Logout button (reuse `src/components/auth/LogoutButton.tsx`)
  - User info (optional)
- [ ] Implement date range filter component (top of page)
  ```typescript
  // Components:
  - DateRangePicker (Headless UI Listbox)
  - Quick filters: Last Week | Last Month | Last Quarter | All Time
  - Custom date range selector (use date-fns for date handling)
  ```
- [ ] Add page header with title and filter controls
- [ ] Implement responsive grid layout:
  - Desktop: 3 columns for plots
  - Tablet: 2 columns, 1 stacked
  - Mobile: 1 column stacked
- [ ] Wrap page with TanStack Query provider (if not in root layout)

**Acceptance Criteria:**
- Layout matches Figma/design spec
- Date range filter updates all components
- Proper spacing (24px padding, 16px gaps)

---

### CC-2: Scatter Plot Component (Base)
- [ ] Create reusable scatter plot at `/src/components/dashboard/ScatterPlot.tsx`
  - **Note:** Use `/src/components/dashboard/` directory for dashboard-specific components
- [ ] Implement using Recharts library
- [ ] Add plot features:
  - X-axis: Session count (0-150 range)
  - Y-axis: Percentage metric (0-100% range)
  - Dots: One per tutor
  - Grid lines (subtle)
  - Axis labels with proper typography
- [ ] Configure responsive sizing (maintains aspect ratio)
- [ ] Add plot title prop

**Props Interface:**
```typescript
interface ScatterPlotProps {
  title: string;
  data: Array<{ x: number; y: number; tutorId: string }>;
  xLabel: string;
  yLabel: string;
  thresholdLines?: Array<{ value: number; color: string; label: string }>;
  onDotClick: (tutorId: string) => void;
  selectedTutorId?: string | null;
  zones?: Array<{ min: number; max: number; color: string }>;
}
```

**Acceptance Criteria:**
- Renders correctly with mock data
- Smooth animations on data updates
- Proper TypeScript typing
- Accessible (ARIA labels)

---

### CC-3: Scatter Plot - Threshold Zones (1A)
- [ ] Extend ScatterPlot component to support background zones
- [ ] Implement zone rendering:
  ```typescript
  // Example zones for Attendance plot
  zones: [
    { min: 90, max: 100, color: 'rgba(16, 185, 129, 0.1)' }, // Safe
    { min: 70, max: 90, color: 'rgba(245, 158, 11, 0.1)' },  // Warning
    { min: 0, max: 70, color: 'rgba(239, 68, 68, 0.1)' }     // Risk
  ]
  ```
- [ ] Add dashed threshold lines at zone boundaries
- [ ] Add zone legend (collapsible or always visible)
- [ ] Ensure zones render behind dots

**Acceptance Criteria:**
- Zones visible but not overwhelming
- Threshold lines clearly marked
- Legend explains zones
- Works across all three plot types

---

### CC-4: Scatter Plot - First Session Toggle (1B)
- [ ] Add toggle control to "First Session Quality" plot
- [ ] Implement radio button group or segmented control:
  ```typescript
  enum QualityView {
    AllSessions = 'all',
    FirstOnly = 'first'
  }
  ```
- [ ] Toggle switches between two datasets:
  - All Sessions: Average of all student ratings
  - First Only: Average of first session ratings only
- [ ] Add smooth transition when toggling
- [ ] Update y-axis label based on selected view
- [ ] Persist toggle state in Zustand store

**Acceptance Criteria:**
- Toggle is visually clear and accessible
- Data switches smoothly without jarring
- Label updates to reflect current view
- State persists during navigation

---

### CC-5: Scatter Plot - Interactive Features
- [ ] Implement dot click handler
  - Calls `setSelectedTutor(tutorId)` in store
  - Opens detail card at dot location
- [ ] Highlight selected tutor across all plots:
  - Increase dot size by 1.5x
  - Add stroke/border to selected dot
  - Dim other dots (opacity: 0.6)
- [ ] Implement zoom and pan:
  ```typescript
  // Use cmd/ctrl + scroll for zoom
  // Use scroll/drag for pan
  // Store zoom/pan state per plot in component state (not Zustand)
  ```
- [ ] Add "Reset View" button to each plot (top-right corner)
- [ ] Add "Fullscreen" button to each plot (top-right corner)

**Acceptance Criteria:**
- Click interaction feels responsive (<100ms)
- Zoom and pan work smoothly
- Reset button returns to default view
- Fullscreen button opens modal
- Selected tutor visible across all plots

---

### CC-6: Tutor Detail Card (Section 2)
- [ ] Create detail card component at `/src/components/dashboard/TutorDetailCard.tsx`
- [ ] Position card as overlay near clicked dot (absolute positioning)
- [ ] Implement card content:
  ```typescript
  interface TutorDetailCardProps {
    tutorId: string;
    position: { x: number; y: number }; // Dot coordinates
    onClose: () => void;
  }
  
  // Card displays:
  - Tutor ID #
  - Total session count
  - Days on platform
  - Avg rating (all sessions) with ⭐ icon
  - Nested: First session avg rating (if different)
  - Attendance percentage
  - Sessions kept percentage (not rescheduled by tutor)
  - Risk flags section (if any thresholds breached)
  - "View Session History" button
  ```
- [ ] Add close button (X in top-right)
- [ ] Implement click-outside-to-close behavior
- [ ] Add drop shadow and border for visibility
- [ ] Ensure card stays within viewport bounds

**Acceptance Criteria:**
- Card appears near clicked dot without covering it
- All metrics display correctly
- Risk flags only show when relevant
- Card closes on outside click or X button
- Smooth fade-in animation

---

### CC-7: Flagged Tutors Table (Section 3B, 3C)
- [ ] Create table component at `/src/components/dashboard/FlaggedTutorsTable.tsx`
- [ ] Implement table columns:
  ```typescript
  interface TableColumn {
    id: string;
    label: string;
    sortable: boolean;
    renderCell: (tutor: TutorSummary) => ReactNode;
  }
  
  // Columns:
  1. Tutor ID (sortable, clickable)
  2. Total Sessions (sortable)
  3. Attendance % (sortable, with mini bar chart)
  4. Kept Sessions % (sortable, with mini bar chart)
  5. Avg Rating (sortable, with stars)
  6. Days on Platform (sortable)
  ```
- [ ] Add mini visualizations in cells:
  - Progress bars for percentages: `▓▓▓▓▓░ 92%`
  - Star ratings: `★★★★☆`
- [ ] Implement row highlighting:
  - Normal: white background
  - Warning (breaches 1 threshold): light amber `bg-warning/10`
  - Critical (breaches 2+ thresholds): light red `bg-risk/10`
- [ ] Add icon indicators for risk types in rows
- [ ] Click row to highlight tutor in plots

**Acceptance Criteria:**
- Table renders with mock data
- Mini visualizations clearly convey metrics
- Row colors indicate severity
- Click row highlights in scatter plots
- Accessible (keyboard navigation, screen readers)

---

### CC-8: Table Sorting & Pagination
- [ ] Implement column header click sorting:
  - First click: ascending
  - Second click: descending
  - Third click: back to default (unsorted)
- [ ] Add sort indicator arrows (↑↓) in headers
- [ ] Implement pagination controls:
  ```typescript
  // Bottom of table:
  - "Rows per page" dropdown: 10, 25, 50, 100
  - Page indicator: "Showing 1-10 of 247"
  - Previous/Next buttons
  - Page number buttons (show 5 at a time)
  ```
- [ ] Persist sort and pagination state in Zustand
- [ ] Implement sticky table header on scroll
- [ ] Add summary row above table:
  ```typescript
  // "Showing 10 of 247 tutors | 23 flagged for review"
  ```

**Acceptance Criteria:**
- Sorting works correctly for all columns
- Pagination doesn't break on edge cases
- State persists during interactions
- Sticky header works on scroll
- Summary row updates with filters

---

### CC-9: Fullscreen Plot Modal
- [ ] Create modal component at `/src/components/dashboard/FullscreenPlotModal.tsx`
- [ ] Render clicked plot at full screen
- [ ] Use Headless UI Dialog for modal
- [ ] Add close button (X) and ESC key handler
- [ ] Maintain all interactive features in fullscreen:
  - Zoom/pan
  - Dot click
  - Threshold zones
- [ ] Show larger version of plot with more detail
- [ ] Add dark overlay behind modal (backdrop)

**Acceptance Criteria:**
- Modal opens on fullscreen button click
- Plot renders larger with more detail
- All interactions work in fullscreen
- Closes on X button, ESC, or backdrop click
- Smooth open/close animations

---

### CC-10: Session History Modal (Section 2)
- [ ] Create session history modal at `/src/components/dashboard/SessionHistoryModal.tsx`
- [ ] Fetch detailed session data for selected tutor
- [ ] Display session timeline or list:
  ```typescript
  // Modal content:
  - Tutor header (ID, name, total sessions)
  - Timeline view (optional) showing sessions over time
  - Session list with columns:
    * Date/Time
    * Subject(s)
    * Student Rating
    * Attendance Status (on-time, late, no-show)
    * Rescheduled? (by whom)
    * First session? (badge)
  - Filters: Date range, subject, session type
  - Sort: Date, rating, status
  ```
- [ ] Implement trends section at top:
  ```typescript
  // Trends over time (if implemented in Phase 2):
  - Attendance trend chart (↗️ improving, ↘️ declining)
  - Rating trend chart
  - Reschedule trend chart
  ```
- [ ] Add export button (CSV download of session data)
- [ ] Implement pagination for session list

**Acceptance Criteria:**
- Modal opens on "View Session History" button click
- Session data displays correctly
- Filters and sorting work
- Timeline/trends provide insight
- Export generates correct CSV

---

## ⚡ Interactive Features

### IF-1: Cross-Highlight Synchronization
- [ ] Implement global state listener in all plots
- [ ] When tutor selected:
  - Highlight dot in all three scatter plots
  - Highlight corresponding row in table
  - Scroll table to ensure row is visible
- [ ] When table row clicked:
  - Highlight dots in all plots
  - Open detail card
- [ ] Add visual feedback (transition duration: 200ms)

**Acceptance Criteria:**
- Highlighting is instant and synchronized
- Smooth transitions between states
- Scroll behavior doesn't cause jarring
- Works with large datasets (200+ tutors)

---

### IF-2: Date Range Filtering
- [ ] Implement date range filter at page top
- [ ] Quick filters trigger appropriate date ranges:
  - Last Week: 7 days ago to today
  - Last Month: 30 days ago to today
  - Last Quarter: 90 days ago to today
  - All Time: No filter
- [ ] Custom range opens date picker (use Headless UI)
- [ ] Filter updates:
  - All scatter plot data
  - Table data
  - Selected tutor detail card (if open)
- [ ] Add loading state during data refetch
- [ ] Persist filter in Zustand and URL params

**Acceptance Criteria:**
- Quick filters work instantly
- Custom range picker is intuitive
- All components update together
- URL reflects current filter (shareable)
- Loading states are clear

---

### IF-3: Responsive Plot Interactions
- [ ] Implement touch support for mobile:
  - Pinch to zoom
  - Two-finger pan
  - Tap dot to select
- [ ] Add tooltip on hover (desktop):
  - Shows tutor ID and key metric
  - Follows cursor
  - Disappears after 2s or on mouse leave
- [ ] Optimize for different screen sizes:
  - Desktop: Full interaction
  - Tablet: Touch-optimized
  - Mobile: Simplified (no zoom, larger dots)

**Acceptance Criteria:**
- Touch gestures work smoothly on mobile
- Tooltips enhance desktop experience
- No interaction conflicts (hover vs click)
- Performance remains smooth on all devices

---

## 📱 Responsive Design

### RD-1: Mobile Layout (Section 6)
- [ ] Implement responsive breakpoints:
  ```typescript
  // Tailwind breakpoints
  sm: 640px   // Mobile landscape
  md: 768px   // Tablet
  lg: 1024px  // Desktop
  xl: 1280px  // Large desktop
  ```
- [ ] Mobile (<768px) layout:
  - Plots: 1 column, stacked vertically
  - Table: Horizontal scroll or card view
  - Detail card: Full-width overlay
  - Date filter: Collapsible
- [ ] Tablet (768-1024px) layout:
  - Plots: 2 columns (attendance + reschedules), then 1 full-width (quality)
  - Table: Full width, smaller text
- [ ] Test on real devices (iOS Safari, Android Chrome)

**Acceptance Criteria:**
- No horizontal scroll on mobile
- All features accessible on small screens
- Touch targets ≥44x44px
- Text remains readable (min 14px)

---

### RD-2: Tablet Optimizations
- [ ] Adjust plot sizes for tablet screens
- [ ] Implement touch-friendly controls (larger buttons)
- [ ] Add swipe gestures for plot navigation
- [ ] Optimize table for tablet:
  - Reduce column padding
  - Use abbreviated headers
  - Consider hiding less critical columns

**Acceptance Criteria:**
- Layout looks professional on iPad
- Touch interactions feel native
- Performance remains smooth
- No wasted space

---

### RD-3: Desktop Enhancements
- [ ] Optimize for wide screens (>1400px):
  - Increase plot sizes
  - Show more table rows (default 25)
  - Add side panel for detail card (vs overlay)
- [ ] Implement keyboard shortcuts:
  - ESC: Close modals/detail card
  - Arrow keys: Navigate table rows
  - Enter: Open selected tutor detail
  - 1/2/3: Focus plot 1/2/3
- [ ] Add hover states for all interactive elements

**Acceptance Criteria:**
- Wide screens utilize extra space well
- Keyboard navigation is intuitive
- Hover states provide clear affordance
- Feels like a desktop application

---

## 🧪 Testing & Quality

### TQ-1: Unit Tests
- [x] Vitest is already configured (see `vitest.config.ts`)
- [ ] Write tests for utility functions:
  - Date range calculations
  - Threshold breach detection
  - Data aggregation functions
- [ ] Write tests for components:
  - ScatterPlot: Renders with data, handles clicks
  - TutorDetailCard: Displays correct metrics
  - FlaggedTutorsTable: Sorting and pagination
- [ ] Aim for >80% code coverage on utility functions

**Test Files:**
```
/src/lib/utils/__tests__/dashboard.test.ts
/src/components/dashboard/__tests__/ScatterPlot.test.tsx
/src/components/dashboard/__tests__/TutorDetailCard.test.tsx
/src/components/dashboard/__tests__/FlaggedTutorsTable.test.tsx
```

**Acceptance Criteria:**
- All tests pass
- Coverage >80% on utils
- Tests run in <10 seconds
- CI/CD integration ready

---

### TQ-2: Integration Tests
- [ ] Set up Playwright for E2E testing
- [ ] Write integration tests:
  ```typescript
  // Test scenarios:
  1. User lands on dashboard, sees all plots
  2. User clicks dot, detail card opens
  3. User clicks table row, plots highlight
  4. User changes date range, all data updates
  5. User opens fullscreen plot, interacts with it
  6. User opens session history, views details
  ```
- [ ] Test across browsers (Chrome, Firefox, Safari)
- [ ] Test responsive breakpoints

**Acceptance Criteria:**
- All E2E tests pass
- Tests run in <60 seconds
- Visual regression tests included
- CI/CD integration ready

---

### TQ-3: Accessibility Audit
- [ ] Run Lighthouse accessibility audit (score >90)
- [ ] Ensure ARIA labels on all interactive elements:
  - Plots: `aria-label` on dots
  - Buttons: Descriptive labels
  - Modals: `role="dialog"`, focus trap
- [ ] Test keyboard navigation:
  - Tab order is logical
  - Focus indicators visible
  - All actions keyboard-accessible
- [ ] Test with screen reader (NVDA or VoiceOver)
- [ ] Ensure color contrast ratios meet WCAG AA:
  - Text: 4.5:1
  - Interactive elements: 3:1

**Acceptance Criteria:**
- Lighthouse accessibility score >90
- Keyboard navigation works completely
- Screen reader announces correctly
- Color contrast meets WCAG AA

---

### TQ-4: Performance Testing
- [ ] Test with large datasets (500+ tutors)
- [ ] Measure rendering performance:
  - Time to interactive <2s
  - Smooth scroll (60fps)
  - Plot interactions <100ms
- [ ] Optimize if needed:
  - Virtualize table rows (react-window)
  - Debounce search/filter inputs
  - Lazy load session history data
- [ ] Test on slower devices (low-end mobile)

**Acceptance Criteria:**
- Handles 500+ tutors smoothly
- No janky animations
- Fast interactions even on slow devices
- Bundle size <500KB (excluding charts)

---

## 🚀 Performance Optimization

### PO-1: Code Splitting
- [ ] Implement dynamic imports for heavy components:
  ```typescript
  // Lazy load modals
  const SessionHistoryModal = dynamic(() => 
    import('@/components/SessionHistoryModal')
  );
  
  const FullscreenPlotModal = dynamic(() => 
    import('@/components/FullscreenPlotModal')
  );
  ```
- [ ] Split Recharts bundle (load only needed components)
- [ ] Use Next.js automatic code splitting

**Acceptance Criteria:**
- Initial bundle <300KB
- Modal bundles load on-demand
- No noticeable delay when opening modals

---

### PO-2: Data Optimization
- [ ] Implement data pagination for API calls:
  - Fetch only visible tutors initially
  - Load more on scroll or page change
- [ ] Use TanStack Query caching effectively:
  - Cache tutor list for 5 minutes
  - Cache detail data for 10 minutes
  - Invalidate on date range change
- [ ] Optimize API responses:
  - Return only needed fields
  - Use pagination and cursor-based loading
- [ ] Implement optimistic updates where applicable

**Acceptance Criteria:**
- API calls return <500KB per request
- Data loads in <1 second
- Caching reduces redundant requests
- Optimistic updates feel instant

---

### PO-3: Rendering Optimization
- [ ] Implement React.memo for expensive components:
  ```typescript
  export const ScatterPlot = memo(ScatterPlotComponent);
  export const TutorDetailCard = memo(TutorDetailCardComponent);
  ```
- [ ] Use useCallback for event handlers passed to children
- [ ] Use useMemo for expensive calculations:
  - Table sorting
  - Data filtering
  - Aggregate calculations
- [ ] Virtualize table if >100 rows visible

**Acceptance Criteria:**
- Re-renders only when necessary
- No performance warnings in React DevTools
- Smooth scrolling in large tables
- Chart animations don't block UI

---

## 📚 Documentation

### DOC-1: Code Documentation
- [ ] Add JSDoc comments to all exported functions and components:
  ```typescript
  /**
   * Renders a scatter plot for tutor metrics with interactive features
   * @param title - Plot title displayed at the top
   * @param data - Array of data points with x, y, and tutorId
   * @param onDotClick - Callback when a dot is clicked
   * @returns React component
   */
  ```
- [ ] Document complex logic with inline comments
- [ ] Create README in `/src/app/dashboard/README.md` explaining:
  - Component structure
  - State management approach
  - Data flow
  - Key design decisions

**Acceptance Criteria:**
- All public APIs documented
- README is clear and helpful
- Complex logic has explanatory comments

---

### DOC-2: User Guide
- [ ] Create user guide document (Markdown or wiki)
- [ ] Include screenshots/GIFs of key interactions:
  - Selecting a tutor
  - Using date range filter
  - Viewing session history
- [ ] Document interpretation of metrics:
  - What threshold zones mean
  - How to identify at-risk tutors
  - When to intervene
- [ ] Add FAQ section

**Acceptance Criteria:**
- Guide is accessible to non-technical users
- Screenshots show current UI
- FAQ addresses common questions

---

### DOC-3: Technical Documentation
- [ ] Document API contracts:
  - Request/response formats
  - Error handling
  - Rate limits
- [ ] Document state management:
  - What goes in Zustand vs TanStack Query
  - State shape and update patterns
- [ ] Document testing strategy:
  - How to run tests
  - How to add new tests
  - Coverage requirements
- [ ] Add deployment notes:
  - Environment variables needed
  - Build process
  - Deployment checklist

**Acceptance Criteria:**
- Developers can onboard quickly
- API contracts are clear
- Testing is well-documented
- Deployment is repeatable

---

## ✅ Definition of Done

A task is considered complete when:

1. **Code Quality**
   - [ ] TypeScript compiles with no errors
   - [ ] ESLint passes with no warnings
   - [ ] Prettier formatting applied
   - [ ] No console.log statements in production code

2. **Functionality**
   - [ ] Feature works as specified
   - [ ] Edge cases handled
   - [ ] Error states implemented
   - [ ] Loading states implemented

3. **Testing**
   - [ ] Unit tests written and passing
   - [ ] Integration tests written (if applicable)
   - [ ] Manual testing completed
   - [ ] Tested on target browsers/devices

4. **Accessibility**
   - [ ] Keyboard navigation works
   - [ ] ARIA labels added
   - [ ] Color contrast meets WCAG AA
   - [ ] Screen reader friendly

5. **Performance**
   - [ ] No performance regressions
   - [ ] Bundle size acceptable
   - [ ] Renders smoothly (60fps)

6. **Documentation**
   - [ ] Code comments added
   - [ ] README updated (if needed)
   - [ ] API docs updated (if needed)

7. **Review**
   - [ ] Code reviewed by peer
   - [ ] Design reviewed (matches spec)
   - [ ] Product owner approved

---

## 📅 Suggested Implementation Order

### Week 1: Foundation
1. PS-1: Project Setup
2. DL-1: API Integration
3. DL-2: State Management
4. DL-3: Mock Data Generator
5. CC-1: Page Layout

### Week 2: Core Visualizations
6. CC-2: Scatter Plot Component (Base)
7. CC-3: Scatter Plot - Threshold Zones
8. CC-4: Scatter Plot - First Session Toggle
9. CC-5: Scatter Plot - Interactive Features

### Week 3: Details & Tables
10. CC-6: Tutor Detail Card
11. CC-7: Flagged Tutors Table
12. CC-8: Table Sorting & Pagination
13. IF-1: Cross-Highlight Synchronization

### Week 4: Modals & Filtering
14. CC-9: Fullscreen Plot Modal
15. CC-10: Session History Modal
16. IF-2: Date Range Filtering
17. IF-3: Responsive Plot Interactions

### Week 5: Responsive & Polish
18. RD-1: Mobile Layout
19. RD-2: Tablet Optimizations
20. RD-3: Desktop Enhancements
21. PO-1: Code Splitting

### Week 6: Testing & Optimization
22. TQ-1: Unit Tests
23. TQ-2: Integration Tests
24. TQ-3: Accessibility Audit
25. PO-2: Data Optimization
26. PO-3: Rendering Optimization

### Week 7: Documentation & Launch
27. TQ-4: Performance Testing
28. DOC-1: Code Documentation
29. DOC-2: User Guide
30. DOC-3: Technical Documentation
31. Final review and bug fixes
32. Deploy to staging
33. User acceptance testing
34. Deploy to production

---

## 🎯 Success Metrics

After implementation, measure:

1. **Technical Metrics**
   - Lighthouse score >90 (all categories)
   - Bundle size <500KB
   - Time to interactive <2s
   - Test coverage >80%

2. **User Metrics**
   - Time to identify at-risk tutor <30s
   - User can complete key tasks without training
   - Zero critical accessibility issues
   - <5% error rate in user testing

3. **Business Metrics**
   - Coaches can review 20+ tutors per hour
   - 90% of flagged tutors are actionable
   - Dashboard loads 3,000 sessions without issues

---

**Next Steps:**
1. Review this task list with team
2. Refine estimates for each task
3. Assign tasks to developers
4. Begin implementation starting with Week 1 tasks
5. Hold weekly sync to review progress

**Questions or Blockers?**
- Create GitHub issues for each task
- Use issue templates for consistency
- Tag issues with priority and component labels

---

---

## 📝 Migration Notes

### Existing Code to Reuse
- ✅ `src/components/auth/LogoutButton.tsx` - Reuse in dashboard header
- ✅ `src/app/login/page.tsx` - Already redirects to `/dashboard`
- ✅ `src/middleware.ts` - Already protects dashboard routes
- ✅ Authentication infrastructure (Supabase Auth)

### Existing Code to Remove/Clean Up
- [ ] Remove empty `/src/app/dashboard/analytics/` directory (if exists)

### Dependencies Already Installed
All required dependencies are already in `package.json`:
- ✅ `recharts@3.3.0`
- ✅ `@tanstack/react-query@5.90.6`
- ✅ `zustand@5.0.8`
- ✅ `@headlessui/react@2.2.9`
- ✅ `date-fns@4.1.0`
- ✅ `lucide-react@0.552.0`

### Directory Structure
```
src/
├── app/
│   ├── dashboard/
│   │   └── page.tsx          # Main dashboard page (NEW)
│   └── api/
│       └── dashboard/        # API routes (may need creation)
├── components/
│   └── dashboard/            # Dashboard-specific components (NEW)
│       ├── ScatterPlot.tsx
│       ├── TutorDetailCard.tsx
│       ├── FlaggedTutorsTable.tsx
│       ├── FullscreenPlotModal.tsx
│       └── SessionHistoryModal.tsx
├── lib/
│   ├── api/
│   │   └── dashboard.ts      # API client (NEW)
│   ├── hooks/
│   │   └── useDashboardData.ts # TanStack Query hooks (NEW)
│   ├── stores/
│   │   └── dashboardStore.ts  # Zustand store (NEW)
│   ├── types/
│   │   └── dashboard.ts       # Dashboard TypeScript interfaces (NEW)
│   └── mock-data/
│       └── dashboard.ts       # Mock data generator (NEW)
```

---

**Document Version:** 1.1  
**Last Updated:** 2025-11-07  
**Status:** Ready for implementation
