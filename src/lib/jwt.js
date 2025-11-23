// JWT utilities for authentication
const JWT_SECRET = "candy-kush-jwt-secret-2025"; // In production, use environment variable

export const jwtUtils = {
  // Simple hash function for signature
  _hash: (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  },

  // Encode JWT token
  encode: (payload) => {
    try {
      const header = {
        alg: "HS256",
        typ: "JWT",
      };

      // Set expiration to 99 days from now, unless already specified
      const exp =
        payload.exp || Math.floor(Date.now() / 1000) + 99 * 24 * 60 * 60; // 99 days
      const data = {
        ...payload,
        exp,
        iat: Math.floor(Date.now() / 1000),
      };

      const encodedHeader = btoa(JSON.stringify(header));
      const encodedPayload = btoa(JSON.stringify(data));

      // Create signature
      const message = `${encodedHeader}.${encodedPayload}`;
      const signature = btoa(jwtUtils._hash(message + JWT_SECRET))
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");

      return `${encodedHeader}.${encodedPayload}.${signature}`;
    } catch (error) {
      console.error("JWT encode error:", error);
      return null;
    }
  },

  // Decode and verify JWT token
  decode: (token) => {
    try {
      if (!token || typeof token !== "string") {
        return null;
      }

      const parts = token.split(".");
      if (parts.length !== 3) {
        return null;
      }

      const [encodedHeader, encodedPayload, signature] = parts;

      // Decode payload
      const payload = JSON.parse(atob(encodedPayload));

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        console.log("JWT token expired");
        return null;
      }

      // Verify signature
      const message = `${encodedHeader}.${encodedPayload}`;
      const expectedSignature = btoa(jwtUtils._hash(message + JWT_SECRET))
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");

      if (signature !== expectedSignature) {
        console.log("JWT signature verification failed");
        return null;
      }

      return payload;
    } catch (error) {
      console.error("JWT decode error:", error);
      return null;
    }
  },

  // Check if token is valid
  isValid: (token) => {
    const payload = jwtUtils.decode(token);
    return payload !== null;
  },

  // Get user from token
  getUserFromToken: (token) => {
    const payload = jwtUtils.decode(token);
    if (payload && payload.user) {
      return payload.user;
    }
    return null;
  },
};
