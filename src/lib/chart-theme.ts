/**
 * Chart Theme
 * 
 * Centralized theme configuration for all Recharts visualizations.
 * This is the single source of truth for chart styling.
 */

export const CHART_THEME = {
  colors: {
    safe: "#10B981",
    warning: "#F59E0B",
    risk: "#EF4444",
    neutral: "#6B7280",
    background: "#F9FAFB",
  },

  zones: [
    { min: 90, max: 100, fill: "rgba(16, 185, 129, 0.1)", label: "Safe" },
    { min: 70, max: 90, fill: "rgba(245, 158, 11, 0.1)", label: "Warning" },
    { min: 0, max: 70, fill: "rgba(239, 68, 68, 0.1)", label: "Risk" },
  ],
  // Zones for quality plot (1-5 rating scale)
  qualityZones: [
    { min: 4.0, max: 5.0, fill: "rgba(16, 185, 129, 0.1)", label: "Safe" },
    { min: 3.0, max: 4.0, fill: "rgba(245, 158, 11, 0.1)", label: "Warning" },
    { min: 1.0, max: 3.0, fill: "rgba(239, 68, 68, 0.1)", label: "Risk" },
  ],

  dot: {
    default: { r: 6, opacity: 0.8, fill: "#6B7280" },
    hover: { r: 7, opacity: 1 },
    selected: { r: 8, stroke: "#3B82F6", strokeWidth: 2 },
  },

  thresholdLine: {
    stroke: "#9CA3AF",
    strokeWidth: 1,
    strokeDasharray: "5 5",
  },

  animation: {
    duration: 200,
    easing: "ease-in-out",
  },
} as const;

