# PWA Testing Guide for Android Tablet

## ✅ Changes Made

### 1. Fixed Orientation

- Changed from `"orientation": "portrait-primary"` to `"orientation": "landscape"`
- PWA will now open in landscape mode on Android tablets

### 2. Fixed Icons

- Updated manifest.json to use correct SVG icons (not PNG)
- Icons show "CK" branding (green background with white text)
- All icon sizes: 72, 96, 128, 144, 152, 192, 384, 512

### 3. Reduced Install Prompt Delay

- Changed from 30 seconds to 5 seconds for easier testing
- Added console logging to debug installation issues

---

## 🧪 How to Test on Android Tablet

### Step 1: Build and Deploy

Before testing, you need a production build:

```powershell
# Build the app
npm run build

# Start production server
npm start
```

**Important:** PWA features only work in **production mode** (`npm start`), not in development mode (`npm run dev`).

### Step 2: Access on Android Tablet

1. **Connect to the same network** as your development computer
2. **Find your local IP address:**

   ```powershell
   ipconfig
   ```

   Look for "IPv4 Address" (e.g., `192.168.1.100`)

3. **Open Chrome on your Android tablet**
4. **Navigate to:** `http://YOUR_IP:3000/login`
   - Example: `http://192.168.1.100:3000/login`
   - Or just: `http://YOUR_IP:3000` (redirects to login)

### Step 3: Install Prompt Shows Instantly

1. **Login page loads** → Install prompt appears **immediately**
2. **Look for the install banner** at the bottom of the screen
3. **Check browser console** (Chrome DevTools) for logs:
   - "PWA: beforeinstallprompt event fired"
   - "PWA: Showing install prompt"

### Step 4: Install the PWA

**Method 1: Automatic Prompt (preferred)**

- Wait for the prompt to appear
- Tap "Install" button

**Method 2: Manual Installation**

1. Tap the **three-dot menu** (⋮) in Chrome
2. Select **"Add to Home screen"** or **"Install app"**
3. Confirm the installation
4. App icon will appear on your home screen

### Step 5: Verify Installation

1. **Tap the "CK POS" icon** on your home screen
2. **App should open in landscape mode**
3. **No browser UI** (address bar, tabs) should be visible
4. **Icon should show "CK"** not Vercel logo

---

## 🐛 Troubleshooting

### Install Prompt Not Showing?

**Check these requirements:**

- ✅ Using **HTTPS** or **localhost/local IP**
- ✅ Using **Chrome browser** (not Samsung Internet or Firefox)
- ✅ On the **/sales** route (not /admin or /)
- ✅ **Not already installed** (check home screen)
- ✅ Haven't dismissed prompt in last 7 days

**Clear dismissal flag:**
Open Chrome DevTools Console and run:

```javascript
localStorage.removeItem("pwa-install-dismissed");
location.reload();
```

### Install Prompt Dismissed?

If you dismissed it by accident:

1. **Wait 7 days**, OR
2. **Clear site data:**
   - Chrome menu → Settings → Site settings → POS site
   - Tap "Clear & reset"
3. **Reload the page**

### Manual Installation Steps

If automatic prompt never shows:

1. **Chrome menu** (⋮) → "Add to Home screen"
2. **Or** check Chrome flags:
   - Go to `chrome://flags`
   - Search for "Web App Install"
   - Ensure related flags are enabled

### Orientation Still Portrait?

1. **Uninstall the PWA** (long-press icon → "Uninstall")
2. **Clear browser cache** completely
3. **Reinstall** from updated manifest

### Shows Vercel Logo?

This means old cached icons. Fix:

1. **Uninstall the PWA**
2. **Clear Chrome cache**: Settings → Privacy → Clear browsing data
3. **Reload** `/sales` page
4. **Reinstall** the PWA

---

## 📱 Testing Checklist

Before shipping to production:

- [ ] Build with `npm run build`
- [ ] Start with `npm start` (not `npm run dev`)
- [ ] Access via local IP on Android tablet
- [ ] Navigate to `/login` route (or just root URL)
- [ ] Install prompt appears **instantly**
- [ ] Install PWA successfully
- [ ] Verify landscape orientation
- [ ] Verify "CK" branded icon (not Vercel)
- [ ] Test offline functionality (disconnect WiFi)
- [ ] Test payment flow
- [ ] Test product search
- [ ] Uninstall and reinstall to verify

---

## 🚀 Production Deployment

For production (deployed to a real domain):

1. **Must use HTTPS** (required for PWA)
2. **Deploy to Vercel/Netlify/your server**
3. **Access via real domain** (e.g., `https://pos.candykush.com`)
4. **Install prompt shows on login page** instantly
5. **Install prompt works better** on HTTPS (more reliable)

---

## 🔍 Debug Commands

**Check if PWA is installable (Chrome DevTools):**

1. Open DevTools (F12)
2. Go to **Application** tab
3. Check **Manifest** section
4. Look for "Add to homescreen" status
5. Check **Service Workers** section

**Console logs to watch for:**

```
PWA: beforeinstallprompt event fired
PWA: Showing install prompt
```

**Force show prompt (for testing):**

```javascript
// In browser console
window.dispatchEvent(new Event("beforeinstallprompt"));
```

---

## 📝 Notes

- **No delay** - Install prompt shows **instantly** on login page
- **Login is entry point** - First page users see when visiting site
- **Landscape orientation** applies to tablets/large screens
- **Phones may ignore** landscape setting (user preference)
- **Install prompt** only shows once per 7 days if dismissed
- **Service worker** caches assets for offline use
- **Scope is /** - Works across all routes (login, sales, admin)

---

## ✅ Expected Behavior

After successful installation:

1. **Icon on home screen** with "CK" logo
2. **Launches in landscape mode**
3. **No browser UI** (standalone mode)
4. **Works offline** (after first load)
5. **Fast loading** (cached assets)
6. **Badge shows "CK POS"**

Good luck with testing! 🎉
