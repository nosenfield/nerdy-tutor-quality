/**
 * Statistical Utilities
 * 
 * Helper functions for calculating averages, percentiles, trends,
 * and other statistical metrics used in scoring and analytics.
 */

/**
 * Calculate average of an array of numbers
 * 
 * @param values - Array of numbers
 * @returns Average value, or null if array is empty
 */
export function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Calculate percentile value from sorted array
 * 
 * @param values - Sorted array of numbers
 * @param percentile - Percentile (0-100)
 * @returns Value at percentile, or null if array is empty
 */
export function percentile(values: number[], percentile: number): number | null {
  if (values.length === 0) {
    return null;
  }
  if (percentile <= 0) {
    return values[0];
  }
  if (percentile >= 100) {
    return values[values.length - 1];
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower];
  }

  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calculate rate (percentage) from count and total
 * 
 * @param count - Number of occurrences
 * @param total - Total number of items
 * @returns Rate as decimal (0.0 to 1.0), or null if total is 0
 */
export function calculateRate(count: number, total: number): number | null {
  if (total === 0) {
    return null;
  }
  return count / total;
}

/**
 * Determine trend direction from two values
 * 
 * @param oldValue - Older value
 * @param newValue - Newer value
 * @param threshold - Minimum change to be considered significant (default: 0.05 = 5%)
 * @returns 'improving' | 'stable' | 'declining' | null
 */
export function calculateTrend(
  oldValue: number | null,
  newValue: number | null,
  threshold: number = 0.05
): "improving" | "stable" | "declining" | null {
  if (oldValue === null || newValue === null) {
    return null;
  }

  const change = (newValue - oldValue) / oldValue;

  if (Math.abs(change) < threshold) {
    return "stable";
  }

  // For scores/ratings: higher is better (improving)
  // For rates/percentages: lower is better (improving)
  return change > 0 ? "improving" : "declining";
}

/**
 * Calculate percentile rank of a value within a distribution
 * 
 * @param value - Value to rank
 * @param distribution - Array of values in distribution
 * @returns Percentile rank (0-100), or null if distribution is empty
 */
export function percentileRank(
  value: number,
  distribution: number[]
): number | null {
  if (distribution.length === 0) {
    return null;
  }

  const sorted = [...distribution].sort((a, b) => a - b);
  const belowCount = sorted.filter((v) => v < value).length;
  const equalCount = sorted.filter((v) => v === value).length;

  return ((belowCount + equalCount / 2) / sorted.length) * 100;
}

/**
 * Calculate median of an array
 * 
 * @param values - Array of numbers
 * @returns Median value, or null if array is empty
 */
export function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

/**
 * Calculate standard deviation
 * 
 * @param values - Array of numbers
 * @returns Standard deviation, or null if array is empty
 */
export function standardDeviation(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const avg = average(values);
  if (avg === null) {
    return null;
  }

  const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
  const avgSquareDiff = average(squareDiffs);
  if (avgSquareDiff === null) {
    return null;
  }

  return Math.sqrt(avgSquareDiff);
}

/**
 * Round to specified decimal places
 * 
 * @param value - Value to round
 * @param decimals - Number of decimal places (default: 2)
 * @returns Rounded value
 */
export function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

