/**
 * ISY Order Sync Service
 * Background service to retry failed order duplications to ISY API
 */

import db from "@/lib/db/index";
import { retryOrderDuplication } from "./orderDuplicationService";

const SYNC_INTERVAL = 60000; // Check every minute
const MAX_RETRY_ATTEMPTS = 5;
const BATCH_SIZE = 10;

let syncInterval = null;
let isSyncing = false;

/**
 * Process pending ISY order duplications
 */
const processPendingDuplications = async () => {
  if (isSyncing) {
    console.log("⏳ ISY sync already in progress, skipping...");
    return;
  }

  try {
    isSyncing = true;

    // Get pending ISY duplication tasks from sync queue
    const pendingTasks = await db.syncQueue
      .where("type")
      .equals("isy_order_duplication")
      .and(
        (task) =>
          task.status === "pending" && task.attempts < MAX_RETRY_ATTEMPTS,
      )
      .limit(BATCH_SIZE)
      .toArray();

    if (pendingTasks.length === 0) {
      return;
    }

    console.log(
      `🔄 Processing ${pendingTasks.length} pending ISY duplications...`,
    );

    for (const task of pendingTasks) {
      try {
        // Get cashier info (may need to retrieve from storage or task data)
        const cashier = {
          id: task.data?.cashierId || task.data?.userId,
          name: task.data?.cashierName || "Unknown",
        };

        // Attempt to duplicate the order
        const result = await retryOrderDuplication(task.data, cashier, 1);

        if (result.success) {
          // Mark as completed
          await db.syncQueue.update(task.id, {
            status: "completed",
            completedAt: new Date().toISOString(),
            result: result.data,
          });

          console.log("✅ ISY duplication completed:", task.orderNumber);
        } else {
          // Increment attempts
          const newAttempts = (task.attempts || 0) + 1;

          if (newAttempts >= MAX_RETRY_ATTEMPTS) {
            // Mark as failed after max attempts
            await db.syncQueue.update(task.id, {
              status: "failed",
              attempts: newAttempts,
              lastError: result.error,
              failedAt: new Date().toISOString(),
            });

            console.error(
              `❌ ISY duplication failed after ${newAttempts} attempts:`,
              task.orderNumber,
            );
          } else {
            // Update attempts and continue retrying
            await db.syncQueue.update(task.id, {
              attempts: newAttempts,
              lastError: result.error,
              lastAttemptAt: new Date().toISOString(),
            });

            console.warn(
              `⚠️ ISY duplication attempt ${newAttempts} failed:`,
              task.orderNumber,
            );
          }
        }
      } catch (error) {
        console.error("Error processing ISY duplication task:", error);

        // Update attempts on error
        await db.syncQueue.update(task.id, {
          attempts: (task.attempts || 0) + 1,
          lastError: error.message,
          lastAttemptAt: new Date().toISOString(),
        });
      }

      // Small delay between tasks
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("✅ ISY sync batch completed");
  } catch (error) {
    console.error("Error in ISY sync service:", error);
  } finally {
    isSyncing = false;
  }
};

/**
 * Start the background sync service
 */
export const startISYSyncService = () => {
  if (syncInterval) {
    console.warn("ISY sync service already running");
    return;
  }

  console.log("🚀 Starting ISY order sync service...");

  // Run immediately
  processPendingDuplications();

  // Then run on interval
  syncInterval = setInterval(processPendingDuplications, SYNC_INTERVAL);
};

/**
 * Stop the background sync service
 */
export const stopISYSyncService = () => {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log("🛑 ISY sync service stopped");
  }
};

/**
 * Get sync statistics
 */
export const getISYSyncStats = async () => {
  try {
    const pending = await db.syncQueue
      .where("type")
      .equals("isy_order_duplication")
      .and((task) => task.status === "pending")
      .count();

    const completed = await db.syncQueue
      .where("type")
      .equals("isy_order_duplication")
      .and((task) => task.status === "completed")
      .count();

    const failed = await db.syncQueue
      .where("type")
      .equals("isy_order_duplication")
      .and((task) => task.status === "failed")
      .count();

    return {
      pending,
      completed,
      failed,
      total: pending + completed + failed,
    };
  } catch (error) {
    console.error("Error getting ISY sync stats:", error);
    return { pending: 0, completed: 0, failed: 0, total: 0 };
  }
};

/**
 * Manually trigger sync
 */
export const triggerISYSync = async () => {
  console.log("🔄 Manually triggering ISY sync...");
  await processPendingDuplications();
};

/**
 * Clear completed sync tasks (cleanup)
 */
export const cleanupCompletedSyncTasks = async (olderThanDays = 7) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const completedTasks = await db.syncQueue
      .where("type")
      .equals("isy_order_duplication")
      .and((task) => {
        if (task.status !== "completed") return false;
        const completedAt = new Date(task.completedAt);
        return completedAt < cutoffDate;
      })
      .toArray();

    if (completedTasks.length > 0) {
      const ids = completedTasks.map((task) => task.id);
      await db.syncQueue.bulkDelete(ids);
      console.log(`🧹 Cleaned up ${completedTasks.length} old ISY sync tasks`);
    }

    return completedTasks.length;
  } catch (error) {
    console.error("Error cleaning up sync tasks:", error);
    return 0;
  }
};

export const isySyncService = {
  start: startISYSyncService,
  stop: stopISYSyncService,
  trigger: triggerISYSync,
  getStats: getISYSyncStats,
  cleanup: cleanupCompletedSyncTasks,
};
