/**
 * IndexedDB Cache for Reports Data
 * Stores receipts and products for faster report loading
 */

import Dexie from "dexie";

class ReportsCacheDB extends Dexie {
  constructor() {
    super("ReportsCacheDB");

    this.version(1).stores({
      receipts:
        "++id, receiptDate, createdAt, employeeId, receiptType, *lineItems.variantId",
      products: "++id, name, categoryId, variantId",
      categories: "++id, name",
      cacheMetadata: "key, timestamp, expiresAt",
    });
  }

  /**
   * Save receipts to cache
   */
  async cacheReceipts(receipts, expiryMinutes = 5) {
    try {
      await this.transaction(
        "rw",
        [this.receipts, this.cacheMetadata],
        async () => {
          // Clear old receipts
          await this.receipts.clear();

          // Add new receipts
          await this.receipts.bulkAdd(receipts);

          // Update metadata
          const now = Date.now();
          await this.cacheMetadata.put({
            key: "receipts",
            timestamp: now,
            expiresAt: now + expiryMinutes * 60 * 1000,
            count: receipts.length,
          });
        }
      );

      console.log(`✅ Cached ${receipts.length} receipts`);
      return true;
    } catch (error) {
      console.error("Error caching receipts:", error);
      return false;
    }
  }

  /**
   * Get receipts from cache
   */
  async getCachedReceipts() {
    try {
      const metadata = await this.cacheMetadata.get("receipts");

      // Check if cache is expired
      if (!metadata || Date.now() > metadata.expiresAt) {
        console.log("📦 Cache expired or not found");
        return null;
      }

      const receipts = await this.receipts.toArray();
      console.log(`✅ Retrieved ${receipts.length} receipts from cache`);
      return receipts;
    } catch (error) {
      console.error("Error getting cached receipts:", error);
      return null;
    }
  }

  /**
   * Get receipts within date range
   */
  async getReceiptsInRange(startDate, endDate) {
    try {
      const metadata = await this.cacheMetadata.get("receipts");

      // Check if cache is expired
      if (!metadata || Date.now() > metadata.expiresAt) {
        return null;
      }

      const receipts = await this.receipts
        .where("receiptDate")
        .between(startDate, endDate, true, true)
        .toArray();

      return receipts;
    } catch (error) {
      console.error("Error getting receipts in range:", error);
      return null;
    }
  }

  /**
   * Cache products
   */
  async cacheProducts(products, expiryMinutes = 30) {
    try {
      await this.transaction(
        "rw",
        [this.products, this.cacheMetadata],
        async () => {
          await this.products.clear();
          await this.products.bulkAdd(products);

          const now = Date.now();
          await this.cacheMetadata.put({
            key: "products",
            timestamp: now,
            expiresAt: now + expiryMinutes * 60 * 1000,
            count: products.length,
          });
        }
      );

      console.log(`✅ Cached ${products.length} products`);
      return true;
    } catch (error) {
      console.error("Error caching products:", error);
      return false;
    }
  }

  /**
   * Get cached products
   */
  async getCachedProducts() {
    try {
      const metadata = await this.cacheMetadata.get("products");

      if (!metadata || Date.now() > metadata.expiresAt) {
        console.log("📦 Products cache expired");
        return null;
      }

      const products = await this.products.toArray();
      console.log(`✅ Retrieved ${products.length} products from cache`);
      return products;
    } catch (error) {
      console.error("Error getting cached products:", error);
      return null;
    }
  }

  /**
   * Cache categories
   */
  async cacheCategories(categories, expiryMinutes = 60) {
    try {
      await this.transaction(
        "rw",
        [this.categories, this.cacheMetadata],
        async () => {
          await this.categories.clear();
          await this.categories.bulkAdd(categories);

          const now = Date.now();
          await this.cacheMetadata.put({
            key: "categories",
            timestamp: now,
            expiresAt: now + expiryMinutes * 60 * 1000,
            count: categories.length,
          });
        }
      );

      return true;
    } catch (error) {
      console.error("Error caching categories:", error);
      return false;
    }
  }

  /**
   * Get cached categories
   */
  async getCachedCategories() {
    try {
      const metadata = await this.cacheMetadata.get("categories");

      if (!metadata || Date.now() > metadata.expiresAt) {
        return null;
      }

      return await this.categories.toArray();
    } catch (error) {
      console.error("Error getting cached categories:", error);
      return null;
    }
  }

  /**
   * Clear products cache
   */
  async clearProductsCache() {
    try {
      await this.transaction(
        "rw",
        [this.products, this.cacheMetadata],
        async () => {
          await this.products.clear();
          await this.cacheMetadata.where("key").equals("products").delete();
        }
      );
      console.log("✅ Products cache cleared");
      return true;
    } catch (error) {
      console.error("Error clearing products cache:", error);
      return false;
    }
  }

  /**
   * Invalidate all caches
   */
  async invalidateAll() {
    try {
      await this.transaction(
        "rw",
        [this.receipts, this.products, this.categories, this.cacheMetadata],
        async () => {
          await this.receipts.clear();
          await this.products.clear();
          await this.categories.clear();
          await this.cacheMetadata.clear();
        }
      );
      console.log("✅ All caches invalidated");
      return true;
    } catch (error) {
      console.error("Error invalidating caches:", error);
      return false;
    }
  }

  /**
   * Get cache stats
   */
  async getCacheStats() {
    try {
      const [receiptsCount, productsCount, categoriesCount, metadata] =
        await Promise.all([
          this.receipts.count(),
          this.products.count(),
          this.categories.count(),
          this.cacheMetadata.toArray(),
        ]);

      return {
        receipts: {
          count: receiptsCount,
          metadata: metadata.find((m) => m.key === "receipts"),
        },
        products: {
          count: productsCount,
          metadata: metadata.find((m) => m.key === "products"),
        },
        categories: {
          count: categoriesCount,
          metadata: metadata.find((m) => m.key === "categories"),
        },
      };
    } catch (error) {
      console.error("Error getting cache stats:", error);
      return null;
    }
  }
}

// Create singleton instance
export const reportsCacheDB = new ReportsCacheDB();
