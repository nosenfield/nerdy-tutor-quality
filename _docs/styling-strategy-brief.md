# Styling Strategy Brief: Tutor Dashboard

**Date:** 2025-11-07  
**Project:** Tutor Quality Scoring System - Coach Dashboard  
**Decision:** Hybrid Tailwind + Chart Theme Approach

---

## 📋 Recommendation

**Keep Tailwind CSS 4.1** as the primary styling solution, augmented with a centralized chart theme and selective CSS Modules.

### Distribution:
- **80%** - Tailwind CSS (layout, spacing, responsive design)
- **15%** - Chart Theme (TypeScript constants for data visualization)
- **5%** - CSS Modules (complex animations only)

---

## 🎯 Rationale

1. **Already in Tech Stack** - No adoption cost, team familiar with Tailwind
2. **Rapid Iteration** - Dashboard UI will evolve during development
3. **Chart-Heavy Application** - Most styling complexity is in Recharts config, not CSS
4. **Small Scope** - Focused dashboard doesn't require a full design system

---

## 🏗️ Implementation Architecture

### 1. Tailwind CSS - Layout & Structure
**Use for:**
- Grid layouts and flexbox
- Spacing (padding, margins, gaps)
- Responsive breakpoints
- Typography basics
- Colors for UI chrome (backgrounds, borders)

```typescript
// Example: Dashboard layout
<div className="grid grid-cols-3 gap-4 p-6">
  <Card className="p-4 bg-white rounded-lg shadow-sm">
    <h3 className="text-lg font-semibold mb-4">Tutor Attendance</h3>
    {/* Plot component */}
  </Card>
</div>
```

---

### 2. Chart Theme - Data Visualization
**Use for:**
- All Recharts styling (colors, sizes, strokes)
- Zone definitions (safe/warning/risk)
- Dot states (default/hover/selected)
- Animation timings

**File:** `/src/lib/chart-theme.ts`

```typescript
export const CHART_THEME = {
  colors: {
    safe: '#10B981',
    warning: '#F59E0B',
    risk: '#EF4444',
    neutral: '#6B7280',
    background: '#F9FAFB'
  },
  
  zones: [
    { min: 90, max: 100, fill: 'rgba(16, 185, 129, 0.1)', label: 'Safe' },
    { min: 70, max: 90, fill: 'rgba(245, 158, 11, 0.1)', label: 'Warning' },
    { min: 0, max: 70, fill: 'rgba(239, 68, 68, 0.1)', label: 'Risk' }
  ],
  
  dot: {
    default: { r: 6, opacity: 0.8, fill: '#6B7280' },
    hover: { r: 7, opacity: 1 },
    selected: { r: 8, stroke: '#3B82F6', strokeWidth: 2 }
  },
  
  thresholdLine: {
    stroke: '#9CA3AF',
    strokeWidth: 1,
    strokeDasharray: '5 5'
  },
  
  animation: {
    duration: 200,
    easing: 'ease-in-out'
  }
} as const;
```

**Usage in components:**
```typescript
import { CHART_THEME } from '@/lib/chart-theme';

<ScatterChart>
  <Scatter fill={CHART_THEME.colors.safe} {...CHART_THEME.dot.default} />
  {CHART_THEME.zones.map((zone) => (
    <ReferenceArea y1={zone.min} y2={zone.max} fill={zone.fill} />
  ))}
</ScatterChart>
```

---

### 3. CSS Modules - Complex Animations (Selective)
**Use ONLY for:**
- Detail card positioning and fade-in animations
- Modal entrance/exit transitions
- Complex hover effects that need multiple pseudo-selectors

**Files:**
- `/src/components/dashboard/TutorDetailCard.module.css`
- `/src/components/dashboard/SessionHistoryModal.module.css`

```css
/* TutorDetailCard.module.css */
.card {
  position: absolute;
  z-index: 50;
  animation: fadeInUp 200ms ease-in-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card::before {
  /* Complex pseudo-element for arrow/pointer */
  content: '';
  position: absolute;
  /* ... */
}
```

---

## 📁 File Structure

```
src/
├── lib/
│   └── chart-theme.ts          ← Single source of truth for viz styling
├── components/
│   ├── dashboard/              ← Dashboard-specific components
│   │   ├── ScatterPlot.tsx         ← Uses CHART_THEME
│   │   ├── TutorDetailCard.tsx     ← Uses CSS Module
│   │   ├── TutorDetailCard.module.css
│   │   ├── FlaggedTutorsTable.tsx  ← Uses Tailwind only
│   │   ├── FullscreenPlotModal.tsx
│   │   └── SessionHistoryModal.tsx
│   └── auth/
│       └── LogoutButton.tsx    ← Reusable auth component
└── app/
    ├── dashboard/
    │   └── page.tsx            ← Uses Tailwind for layout
    └── globals.css             ← Tailwind v4 theme config
```

---

## ✅ Benefits of This Approach

1. **Fast Development** - Tailwind for rapid layout iteration
2. **Consistent Charts** - Single theme file prevents style drift
3. **Type Safety** - Chart theme is TypeScript with autocomplete
4. **No Bloat** - Only use CSS Modules where truly needed
5. **Maintainable** - Clear separation of concerns
6. **Team Familiarity** - Leverages existing Tailwind knowledge

---

## 🚫 What NOT to Do

❌ **Don't** put chart colors in Tailwind classes  
❌ **Don't** use inline styles for chart elements  
❌ **Don't** create CSS Modules for simple layouts  
❌ **Don't** duplicate theme values across files  
❌ **Don't** use Tailwind arbitrary values for chart styling  

---

## 🎨 Tailwind v4 Theme Configuration

**File:** `src/app/globals.css`

**Note:** Tailwind CSS v4 uses `@theme inline` in CSS files instead of `tailwind.config.ts`.

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  /* Existing theme variables */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  
  /* Dashboard color palette */
  --color-safe: #10B981;
  --color-warning: #F59E0B;
  --color-risk: #EF4444;
  --color-neutral: #6B7280;
  --color-dashboard-bg: #F9FAFB;
  
  /* Custom spacing for dashboard */
  --spacing-plot-padding: 24px;
  --spacing-plot-gap: 16px;
  --spacing-card-padding: 20px;
  
  /* Custom typography for dashboard */
  --font-size-plot-title: 20px;
  --line-height-plot-title: 28px;
  --font-size-plot-label: 14px;
  --line-height-plot-label: 20px;
  --font-size-table-header: 13px;
  --line-height-table-header: 18px;
  --font-size-table-cell: 13px;
  --line-height-table-cell: 18px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
```

**Usage in components:**
```tsx
// Use Tailwind classes with custom colors
<div className="bg-safe text-white">Safe zone</div>
<div className="bg-warning text-white">Warning zone</div>
<div className="bg-risk text-white">Risk zone</div>

// Use custom spacing (if needed via arbitrary values)
<div className="p-[var(--spacing-plot-padding)]">Content</div>
```

**Note:** For custom spacing and typography, you can either:
1. Use CSS variables directly: `p-[var(--spacing-plot-padding)]`
2. Use Tailwind's arbitrary values: `p-[24px]`
3. Use standard Tailwind spacing: `p-6` (24px = 1.5rem = p-6)

---

## 📊 Example: Complete Component

```typescript
// src/components/dashboard/ScatterPlot.tsx - Demonstrates hybrid approach
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ReferenceArea } from 'recharts';
import { CHART_THEME } from '@/lib/chart-theme';
// import styles from './ScatterPlot.module.css'; // Only if needed for animations

interface ScatterPlotProps {
  title: string;
  data: Array<{ x: number; y: number; tutorId: string }>;
  selectedTutorId?: string | null;
  onDotClick: (tutorId: string) => void;
}

export function ScatterPlot({ title, data, selectedTutorId, onDotClick }: ScatterPlotProps) {
  return (
    // Tailwind: Layout and structure
    <div className="relative p-6 bg-white rounded-lg shadow-sm">
      
      {/* Tailwind: Header layout */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        
        <div className="flex gap-2">
          <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900">
            Reset
          </button>
          <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900">
            Fullscreen
          </button>
        </div>
      </div>

      {/* Chart Theme: All visualization styling */}
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart>
          {/* Threshold zones from theme */}
          {CHART_THEME.zones.map((zone, i) => (
            <ReferenceArea
              key={i}
              y1={zone.min}
              y2={zone.max}
              fill={zone.fill}
              fillOpacity={1}
            />
          ))}
          
          {/* Axes */}
          <XAxis 
            dataKey="x" 
            label={{ value: 'Total Sessions', position: 'bottom' }}
          />
          <YAxis 
            dataKey="y"
            label={{ value: '% Attendance', angle: -90, position: 'left' }}
          />
          
          {/* Data points */}
          <Scatter
            data={data}
            {...CHART_THEME.dot.default}
            onClick={(data) => onDotClick(data.tutorId)}
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* CSS Module: Only for complex positioned overlay (if needed) */}
      {selectedTutorId && (
        <div className="absolute top-0 left-0 z-50">
          {/* Detail card content - positioned absolutely */}
        </div>
      )}
    </div>
  );
}
```

---

## 🔄 Migration Path (If Needed Later)

If Tailwind becomes limiting in the future:

1. **Phase 1:** Continue with current approach (hybrid)
2. **Phase 2:** Extract reusable components to component library
3. **Phase 3:** Consider Vanilla Extract or Stitches if type safety becomes critical
4. **Phase 4:** Only migrate if team grows >5 devs or scope expands significantly

**Current recommendation:** Don't migrate. This approach scales for the foreseeable future.

---

## ✅ Decision Summary

**Approved Approach:** Hybrid Tailwind + Chart Theme + Selective CSS Modules

**Reasoning:**
- Leverages existing team knowledge
- Optimized for chart-heavy dashboard
- No additional dependencies
- Fast development velocity
- Maintainable and scalable

**Review Date:** After MVP launch (reassess if pain points emerge)

---

**Status:** ✅ Approved for Implementation  
**Next Step:** Begin development with this strategy

---

## ⚠️ Important Notes for Tailwind v4

### Configuration Changes
- **No `tailwind.config.ts`** - Tailwind v4 uses `@theme inline` in CSS files
- **Theme variables** - Add custom colors/spacing to `@theme inline` block in `globals.css`
- **PostCSS config** - Uses `@tailwindcss/postcss` plugin (already configured)

### Migration from v3
If you're familiar with Tailwind v3:
- Custom colors: Use `--color-*` in `@theme inline` instead of `theme.extend.colors`
- Custom spacing: Use `--spacing-*` or standard Tailwind classes
- Custom typography: Use CSS variables or standard Tailwind classes
- Plugins: Not needed for this project (no custom plugins required)

### Best Practices
1. **Use standard Tailwind classes** when possible (e.g., `p-6` instead of `p-[24px]`)
2. **Use CSS variables** for chart theme (TypeScript constants)
3. **Use CSS Modules** only for complex animations/positioning
4. **Keep theme centralized** - All chart styling in `/src/lib/chart-theme.ts`
