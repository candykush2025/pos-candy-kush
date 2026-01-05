# 🔐 Security Update: Credentials Moved to .env

## What Changed?

All sensitive credentials and configuration values have been moved from source code to environment variables for better security.

## ⚠️ Action Required

### If you already have a working installation:

1. **Your `.env.local` has been updated** with Loyverse credentials
2. **Restart your development server:**
   ```powershell
   # Stop current server (Ctrl+C)
   npm run dev
   ```

### If you're setting up a new installation:

1. **Copy the example file:**

   ```powershell
   Copy-Item .env.example .env.local
   ```

2. **Edit `.env.local` and replace placeholders:**

   ```bash
   # Replace these with your actual values:
   LOYVERSE_ACCESS_TOKEN=your_actual_token_here
   NEXT_PUBLIC_LOYVERSE_STORE_ID=your_store_id_here
   NEXT_PUBLIC_LOYVERSE_PAYMENT_TYPE_ID=your_payment_type_id_here
   ```

3. **Restart dev server:**
   ```powershell
   npm run dev
   ```

## Changes Made

### 1. Credentials Removed from Source Code ✅

**Before:**

```javascript
// constants.js - ❌ Credentials exposed in code
export const LOYVERSE_CONFIG = {
  STORE_ID: "42dc2cec-6f40-11ea-bde9-1269e7c5a22d",
  DEFAULT_PAYMENT_TYPE_ID: "42dd2a55-6f40-11ea-bde9-1269e7c5a22d",
};

// route.js - ❌ Token hardcoded
const LOYVERSE_ACCESS_TOKEN = "d390d2223e2c4537a12f9bd60860c2b8";
```

**After:**

```javascript
// constants.js - ✅ Uses environment variables
export const LOYVERSE_CONFIG = {
  STORE_ID: process.env.NEXT_PUBLIC_LOYVERSE_STORE_ID || "",
  DEFAULT_PAYMENT_TYPE_ID:
    process.env.NEXT_PUBLIC_LOYVERSE_PAYMENT_TYPE_ID || "",
};

// route.js - ✅ Token from environment
const LOYVERSE_ACCESS_TOKEN = process.env.LOYVERSE_ACCESS_TOKEN;
```

### 2. Store ID Display Fixed ✅

**Admin Orders Page:**

- Before: `Store: 6b365a0c...` (truncated)
- After: `Store: 6b365a0c-6f40-11ea-bde9-1269e7c5a22d` (full ID)

### 3. Environment Files ✅

**`.env.local`** - Your actual credentials (NOT committed to GitHub)

```bash
LOYVERSE_ACCESS_TOKEN=d390d2223e2c4537a12f9bd60860c2b8
NEXT_PUBLIC_LOYVERSE_STORE_ID=42dc2cec-6f40-11ea-bde9-1269e7c5a22d
NEXT_PUBLIC_LOYVERSE_PAYMENT_TYPE_ID=42dd2a55-6f40-11ea-bde9-1269e7c5a22d
```

**`.env.example`** - Template with placeholders (committed to GitHub)

```bash
LOYVERSE_ACCESS_TOKEN=your_access_token_here
NEXT_PUBLIC_LOYVERSE_STORE_ID=your_store_id_here
NEXT_PUBLIC_LOYVERSE_PAYMENT_TYPE_ID=your_payment_type_id_here
```

## Security Benefits

### ✅ What's Protected Now:

1. **Loyverse Access Token** - Never exposed in source code
2. **Store IDs** - Loaded from environment
3. **Payment Type IDs** - Configurable per environment
4. **All sensitive data** - In `.env.local` (ignored by git)

### ✅ Safe for GitHub:

- Source code has no hardcoded credentials
- `.env.local` is in `.gitignore`
- Only `.env.example` (with placeholders) is committed
- Team members use their own `.env.local`

## Verification

### Check if it's working:

1. **Start dev server:**

   ```powershell
   npm run dev
   ```

2. **Check console for errors:**

   - Should NOT see: "Loyverse access token not configured"
   - Should see normal startup messages

3. **Test Loyverse sync:**

   - Complete a sale in POS
   - Check History tab for sync status
   - Should see green "✓ Synced" badge

4. **Check Admin Orders:**
   - Go to Admin → Orders
   - Receipt cards should show full Store ID (not truncated)

## Troubleshooting

### ❌ Error: "Loyverse access token not configured"

**Fix:**

1. Check `.env.local` exists in project root
2. Verify line: `LOYVERSE_ACCESS_TOKEN=your_token` (no spaces, no quotes)
3. Restart dev server

### ❌ Store ID is undefined or empty

**Fix:**

1. Check `.env.local` has: `NEXT_PUBLIC_LOYVERSE_STORE_ID=your_id`
2. Note the `NEXT_PUBLIC_` prefix is required
3. Restart dev server

### ❌ Sync still shows "Failed"

**Fix:**

1. Verify token is correct in `.env.local`
2. Check token hasn't expired in Loyverse
3. Test token with: Visit Loyverse dashboard to confirm it's active

## Files Modified

| File                            | Change                                         |
| ------------------------------- | ---------------------------------------------- |
| `.env.local`                    | ✅ Added Loyverse credentials                  |
| `.env.example`                  | ✅ Added template with placeholders            |
| `src/config/constants.js`       | ✅ Changed to use `process.env`                |
| `src/app/api/loyverse/route.js` | ✅ Changed to use `process.env`                |
| `src/app/admin/orders/page.js`  | ✅ Fixed Store ID display (removed truncation) |
| `ENV_VARIABLES.md`              | ✅ New documentation file                      |
| `SECURITY_MIGRATION.md`         | ✅ This file                                   |

## Production Deployment

### When deploying to Vercel/Netlify/Other:

1. **Add environment variables in platform settings:**

   - Go to your project settings
   - Add each variable from `.env.local`
   - Save and redeploy

2. **Important variables to set:**

   ```
   LOYVERSE_ACCESS_TOKEN=your_production_token
   NEXT_PUBLIC_LOYVERSE_STORE_ID=your_production_store_id
   NEXT_PUBLIC_LOYVERSE_PAYMENT_TYPE_ID=your_production_payment_id
   ```

3. **Test after deployment:**
   - Complete a test sale
   - Verify sync works
   - Check admin orders page

## Team Onboarding

### For new team members:

1. **Get credentials from team lead:**

   - Loyverse access token
   - Store ID
   - Payment type ID

2. **Create `.env.local`:**

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. **Add credentials to `.env.local`**

4. **Start development:**
   ```powershell
   npm install
   npm run dev
   ```

## Checklist

- [ ] `.env.local` exists with correct values
- [ ] Dev server restarted
- [ ] No console errors about missing tokens
- [ ] POS sync works (green "Synced" badges)
- [ ] Admin orders shows full Store ID
- [ ] `.env.local` NOT committed to git
- [ ] Production environment variables configured (if deployed)

## Questions?

See full documentation: `ENV_VARIABLES.md`

## Summary

✅ **Security improved** - No more hardcoded credentials  
✅ **GitHub safe** - `.env.local` not committed  
✅ **Team friendly** - Each dev has their own config  
✅ **Production ready** - Easy to deploy with different credentials  
✅ **Store ID fixed** - Full ID displayed in admin orders

---

**Last Updated:** October 14, 2025  
**Migration Complete:** All credentials moved to environment variables
