# Candy Kush POS System

A modern, feature-rich Point of Sale (POS) system built with Next.js, designed for cannabis dispensaries with offline capabilities, multi-device support, and seamless back-office integration.

## 🎯 Features

### Core Features

- ✅ **Responsive Design** - Optimized for tablets, smartphones (iOS & Android)
- ✅ **Touch-Optimized Interface** - Large touch targets, intuitive gestures
- ✅ **Offline Mode** - Work without internet, automatic sync when reconnected
- ✅ **Multi-Ticket System** - Handle multiple orders simultaneously
- ✅ **Role-Based Access** - Cashier, Manager, Admin roles with permissions
- ✅ **Real-time Sync** - Automatic data synchronization
- ✅ **Product Management** - Search, filter, barcode scanning
- ✅ **Cart Management** - Add/remove items, adjust quantities, apply discounts
- ✅ **Payment Processing** - Multiple payment methods support

### Technical Features

- **Progressive Web App (PWA)** - Install as native app on any device
- **IndexedDB Storage** - Persistent offline data storage
- **Background Sync** - Automatic synchronization in background
- **State Management** - Zustand for efficient state handling
- **Modern UI** - Built with Tailwind CSS and shadcn/ui

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **State Management**: Zustand
- **Database**: IndexedDB (Dexie.js)
- **API Client**: Axios
- **Icons**: Lucide React

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Modern web browser with IndexedDB support

## 🚀 Getting Started

### Installation

1. **Navigate to project directory**

   ```bash
   cd pos-candy-kush
   ```

2. **Install dependencies** (already done)

   ```bash
   npm install
   ```

3. **Create environment file**

   ```bash
   cp .env.example .env.local
   ```

4. **Configure environment variables**
   Edit `.env.local` with your API endpoints

5. **Run development server**

   ```bash
   npm run dev
   ```

6. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Demo Credentials

| Role    | Username | Password   |
| ------- | -------- | ---------- |
| Admin   | admin    | admin123   |
| Manager | manager  | manager123 |
| Cashier | cashier  | cashier123 |

## 📱 Usage

### Sales Screen

1. **Search Products**: Use the search bar to find products by name, barcode, or SKU
2. **Add to Cart**: Click on products to add them to cart
3. **Adjust Quantities**: Use +/- buttons in cart
4. **Apply Discounts**: Click on discount button (Manager/Admin only)
5. **Save Ticket**: Save current cart as a parked ticket
6. **Checkout**: Process payment and complete sale

### Offline Mode

The system automatically detects when you go offline:

- All operations continue to work normally
- Changes are queued locally
- Automatic sync when connection restored
- Visual indicator shows online/offline status

## 🏗 Project Structure

```
pos-candy-kush/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication pages
│   │   ├── (pos)/             # POS interface
│   │   ├── layout.js          # Root layout
│   │   └── page.js            # Home page
│   │
│   ├── components/ui/         # UI components (shadcn/ui)
│   ├── config/                # Configuration files
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities & services
│   │   ├── api/               # API client & endpoints
│   │   ├── db/                # IndexedDB setup (Dexie)
│   │   ├── sync/              # Sync engine
│   │   └── utils/             # Helper functions
│   └── store/                 # Zustand state stores
│
├── public/                    # Static files
├── DEVELOPMENT_PLAN.md        # Full roadmap
├── PROJECT_STRUCTURE.md       # Detailed structure
├── CONSTANTS.md               # App constants
└── README.md                  # This file
```

## 📚 Documentation

- [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) - Full development roadmap
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Detailed project structure
- [CONSTANTS.md](./CONSTANTS.md) - Application constants reference

## 🔌 API Integration

The POS system requires a backend API. See `src/lib/api/endpoints.js` for required endpoints.

### Key Endpoints

- Authentication: `/api/auth/*`
- Products: `/api/products/*`
- Orders: `/api/orders/*`
- Customers: `/api/customers/*`
- Reports: `/api/reports/*`

## 🔐 Security

- JWT-based authentication
- Token refresh mechanism
- Role-based access control (RBAC)
- Secure local storage
- HTTPS required for production

## 📦 Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🗺 Roadmap

### Phase 1 (Current) ✅

- [x] Basic POS interface
- [x] Offline support
- [x] User authentication
- [x] Cart management

### Phase 2 (Next)

- [ ] Payment processing modal
- [ ] Receipt printing
- [ ] Barcode scanning
- [ ] Advanced reporting
- [ ] Ticket management page

### Phase 3 (Future)

- [ ] Customer display
- [ ] Hardware integration
- [ ] Loyalty programs
- [ ] Multi-location support

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 Next Steps

To continue development:

1. **Run the development server** to see the POS interface
2. **Review documentation** in DEVELOPMENT_PLAN.md
3. **Implement payment modal** for checkout flow
4. **Connect backend API** for real data synchronization
5. **Add PWA manifest** for app installation
6. **Implement barcode scanning** using device camera
7. **Build reporting screens** with charts and analytics

## 🙏 Acknowledgments

- Inspired by Loyverse POS
- Built with modern web technologies
- Designed for cannabis dispensaries

---

**Made with ❤️ for Candy Kush**
