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
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(
      `🔥 FETCHING ${collectionName.toUpperCase()} FROM FIREBASE SERVER`
    );
    console.log("Options:", JSON.stringify(options, null, 2));

    let q = collection(db, collectionName);

    if (options.where) {
      console.log("🔍 Adding WHERE filter:", options.where);
      q = query(q, where(...options.where));
    }

    if (options.orderBy) {
      // orderBy can be an object {field, direction} or array [field, direction]
      if (Array.isArray(options.orderBy)) {
        console.log("📊 Adding ORDER BY (array):", options.orderBy);
        q = query(q, orderBy(...options.orderBy));
      } else if (options.orderBy.field) {
        console.log("📊 Adding ORDER BY (object):", options.orderBy);
        q = query(
          q,
          orderBy(options.orderBy.field, options.orderBy.direction || "asc")
        );
      }
    }

    if (options.limit) {
      console.log("🔢 Adding LIMIT:", options.limit);
      q = query(q, limit(options.limit));
    }

    console.log("⏳ Executing Firebase query...");
    // FORCE FETCH FROM SERVER - NOT CACHE!
    const querySnapshot = await getDocsFromServer(q);

    console.log(`📦 Raw query result: ${querySnapshot.size} documents`);
    console.log(`📦 Empty: ${querySnapshot.empty}`);

    const results = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      // CRITICAL: Use Firestore Document ID, not the "id" field inside the document
      // The spread operator was overwriting doc.id with data.id
      return {
        ...data,
        id: doc.id, // ✅ Force Document ID to override any "id" field in data
        _firestoreId: doc.id, // Backup: Store the real Firestore ID
        _dataId: data.id, // Backup: Store the old "id" field for reference
      };
    });

    console.log(
      `✅ FETCHED ${
        results.length
      } ${collectionName.toUpperCase()} FROM FIREBASE SERVER`
    );

    if (results.length > 0) {
      console.log(
        "📄 First document sample:",
        JSON.stringify(results[0], null, 2)
      );
      console.log(
        "📋 All document IDs:",
        results.map((r) => r.id)
      );
    } else {
      console.warn(`⚠️ NO ${collectionName.toUpperCase()} FOUND IN FIREBASE!`);
      console.warn(
        "Collection path:",
        `${db.app.options.projectId}/firestore/${collectionName}`
      );
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

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
    console.log(`🗑️ Attempting to delete from ${collectionName}:`, id);
    const docRef = doc(db, collectionName, id);

    // Verify document exists before deleting
    const docSnap = await getDocFromServer(docRef);
    if (!docSnap.exists()) {
      console.warn(`⚠️ Document ${id} does not exist in ${collectionName}`);
      return id;
    }

    console.log(`📄 Document exists, proceeding with deletion...`);
    await deleteDoc(docRef);

    // Verify deletion
    const verifySnap = await getDocFromServer(docRef);
    if (verifySnap.exists()) {
      console.error(
        `❌ DELETION FAILED! Document ${id} still exists after deleteDoc()`
      );
      throw new Error("Deletion verification failed - document still exists");
    }

    console.log(`✅ Successfully deleted ${id} from ${collectionName}`);
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
        categorySlotColors: tabsData.categorySlotColors || {},
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
      const allCategorySlotColors = {};

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
        if (data.categorySlotColors) {
          // Merge category slot colors
          Object.keys(data.categorySlotColors).forEach((slotKey) => {
            if (!allCategorySlotColors[slotKey]) {
              allCategorySlotColors[slotKey] = data.categorySlotColors[slotKey];
            }
          });
        }
      });

      return {
        categories: allCategories,
        categoryProducts: allCategoryProducts,
        categorySlotColors: allCategorySlotColors,
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
