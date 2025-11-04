import Dexie from "dexie";

/**
 * Reset the database by deleting and recreating it
 * This is needed when schema changes are incompatible with migration
 */
export async function resetDatabase() {
  try {
    console.log("🗑️ Deleting old database...");
    await Dexie.delete("CandyKushPOS");
    console.log("✅ Database deleted successfully");
    console.log("🔄 Please refresh the page to recreate the database");
    return true;
  } catch (error) {
    console.error("❌ Error deleting database:", error);
    return false;
  }
}

// Expose to window for manual execution in console
if (typeof window !== "undefined") {
  window.resetDatabase = resetDatabase;
}
