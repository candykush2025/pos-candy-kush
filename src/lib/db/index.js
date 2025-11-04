import Dexie from "dexie";

// Initialize Dexie database
export const db = new Dexie("CandyKushPOS");

// Version 3: Fresh start with kiosk-compatible customer schema
// Note: Skipping version 2 migration issues, going straight to v3
db.version(3).stores({
  // Products table (Loyverse compatible)
  products:
    "id, barcode, sku, name, categoryId, price, stock, source, createdAt, updatedAt",

  // Categories table (Loyverse compatible)
  categories: "id, name, color, source, createdAt, updatedAt",

  // Orders table
  orders:
    "++id, orderNumber, status, total, userId, customerId, createdAt, syncStatus, lastSynced",

  // Order items table
  orderItems: "++id, orderId, productId, quantity, price, discount, total",

  // Tickets (parked orders) table
  tickets:
    "++id, ticketNumber, userId, status, total, createdAt, updatedAt, syncStatus",

  // Ticket items table
  ticketItems: "++id, ticketId, productId, quantity, price, discount",

  // Customers table with kiosk integration fields
  customers:
    "id, customerId, memberId, name, lastName, email, phone, cell, customerCode, nationality, isActive, syncedToKiosk, source",

  // Users (staff) table
  users: "++id, username, name, role, email, lastSynced",

  // Payments table
  payments: "++id, orderId, method, amount, status, createdAt, syncStatus",

  // Sync queue table
  syncQueue:
    "++id, type, action, data, status, attempts, createdAt, lastAttempt",

  // Settings table
  settings: "key, value, lastSynced",

  // Cash drawer sessions
  sessions:
    "++id, userId, openedAt, closedAt, openingBalance, closingBalance, status, syncStatus",
});

// Add hooks for auto-timestamping
db.orders.hook("creating", (primKey, obj) => {
  if (!obj.createdAt) obj.createdAt = new Date().toISOString();
  if (!obj.syncStatus) obj.syncStatus = "pending";
});

db.tickets.hook("creating", (primKey, obj) => {
  if (!obj.createdAt) obj.createdAt = new Date().toISOString();
  if (!obj.updatedAt) obj.updatedAt = new Date().toISOString();
  if (!obj.syncStatus) obj.syncStatus = "pending";
});

db.tickets.hook("updating", (mods, primKey, obj) => {
  mods.updatedAt = new Date().toISOString();
});

db.syncQueue.hook("creating", (primKey, obj) => {
  if (!obj.createdAt) obj.createdAt = new Date().toISOString();
  if (!obj.status) obj.status = "pending";
  if (!obj.attempts) obj.attempts = 0;
});

export default db;
