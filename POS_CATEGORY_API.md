# POS Integration: Fetch Category by Firestore Document ID

Purpose

- Provide a small, copy-pasteable guide for POS developers to fetch a single category by its Firestore document id (the document id shown in the Firebase console).
- Includes endpoint, required headers/CORS notes, example responses, and a ready-to-use JavaScript function for the POS app.

Endpoint

- GET /api/categories
- Query parameter: `id` (Firestore document id)

Example

- Fetch a single category by document id:
  GET https://candy-kush-kiosk.vercel.app/api/categories?id=DOCUMENT_ID

Get all categories

- To fetch all categories, call the same endpoint without the `id` parameter:
  GET https://candy-kush-kiosk.vercel.app/api/categories

- Optional filter: `active=true` returns only active categories:
  GET https://candy-kush-kiosk.vercel.app/api/categories?active=true

Example response (list):

```json
{
  "success": true,
  "data": [
    {
      "id": "abc123",
      "categoryId": "CAT-001",
      "name": "Flowers",
      "description": "All flower products"
    },
    {
      "id": "def456",
      "categoryId": "CAT-002",
      "name": "Pre-rolls",
      "description": "Pre-rolled joints"
    }
  ]
}
```

JS helper — fetch all categories (browser / POS frontend)

```javascript
// Returns array of categories (or empty array)
async function fetchAllCategories(
  baseUrl = "https://candy-kush-kiosk.vercel.app",
  activeOnly = false
) {
  const url = `${baseUrl.replace(/\/+$/, "")}/api/categories${
    activeOnly ? "?active=true" : ""
  }`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const payload = await res.json();
  return payload.success ? payload.data : [];
}

// Usage example
(async () => {
  const cats = await fetchAllCategories();
  console.log("Categories:", cats);
})();
```

CORS / Allowed Origins

- This API is CORS-protected. The allowed origins are:
  - https://pos-candy-kush.vercel.app
  - http://localhost:3000
  - http://localhost:3001

Headers

- No special auth required for reading categories. Include the Origin header automatically sent by browsers.
- If you call from server-side code (POS backend), you don't need the Origin header; the API only checks it for browser requests.

Response Shapes

Success (200)

```json
{
  "success": true,
  "data": {
    "id": "<documentId>",
    "categoryId": "CAT-001",
    "name": "Flowers",
    "description": "All flower products"
  }
}
```

Not found (404)

```json
{
  "success": false,
  "error": "Not Found",
  "message": "Category not found"
}
```

Server error (500)

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "<error message>"
}
```

JS (browser / POS frontend) helper — copy/paste

```javascript
// POS: fetch category by Firestore document id
// Returns the category object or null if not found. Throws on network/server errors.
async function fetchCategoryById(
  documentId,
  baseUrl = "https://candy-kush-kiosk.vercel.app"
) {
  if (!documentId) throw new Error("documentId is required");

  const url = `${baseUrl.replace(
    /\/+$/,
    ""
  )}/api/categories?id=${encodeURIComponent(documentId)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      // Origin header is automatically sent by browsers. If you call from server-side code,
      // omit or set a proper Origin for preflight checks if required.
    },
  });

  const payload = await res.json();

  if (!res.ok) {
    // If you want to treat 404 specially:
    if (res.status === 404) return null;
    throw new Error(payload?.message || `HTTP ${res.status}`);
  }

  return payload.success ? payload.data : null;
}

// Usage example in POS UI
(async () => {
  try {
    const docId = "YOUR_FIRESTORE_DOC_ID"; // replace
    const category = await fetchCategoryById(docId);
    if (!category) {
      console.warn("Category not found for id", docId);
      return;
    }
    console.log("Category:", category);
    // populate UI: category.name, category.description
  } catch (err) {
    console.error("Error fetching category:", err);
  }
})();
```

Node / Server-side usage (POS backend)

- If your POS backend calls the API, call the same endpoint. Server-to-server calls typically do not trigger CORS checks.

Notes and troubleshooting

- Make sure you pass the Firestore document id (the doc id), not the `categoryId` field unless they happen to match.
- If you get a 403/Unauthorized origin error when calling from the browser, confirm the page's origin is one of the allowed origins above.
- If images are returned elsewhere in the API, they are stored as accessible Firebase Storage download URLs; no extra conversion is required.

Optional: REST-style route

- If you prefer REST-style: GET /api/categories/:id, we can add a dynamic route. Currently the supported method is `GET /api/categories?id=...`.

Contact / Follow-up

- If you want this helper in TypeScript, or a small npm-style client wrapper (with retry/backoff and timeout), tell me which variant and I will add it.
