import { createTrace } from "@/lib/firebase/config";
import { performanceTracker } from "@/lib/performance/measure";

/**
 * Enhanced Firestore Operations with Performance Tracking
 * IMPORTANT: All operations FORCE fetch from server (no cache)
 * This ensures you ALWAYS get the latest data
 */

/**
 * Wrapper for getDocuments with performance tracking
 * ALWAYS fetches from server - NO CACHE
 */
export async function getDocumentsWithPerformance(
  getDocumentsFn,
  collectionName,
  options = {}
) {
  const traceName = `firestore_get_${collectionName}`;
  const tracePromise = createTrace(traceName);

  performanceTracker.startQuery(collectionName);

  try {
    const trace = await tracePromise;
    trace.start();

    // CRITICAL: Force server fetch (not cache)
    const startTime = performance.now();
    const results = await getDocumentsFn(collectionName, {
      ...options,
      forceServer: true, // FORCE SERVER FETCH
    });
    const endTime = performance.now();

    // Track metrics
    const duration = endTime - startTime;
    trace.putAttribute("collection", collectionName);
    trace.putAttribute("has_filters", options.where ? "true" : "false");
    trace.putMetric("query_duration", duration);
    trace.putMetric("documents_returned", results?.length || 0);

    performanceTracker.endQuery(collectionName, results?.length || 0);

    trace.stop();

    console.log(
      `🔥 Fetched ${results?.length || 0} documents from ${collectionName} in ${duration.toFixed(2)}ms (SERVER)`
    );

    return results;
  } catch (error) {
    performanceTracker.endQuery(collectionName, 0);
    console.error(`❌ Error fetching ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Wrapper for getDocument with performance tracking
 * ALWAYS fetches from server - NO CACHE
 */
export async function getDocumentWithPerformance(
  getDocumentFn,
  collectionName,
  id
) {
  const traceName = `firestore_get_doc_${collectionName}`;
  const tracePromise = createTrace(traceName);

  performanceTracker.startQuery(`${collectionName}_single`);

  try {
    const trace = await tracePromise;
    trace.start();

    const startTime = performance.now();
    const result = await getDocumentFn(collectionName, id);
    const endTime = performance.now();

    const duration = endTime - startTime;
    trace.putAttribute("collection", collectionName);
    trace.putAttribute("document_id", id);
    trace.putMetric("query_duration", duration);
    trace.putMetric("found", result ? 1 : 0);

    performanceTracker.endQuery(`${collectionName}_single`, result ? 1 : 0);

    trace.stop();

    console.log(
      `🔥 Fetched document from ${collectionName} in ${duration.toFixed(2)}ms (SERVER)`
    );

    return result;
  } catch (error) {
    performanceTracker.endQuery(`${collectionName}_single`, 0);
    console.error(`❌ Error fetching document from ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Batch load multiple collections in parallel for faster loading
 * ALWAYS fetches from server - NO CACHE
 */
export async function batchLoadCollections(loaders) {
  console.log(`🚀 Batch loading ${loaders.length} collections in parallel...`);

  const startTime = performance.now();

  try {
    const results = await Promise.all(
      loaders.map(async ({ name, fn }) => {
        try {
          const data = await fn();
          return { name, data, success: true };
        } catch (error) {
          console.error(`❌ Failed to load ${name}:`, error);
          return { name, data: null, success: false, error };
        }
      })
    );

    const endTime = performance.now();
    const duration = endTime - startTime;

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(
      `✅ Batch load completed in ${duration.toFixed(2)}ms (${successful} successful, ${failed} failed)`
    );

    return results;
  } catch (error) {
    console.error("❌ Batch load failed:", error);
    throw error;
  }
}

/**
 * Preload critical data for faster app startup
 * ALWAYS fetches from server - NO CACHE
 */
export async function preloadCriticalData() {
  console.log("🚀 Preloading critical data...");

  const startTime = performance.now();

  try {
    // Dynamically import Firebase services
    const { productsService, categoriesService } = await import(
      "@/lib/firebase/firestore"
    );

    // Load critical data in parallel
    const results = await batchLoadCollections([
      {
        name: "products",
        fn: () => productsService.getAll(),
      },
      {
        name: "categories",
        fn: () => categoriesService.getAll(),
      },
    ]);

    const endTime = performance.now();
    console.log(
      `✅ Critical data preloaded in ${(endTime - startTime).toFixed(2)}ms`
    );

    return results;
  } catch (error) {
    console.error("❌ Failed to preload critical data:", error);
    throw error;
  }
}
