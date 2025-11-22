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
  startAfter,
  serverTimestamp,
  onSnapshot,
  getDocsFromServer,
  getDocFromServer,
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
  ORDERS: "receipts",
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
    // Return both id and data
    return { id: docRef.id, ...data };
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
    // FORCE FETCH FROM SERVER - NOT CACHE!
    const docSnap = await getDocFromServer(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // CRITICAL: Use Firestore Document ID, not the "id" field inside the document
      return {
        ...data,
        id: docSnap.id, // ✅ Force Document ID to override any "id" field in data
        _firestoreId: docSnap.id,
        _dataId: data.id,
      };
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

    if (options.startAfter) {
      q = query(q, startAfter(options.startAfter));
    }

    if (options.limit) {
      q = query(q, limit(options.limit));
    }

    // FORCE FETCH FROM SERVER - NOT CACHE!
    const querySnapshot = await getDocsFromServer(q);

    // Store the last document snapshot for pagination
    const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];

    const results = querySnapshot.docs.map((doc, index) => {
      const data = doc.data();
      const isLast = index === querySnapshot.docs.length - 1;

      // CRITICAL: Use Firestore Document ID, not the "id" field inside the document
      // The spread operator was overwriting doc.id with data.id
      const result = {
        ...data,
        id: doc.id, // ✅ Force Document ID to override any "id" field in data
        _firestoreId: doc.id, // Backup: Store the real Firestore ID
        _dataId: data.id, // Backup: Store the old "id" field for reference
      };

      // Store DocumentSnapshot only for the last document (for pagination)
      // Must use Object.defineProperty because spread operator doesn't copy getters
      if (isLast) {
        Object.defineProperty(result, "_docSnapshot", {
          get() {
            return doc;
          },
          enumerable: false, // Won't be serialized to IndexedDB
          configurable: true,
        });
      }

      return result;
    });

    // Attach the lastDoc to the results array for pagination
    if (lastDoc) {
      Object.defineProperty(results, "_lastDocSnapshot", {
        value: lastDoc,
        enumerable: false, // Won't be serialized
        configurable: true,
      });
    }

    return results;
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
    const docRef = doc(db, collectionName, id);

    // Verify document exists before deleting
    const docSnap = await getDocFromServer(docRef);
    if (!docSnap.exists()) {
      return id;
    }

    await deleteDoc(docRef);

    // Verify deletion
    const verifySnap = await getDocFromServer(docRef);
    if (verifySnap.exists()) {
      throw new Error("Deletion verification failed - document still exists");
    }

    return id;
  } catch (error) {
    console.error(`❌ Error deleting document from ${collectionName}:`, error);
    console.error(`Error code:`, error.code);
    console.error(`Error message:`, error.message);
    throw error;
  }
};

// Subscribe to document changes
export const subscribeToDocument = (collectionName, id, callback) => {
  const docRef = doc(db, collectionName, id);
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      callback({
        ...data,
        id: doc.id, // ✅ Use Firestore Document ID
        _firestoreId: doc.id,
        _dataId: data.id,
      });
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
    const documents = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id, // ✅ Use Firestore Document ID
        _firestoreId: doc.id,
        _dataId: data.id,
      };
    });
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
  // Backwards-compatible alias used across the codebase
  getById: (id) => getDocument(COLLECTIONS.PRODUCTS, id),
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
  set: (id, data) => setDocument(COLLECTIONS.CATEGORIES, id, data),
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

  // Edit requests for admin approval
  createEditRequest: (data) => createDocument("receipt_edit_requests", data),
  getEditRequests: (options) => getDocuments("receipt_edit_requests", options),
  updateEditRequest: (id, data) =>
    updateDocument("receipt_edit_requests", id, data),
  deleteEditRequest: (id) => deleteDocument("receipt_edit_requests", id),
};

// Custom Tabs - store per user
export const customTabsService = {
  // Save custom tabs to SHARED document (all users use same tabs)
  saveUserTabs: async (userId, tabsData) => {
    try {
      // Use a fixed document ID "shared" instead of userId
      const docRef = doc(db, COLLECTIONS.CUSTOM_TABS, "shared");

      const dataToSave = {
        categories: tabsData.categories || [],
        categoryProducts: tabsData.categoryProducts || {},
        updatedAt: serverTimestamp(),
        lastUpdatedBy: userId, // Track who made the last change
      };

      await setDoc(docRef, dataToSave);

      // Verify the write by reading back immediately
      const verifySnap = await getDoc(docRef);
      if (verifySnap.exists()) {
        const writtenData = verifySnap.data();
      }

      return true;
    } catch (error) {
      console.error("❌ Error saving custom tabs:", error);
      console.error("Error details:", error.message, error.stack);
      throw error;
    }
  },

  // Get user's custom tabs configuration (now reads from shared document)
  getUserTabs: async (userId) => {
    try {
      const docRef = doc(db, COLLECTIONS.CUSTOM_TABS, "shared");
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

  // Get ALL custom tabs (now just reads the shared document)
  getAllCustomTabs: async () => {
    try {
      const docRef = doc(db, COLLECTIONS.CUSTOM_TABS, "shared");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        return {
          categories: data.categories || [],
          categoryProducts: data.categoryProducts || {},
        };
      }

      // Return empty structure if document doesn't exist
      return {
        categories: [],
        categoryProducts: {},
      };
    } catch (error) {
      console.error("Error getting all custom tabs:", error);
      throw error;
    }
  },

  // Get custom tabs for a specific user
  getUserCustomTabs: async (userId) => {
    try {
      const docRef = doc(db, COLLECTIONS.CUSTOM_TABS, userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          categories: data.categories || [],
          categoryProducts: data.categoryProducts || {},
        };
      }

      return {
        categories: [],
        categoryProducts: {},
      };
    } catch (error) {
      console.error("Error getting user custom tabs:", error);
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

  // Delete a specific category from ALL users
  deleteCategoryFromAllUsers: async (categoryName) => {
    try {
      const querySnapshot = await getDocs(
        collection(db, COLLECTIONS.CUSTOM_TABS)
      );

      const updatePromises = [];

      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        let needsUpdate = false;

        // Remove category from categories array
        let updatedCategories = data.categories || [];
        if (updatedCategories.includes(categoryName)) {
          updatedCategories = updatedCategories.filter(
            (cat) => cat !== categoryName
          );
          needsUpdate = true;
        }

        // Remove category products
        let updatedCategoryProducts = { ...(data.categoryProducts || {}) };
        if (updatedCategoryProducts[categoryName]) {
          delete updatedCategoryProducts[categoryName];
          needsUpdate = true;
        }

        // Only update if changes were made
        if (needsUpdate) {
          const docRef = doc(db, COLLECTIONS.CUSTOM_TABS, docSnapshot.id);
          // Use updateDoc to preserve other fields like createdAt
          updatePromises.push(
            updateDoc(docRef, {
              categories: updatedCategories,
              categoryProducts: updatedCategoryProducts,
              updatedAt: serverTimestamp(),
            })
          );
        }
      });

      await Promise.all(updatePromises);
      return true;
    } catch (error) {
      console.error("Error deleting category from all users:", error);
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
