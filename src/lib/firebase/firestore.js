import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./config";

/**
 * Firebase Firestore Service
 */

// Collections
export const COLLECTIONS = {
  USERS: "users",
  PRODUCTS: "products",
  CATEGORIES: "categories",
  ORDERS: "orders",
  RECEIPTS: "receipts",
  CUSTOMERS: "customers",
  SESSIONS: "sessions",
  TICKETS: "tickets",
  SETTINGS: "settings",
  SYNC_HISTORY: "sync_history",
  CUSTOM_TABS: "custom_tabs",
};

/**
 * Generic CRUD operations
 */

// Create document
export const createDocument = async (collectionName, data) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error(`Error creating document in ${collectionName}:`, error);
    throw error;
  }
};

// Create document with custom ID
export const setDocument = async (collectionName, id, data) => {
  try {
    await setDoc(doc(db, collectionName, id), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    console.error(`Error setting document in ${collectionName}:`, error);
    throw error;
  }
};

// Get document by ID
export const getDocument = async (collectionName, id) => {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error(`Error getting document from ${collectionName}:`, error);
    throw error;
  }
};

// Get all documents
export const getDocuments = async (collectionName, options = {}) => {
  try {
    let q = collection(db, collectionName);

    if (options.where) {
      // where should be an array: [field, operator, value]
      q = query(q, where(...options.where));
    }

    if (options.orderBy) {
      // orderBy can be an object {field, direction} or array [field, direction]
      if (Array.isArray(options.orderBy)) {
        q = query(q, orderBy(...options.orderBy));
      } else if (options.orderBy.field) {
        q = query(
          q,
          orderBy(options.orderBy.field, options.orderBy.direction || "asc")
        );
      }
    }

    if (options.limit) {
      q = query(q, limit(options.limit));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Error getting documents from ${collectionName}:`, error);
    throw error;
  }
};

// Update document
export const updateDocument = async (collectionName, id, data) => {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    throw error;
  }
};

// Delete document
export const deleteDocument = async (collectionName, id) => {
  try {
    await deleteDoc(doc(db, collectionName, id));
    return id;
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    throw error;
  }
};

// Subscribe to document changes
export const subscribeToDocument = (collectionName, id, callback) => {
  const docRef = doc(db, collectionName, id);
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    } else {
      callback(null);
    }
  });
};

// Subscribe to collection changes
export const subscribeToCollection = (
  collectionName,
  callback,
  options = {}
) => {
  let q = collection(db, collectionName);

  if (options.where) {
    q = query(q, where(...options.where));
  }

  if (options.orderBy) {
    q = query(q, orderBy(...options.orderBy));
  }

  if (options.limit) {
    q = query(q, limit(options.limit));
  }

  return onSnapshot(q, (querySnapshot) => {
    const documents = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(documents);
  });
};

/**
 * Specific service methods
 */

// Products
export const productsService = {
  create: (data) => createDocument(COLLECTIONS.PRODUCTS, data),
  get: (id) => getDocument(COLLECTIONS.PRODUCTS, id),
  getAll: (options) => getDocuments(COLLECTIONS.PRODUCTS, options),
  update: (id, data) => updateDocument(COLLECTIONS.PRODUCTS, id, data),
  delete: (id) => deleteDocument(COLLECTIONS.PRODUCTS, id),
  subscribe: (callback, options) =>
    subscribeToCollection(COLLECTIONS.PRODUCTS, callback, options),
};

// Orders
export const ordersService = {
  create: (data) => createDocument(COLLECTIONS.ORDERS, data),
  get: (id) => getDocument(COLLECTIONS.ORDERS, id),
  getAll: (options) => getDocuments(COLLECTIONS.ORDERS, options),
  update: (id, data) => updateDocument(COLLECTIONS.ORDERS, id, data),
  delete: (id) => deleteDocument(COLLECTIONS.ORDERS, id),
  subscribe: (callback, options) =>
    subscribeToCollection(COLLECTIONS.ORDERS, callback, options),
};

// Customers
export const customersService = {
  create: (data) => createDocument(COLLECTIONS.CUSTOMERS, data),
  get: (id) => getDocument(COLLECTIONS.CUSTOMERS, id),
  getAll: (options) => getDocuments(COLLECTIONS.CUSTOMERS, options),
  update: (id, data) => updateDocument(COLLECTIONS.CUSTOMERS, id, data),
  delete: (id) => deleteDocument(COLLECTIONS.CUSTOMERS, id),
  subscribe: (callback, options) =>
    subscribeToCollection(COLLECTIONS.CUSTOMERS, callback, options),
};

// Categories
export const categoriesService = {
  create: (data) => createDocument(COLLECTIONS.CATEGORIES, data),
  get: (id) => getDocument(COLLECTIONS.CATEGORIES, id),
  getAll: (options) => getDocuments(COLLECTIONS.CATEGORIES, options),
  update: (id, data) => updateDocument(COLLECTIONS.CATEGORIES, id, data),
  delete: (id) => deleteDocument(COLLECTIONS.CATEGORIES, id),
};

// Receipts
export const receiptsService = {
  create: (data) => createDocument(COLLECTIONS.RECEIPTS, data),
  set: (id, data) => setDocument(COLLECTIONS.RECEIPTS, id, data),
  get: (id) => getDocument(COLLECTIONS.RECEIPTS, id),
  getAll: (options) => getDocuments(COLLECTIONS.RECEIPTS, options),
  update: (id, data) => updateDocument(COLLECTIONS.RECEIPTS, id, data),
  delete: (id) => deleteDocument(COLLECTIONS.RECEIPTS, id),
  subscribe: (callback, options) =>
    subscribeToCollection(COLLECTIONS.RECEIPTS, callback, options),
};

// Custom Tabs - store per user
export const customTabsService = {
  // Save user's custom tabs configuration
  saveUserTabs: async (userId, tabsData) => {
    try {
      const docRef = doc(db, COLLECTIONS.CUSTOM_TABS, userId);
      await setDoc(docRef, {
        userId,
        categories: tabsData.categories || [],
        categoryProducts: tabsData.categoryProducts || {},
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error("Error saving custom tabs:", error);
      throw error;
    }
  },

  // Get user's custom tabs configuration
  getUserTabs: async (userId) => {
    try {
      const docRef = doc(db, COLLECTIONS.CUSTOM_TABS, userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      console.error("Error getting custom tabs:", error);
      throw error;
    }
  },

  // Get ALL custom tabs from all users (merged)
  getAllCustomTabs: async () => {
    try {
      const querySnapshot = await getDocs(
        collection(db, COLLECTIONS.CUSTOM_TABS)
      );

      // Merge all categories and products from all documents
      const allCategories = [];
      const allCategoryProducts = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.categories && Array.isArray(data.categories)) {
          // Add categories that don't already exist
          data.categories.forEach((cat) => {
            if (!allCategories.includes(cat)) {
              allCategories.push(cat);
            }
          });
        }
        if (data.categoryProducts) {
          // Merge category products
          Object.keys(data.categoryProducts).forEach((catName) => {
            if (!allCategoryProducts[catName]) {
              allCategoryProducts[catName] = data.categoryProducts[catName];
            }
          });
        }
      });

      return {
        categories: allCategories,
        categoryProducts: allCategoryProducts,
      };
    } catch (error) {
      console.error("Error getting all custom tabs:", error);
      throw error;
    }
  },

  // Delete user's custom tabs
  deleteUserTabs: async (userId) => {
    try {
      const docRef = doc(db, COLLECTIONS.CUSTOM_TABS, userId);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error("Error deleting custom tabs:", error);
      throw error;
    }
  },
};

export default {
  createDocument,
  getDocument,
  getDocuments,
  updateDocument,
  deleteDocument,
  subscribeToDocument,
  subscribeToCollection,
  products: productsService,
  orders: ordersService,
  customers: customersService,
  categories: categoriesService,
  receipts: receiptsService,
  customTabs: customTabsService,
};
