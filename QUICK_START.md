# Quick Start Guide

## First Time Setup

1. **Copy environment file**

   ```bash
   cp .env.example .env.local
   ```

2. **Start development server**

   ```bash
   npm run dev
   ```

3. **Open browser**
   Navigate to: http://localhost:3000

4. **Login with demo credentials**
   - Admin: `admin` / `admin123`
   - Manager: `manager` / `manager123`
   - Cashier: `cashier` / `cashier123`

## What You'll See

### Login Page

- Clean, modern interface
- Demo credentials displayed
- Touch-optimized buttons

### Sales Screen

- Product grid with demo products (Candy Kush Flower, Blue Dream, etc.)
- Shopping cart on the right
- Search bar for quick product lookup
- Add products by clicking them
- Adjust quantities with +/- buttons
- Save tickets for later
- Checkout button (payment modal coming soon)

### Navigation

- Sales: Main POS interface
- Tickets: Saved/parked orders
- Reports: Analytics (coming soon)
- Products: Product management (coming soon)
- Settings: Configuration (coming soon)

### Status Indicators

- WiFi icon: Online/offline status
- Sync button: Manual sync trigger
- User menu: Profile and logout

## Testing Features

### Cart Management

1. Click products to add to cart
2. Use +/- to adjust quantities
3. Click trash icon to remove items
4. View totals updating in real-time

### Multi-Ticket System

1. Add items to cart
2. Click "Save Ticket"
3. Cart clears
4. Start new sale
5. Access saved tickets later

### Offline Mode

1. Open DevTools (F12)
2. Go to Network tab
3. Check "Offline" checkbox
4. Yellow banner appears
5. Continue using POS normally
6. All changes queued locally
7. Uncheck "Offline"
8. Data syncs automatically

### Permissions (Coming Soon)

- Login as different roles
- See what each role can access
- Cashier: Basic sales only
- Manager: Sales + reports + discounts
- Admin: Everything

## Known Limitations (MVP Phase)

- Payment processing modal not implemented yet
- Backend API needs to be connected
- Receipt printing not implemented
- Barcode scanning not implemented
- Reports pages are placeholders

## Next Steps for Development

1. **Implement Payment Modal**

   - Multiple payment methods
   - Change calculation
   - Receipt generation

2. **Connect Real API**

   - Update API_BASE_URL in .env.local
   - Implement actual authentication
   - Sync real product data

3. **Add PWA Manifest**

   - Make installable as app
   - Add service worker
   - Support offline properly

4. **Build Remaining Pages**
   - Ticket management
   - Reports with charts
   - Product management
   - Settings

## Troubleshooting

### Port already in use

```bash
# Kill process on port 3000
npx kill-port 3000
npm run dev
```

### Dependencies not installed

```bash
npm install
```

### Build errors

```bash
# Clear cache
rm -rf .next
npm run dev
```

### IndexedDB not working

- Check browser console for errors
- Ensure using modern browser
- Check browser settings allow IndexedDB

## Development Tips

- Use React DevTools for debugging
- Check Network tab for API calls
- Use Application tab to inspect IndexedDB
- Console shows sync status
- Hot reload enabled (edit and save)

## File Locations

- **Pages**: `src/app/(pos)/`
- **Components**: `src/components/`
- **State**: `src/store/`
- **API**: `src/lib/api/`
- **Database**: `src/lib/db/`
- **Config**: `src/config/`

## Demo Products

The system includes demo products:

- Candy Kush Flower - $45.00
- Blue Dream Flower - $40.00
- OG Kush Pre-Roll - $12.00
- Sour Diesel Flower - $50.00
- Girl Scout Cookies - $48.00
- Gorilla Glue #4 - $52.00
- Purple Haze - $46.00
- Northern Lights - $44.00

These are stored in IndexedDB on first load.

## Production Readiness

Before deploying to production:

1. [ ] Connect real backend API
2. [ ] Implement payment processing
3. [ ] Add SSL/HTTPS
4. [ ] Configure environment variables
5. [ ] Setup error tracking (Sentry)
6. [ ] Add analytics
7. [ ] Test on real devices
8. [ ] Security audit
9. [ ] Performance optimization
10. [ ] User training

---

Ready to start? Run `npm run dev` and visit http://localhost:3000
