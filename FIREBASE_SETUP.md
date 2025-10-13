# Firebase Integration Guide

## ✅ Firebase Setup Completed

Your POS system is now integrated with Firebase! Here's what has been set up:

### Firebase Services Configured

- ✅ Firebase Authentication (Email/Password)
- ✅ Cloud Firestore (Database)
- ✅ Firebase Storage
- ✅ Firebase Analytics

## 🔧 What Was Done

### 1. Environment Variables

Created `.env.local` with your Firebase configuration:

- API Key
- Auth Domain
- Project ID
- Storage Bucket
- Messaging Sender ID
- App ID
- Measurement ID

### 2. Firebase Configuration Files

- `src/lib/firebase/config.js` - Firebase initialization
- `src/lib/firebase/auth.js` - Authentication service
- `src/lib/firebase/firestore.js` - Database service

### 3. Updated Login System

- Login now uses Firebase Authentication
- Email/password authentication instead of username
- Automatic role detection from Firestore

### 4. Admin Panel Created

New admin routes at `/admin/*`:

- **Dashboard** - Overview with stats and analytics
- **Products** - Manage product inventory
- **Orders** - View all orders
- **Users** - Create and manage staff
- **Analytics** - Detailed insights
- **Settings** - System configuration

### 5. POS Integration

- Sales page now syncs with Firebase
- Orders saved to Firestore
- Products loaded from Firebase
- Offline fallback to IndexedDB

## 🚀 Next Steps to Get Started

### Step 1: Create Admin User in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `pos-candy-kush`
3. Click **Authentication** → **Users** tab
4. Click **Add User**
5. Create admin user:
   - Email: `admin@candykush.com`
   - Password: `admin123` (change this!)

### Step 2: Add User Data to Firestore

1. In Firebase Console, go to **Firestore Database**
2. Click **+ Start collection**
3. Collection ID: `users`
4. Click **Next**
5. Document ID: Use the User UID from Authentication (copy it)
6. Add fields:
   ```
   email: admin@candykush.com
   name: Admin User
   role: admin
   permissions: [] (empty array)
   createdAt: (auto-generated)
   updatedAt: (auto-generated)
   ```
7. Click **Save**

### Step 3: Set Firestore Security Rules

In Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper function to get user data
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    // Helper function to check if user is admin
    function isAdmin() {
      return isAuthenticated() && getUserData().role == 'admin';
    }

    // Helper function to check if user is manager or admin
    function isManager() {
      return isAuthenticated() && (getUserData().role == 'admin' || getUserData().role == 'manager');
    }

    // Users collection - admin only
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // Products collection - read for all authenticated, write for manager+
    match /products/{productId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isManager();
    }

    // Categories collection - read for all authenticated, write for manager+
    match /categories/{categoryId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isManager();
    }

    // Orders collection - authenticated users can create, managers can read all
    match /orders/{orderId} {
      allow read: if isManager() || (isAuthenticated() && resource.data.userId == request.auth.uid);
      allow create: if isAuthenticated();
      allow update, delete: if isManager();
    }

    // Customers collection - authenticated only
    match /customers/{customerId} {
      allow read, write: if isAuthenticated();
    }

    // Sessions collection - authenticated only
    match /sessions/{sessionId} {
      allow read, write: if isAuthenticated();
    }

    // Tickets collection - authenticated only
    match /tickets/{ticketId} {
      allow read, write: if isAuthenticated();
    }

    // Settings collection - admin only
    match /settings/{settingId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}
```

### Step 4: Set Storage Security Rules

In Firebase Console → Storage → Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /products/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    match /receipts/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### Step 5: Start the Development Server

```powershell
cd "C:\Users\kevin\SynologyDrive\Candy Kush\pos-candy-kush\pos-candy-kush"
npm run dev
```

### Step 6: Test the System

1. **Login**: Go to http://localhost:3001/login

   - Email: `admin@candykush.com`
   - Password: `admin123`

2. **You'll be redirected to**: `/admin/dashboard`

3. **Test Admin Features**:

   - Create products in Products page
   - Create users in Users page
   - View analytics

4. **Test POS**: Create a cashier user and test sales

## 📝 Creating Users

### Create Manager or Cashier

1. Login as admin
2. Go to Admin Panel → Users
3. Click "Add User"
4. Fill in:
   - Name
   - Email
   - Password
   - Select Role (Cashier, Manager, or Admin)
5. Click "Create User"

User will be created in:

- Firebase Authentication
- Firestore `users` collection

## 🎨 System Features

### Admin Panel Features

- **Dashboard**: Real-time stats, revenue, orders count
- **Products Management**: Add, edit, delete products
- **Orders View**: All orders with details
- **User Management**: Create staff with roles
- **Analytics**: Revenue trends, top products
- **Settings**: System configuration

### POS Features

- **Sales Screen**: Product grid, cart management
- **Firebase Sync**: Real-time data synchronization
- **Offline Mode**: Works without internet
- **Multi-Ticket**: Save and resume orders
- **Role-Based Access**: Different permissions per role

## 🔒 Security Notes

### Change Default Passwords

```
admin@candykush.com - Change in Firebase Console
```

### User Roles

- **Admin**: Full system access, can create users
- **Manager**: Sales, reports, product management
- **Cashier**: Basic sales only

### Firebase Security

- Authentication required for all operations
- Firestore rules enforce permissions
- Storage rules protect files
- JWT tokens auto-refresh

## 🐛 Troubleshooting

### "Permission Denied" Error

- Check Firestore security rules
- Ensure user has correct role in Firestore
- Verify user is authenticated

### "User not found" Error

- Create user in Firebase Authentication first
- Then add user document in Firestore `users` collection
- User UID must match in both places

### Products Not Loading

- Check Firestore rules allow read for authenticated users
- Open browser console for errors
- Try creating products in Admin Panel first

### Login Fails

- Verify email/password in Firebase Console
- Check if user document exists in Firestore
- Look for errors in browser console

## 📊 Database Collections

### Firestore Structure

```
users/
  {userId}/
    - email: string
    - name: string
    - role: string (admin, manager, cashier)
    - permissions: array
    - createdAt: timestamp
    - updatedAt: timestamp

products/
  {productId}/
    - name: string
    - price: number
    - stock: number
    - barcode: string
    - sku: string
    - category: string
    - description: string
    - createdAt: timestamp
    - updatedAt: timestamp

categories/
  {categoryId}/
    - name: string
    - createdAt: timestamp
    - updatedAt: timestamp

orders/
  {orderId}/
    - orderNumber: string
    - items: array
    - subtotal: number
    - discount: number
    - total: number
    - userId: string
    - status: string
    - paymentMethod: string
    - createdAt: timestamp
    - updatedAt: timestamp

customers/
  {customerId}/
    - name: string
    - email: string
    - phone: string
    - createdAt: timestamp
    - updatedAt: timestamp
```

## 🎯 Quick Commands

### Start Development

```powershell
npm run dev
```

### Build for Production

```powershell
npm run build
npm start
```

### Check Firebase Connection

Open browser console and run:

```javascript
import { auth } from "@/lib/firebase/config";
console.log("Firebase connected:", !!auth);
```

## ✨ What's Next?

### Immediate Tasks

1. Create admin user in Firebase
2. Set Firestore security rules
3. Login and test admin panel
4. Create products
5. Create additional users
6. Test POS sales

### Future Enhancements

- Payment modal with multiple methods
- Receipt printing
- Barcode scanning
- Advanced reporting
- Customer management
- Loyalty programs

## 📞 Need Help?

1. Check browser console for errors
2. Review Firestore rules
3. Verify Firebase configuration
4. Check this guide's troubleshooting section

---

**Your Candy Kush POS is now powered by Firebase! 🚀**
