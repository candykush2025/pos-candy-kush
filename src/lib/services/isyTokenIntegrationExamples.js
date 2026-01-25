/**
 * Example: ISY Token Integration with Cashier Login
 *
 * This file shows how to integrate ISY API token management
 * with the existing cashier login flow.
 */

import {
  setISYApiToken,
  clearISYApiToken,
} from "@/lib/services/orderDuplicationService";

/**
 * Example 1: Set token after successful cashier login
 * Add this to your login success handler
 */
export const handleCashierLoginSuccess = async (cashier) => {
  // Your existing login logic...

  // If your cashier object contains ISY token
  if (cashier.isyApiToken) {
    setISYApiToken(cashier.isyApiToken);
    console.log("✅ ISY API token set for cashier:", cashier.name);
  }

  // If you need to fetch token from an API
  try {
    const response = await fetch("/api/auth/isy-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cashierId: cashier.id }),
    });

    if (response.ok) {
      const { token } = await response.json();
      setISYApiToken(token);
      console.log("✅ ISY API token obtained and set");
    }
  } catch (error) {
    console.error("Failed to obtain ISY token:", error);
    // Don't fail login if ISY token fetch fails
  }
};

/**
 * Example 2: Clear token on cashier logout
 * Add this to your logout handler
 */
export const handleCashierLogout = () => {
  // Your existing logout logic...

  // Clear ISY token
  clearISYApiToken();
  console.log("✅ ISY API token cleared");
};

/**
 * Example 3: Token refresh mechanism
 * Automatically refresh token before expiration
 */
export const startTokenRefreshTimer = (tokenExpiresIn) => {
  // Refresh 5 minutes before expiration
  const refreshTime = (tokenExpiresIn - 5 * 60) * 1000;

  setTimeout(async () => {
    try {
      const response = await fetch("/api/auth/refresh-isy-token", {
        method: "POST",
      });

      if (response.ok) {
        const { token } = await response.json();
        setISYApiToken(token);
        console.log("✅ ISY API token refreshed");

        // Start next refresh cycle
        const { expiresIn } = await response.json();
        startTokenRefreshTimer(expiresIn);
      }
    } catch (error) {
      console.error("Failed to refresh ISY token:", error);
    }
  }, refreshTime);
};

/**
 * Example 4: Store-level token (single token for all cashiers)
 * Use this if your store has one ISY token for all POS devices
 */
export const initializeStoreToken = async () => {
  // Get store token from environment or API
  const storeToken = process.env.NEXT_PUBLIC_ISY_STORE_TOKEN;

  if (storeToken) {
    setISYApiToken(storeToken);
    console.log("✅ Store-level ISY API token initialized");
    return true;
  }

  // Or fetch from your backend
  try {
    const response = await fetch("/api/settings/isy-token");
    if (response.ok) {
      const { token } = await response.json();
      setISYApiToken(token);
      console.log("✅ Store-level ISY API token loaded from API");
      return true;
    }
  } catch (error) {
    console.error("Failed to load store token:", error);
  }

  return false;
};

/**
 * Example 5: Admin panel token management
 * Let admins set token via settings page
 */
export const AdminTokenManager = () => {
  const [token, setToken] = useState("");
  const [isSet, setIsSet] = useState(false);

  useEffect(() => {
    // Check if token exists
    const existingToken = localStorage.getItem("isy_api_token");
    setIsSet(!!existingToken);
  }, []);

  const handleSaveToken = async () => {
    if (!token.trim()) {
      alert("Please enter a valid token");
      return;
    }

    // Optionally validate token with ISY API first
    try {
      const response = await fetch("https://api.isy.software/pos/v1/health", {
        headers: {
          Authorization: `Bearer ${token.trim()}`,
        },
      });

      if (!response.ok) {
        alert("Invalid token - authentication failed");
        return;
      }
    } catch (error) {
      console.error("Token validation failed:", error);
      alert("Could not validate token");
      return;
    }

    // Save token
    setISYApiToken(token.trim());
    setIsSet(true);
    setToken("");
    alert("Token saved successfully");
  };

  const handleClearToken = () => {
    if (confirm("Are you sure you want to clear the ISY API token?")) {
      clearISYApiToken();
      setIsSet(false);
      alert("Token cleared");
    }
  };

  return (
    <div>
      <h3>ISY API Token Management</h3>

      {isSet ? (
        <div>
          <p>✅ Token is configured</p>
          <button onClick={handleClearToken}>Clear Token</button>
        </div>
      ) : (
        <div>
          <p>⚠️ Token not set - order duplication is disabled</p>
          <input
            type="password"
            placeholder="Enter ISY API JWT token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <button onClick={handleSaveToken}>Save Token</button>
        </div>
      )}
    </div>
  );
};

/**
 * Example 6: Multi-store setup
 * Different tokens for different store locations
 */
export const initializeStoreSpecificToken = async (storeId) => {
  try {
    const response = await fetch(`/api/stores/${storeId}/isy-token`);
    if (response.ok) {
      const { token } = await response.json();
      setISYApiToken(token);
      console.log(`✅ ISY token set for store ${storeId}`);
      return true;
    }
  } catch (error) {
    console.error(`Failed to load token for store ${storeId}:`, error);
  }

  return false;
};

/**
 * Example 7: Token from Firebase config
 * Store token in Firebase configuration
 */
export const loadTokenFromFirebase = async () => {
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");

    const configRef = doc(db, "configuration", "isy_integration");
    const configSnap = await getDoc(configRef);

    if (configSnap.exists()) {
      const config = configSnap.data();
      if (config.apiToken) {
        setISYApiToken(config.apiToken);
        console.log("✅ ISY token loaded from Firebase");
        return true;
      }
    }
  } catch (error) {
    console.error("Failed to load token from Firebase:", error);
  }

  return false;
};

/**
 * Example 8: Integration with existing POS login in SalesSection
 * Modify the handleLogin function in your sales page
 */
export const integrateWithSalesPage = () => {
  // In your handleLogin function after successful authentication:

  const handleLogin = async (e, pinToCheck = null) => {
    // ... existing login logic ...

    // After successful login:
    // const user = your authenticated user object

    // Try to initialize ISY token
    const tokenInitialized = await initializeStoreToken();

    if (!tokenInitialized) {
      console.warn(
        "⚠️ ISY API token not configured. Order duplication disabled.",
      );
      // Optionally show a warning toast
      // toast.warning("ISY sync not configured. Contact admin.");
    }

    // Continue with existing login flow...
  };
};

// Export for use in your application
export default {
  handleCashierLoginSuccess,
  handleCashierLogout,
  startTokenRefreshTimer,
  initializeStoreToken,
  initializeStoreSpecificToken,
  loadTokenFromFirebase,
};
