# Environment Variables Configuration Guide

## 🔐 Security First

**IMPORTANT:** All sensitive credentials are now stored in `.env.local` and are NOT committed to GitHub.

## Required Environment Variables

### 1. Firebase Configuration

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

**Where to get these:**

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project
3. Go to Project Settings (gear icon)
4. Scroll to "Your apps" section
5. Copy the config values

---

### 2. Loyverse API Configuration

#### Server-Side (Secret - Never exposed to browser)

```bash
# ⚠️ KEEP THIS SECRET - Server-side only
LOYVERSE_ACCESS_TOKEN=your_access_token_here
```

**Where to get this:**

1. Log in to Loyverse: https://r.loyverse.com/
2. Go to Settings → Integrations → API Tokens
3. Create new token or copy existing one
4. **NEVER share this publicly or commit to GitHub**

#### Client-Side (Safe to expose)

```bash
NEXT_PUBLIC_LOYVERSE_STORE_ID=your_store_id
NEXT_PUBLIC_LOYVERSE_PAYMENT_TYPE_ID=your_payment_type_id
NEXT_PUBLIC_LOYVERSE_SOURCE_NAME=Your POS Name
```

**Where to get these:**

- **Store ID**: Loyverse Dashboard → Settings → Stores → Copy Store ID
- **Payment Type ID**: Use existing or create new payment type in Loyverse
- **Source Name**: Your custom POS name (e.g., "Candy Kush POS")

---

### 3. App Configuration

```bash
NEXT_PUBLIC_APP_NAME=Your POS Name
NEXT_PUBLIC_APP_VERSION=1.0.0
```

---

### 4. API Configuration (Optional)

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

---

### 5. Sync Configuration

```bash
NEXT_PUBLIC_SYNC_INTERVAL=30000          # 30 seconds
NEXT_PUBLIC_MAX_OFFLINE_QUEUE=100        # Max items in queue
```

---

### 6. Feature Flags

```bash
NEXT_PUBLIC_ENABLE_BARCODE_SCANNER=false
NEXT_PUBLIC_ENABLE_CUSTOMER_DISPLAY=false
NEXT_PUBLIC_ENABLE_HARDWARE_INTEGRATION=false
NEXT_PUBLIC_LOYVERSE_SYNC=true           # Enable Loyverse sync
NEXT_PUBLIC_DEBUG_MODE=false
NEXT_PUBLIC_MOCK_API=false
```

---

## Setup Instructions

### Initial Setup (New Installation)

1. **Copy the example file:**

   ```powershell
   Copy-Item .env.example .env.local
   ```

2. **Edit `.env.local`:**

   - Open in your code editor
   - Replace all `your_xxx_here` values with actual credentials
   - Save the file

3. **Verify `.env.local` is in `.gitignore`:**

   ```powershell
   Get-Content .gitignore | Select-String ".env"
   ```

   Should show: `.env*`

4. **Restart your dev server:**
   ```powershell
   npm run dev
   ```

---

## Environment Variable Prefixes

### `NEXT_PUBLIC_` Prefix

**Used for:** Variables that need to be accessible in the browser (client-side)

**Examples:**

- `NEXT_PUBLIC_LOYVERSE_STORE_ID` ✅ (Safe to expose)
- `NEXT_PUBLIC_APP_NAME` ✅ (Safe to expose)

**Security:** These are embedded in the client-side JavaScript bundle and visible to users.

### No Prefix

**Used for:** Server-side only variables (secrets)

**Examples:**

- `LOYVERSE_ACCESS_TOKEN` ✅ (Secret - server only)
- Database credentials
- API keys with write access

**Security:** Never accessible from browser, only available in API routes and server components.

---

## File Structure

```
pos-candy-kush/
├── .env.local              ← Your actual credentials (NEVER commit)
├── .env.example            ← Template with placeholder values (commit this)
├── .gitignore              ← Contains .env* to ignore all env files
└── src/
    ├── config/
    │   └── constants.js    ← Uses process.env.NEXT_PUBLIC_* (no hardcoded values)
    └── app/
        └── api/
            └── loyverse/
                └── route.js ← Uses process.env.LOYVERSE_ACCESS_TOKEN
```

---

## Security Best Practices

### ✅ DO:

- Store all secrets in `.env.local`
- Use `NEXT_PUBLIC_` prefix only for non-sensitive data
- Keep `.env.local` in `.gitignore`
- Commit `.env.example` with placeholder values
- Use different tokens for development and production
- Rotate API tokens regularly

### ❌ DON'T:

- Hardcode credentials in source files
- Commit `.env.local` to GitHub
- Share your `.env.local` file
- Use production tokens in development
- Add `NEXT_PUBLIC_` to secret tokens
- Expose API tokens in client-side code

---

## Troubleshooting

### Problem: "Loyverse access token not configured"

**Solution:**

1. Check `.env.local` exists in project root
2. Verify `LOYVERSE_ACCESS_TOKEN=your_token` (no NEXT*PUBLIC* prefix)
3. Restart dev server: `npm run dev`

### Problem: "Store ID is undefined"

**Solution:**

1. Check `.env.local` has `NEXT_PUBLIC_LOYVERSE_STORE_ID=your_id`
2. Verify the prefix `NEXT_PUBLIC_` is present
3. Restart dev server

### Problem: Changes not taking effect

**Solution:**

1. Restart dev server (Next.js caches env vars)
2. Clear `.next` cache: `Remove-Item -Recurse -Force .next`
3. Run `npm run dev` again

### Problem: Env vars work locally but not in production

**Solution:**

1. Set environment variables in your hosting platform:
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Environment Variables
   - Other: Check your platform's documentation
2. Redeploy your application

---

## Production Deployment

### Vercel

1. Go to your project on Vercel
2. Settings → Environment Variables
3. Add each variable:
   - Variable name: `LOYVERSE_ACCESS_TOKEN`
   - Value: Your actual token
   - Environment: Production (or All)
4. Click "Save"
5. Redeploy

### Other Platforms

Check your hosting provider's documentation for setting environment variables.

---

## Checking Current Configuration

### View loaded env vars (development)

Create a test page at `pages/api/test-env.js`:

```javascript
export default function handler(req, res) {
  // Only in development!
  if (process.env.NODE_ENV !== "development") {
    return res.status(403).json({ error: "Forbidden" });
  }

  res.json({
    storeId: process.env.NEXT_PUBLIC_LOYVERSE_STORE_ID,
    hasToken: !!process.env.LOYVERSE_ACCESS_TOKEN,
    appName: process.env.NEXT_PUBLIC_APP_NAME,
  });
}
```

Visit: http://localhost:3000/api/test-env

**⚠️ Delete this file before deploying to production!**

---

## Migration from Hardcoded Values

If you're upgrading from hardcoded values in `constants.js`:

### Before (❌ Insecure):

```javascript
export const LOYVERSE_CONFIG = {
  STORE_ID: "42dc2cec-6f40-11ea-bde9-1269e7c5a22d",
  DEFAULT_PAYMENT_TYPE_ID: "42dd2a55-6f40-11ea-bde9-1269e7c5a22d",
};
```

### After (✅ Secure):

```javascript
export const LOYVERSE_CONFIG = {
  STORE_ID: process.env.NEXT_PUBLIC_LOYVERSE_STORE_ID || "",
  DEFAULT_PAYMENT_TYPE_ID:
    process.env.NEXT_PUBLIC_LOYVERSE_PAYMENT_TYPE_ID || "",
};
```

**Migration Steps:**

1. Copy values from `constants.js` to `.env.local`
2. Update `constants.js` to use `process.env`
3. Test locally
4. Commit changes (constants.js will have no secrets)
5. Update production environment variables

---

## Quick Reference Card

| Variable        | Prefix       | Location   | Public? |
| --------------- | ------------ | ---------- | ------- |
| Firebase Config | NEXT*PUBLIC* | .env.local | Yes     |
| Loyverse Token  | (none)       | .env.local | **NO**  |
| Store ID        | NEXT*PUBLIC* | .env.local | Yes     |
| Payment Type ID | NEXT*PUBLIC* | .env.local | Yes     |
| App Name        | NEXT*PUBLIC* | .env.local | Yes     |
| Feature Flags   | NEXT*PUBLIC* | .env.local | Yes     |

---

## Support

### Issues?

1. Check this guide first
2. Verify `.env.local` syntax (no spaces around `=`)
3. Restart dev server
4. Check browser console for errors
5. Check terminal for server errors

### Need Help?

- Check `.env.example` for reference
- Review Next.js env docs: https://nextjs.org/docs/basic-features/environment-variables
- Verify Loyverse API token is valid

---

## Checklist

Before committing code:

- [ ] All secrets moved to `.env.local`
- [ ] No hardcoded credentials in source files
- [ ] `.env.local` is in `.gitignore`
- [ ] `.env.example` updated with placeholders
- [ ] Tested locally with new env vars
- [ ] Production env vars configured
- [ ] Documentation updated
- [ ] Team notified of changes

---

## Last Updated

Date: October 14, 2025
Version: 1.0.0
