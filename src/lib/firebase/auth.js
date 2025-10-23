import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config";
import { USER_ROLES } from "@/config/constants";

/**
 * Firebase Authentication Service
 */

/**
 * Login with email and password
 */
export const loginWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (!userDoc.exists()) {
      throw new Error("User data not found");
    }

    const userData = userDoc.data();

    return {
      user: {
        id: user.uid,
        email: user.email,
        name: userData.name || user.displayName,
        role: userData.role || USER_ROLES.CASHIER,
        permissions: userData.permissions || [],
      },
      token: await user.getIdToken(),
      refreshToken: user.refreshToken,
    };
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

/**
 * Logout user
 */
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};

/**
 * Create new user with email and password
 */
export const registerUser = async (email, password, userData) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Update profile
    await updateProfile(user, {
      displayName: userData.name,
    });

    // Save user data to Firestore
    await setDoc(doc(db, "users", user.uid), {
      email,
      name: userData.name,
      role: userData.role || USER_ROLES.CASHIER,
      permissions: userData.permissions || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      user: {
        id: user.uid,
        email: user.email,
        name: userData.name,
        role: userData.role || USER_ROLES.CASHIER,
        permissions: userData.permissions || [],
      },
      token: await user.getIdToken(),
    };
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
};

/**
 * Reset password
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Reset password error:", error);
    throw error;
  }
};

/**
 * Update user password (admin function - sends password reset email)
 * Note: Firebase doesn't allow changing another user's password directly from client-side
 * This function sends a password reset email to the user
 */
export const adminResetUserPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: "Password reset email sent" };
  } catch (error) {
    console.error("Admin reset password error:", error);
    throw error;
  }
};

/**
 * Get current user
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Get user token
 */
export const getUserToken = async () => {
  const user = getCurrentUser();
  if (user) {
    return await user.getIdToken();
  }
  return null;
};

/**
 * Subscribe to auth state changes
 */
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      callback({
        id: user.uid,
        email: user.email,
        name: userData.name || user.displayName,
        role: userData.role || USER_ROLES.CASHIER,
        permissions: userData.permissions || [],
      });
    } else {
      callback(null);
    }
  });
};

export default {
  loginWithEmail,
  logout,
  registerUser,
  resetPassword,
  adminResetUserPassword,
  getCurrentUser,
  getUserToken,
  onAuthChange,
};
