/**
 * Loyverse API Service
 * Documentation: https://developer.loyverse.com/
 * Uses Next.js API proxy to avoid CORS issues
 */

class LoyverseService {
  constructor() {
    // Use local API proxy instead of direct API calls
    this.proxyURL = "/api/loyverse";
  }

  /**
   * Make API request to Loyverse via proxy
   */
  async request(endpoint, params = {}) {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams({
        endpoint,
        ...params,
      });

      const url = `${this.proxyURL}?${queryParams.toString()}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `API Error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Check if response contains an error
      if (data.error) {
        throw new Error(data.message || "API request failed");
      }

      return data;
    } catch (error) {
      console.error("Loyverse API Error:", error);
      throw error;
    }
  }

  /**
   * Get list of categories
   * @param {Object} params - Query parameters
   * @param {string} params.categories_ids - Comma-separated list of category IDs
   * @param {number} params.limit - Number of results (1-250, default 50)
   * @param {string} params.cursor - Pagination cursor
   * @param {boolean} params.show_deleted - Show deleted items
   * @returns {Promise<Object>} Categories data
   */
  async getCategories(params = {}) {
    const requestParams = {
      ...params,
    };

    if (params.limit) {
      requestParams.limit = Math.min(Math.max(params.limit, 1), 250);
    }

    if (params.categories_ids) {
      requestParams.ids = params.categories_ids;
    }

    return await this.request("/categories", requestParams);
  }

  /**
   * Get all categories (handles pagination automatically)
   */
  async getAllCategories(params = {}) {
    let allCategories = [];
    let cursor = null;
    let hasMore = true;

    while (hasMore) {
      // Build request params - only include cursor if it exists
      const requestParams = {
        ...params,
        limit: 250, // Max per request
      };

      if (cursor) {
        requestParams.cursor = cursor;
      }

      const response = await this.getCategories(requestParams);

      if (response.categories && response.categories.length > 0) {
        allCategories = [...allCategories, ...response.categories];
      }

      // Check if there are more results
      // Only continue if cursor is returned and not empty
      cursor = response.cursor;
      hasMore = !!cursor && cursor !== "";
    }

    return {
      categories: allCategories,
      total: allCategories.length,
    };
  }

  /**
   * Get list of items (products)
   * @param {Object} params - Query parameters
   * @param {string} params.items_ids - Comma-separated list of item IDs
   * @param {string} params.created_at_min - Show resources created after date (ISO 8601)
   * @param {string} params.created_at_max - Show resources created before date (ISO 8601)
   * @param {string} params.updated_at_min - Show resources updated after date (ISO 8601)
   * @param {string} params.updated_at_max - Show resources updated before date (ISO 8601)
   * @param {number} params.limit - Number of results (1-250, default 50)
   * @param {string} params.cursor - Pagination cursor
   * @param {boolean} params.show_deleted - Show deleted items (default: false)
   * @returns {Promise<Object>} Items data
   */
  async getItems(params = {}) {
    const requestParams = {};

    // Limit validation
    if (params.limit) {
      requestParams.limit = Math.min(Math.max(params.limit, 1), 250);
    }

    // Item IDs filter
    if (params.items_ids) {
      requestParams.items_ids = params.items_ids;
    }

    // Date filters
    if (params.created_at_min) {
      requestParams.created_at_min = params.created_at_min;
    }
    if (params.created_at_max) {
      requestParams.created_at_max = params.created_at_max;
    }
    if (params.updated_at_min) {
      requestParams.updated_at_min = params.updated_at_min;
    }
    if (params.updated_at_max) {
      requestParams.updated_at_max = params.updated_at_max;
    }

    // Show deleted
    if (params.show_deleted !== undefined) {
      requestParams.show_deleted = params.show_deleted;
    }

    // Pagination
    if (params.cursor) {
      requestParams.cursor = params.cursor;
    }

    return await this.request("/items", requestParams);
  }

  /**
   * Get all items (handles pagination automatically)
   */
  async getAllItems(params = {}) {
    let allItems = [];
    let cursor = null;
    let hasMore = true;

    while (hasMore) {
      // Build request params - only include cursor if it exists
      const requestParams = {
        ...params,
        limit: 250,
      };

      if (cursor) {
        requestParams.cursor = cursor;
      }

      const response = await this.getItems(requestParams);

      if (response.items && response.items.length > 0) {
        allItems = [...allItems, ...response.items];
      }

      // Only continue if cursor is returned and not empty
      cursor = response.cursor;
      hasMore = !!cursor && cursor !== "";
    }

    return {
      items: allItems,
      total: allItems.length,
    };
  }

  /**
   * Get list of customers
   * @param {Object} params - Query parameters
   * @param {string} params.customer_ids - Comma-separated list of customer IDs
   * @param {string} params.email - Filter customers by email
   * @param {string} params.created_at_min - Show resources created after date (ISO 8601)
   * @param {string} params.created_at_max - Show resources created before date (ISO 8601)
   * @param {string} params.updated_at_min - Show resources updated after date (ISO 8601)
   * @param {string} params.updated_at_max - Show resources updated before date (ISO 8601)
   * @param {number} params.limit - Number of results (1-250, default 50)
   * @param {string} params.cursor - Pagination cursor
   * @returns {Promise<Object>} Customers data
   */
  async getCustomers(params = {}) {
    const requestParams = {};

    // Limit validation
    if (params.limit) {
      requestParams.limit = Math.min(Math.max(params.limit, 1), 250);
    }

    // Customer IDs filter
    if (params.customer_ids) {
      requestParams.customer_ids = params.customer_ids;
    }

    // Email filter
    if (params.email) {
      requestParams.email = params.email;
    }

    // Date filters
    if (params.created_at_min) {
      requestParams.created_at_min = params.created_at_min;
    }
    if (params.created_at_max) {
      requestParams.created_at_max = params.created_at_max;
    }
    if (params.updated_at_min) {
      requestParams.updated_at_min = params.updated_at_min;
    }
    if (params.updated_at_max) {
      requestParams.updated_at_max = params.updated_at_max;
    }

    // Pagination
    if (params.cursor) {
      requestParams.cursor = params.cursor;
    }

    return await this.request("/customers", requestParams);
  }

  /**
   * Get all customers (handles pagination automatically)
   */
  async getAllCustomers(params = {}) {
    let allCustomers = [];
    let cursor = null;
    let hasMore = true;

    while (hasMore) {
      // Build request params - only include cursor if it exists
      const requestParams = {
        ...params,
        limit: 250,
      };

      if (cursor) {
        requestParams.cursor = cursor;
      }

      const response = await this.getCustomers(requestParams);

      if (response.customers && response.customers.length > 0) {
        allCustomers = [...allCustomers, ...response.customers];
      }

      // Only continue if cursor is returned and not empty
      cursor = response.cursor;
      hasMore = !!cursor && cursor !== "";
    }

    return {
      customers: allCustomers,
      total: allCustomers.length,
    };
  }

  /**
   * Get list of receipts (orders)
   * @param {Object} params - Query parameters
   * @param {string} params.receipt_numbers - Comma-separated list of receipt numbers
   * @param {string} params.since_receipt_number - Show receipts since date equal to created_at of this receipt
   * @param {string} params.before_receipt_number - Show receipts up to date equal to created_at of this receipt
   * @param {string} params.store_id - Show receipts only for specified store
   * @param {string} params.order - Filter receipts by order
   * @param {string} params.source - The source this receipt comes from
   * @param {string} params.updated_at_min - Show receipts updated after date
   * @param {string} params.updated_at_max - Show receipts updated before date
   * @param {string} params.created_at_min - Show receipts created after date
   * @param {string} params.created_at_max - Show receipts created before date
   * @param {number} params.limit - Pagination limit (1-250)
   * @param {string} params.cursor - Pagination cursor
   * @returns {Promise<Object>} Response with receipts array and cursor
   */
  async getReceipts(params = {}) {
    const requestParams = {};

    // Add query parameters
    if (params.receipt_numbers)
      requestParams.receipt_numbers = params.receipt_numbers;
    if (params.since_receipt_number)
      requestParams.since_receipt_number = params.since_receipt_number;
    if (params.before_receipt_number)
      requestParams.before_receipt_number = params.before_receipt_number;
    if (params.store_id) requestParams.store_id = params.store_id;
    if (params.order) requestParams.order = params.order;
    if (params.source) requestParams.source = params.source;
    if (params.updated_at_min)
      requestParams.updated_at_min = params.updated_at_min;
    if (params.updated_at_max)
      requestParams.updated_at_max = params.updated_at_max;
    if (params.created_at_min)
      requestParams.created_at_min = params.created_at_min;
    if (params.created_at_max)
      requestParams.created_at_max = params.created_at_max;
    if (params.limit)
      requestParams.limit = Math.min(Math.max(params.limit, 1), 250);
    if (params.cursor && params.cursor !== "" && params.cursor !== "null")
      requestParams.cursor = params.cursor;

    return await this.request("/receipts", requestParams);
  }

  /**
   * Get all receipts with automatic pagination
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} All receipts
   */
  async getAllReceipts(params = {}) {
    let allReceipts = [];
    let cursor = null;
    let hasMore = true;
    const onProgress = params.onProgress;

    while (hasMore) {
      const requestParams = {
        ...params,
        limit: params.limit || 250,
      };

      // Remove onProgress from API params
      delete requestParams.onProgress;

      // Only include cursor if it exists and is not empty
      if (cursor && cursor !== "" && cursor !== "null") {
        requestParams.cursor = cursor;
      }

      const response = await this.getReceipts(requestParams);

      if (response.receipts && response.receipts.length > 0) {
        allReceipts = allReceipts.concat(response.receipts);

        // Call progress callback if provided
        if (onProgress && typeof onProgress === "function") {
          const estimatedTotal = hasMore
            ? allReceipts.length + 250
            : allReceipts.length;
          onProgress(allReceipts.length, estimatedTotal);
        }
      }

      cursor = response.cursor;
      hasMore = !!cursor && cursor !== "";
    }

    return {
      receipts: allReceipts,
      total: allReceipts.length,
    };
  }

  /**
   * Get inventory levels for item variants
   * @param {Object} params - Query parameters
   * @param {string} params.store_ids - Show inventory levels only for specified stores
   * @param {string} params.variant_ids - Show inventory levels only for specified variants
   * @param {string} params.updated_at_min - Show inventory levels updated at or after specified date
   * @param {string} params.updated_at_max - Show inventory levels updated at or before specified date
   * @param {number} params.limit - Used for pagination (1-250)
   * @param {string} params.cursor - Used for pagination
   * @returns {Promise<Object>} Response with inventory_levels array and cursor
   */
  async getInventory(params = {}) {
    const requestParams = {};

    // Add query parameters
    if (params.store_ids) requestParams.store_ids = params.store_ids;
    if (params.variant_ids) requestParams.variant_ids = params.variant_ids;
    if (params.updated_at_min)
      requestParams.updated_at_min = params.updated_at_min;
    if (params.updated_at_max)
      requestParams.updated_at_max = params.updated_at_max;
    if (params.limit)
      requestParams.limit = Math.min(Math.max(params.limit, 1), 250);
    if (params.cursor && params.cursor !== "" && params.cursor !== "null")
      requestParams.cursor = params.cursor;

    return await this.request("/inventory", requestParams);
  }

  /**
   * Get all inventory levels with automatic pagination
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} All inventory levels
   */
  async getAllInventory(params = {}) {
    let allInventory = [];
    let cursor = null;
    let hasMore = true;

    while (hasMore) {
      const requestParams = {
        ...params,
        limit: params.limit || 250,
      };

      // Only include cursor if it exists and is not empty
      if (cursor && cursor !== "" && cursor !== "null") {
        requestParams.cursor = cursor;
      }

      const response = await this.getInventory(requestParams);

      if (response.inventory_levels && response.inventory_levels.length > 0) {
        allInventory = allInventory.concat(response.inventory_levels);
      }

      cursor = response.cursor;
      hasMore = !!cursor && cursor !== "";
    }

    return {
      inventory_levels: allInventory,
      total: allInventory.length,
    };
  }

  /**
   * Get a single employee by ID
   * @param {string} employeeId - The employee ID
   * @returns {Promise<Object>} Employee details
   */
  async getEmployee(employeeId) {
    if (!employeeId) {
      throw new Error("Employee ID is required");
    }

    const data = await this.request(`/employees/${employeeId}`);
    return data;
  }

  /**
   * Get list of payment types
   * @param {Object} params - Query parameters
   * @param {string} params.payment_type_ids - Comma-separated list of payment type IDs
   * @param {string} params.created_at_min - Show resources created after date
   * @param {string} params.created_at_max - Show resources created before date
   * @param {string} params.updated_at_min - Show resources updated after date
   * @param {string} params.updated_at_max - Show resources updated before date
   * @param {boolean} params.show_deleted - Show deleted payment types
   * @returns {Promise<Object>} Response with payment_types array
   */
  async getPaymentTypes(params = {}) {
    const requestParams = {};

    // Add query parameters
    if (params.payment_type_ids)
      requestParams.payment_type_ids = params.payment_type_ids;
    if (params.created_at_min)
      requestParams.created_at_min = params.created_at_min;
    if (params.created_at_max)
      requestParams.created_at_max = params.created_at_max;
    if (params.updated_at_min)
      requestParams.updated_at_min = params.updated_at_min;
    if (params.updated_at_max)
      requestParams.updated_at_max = params.updated_at_max;
    if (params.show_deleted !== undefined)
      requestParams.show_deleted = params.show_deleted;

    return await this.request("/payment_types", requestParams);
  }

  /**
   * Get all payment types (convenience method)
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} All payment types
   */
  async getAllPaymentTypes(params = {}) {
    return await this.getPaymentTypes(params);
  }

  /**
   * Create a receipt (POST request)
   * @param {Object} receiptData - Receipt data to create
   * @returns {Promise<Object>} Created receipt data
   */
  async createReceipt(receiptData) {
    try {
      const response = await fetch(this.proxyURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: "/receipts",
          method: "POST",
          data: receiptData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `API Error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Check if response contains an error
      if (data.error) {
        throw new Error(data.message || "Failed to create receipt");
      }

      return data;
    } catch (error) {
      console.error("Create receipt error:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const loyverseService = new LoyverseService();
export default loyverseService;
