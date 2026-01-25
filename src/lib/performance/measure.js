/**
 * Performance Measurement Utilities
 * Track Firebase loading times and optimize performance
 */

/**
 * Measure synchronous operation performance
 */
export const measurePerformance = (name, fn) => {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  const duration = end - start;

  console.log(`⚡ ${name} took ${duration.toFixed(2)}ms`);

  // Send to analytics if available
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "performance_measurement", {
      event_category: "performance",
      event_label: name,
      value: Math.round(duration),
    });
  }

  return result;
};

/**
 * Measure asynchronous operation performance
 */
export const measureAsyncPerformance = async (name, fn) => {
  const start = performance.now();
  try {
    const result = await fn();
    const end = performance.now();
    const duration = end - start;

    console.log(`⚡ ${name} took ${duration.toFixed(2)}ms`);

    // Send to analytics
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "async_performance_measurement", {
        event_category: "performance",
        event_label: name,
        value: Math.round(duration),
      });
    }

    return result;
  } catch (error) {
    const end = performance.now();
    const duration = end - start;
    console.error(`❌ ${name} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
};

/**
 * Create a performance marker for detailed profiling
 */
export const createPerformanceMarker = (name) => {
  const markStart = `${name}-start`;
  const markEnd = `${name}-end`;
  const measureName = `${name}-measure`;

  return {
    start: () => {
      if (typeof window !== "undefined") {
        performance.mark(markStart);
      }
    },
    end: () => {
      if (typeof window !== "undefined") {
        performance.mark(markEnd);
        try {
          performance.measure(measureName, markStart, markEnd);
          const measure = performance.getEntriesByName(measureName)[0];
          console.log(`⚡ ${name} took ${measure.duration.toFixed(2)}ms`);

          // Clean up marks
          performance.clearMarks(markStart);
          performance.clearMarks(markEnd);
          performance.clearMeasures(measureName);

          return measure.duration;
        } catch (error) {
          console.error("Performance measurement error:", error);
        }
      }
    },
  };
};

/**
 * Track Firebase query performance
 */
export class FirebasePerformanceTracker {
  constructor() {
    this.metrics = new Map();
  }

  startQuery(queryName) {
    const startTime = performance.now();
    this.metrics.set(queryName, { startTime, endTime: null, duration: null });
  }

  endQuery(queryName, resultCount = 0) {
    const metric = this.metrics.get(queryName);
    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.resultCount = resultCount;

      console.log(
        `🔥 Firebase Query "${queryName}": ${metric.duration.toFixed(2)}ms (${resultCount} documents)`,
      );

      return metric.duration;
    }
  }

  getMetric(queryName) {
    return this.metrics.get(queryName);
  }

  getAllMetrics() {
    return Array.from(this.metrics.entries()).map(([name, metric]) => ({
      name,
      ...metric,
    }));
  }

  clear() {
    this.metrics.clear();
  }
}

export const performanceTracker = new FirebasePerformanceTracker();
