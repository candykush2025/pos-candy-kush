# PWA (Progressive Web App) Setup

## ✅ What's Been Configured

Your Candy Kush POS is now a **Progressive Web App (PWA)** with the following features:

### 🎯 Core Features

- ✅ **Offline Support**: Works without internet connection
- ✅ **Installable**: Can be installed on any device (mobile, tablet, desktop)
- ✅ **App-like Experience**: Runs in standalone mode without browser UI
- ✅ **Fast Loading**: Cached assets for instant startup
- ✅ **Service Worker**: Automatic caching and offline functionality
- ✅ **Web Manifest**: App metadata and icons
- ✅ **Cashier-Specific**: PWA scoped to `/sales` route only

### 🎯 Important: Role-Based Usage

#### �‍💼 For Cashiers

- ✅ **Install the PWA** on your device for best performance
- 📱 Install from `/sales` route only
- 🚀 PWA provides faster, app-like experience
- 📖 **Read**: [CASHIER_PWA_INSTALL.md](./CASHIER_PWA_INSTALL.md) for step-by-step guide

#### 🔧 For Admins

- ❌ **Do NOT install the PWA**
- 🌐 Use regular browser to access admin features
- 💼 Admin dashboard requires browser environment
- 🔄 PWA install prompt will NOT show on admin routes

### 📱 Installation Guides

- **Cashiers**: See [CASHIER_PWA_INSTALL.md](./CASHIER_PWA_INSTALL.md)
- **Detailed Instructions**: Visit `/admin/pwa-install`

## 🚀 How to Use

### For Users (Installing the App)

1. **Desktop (Chrome/Edge)**:

   - Click the install icon (⊕) in the address bar
   - Or: Menu → "Install Candy Kush POS"

2. **Android (Chrome)**:

   - Tap the menu (⋮) → "Add to Home screen" or "Install app"

3. **iPhone/iPad (Safari)**:

   - Tap Share (□↑) → "Add to Home Screen"

4. **Mac (Safari)**:
   - File → "Add to Dock"

### For Developers

#### Build and Deploy

```bash
# Development (PWA disabled for hot reload)
npm run dev

# Production build (PWA enabled)
npm run build
npm start
```

#### Testing PWA Locally

1. Build the production version:

   ```bash
   npm run build
   npm start
   ```

2. Open Chrome DevTools:

   - Go to Application tab
   - Check "Manifest" section
   - Check "Service Workers" section
   - Use Lighthouse to audit PWA score

3. Test offline:
   - Open DevTools → Network tab
   - Check "Offline" checkbox
   - Refresh page - it should still work!

## 📦 What's Included

### Files Added/Modified

```
public/
├── manifest.json          # PWA manifest with app metadata
└── icons/                 # App icons in multiple sizes
    ├── icon-72x72.svg
    ├── icon-96x96.svg
    ├── icon-128x128.svg
    ├── icon-144x144.svg
    ├── icon-152x152.svg
    ├── icon-192x192.svg
    ├── icon-384x384.svg
    └── icon-512x512.svg

src/
├── app/
│   ├── layout.js          # Updated with PWA meta tags
│   └── admin/
│       └── pwa-install/
│           └── page.js    # Installation guide page
└── components/
    └── PWAInstallPrompt.jsx  # Auto-prompt for installation

next.config.mjs            # Configured with next-pwa
scripts/
└── generate-icons.js      # Icon generator utility
```

### Service Worker Caching Strategy

The PWA automatically caches:

- **Static assets** (JS, CSS, images): StaleWhileRevalidate
- **API requests**: NetworkFirst with 10s timeout
- **Fonts**: CacheFirst
- **Next.js data**: StaleWhileRevalidate

## 🎨 Customizing Icons

⚠️ **Important**: The current icons are placeholders!

For production, create proper PNG icons:

### Option 1: Online Generators

- **PWA Builder**: https://www.pwabuilder.com/imageGenerator
- **Real Favicon Generator**: https://realfavicongenerator.net/
- **Favicon.io**: https://favicon.io/

### Option 2: Manual Creation

1. Create a 512x512px PNG with your brand logo
2. Use ImageMagick or similar tools to resize:

   ```bash
   # Install ImageMagick
   brew install imagemagick  # macOS

   # Generate all sizes
   for size in 72 96 128 144 152 192 384 512; do
     convert icon-source.png -resize ${size}x${size} public/icons/icon-${size}x${size}.png
   done
   ```

### Icon Requirements

- **Format**: PNG with transparency
- **Sizes**: 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512
- **Design**: Simple, recognizable at small sizes
- **Safe area**: Keep important content in center 80%

## 🧪 Testing Checklist

### PWA Requirements

- [ ] HTTPS enabled (or localhost for testing)
- [ ] Manifest.json served correctly
- [ ] Service worker registered
- [ ] Icons in all required sizes
- [ ] Start URL loads while offline
- [ ] Viewport meta tag present

### Browser Testing

- [ ] Chrome/Edge (Desktop) - Install prompt appears
- [ ] Chrome (Android) - Add to Home Screen works
- [ ] Safari (iOS) - Add to Home Screen works
- [ ] Safari (Mac) - Add to Dock works

### Offline Testing

- [ ] App loads while offline
- [ ] Sales can be recorded offline
- [ ] Data syncs when back online
- [ ] Cached assets load instantly

### Lighthouse Audit

Run Lighthouse in Chrome DevTools:

```
Target PWA Score: 100/100
- Installable
- PWA Optimized
- Service Worker registered
- Offline capable
```

## 🔧 Configuration

### Manifest.json

Edit `public/manifest.json` to customize:

- App name and short name
- Theme color
- Background color
- Display mode (standalone, fullscreen, minimal-ui)
- Orientation (portrait, landscape, any)

### Service Worker

Edit `next.config.mjs` to customize caching:

- Cache strategies (NetworkFirst, CacheFirst, StaleWhileRevalidate)
- Cache expiration times
- URL patterns to cache
- Skip waiting behavior

### Install Prompt

Edit `src/components/PWAInstallPrompt.jsx` to customize:

- When to show prompt (default: after 30 seconds)
- How often to show (default: every 7 days if dismissed)
- Prompt appearance and copy

## 📚 Resources

### Documentation

- **Next PWA**: https://github.com/shadowwalker/next-pwa
- **Workbox**: https://developers.google.com/web/tools/workbox
- **PWA Checklist**: https://web.dev/pwa-checklist/

### Testing Tools

- **Lighthouse**: Built into Chrome DevTools
- **PWA Builder**: https://www.pwabuilder.com/
- **Chrome DevTools Application Tab**: Service Workers, Manifest, Cache Storage

### Best Practices

- **Web.dev PWA Guide**: https://web.dev/progressive-web-apps/
- **MDN PWA Guide**: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps

## 🐛 Troubleshooting

### "Install prompt not showing"

- Ensure you're on HTTPS (or localhost)
- Check manifest.json is valid
- Verify service worker is registered
- Clear cache and reload
- Try in incognito/private window

### "App not working offline"

- Check service worker is active in DevTools
- Verify caching strategy in next.config.mjs
- Check console for service worker errors
- Clear cache and re-register service worker

### "Icons not appearing"

- Verify icon files exist in public/icons/
- Check icon paths in manifest.json
- Ensure icons are PNG format (not SVG)
- Check file sizes are reasonable (<100KB each)

### "Updates not showing"

- Service worker caches aggressively
- Users need to close all tabs and reopen
- Or: skipWaiting can force immediate updates
- Use versioning in manifest for major updates

## 🚀 Deployment

When deploying to production:

1. **Build the app**:

   ```bash
   npm run build
   ```

2. **Verify service worker**:

   - Check `public/sw.js` was generated
   - Check `public/workbox-*.js` files exist

3. **Deploy to HTTPS host**:

   - Vercel, Netlify, or any HTTPS server
   - PWAs require HTTPS (except localhost)

4. **Test installation**:

   - Visit site on different devices
   - Verify install prompt appears
   - Test offline functionality

5. **Monitor**:
   - Check service worker registration
   - Monitor cache sizes
   - Track installation rates

## 💡 Tips

- **Update Strategy**: Use `skipWaiting: true` for automatic updates
- **Cache Size**: Monitor cache growth, implement cleanup if needed
- **Performance**: PWA should improve load times significantly
- **Analytics**: Track install events and offline usage
- **Marketing**: Promote the "Install" feature to users

## 📝 Next Steps

1. **Replace placeholder icons** with your brand design
2. **Customize colors** in manifest.json and meta tags
3. **Test on all target devices** and browsers
4. **Add analytics** to track PWA adoption
5. **Optimize caching** based on usage patterns
6. **Add screenshots** to manifest for app stores
7. **Consider push notifications** (requires setup)

---

**Need Help?**

- Check the installation guide: `/admin/pwa-install`
- Read Next PWA docs: https://github.com/shadowwalker/next-pwa
- Open an issue on the repository
