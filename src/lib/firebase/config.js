import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  console.log("✅ Firebase initialized successfully");
} else {
  app = getApps()[0];
}

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Analytics (only in browser)
export const analytics =
  typeof window !== "undefined" && isSupported() ? getAnalytics(app) : null;

// Initialize Performance Monitoring (only in browser)
let performanceInstance = null;
if (typeof window !== "undefined") {
  import("firebase/performance")
    .then((perfModule) => {
      performanceInstance = perfModule.getPerformance(app);
      console.log("✅ Firebase Performance Monitoring initialized");
    })
    .catch((err) => {
      console.warn("Firebase Performance Monitoring not available:", err);
    });
}

export const performance = performanceInstance;

/**
 * Create a performance trace for monitoring
 * IMPORTANT: This helps track which Firebase operations are slow
 */
export const createTrace = (name) => {
  if (performanceInstance && typeof window !== "undefined") {
    return import("firebase/performance").then((perfModule) => {
      return perfModule.trace(performanceInstance, name);
    });
  }
  // Return a no-op trace if performance monitoring is not available
  return Promise.resolve({
    start: () => {},
    stop: () => {},
    putAttribute: () => {},
    putMetric: () => {},
  });
};

export default app;
