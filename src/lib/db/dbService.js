import db from "./index";

/**
 * Database service with common operations
 */

export const dbService = {
  // Products
  async getProducts(filters = {}) {
    let query = db.products.toCollection();

    if (filters.categoryId) {
      query = query.filter((p) => p.categoryId === filters.categoryId);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      query = query.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.barcode?.includes(search) ||
          p.sku?.includes(search)
      );
    }

    return await query.toArray();
  },

  async getProductById(id) {
    return await db.products.get(id);
  },

  async getProductByBarcode(barcode) {
    return await db.products.where("barcode").equals(barcode).first();
  },

  async upsertProducts(products) {
    return await db.products.bulkPut(products);
  },

  async updateProductStock(productId, quantity) {
    const product = await db.products.get(productId);
    if (product) {
      product.stock = (product.stock || 0) + quantity;
      await db.products.put(product);
    }
  },

  async deleteProduct(id) {
    const result = await db.products.delete(id);
    return result;
  },

  async bulkDeleteProducts(ids) {
    const result = await db.products.bulkDelete(ids);
    return result;
  },

  // Categories
  async getCategories() {
    return await db.categories.toArray();
  },

  async upsertCategories(categories) {
    return await db.categories.bulkPut(categories);
  },

  async updateCategory(id, updates) {
    const category = await db.categories.get(id);
    if (!category) {
      throw new Error("Category not found");
    }
    return await db.categories.put({ ...category, ...updates, id });
  },

  async deleteCategory(id) {
    return await db.categories.delete(id);
  },

  // Orders
  async createOrder(order, items) {
    return await db.transaction(
      "rw",
      db.orders,
      db.orderItems,
      db.syncQueue,
      async () => {
        const orderId = await db.orders.add(order);

        const orderItemsWithOrderId = items.map((item) => ({
          ...item,
          orderId,
        }));

        await db.orderItems.bulkAdd(orderItemsWithOrderId);

        // Add to sync queue with proper structure
        await db.syncQueue.add({
          type: "order",
          action: "create",
          data: {
            id: orderId,
            ...order,
            items: orderItemsWithOrderId,
          },
        });

        return orderId;
      }
    );
  },

  async getOrders(filters = {}) {
    let query = db.orders.toCollection();

    if (filters.status) {
      query = query.filter((o) => o.status === filters.status);
    }

    if (filters.userId) {
      query = query.filter((o) => o.userId === filters.userId);
    }

    if (filters.startDate) {
      query = query.filter(
        (o) => new Date(o.createdAt) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      query = query.filter(
        (o) => new Date(o.createdAt) <= new Date(filters.endDate)
      );
    }

    return await query.reverse().toArray();
  },

  async getOrderWithItems(orderId) {
    const order = await db.orders.get(orderId);
    if (!order) return null;

    const items = await db.orderItems
      .where("orderId")
      .equals(orderId)
      .toArray();
    return { ...order, items };
  },

  async updateOrder(orderId, updates) {
    return await db.orders.update(orderId, updates);
  },

  // Tickets (Parked Orders)
  async createTicket(ticket, items) {
    return await db.transaction("rw", db.tickets, db.ticketItems, async () => {
      const ticketId = await db.tickets.add(ticket);

      const ticketItemsWithTicketId = items.map((item) => ({
        ...item,
        ticketId,
      }));

      await db.ticketItems.bulkAdd(ticketItemsWithTicketId);

      return ticketId;
    });
  },

  async updateTicket(ticketId, ticket, items) {
    return await db.transaction("rw", db.tickets, db.ticketItems, async () => {
      await db.tickets.update(ticketId, ticket);

      // Delete old items
      await db.ticketItems.where("ticketId").equals(ticketId).delete();

      // Add new items
      const ticketItemsWithTicketId = items.map((item) => ({
        ...item,
        ticketId,
      }));

      await db.ticketItems.bulkAdd(ticketItemsWithTicketId);

      return ticketId;
    });
  },

  async getTickets(filters = {}) {
    let query = db.tickets.toCollection();

    if (filters.status) {
      query = query.filter((t) => t.status === filters.status);
    }

    if (filters.userId) {
      query = query.filter((t) => t.userId === filters.userId);
    }

    return await query.reverse().toArray();
  },

  async getTicketWithItems(ticketId) {
    const ticket = await db.tickets.get(ticketId);
    if (!ticket) return null;

    const items = await db.ticketItems
      .where("ticketId")
      .equals(ticketId)
      .toArray();
    return { ...ticket, items };
  },

  async deleteTicket(ticketId) {
    return await db.transaction("rw", db.tickets, db.ticketItems, async () => {
      await db.ticketItems.where("ticketId").equals(ticketId).delete();
      await db.tickets.delete(ticketId);
    });
  },

  // Customers
  async getCustomers(search = "") {
    if (!search) {
      return await db.customers.toArray();
    }

    const searchLower = search.toLowerCase();
    return await db.customers
      .filter(
        (c) =>
          c.name?.toLowerCase().includes(searchLower) ||
          c.email?.toLowerCase().includes(searchLower) ||
          c.phone?.includes(search)
      )
      .toArray();
  },

  async upsertCustomers(customers) {
    return await db.customers.bulkPut(customers);
  },

  async addCustomer(customer) {
    return await db.customers.add(customer);
  },

  async updateCustomer(id, updates) {
    return await db.customers.update(id, updates);
  },

  async deleteCustomer(id) {
    return await db.customers.delete(id);
  },

  // Users
  async getUsers() {
    return await db.users.toArray();
  },

  async getUserByPin(pin) {
    const users = await db.users.toArray();
    return users.find((u) => u.pin === pin);
  },

  async upsertUsers(users) {
    return await db.users.bulkPut(users);
  },

  // Sync Queue
  async getSyncQueue() {
    return await db.syncQueue.where("status").equals("pending").toArray();
  },

  async updateSyncQueueItem(id, updates) {
    return await db.syncQueue.update(id, updates);
  },

  async deleteSyncQueueItem(id) {
    return await db.syncQueue.delete(id);
  },

  async clearSyncedQueue() {
    return await db.syncQueue.where("status").equals("synced").delete();
  },

  // Settings
  async getSetting(key) {
    const setting = await db.settings.get(key);
    return setting?.value;
  },

  async setSetting(key, value) {
    return await db.settings.put({
      key,
      value,
      lastSynced: new Date().toISOString(),
    });
  },

  async getSettings() {
    const settings = await db.settings.toArray();
    return settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
  },

  // Sessions
  async createSession(session) {
    return await db.sessions.add(session);
  },

  async updateSession(sessionId, updates) {
    return await db.sessions.update(sessionId, updates);
  },

  async getCurrentSession() {
    return await db.sessions.where("status").equals("open").first();
  },

  async getSessions(filters = {}) {
    let query = db.sessions.toCollection();

    if (filters.userId) {
      query = query.filter((s) => s.userId === filters.userId);
    }

    if (filters.status) {
      query = query.filter((s) => s.status === filters.status);
    }

    return await query.reverse().toArray();
  },

  // Utilities
  async clearAllData() {
    await db.transaction(
      "rw",
      db.products,
      db.categories,
      db.orders,
      db.orderItems,
      db.tickets,
      db.ticketItems,
      db.customers,
      db.users,
      db.payments,
      db.sessions,
      async () => {
        await db.products.clear();
        await db.categories.clear();
        await db.orders.clear();
        await db.orderItems.clear();
        await db.tickets.clear();
        await db.ticketItems.clear();
        await db.customers.clear();
        await db.users.clear();
        await db.payments.clear();
        await db.sessions.clear();
      }
    );
  },

  async getLastSyncTime() {
    return await this.getSetting("last_sync_time");
  },

  async setLastSyncTime(timestamp) {
    return await this.setSetting("last_sync_time", timestamp);
  },
};

export default dbService;
