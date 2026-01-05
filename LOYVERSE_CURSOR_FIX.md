# Loyverse API Cursor Pagination Fix

## Problem

When syncing categories from Loyverse API, you received this error:

```json
{
  "error": true,
  "message": "API Error: 400",
  "details": "{\"errors\":[{\"code\":\"INVALID_CURSOR\",\"details\":\"The provided cursor was not found.\",\"field\":\"cursor\"}]}"
}
```

## Root Cause

The pagination logic in `getAllCategories()`, `getAllItems()`, and `getAllCustomers()` had a bug:

### Before (Broken):

```javascript
while (hasMore) {
  const response = await this.getCategories({
    ...params,
    cursor, // ❌ This sends "cursor: null" or "cursor: undefined"
    limit: 250,
  });

  cursor = response.cursor;
  hasMore = !!cursor;
}
```

**What went wrong:**

1. On the **first request**, `cursor` is `null`
2. JavaScript spreads `cursor: null` into the params
3. This gets converted to the URL parameter `?cursor=null` (string "null")
4. Loyverse API receives an invalid cursor string and returns error 400

## Solution

Only include the `cursor` parameter **if it actually exists and has a valid value**.

### After (Fixed):

```javascript
while (hasMore) {
  // Build request params - only include cursor if it exists
  const requestParams = {
    ...params,
    limit: 250,
  };

  if (cursor) {
    // ✅ Only add cursor if it's truthy
    requestParams.cursor = cursor;
  }

  const response = await this.getCategories(requestParams);

  // Only continue if cursor is returned and not empty
  cursor = response.cursor;
  hasMore = !!cursor && cursor !== "";
}
```

### Additional Protection in API Proxy

Added extra validation in `src/app/api/loyverse/route.js`:

```javascript
// Only add cursor if it's not null, undefined, or "undefined" string
if (cursor && cursor !== "null" && cursor !== "undefined") {
  queryParams.append("cursor", cursor);
}
```

## How Loyverse Pagination Works

### Request 1 (No cursor):

```
GET /categories?limit=250
```

Response:

```json
{
  "categories": [
    /* 250 items */
  ],
  "cursor": "eyJpZCI6MTIzfQ==" // Only present if more data exists
}
```

### Request 2 (With cursor):

```
GET /categories?limit=250&cursor=eyJpZCI6MTIzfQ==
```

Response:

```json
{
  "categories": [
    /* next 250 items */
  ],
  "cursor": "eyJpZCI6NDU2fQ==" // or null/undefined if no more data
}
```

### Request 3 (Last page):

```
GET /categories?limit=250&cursor=eyJpZCI6NDU2fQ==
```

Response:

```json
{
  "categories": [
    /* remaining items */
  ]
  // No cursor field = end of data
}
```

## Fixed Functions

1. ✅ `getAllCategories()` - Categories pagination
2. ✅ `getAllItems()` - Products pagination
3. ✅ `getAllCustomers()` - Customers pagination

## Testing

To test the fix:

1. Go to **Admin → Integration**
2. Click **"Test Connection"** - should show success
3. Click **"Sync Categories"** - should sync all categories without cursor error
4. Click **"Sync Items"** - should sync all products
5. Click **"Sync Customers"** - should sync all customers

## Expected Behavior

- ✅ First request: No cursor parameter sent
- ✅ Subsequent requests: Valid cursor from previous response
- ✅ Last request: Loop stops when no cursor returned
- ✅ No more `INVALID_CURSOR` errors

## Common Pagination Mistakes to Avoid

### ❌ Don't do this:

```javascript
// Bad: Always sends cursor even when null
const params = { cursor, limit: 250 };
```

### ✅ Do this:

```javascript
// Good: Only adds cursor if it exists
const params = { limit: 250 };
if (cursor) params.cursor = cursor;
```

### ❌ Don't do this:

```javascript
// Bad: Sends "undefined" or "null" as strings
queryParams.append("cursor", cursor);
```

### ✅ Do this:

```javascript
// Good: Validates before adding
if (cursor && cursor !== "null" && cursor !== "undefined") {
  queryParams.append("cursor", cursor);
}
```

## Summary

The cursor parameter should **only be included in the request when it has a valid value**. The first request should never include a cursor, and subsequent requests should only include it if the previous response returned one.

This is a common mistake when working with cursor-based pagination APIs!
