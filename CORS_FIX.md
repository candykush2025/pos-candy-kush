# CORS Fix - Loyverse Integration

## Problem

The Loyverse API blocks direct browser requests due to CORS (Cross-Origin Resource Sharing) policy:

```
Access to fetch at 'https://api.loyverse.com/v1.0/categories'
from origin 'http://localhost:3001' has been blocked by CORS policy
```

## Solution

Created a **Next.js API proxy route** that handles requests server-side, avoiding CORS issues.

## Architecture

### Before (CORS Error):

```
Browser → Loyverse API ❌ CORS Error
```

### After (Working):

```
Browser → Next.js API Route → Loyverse API ✅ Success
```

## Implementation

### 1. API Proxy Route

**File**: `src/app/api/loyverse/route.js`

```javascript
GET /api/loyverse?endpoint=/categories&limit=50
→ Proxies to: https://api.loyverse.com/v1.0/categories?limit=50
```

**Features**:

- Handles GET and POST requests
- Adds Authorization header server-side
- Supports all query parameters
- Proper error handling
- Console logging for debugging

### 2. Updated Loyverse Service

**File**: `src/lib/api/loyverse.js`

**Changes**:

- Now calls `/api/loyverse` instead of direct API
- Simplified parameter handling
- Access token hidden from browser
- Same public API interface

## Usage (No Changes Needed!)

The integration page works exactly the same:

```javascript
// This still works!
const response = await loyverseService.getCategories({ limit: 50 });
```

Behind the scenes:

1. Browser calls: `/api/loyverse?endpoint=/categories&limit=50`
2. Next.js proxy adds auth token
3. Proxy calls Loyverse API
4. Response sent back to browser

## Benefits

✅ **No CORS errors** - Server-side requests  
✅ **Secure token** - Not exposed to browser  
✅ **Same interface** - No changes to integration page  
✅ **Better logging** - Server-side console logs  
✅ **Error handling** - Proper HTTP status codes

## Testing

1. Restart dev server:

   ```bash
   npm run dev
   ```

2. Go to Integration page:

   ```
   http://localhost:3001/admin/integration
   ```

3. Click "Test Connection"

   - Should see: ✅ Connection successful!
   - No CORS errors

4. Try syncing categories:
   - Click "Sync Categories"
   - Should fetch data successfully

## API Routes Available

### GET /api/loyverse

Query Parameters:

- `endpoint` - The Loyverse endpoint (e.g., `/categories`)
- `limit` - Items per page (1-250)
- `cursor` - Pagination cursor
- `show_deleted` - Include deleted items
- `ids` - Comma-separated IDs

Examples:

```
GET /api/loyverse?endpoint=/categories&limit=50
GET /api/loyverse?endpoint=/items&limit=250&cursor=abc123
GET /api/loyverse?endpoint=/customers&limit=100
```

### POST /api/loyverse

Body:

```json
{
  "endpoint": "/items",
  "method": "POST",
  "data": { ... }
}
```

## Error Handling

### API Errors

If Loyverse API returns error:

```json
{
  "error": true,
  "message": "API Error: 401 Unauthorized",
  "details": "..."
}
```

### Network Errors

If request fails:

```json
{
  "error": true,
  "message": "Failed to fetch"
}
```

## Security Notes

### Access Token

- ✅ Stored server-side only
- ✅ Never sent to browser
- ✅ Added by proxy route

### Production

For production, use environment variables:

1. Create `.env.local`:

```bash
LOYVERSE_ACCESS_TOKEN=d390d2223e2c4537a12f9bd60860c2b8
```

2. Update `route.js`:

```javascript
const LOYVERSE_ACCESS_TOKEN = process.env.LOYVERSE_ACCESS_TOKEN;
```

## Troubleshooting

### Still Getting CORS Error

- Clear browser cache
- Restart dev server
- Check file was saved correctly

### 404 Error on API Route

- Verify file exists: `src/app/api/loyverse/route.js`
- Check filename is `route.js` (not `routes.js`)
- Restart dev server

### No Data Returned

- Check server console logs
- Verify access token is correct
- Test endpoint directly in browser dev tools

### Authorization Failed

- Verify token in `route.js`
- Check token hasn't expired
- Test with Postman or curl

## Console Logging

### Server Console (Terminal)

```bash
Proxying request to: https://api.loyverse.com/v1.0/categories?limit=1
```

### Browser Console

```javascript
Loyverse Categories: { categories: [...], cursor: null }
```

## Files Modified

1. ✅ `src/app/api/loyverse/route.js` - NEW proxy route
2. ✅ `src/lib/api/loyverse.js` - Updated to use proxy
3. ✅ No changes needed in `integration/page.js`

## Summary

**Problem**: CORS blocked direct API calls  
**Solution**: Next.js API proxy route  
**Result**: ✅ Working perfectly!

The integration now works without CORS errors while keeping the same easy-to-use interface.
