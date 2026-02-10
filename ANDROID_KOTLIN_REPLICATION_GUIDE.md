# 📱 Candy Kush POS - Android Kotlin Cashier App Replication Guide

**Complete Documentation for Building Native Android Cashier App**

**Version:** 2.0  
**Last Updated:** February 3, 2026  
**Purpose:** Replicate ALL CASHIER POS features in native Android Kotlin app

---

## 📋 Table of Contents

1. [Cashier App Overview](#1-cashier-app-overview)
2. [Complete Cashier Flow](#2-complete-cashier-flow)
3. [POS Navigation Menu Structure](#3-pos-navigation-menu-structure)
4. [Technology Stack Mapping](#4-technology-stack-mapping)
5. [Authentication - PIN Login](#5-authentication---pin-login)
6. [Sales Section (Main POS)](#6-sales-section-main-pos)
7. [Tickets Section](#7-tickets-section)
8. [Customers Section](#8-customers-section)
9. [History Section](#9-history-section)
10. [Shifts Section](#10-shifts-section)
11. [Products Section](#11-products-section)
12. [Kiosk Orders Section](#12-kiosk-orders-section)
13. [Expenses Section](#13-expenses-section)
14. [Settings Section](#14-settings-section)
15. [Data Models](#15-data-models)
16. [Firebase Collections](#16-firebase-collections)
17. [State Management](#17-state-management)
18. [Offline Support](#18-offline-support)
19. [API Endpoints](#19-api-endpoints)
20. [Implementation Checklist](#20-implementation-checklist)

---

## 1. Cashier App Overview

### 1.1 Purpose

This Android app is for **CASHIERS ONLY** - replicating the POS web interface at `/pos` route. The app handles:

- Point of Sale operations (sales processing)
- Customer selection and points management
- Shift management (start/end shifts with cash reconciliation)
- Saved tickets (park/resume orders)
- Transaction history
- Product browsing
- Kiosk order processing
- Expense submission
- App settings (theme, timeout)

### 1.2 Key Features

| Feature          | Description                                                     |
| ---------------- | --------------------------------------------------------------- |
| **PIN Login**    | Cashiers login with 4-digit PIN                                 |
| **Sales**        | Add products to cart, apply discounts, process payments         |
| **Tickets**      | Save/park orders, resume later                                  |
| **Customers**    | Select customer, view/earn points                               |
| **History**      | View past transactions, void sales                              |
| **Shifts**       | Start shift (opening cash), end shift (closing cash + variance) |
| **Products**     | Browse products, categories, check stock                        |
| **Kiosk Orders** | Receive orders from customer kiosk, process them                |
| **Expenses**     | Submit expense requests for approval                            |
| **Settings**     | Theme toggle, idle timeout, logout                              |

---

## 2. Complete Cashier Flow

### 2.1 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CASHIER WORKFLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. LOGIN (PIN)                                                  │
│     └── Enter 4-digit PIN                                       │
│         └── Validate against Firebase users collection          │
│             └── Get JWT token + cashier data                    │
│                                                                  │
│  2. START SHIFT (Required before sales)                         │
│     └── Go to Shifts tab                                        │
│         └── Enter opening cash amount                           │
│             └── Shift becomes "active"                          │
│                                                                  │
│  3. PROCESS SALES                                               │
│     └── Select products (tap to add to cart)                    │
│         └── Optional: Select customer (for points)              │
│             └── Optional: Apply discounts                       │
│                 └── Choose payment method                       │
│                     └── Complete sale → Print receipt           │
│                                                                  │
│  4. END SHIFT                                                   │
│     └── Go to Shifts tab                                        │
│         └── Click "End Shift"                                   │
│             └── Enter closing cash amount                       │
│                 └── System calculates variance                  │
│                     └── Print shift report                      │
│                                                                  │
│  5. LOGOUT                                                      │
│     └── Settings tab → Logout button                            │
│         └── Or auto-logout after idle timeout                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Detailed Sale Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                         SALE PROCESS                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐                                               │
│  │ CHECK SHIFT     │ ◄── Must have active shift before checkout    │
│  └────────┬────────┘                                               │
│           │                                                         │
│  ┌────────▼────────┐                                               │
│  │ SELECT PRODUCTS │ ◄── Tap product → Add to cart                 │
│  │ - Category tabs │     Weight items → Enter weight popup         │
│  │ - Search bar    │     Barcode scan → Auto-add product           │
│  │ - Product grid  │                                               │
│  └────────┬────────┘                                               │
│           │                                                         │
│  ┌────────▼────────┐                                               │
│  │ MODIFY CART     │ ◄── Change quantity (+/-)                     │
│  │ - Qty buttons   │     Remove items (trash icon)                 │
│  │ - Remove item   │     Clear entire cart                         │
│  └────────┬────────┘                                               │
│           │                                                         │
│  ┌────────▼────────┐     ┌──────────────────┐                      │
│  │ SELECT CUSTOMER │────►│ Customer Modal    │                      │
│  │ (Optional)      │     │ - Search by name  │                      │
│  └────────┬────────┘     │ - Phone/email     │                      │
│           │              │ - Barcode scan    │                      │
│           │              └──────────────────┘                      │
│  ┌────────▼────────┐                                               │
│  │ APPLY DISCOUNTS │ ◄── Select from list or custom discount       │
│  │ (Optional)      │     Multiple discounts supported              │
│  └────────┬────────┘                                               │
│           │                                                         │
│  ┌────────▼────────┐                                               │
│  │ USE POINTS      │ ◄── Enter points to redeem (if customer has)  │
│  │ (Optional)      │     Points convert to discount                │
│  └────────┬────────┘                                               │
│           │                                                         │
│  ┌────────▼────────┐                                               │
│  │ CHECKOUT        │ ◄── Click "Pay" button                        │
│  └────────┬────────┘                                               │
│           │                                                         │
│  ┌────────▼─────────────────────────────────────┐                  │
│  │           PAYMENT MODAL                       │                  │
│  │  ┌─────────────────────────────────────────┐ │                  │
│  │  │ Payment Methods:                         │ │                  │
│  │  │  💵 Cash    💳 Card    ₿ Crypto          │ │                  │
│  │  │  🏦 Transfer                             │ │                  │
│  │  └─────────────────────────────────────────┘ │                  │
│  │  ┌─────────────────────────────────────────┐ │                  │
│  │  │ If Cash:                                 │ │                  │
│  │  │  - Enter cash received amount           │ │                  │
│  │  │  - Quick amount buttons (exact, +10)    │ │                  │
│  │  │  - Calculate change automatically       │ │                  │
│  │  └─────────────────────────────────────────┘ │                  │
│  └────────┬─────────────────────────────────────┘                  │
│           │                                                         │
│  ┌────────▼────────┐                                               │
│  │ COMPLETE SALE   │ ◄── Save receipt to Firebase                  │
│  │ - Save receipt  │     Update stock levels                       │
│  │ - Update stock  │     Update customer points                    │
│  │ - Award points  │     Add to shift transactions                 │
│  │ - Update shift  │                                               │
│  └────────┬────────┘                                               │
│           │                                                         │
│  ┌────────▼────────┐                                               │
│  │ RECEIPT MODAL   │ ◄── Show order summary                        │
│  │ - Order summary │     Print receipt button                      │
│  │ - Print button  │     "New Sale" to continue                    │
│  │ - New Sale btn  │                                               │
│  └─────────────────┘                                               │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. POS Navigation Menu Structure

### 3.1 Sidebar Tabs

The POS interface has a **left sidebar** with these tabs (top to bottom):

```kotlin
enum class PosTab(val icon: String, val label: String) {
    SALES("shopping-cart", "Sales"),           // Main POS - default
    TICKETS("file-text", "Tickets"),           // Saved/parked orders
    CUSTOMERS("users", "Customers"),           // Customer management
    HISTORY("clock", "History"),               // Transaction history
    SHIFTS("briefcase", "Shifts"),             // Shift management
    PRODUCTS("package", "Products"),           // Product catalog
    KIOSK_ORDERS("smartphone", "Kiosk"),       // Kiosk orders panel
    EXPENSES("dollar-sign", "Expenses"),       // Expense tracking
    SETTINGS("settings", "Settings")           // App settings
}
```

### 3.2 Tab Layout Visual

```
┌────────────────────────────────────────────────────────────┐
│  ┌──────┐                                                  │
│  │ 🛒   │  ←── Sales (default active)                     │
│  ├──────┤                                                  │
│  │ 📄   │  ←── Tickets                                    │
│  ├──────┤                                                  │
│  │ 👥   │  ←── Customers                                  │
│  ├──────┤                                                  │
│  │ 🕐   │  ←── History                                    │
│  ├──────┤                                                  │
│  │ 💼   │  ←── Shifts                                     │
│  ├──────┤                                                  │
│  │ 📦   │  ←── Products                                   │
│  ├──────┤                                                  │
│  │ 📱   │  ←── Kiosk Orders                               │
│  ├──────┤                                                  │
│  │ 💰   │  ←── Expenses                                   │
│  ├──────┤                                                  │
│  │ ⚙️   │  ←── Settings                                   │
│  └──────┘                                                  │
│                                                            │
│  [Shift: Active]  ←── Shift status indicator              │
│  [End Shift]      ←── Quick end shift button              │
│                                                            │
│  [👤 Cashier Name] ←── Current cashier                    │
│  [Logout]         ←── Logout button                        │
└────────────────────────────────────────────────────────────┘
```

---

## 4. Technology Stack Mapping

### 4.1 Web → Android Mapping

| Web Technology   | Android Equivalent            |
| ---------------- | ----------------------------- |
| Next.js + React  | Jetpack Compose               |
| Zustand (state)  | ViewModel + StateFlow         |
| React Query      | Repository Pattern + Flow     |
| Firebase Web SDK | Firebase Android SDK          |
| IndexedDB        | Room Database                 |
| Tailwind CSS     | Material Design 3             |
| LocalStorage     | SharedPreferences / DataStore |

### 4.2 Recommended Android Stack

```kotlin
// build.gradle.kts (app level)
dependencies {
    // Jetpack Compose
    implementation("androidx.compose.ui:ui:1.6.0")
    implementation("androidx.compose.material3:material3:1.2.0")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation("androidx.navigation:navigation-compose:2.7.6")

    // ViewModel
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")

    // Firebase
    implementation(platform("com.google.firebase:firebase-bom:32.7.0"))
    implementation("com.google.firebase:firebase-firestore-ktx")
    implementation("com.google.firebase:firebase-auth-ktx")

    // Room (offline storage)
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    kapt("androidx.room:room-compiler:2.6.1")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    // DataStore (preferences)
    implementation("androidx.datastore:datastore-preferences:1.0.0")

    // Coil (image loading)
    implementation("io.coil-kt:coil-compose:2.5.0")

    // Barcode scanning
    implementation("com.google.mlkit:barcode-scanning:17.2.0")
}
```

---

## 5. Authentication - PIN Login

### 5.1 Login Flow

```
┌──────────────────────────────────────────────────────────┐
│                     PIN LOGIN SCREEN                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                    🍬 Candy Kush                         │
│                       POS                                │
│                                                          │
│                   ┌─────────────┐                        │
│                   │  ● ● ● ●   │  ←── PIN input dots    │
│                   └─────────────┘                        │
│                                                          │
│              ┌─────┬─────┬─────┐                        │
│              │  1  │  2  │  3  │                        │
│              ├─────┼─────┼─────┤                        │
│              │  4  │  5  │  6  │   ←── Number pad       │
│              ├─────┼─────┼─────┤                        │
│              │  7  │  8  │  9  │                        │
│              ├─────┼─────┼─────┤                        │
│              │  ⌫  │  0  │  ✓  │                        │
│              └─────┴─────┴─────┘                        │
│                                                          │
│              [Use Email Login Instead]                   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 5.2 PIN Authentication Logic

```kotlin
// AuthRepository.kt
class AuthRepository(
    private val firestore: FirebaseFirestore,
    private val auth: FirebaseAuth
) {
    suspend fun loginWithPin(pin: String): Result<CashierUser> {
        return try {
            // Query users collection for matching PIN
            val snapshot = firestore.collection("users")
                .whereEqualTo("pin", pin)
                .whereEqualTo("role", "cashier")
                .whereEqualTo("status", "active")
                .limit(1)
                .get()
                .await()

            if (snapshot.isEmpty) {
                Result.failure(Exception("Invalid PIN"))
            } else {
                val userDoc = snapshot.documents.first()
                val user = userDoc.toObject(CashierUser::class.java)
                    ?.copy(id = userDoc.id)

                // Get JWT token via API
                val token = getJwtToken(user!!.id)

                Result.success(user.copy(token = token))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun getJwtToken(userId: String): String {
        // Call your API to get JWT token
        val response = apiService.login(userId)
        return response.token
    }
}

// CashierUser.kt
data class CashierUser(
    val id: String = "",
    val name: String = "",
    val email: String = "",
    val pin: String = "",
    val role: String = "cashier",
    val status: String = "active",
    val token: String? = null,
    val permissions: CashierPermissions = CashierPermissions()
)

data class CashierPermissions(
    val canGiveDiscounts: Boolean = false,
    val maxDiscountPercentage: Double = 10.0,
    val maxDiscountAmount: Double = 50.0
)
```

### 5.3 Login Screen Composable

```kotlin
@Composable
fun PinLoginScreen(
    viewModel: AuthViewModel = hiltViewModel(),
    onLoginSuccess: (CashierUser) -> Unit
) {
    var pin by remember { mutableStateOf("") }
    val loginState by viewModel.loginState.collectAsState()

    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Logo
        Text("🍬 Candy Kush POS", style = MaterialTheme.typography.headlineLarge)

        Spacer(modifier = Modifier.height(32.dp))

        // PIN dots
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            repeat(4) { index ->
                Box(
                    modifier = Modifier
                        .size(20.dp)
                        .background(
                            color = if (index < pin.length)
                                MaterialTheme.colorScheme.primary
                            else
                                MaterialTheme.colorScheme.outline,
                            shape = CircleShape
                        )
                )
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        // Number pad
        NumberPad(
            onNumberClick = { number ->
                if (pin.length < 4) {
                    pin += number
                    if (pin.length == 4) {
                        viewModel.loginWithPin(pin)
                    }
                }
            },
            onBackspace = { pin = pin.dropLast(1) },
            onClear = { pin = "" }
        )

        // Error message
        if (loginState is LoginState.Error) {
            Text(
                text = (loginState as LoginState.Error).message,
                color = MaterialTheme.colorScheme.error
            )
        }

        // Loading indicator
        if (loginState is LoginState.Loading) {
            CircularProgressIndicator()
        }
    }

    LaunchedEffect(loginState) {
        if (loginState is LoginState.Success) {
            onLoginSuccess((loginState as LoginState.Success).user)
        }
    }
}
```

---

## 6. Sales Section (Main POS)

### 6.0 Complete POS Layout Structure (Header + Sidebar + Content)

**IMPORTANT:** The POS interface has 3 main components that wrap ALL sections:

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                              TOP HEADER BAR                                     │
│  🍬 Candy Kush POS    |    🔔 Notifications (2)    |    🖨️ Print Jobs    |  👤  │
│  [Shift: Active ✅]   |    📶 Online/Offline       |    🔄 Sync (3)           │
└────────────────────────────────────────────────────────────────────────────────┘
│                                                                                │
│  ┌────────────┬─────────────────────────────────────────────────────────────┐ │
│  │  SIDEBAR   │                    MAIN CONTENT AREA                        │ │
│  │            │              (Sales/Tickets/Customers/etc.)                 │ │
│  │  🛒 Sales  │                                                             │ │
│  │  📄 Tickets│                                                             │ │
│  │  👥 Cust.  │                                                             │ │
│  │  🕐 History│               Section-specific content here                 │ │
│  │  💼 Shifts │                                                             │ │
│  │  📦 Prod.  │                                                             │ │
│  │  📱 Kiosk  │                                                             │ │
│  │  💰 Expense│                                                             │ │
│  │  ⚙️ Settings│                                                            │ │
│  │            │                                                             │ │
│  │ ──────────│                                                             │ │
│  │ [End Shift]│                                                             │ │
│  │            │                                                             │ │
│  │ Jane Smith │                                                             │ │
│  │ [Logout]   │                                                             │ │
│  └────────────┴─────────────────────────────────────────────────────────────┘ │
```

### 6.0.1 Header Bar Implementation

```kotlin
// PosHeader.kt
@Composable
fun PosHeader(
    cashier: CashierUser,
    activeShift: Shift?,
    isOnline: Boolean,
    pendingSyncCount: Int,
    notificationCount: Int,
    onPrintJobsClick: () -> Unit,
    onNotificationsClick: () -> Unit,
    onSyncClick: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        tonalElevation = 4.dp,
        shadowElevation = 8.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(64.dp)
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Left side: Logo + Shift status
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Logo
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "🍬",
                        style = MaterialTheme.typography.headlineMedium
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(
                            text = "Candy Kush",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "POS System",
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }

                Divider(
                    modifier = Modifier
                        .height(32.dp)
                        .width(1.dp)
                )

                // Shift status indicator
                ShiftStatusBadge(activeShift)
            }

            // Right side: Action buttons
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Online/Offline status
                Badge(
                    containerColor = if (isOnline)
                        Color(0xFF4CAF50)
                    else
                        Color(0xFFF44336)
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = if (isOnline)
                                Icons.Default.Wifi
                            else
                                Icons.Default.WifiOff,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = if (isOnline) "Online" else "Offline",
                            style = MaterialTheme.typography.labelSmall
                        )
                    }
                }

                // Sync status
                if (pendingSyncCount > 0) {
                    BadgedBox(
                        badge = {
                            Badge { Text(pendingSyncCount.toString()) }
                        }
                    ) {
                        IconButton(onClick = onSyncClick) {
                            Icon(
                                imageVector = Icons.Default.Sync,
                                contentDescription = "Sync pending items"
                            )
                        }
                    }
                }

                // Notifications
                BadgedBox(
                    badge = {
                        if (notificationCount > 0) {
                            Badge { Text(notificationCount.toString()) }
                        }
                    }
                ) {
                    IconButton(onClick = onNotificationsClick) {
                        Icon(
                            imageVector = Icons.Default.Notifications,
                            contentDescription = "Notifications"
                        )
                    }
                }

                // Print jobs
                IconButton(onClick = onPrintJobsClick) {
                    Icon(
                        imageVector = Icons.Default.Print,
                        contentDescription = "Print jobs"
                    )
                }

                // Cashier profile
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .background(
                            color = MaterialTheme.colorScheme.primaryContainer,
                            shape = RoundedCornerShape(20.dp)
                        )
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = cashier.name,
                        style = MaterialTheme.typography.labelLarge
                    )
                }
            }
        }
    }
}

@Composable
fun ShiftStatusBadge(shift: Shift?) {
    if (shift != null && shift.status == ShiftStatus.ACTIVE) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .background(
                    color = Color(0xFF4CAF50).copy(alpha = 0.2f),
                    shape = RoundedCornerShape(8.dp)
                )
                .padding(horizontal = 12.dp, vertical = 6.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .background(Color(0xFF4CAF50), CircleShape)
            )
            Text(
                text = "Shift Active",
                style = MaterialTheme.typography.labelMedium,
                color = Color(0xFF2E7D32)
            )
            Text(
                text = "• ${formatDuration(shift.duration)}",
                style = MaterialTheme.typography.labelSmall
            )
        }
    } else {
        Text(
            text = "⚠️ No Active Shift",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.error
        )
    }
}
```

### 6.0.2 Sidebar Navigation Implementation

```kotlin
// PosSidebar.kt
@Composable
fun PosSidebar(
    selectedTab: PosTab,
    activeShift: Shift?,
    cashier: CashierUser,
    onTabSelected: (PosTab) -> Unit,
    onEndShift: () -> Unit,
    onLogout: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxHeight()
            .width(200.dp),
        tonalElevation = 2.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(vertical = 8.dp)
        ) {
            // Navigation tabs
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                PosTab.values().forEach { tab ->
                    SidebarItem(
                        tab = tab,
                        isSelected = selectedTab == tab,
                        onClick = { onTabSelected(tab) }
                    )
                }
            }

            Divider(modifier = Modifier.padding(horizontal = 8.dp))

            Spacer(modifier = Modifier.height(8.dp))

            // End shift button (only if shift is active)
            if (activeShift != null && activeShift.status == ShiftStatus.ACTIVE) {
                Button(
                    onClick = onEndShift,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer,
                        contentColor = MaterialTheme.colorScheme.onErrorContainer
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.Stop,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("End Shift")
                }

                Spacer(modifier = Modifier.height(8.dp))
            }

            // Cashier info + Logout
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        shape = RoundedCornerShape(8.dp)
                    )
                    .padding(12.dp)
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        modifier = Modifier.size(24.dp)
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = cashier.name,
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = "Cashier",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedButton(
                    onClick = onLogout,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.Logout,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Logout")
                }
            }
        }
    }
}

@Composable
fun SidebarItem(
    tab: PosTab,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val icon = when (tab) {
        PosTab.SALES -> Icons.Default.ShoppingCart
        PosTab.TICKETS -> Icons.Default.Description
        PosTab.CUSTOMERS -> Icons.Default.People
        PosTab.HISTORY -> Icons.Default.History
        PosTab.SHIFTS -> Icons.Default.Work
        PosTab.PRODUCTS -> Icons.Default.Inventory
        PosTab.KIOSK_ORDERS -> Icons.Default.PhoneAndroid
        PosTab.EXPENSES -> Icons.Default.AttachMoney
        PosTab.SETTINGS -> Icons.Default.Settings
    }

    Surface(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp),
        shape = RoundedCornerShape(8.dp),
        color = if (isSelected)
            MaterialTheme.colorScheme.primaryContainer
        else
            Color.Transparent
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(24.dp),
                tint = if (isSelected)
                    MaterialTheme.colorScheme.onPrimaryContainer
                else
                    MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = tab.label,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                color = if (isSelected)
                    MaterialTheme.colorScheme.onPrimaryContainer
                else
                    MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
```

### 6.0.3 Main POS Screen with Layout

```kotlin
// PosScreen.kt - Main container that holds header, sidebar, and content
@Composable
fun PosScreen(
    viewModel: PosViewModel = hiltViewModel(),
    onLogout: () -> Unit
) {
    val selectedTab by viewModel.selectedTab.collectAsState()
    val activeShift by viewModel.activeShift.collectAsState()
    val cashier by viewModel.cashier.collectAsState()
    val isOnline by viewModel.isOnline.collectAsState()
    val pendingSyncCount by viewModel.pendingSyncCount.collectAsState()

    Scaffold(
        topBar = {
            if (cashier != null) {
                PosHeader(
                    cashier = cashier!!,
                    activeShift = activeShift,
                    isOnline = isOnline,
                    pendingSyncCount = pendingSyncCount,
                    notificationCount = 0,
                    onPrintJobsClick = { viewModel.openPrintJobs() },
                    onNotificationsClick = { viewModel.openNotifications() },
                    onSyncClick = { viewModel.syncNow() }
                )
            }
        }
    ) { paddingValues ->
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Left sidebar
            if (cashier != null) {
                PosSidebar(
                    selectedTab = selectedTab,
                    activeShift = activeShift,
                    cashier = cashier!!,
                    onTabSelected = { viewModel.selectTab(it) },
                    onEndShift = { viewModel.showEndShiftDialog() },
                    onLogout = onLogout
                )
            }

            // Main content area (changes based on selected tab)
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f)
            ) {
                when (selectedTab) {
                    PosTab.SALES -> SalesSection(cashier = cashier)
                    PosTab.TICKETS -> TicketsSection()
                    PosTab.CUSTOMERS -> CustomersSection()
                    PosTab.HISTORY -> HistorySection()
                    PosTab.SHIFTS -> ShiftsSection()
                    PosTab.PRODUCTS -> ProductsSection()
                    PosTab.KIOSK_ORDERS -> KioskOrdersSection()
                    PosTab.EXPENSES -> ExpensesSection(cashier = cashier)
                    PosTab.SETTINGS -> SettingsSection()
                }
            }
        }
    }
}
```

### 6.0.4 Bottom Navigation Bar for Custom Tabs

The bottom bar allows cashiers to quickly switch between custom product category tabs for faster access in the Sales section.

**Visual Layout:**

```
┌────────────────────────────────────────────────────────────────┐
│                    BOTTOM NAVIGATION BAR                        │
├────────────────────────────────────────────────────────────────┤
│  [All] [Flowers] [Edibles] [Vapes] [Drinks] [+] [⚙️]          │
│   ▔▔▔    (selected - underline indicator)                      │
└────────────────────────────────────────────────────────────────┘
```

**Features:**

- **Scrollable Tabs**: Horizontally scrollable when many custom tabs
- **"All" Tab**: Always present, shows all products
- **Custom Category Tabs**: Created by cashier/admin (e.g., "Flowers", "Edibles")
- **Add Tab Button (+)**: Create new custom category filter
- **Settings Button (⚙️)**: Edit/reorder/delete custom tabs
- **Active Indicator**: Underline and bold text for selected tab
- **Persistent**: Stays at bottom of Sales section only

```kotlin
// CustomTab.kt - Data model for custom category tabs
data class CustomTab(
    val id: String = UUID.randomUUID().toString(),
    val label: String,
    val categoryIds: List<String> = emptyList(), // Empty = All products
    val color: Color = Color.Blue,
    val icon: String? = null,
    val order: Int = 0,
    val isDefault: Boolean = false // "All" tab is default
)

// PosBottomBar.kt - Bottom navigation for custom tabs
@Composable
fun PosBottomBar(
    customTabs: List<CustomTab>,
    selectedTabId: String,
    onTabSelected: (String) -> Unit,
    onAddTab: () -> Unit,
    onManageTabs: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surfaceVariant,
        tonalElevation = 3.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
                .padding(horizontal = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Scrollable tabs area
            LazyRow(
                modifier = Modifier.weight(1f),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                items(customTabs) { tab ->
                    CustomTabChip(
                        tab = tab,
                        isSelected = tab.id == selectedTabId,
                        onClick = { onTabSelected(tab.id) }
                    )
                }
            }

            // Add tab button
            IconButton(
                onClick = onAddTab,
                modifier = Modifier.size(40.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = "Add Custom Tab",
                    tint = MaterialTheme.colorScheme.primary
                )
            }

            // Manage tabs button
            IconButton(
                onClick = onManageTabs,
                modifier = Modifier.size(40.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Settings,
                    contentDescription = "Manage Tabs",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
fun CustomTabChip(
    tab: CustomTab,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .background(
                color = if (isSelected)
                    MaterialTheme.colorScheme.primaryContainer
                else
                    Color.Transparent
            )
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Optional icon
            tab.icon?.let { iconName ->
                Icon(
                    imageVector = getIconForName(iconName),
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                    tint = if (isSelected)
                        MaterialTheme.colorScheme.onPrimaryContainer
                    else
                        MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Text(
                text = tab.label,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                color = if (isSelected)
                    MaterialTheme.colorScheme.onPrimaryContainer
                else
                    MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        // Active indicator
        if (isSelected) {
            Spacer(modifier = Modifier.height(4.dp))
            Box(
                modifier = Modifier
                    .width(32.dp)
                    .height(3.dp)
                    .background(
                        color = MaterialTheme.colorScheme.primary,
                        shape = RoundedCornerShape(2.dp)
                    )
            )
        }
    }
}

// CustomTabViewModel.kt - Manages custom tabs state
@HiltViewModel
class CustomTabViewModel @Inject constructor(
    private val customTabRepository: CustomTabRepository
) : ViewModel() {

    private val _customTabs = MutableStateFlow<List<CustomTab>>(emptyList())
    val customTabs: StateFlow<List<CustomTab>> = _customTabs.asStateFlow()

    private val _selectedTabId = MutableStateFlow("all")
    val selectedTabId: StateFlow<String> = _selectedTabId.asStateFlow()

    init {
        loadCustomTabs()
    }

    private fun loadCustomTabs() {
        viewModelScope.launch {
            customTabRepository.getAllTabs().collect { tabs ->
                // Always include "All" tab at the beginning
                val allTab = CustomTab(
                    id = "all",
                    label = "All",
                    categoryIds = emptyList(),
                    isDefault = true,
                    order = -1
                )
                _customTabs.value = listOf(allTab) + tabs.sortedBy { it.order }
            }
        }
    }

    fun selectTab(tabId: String) {
        _selectedTabId.value = tabId
    }

    fun addCustomTab(label: String, categoryIds: List<String>, icon: String? = null) {
        viewModelScope.launch {
            val newTab = CustomTab(
                label = label,
                categoryIds = categoryIds,
                icon = icon,
                order = _customTabs.value.size
            )
            customTabRepository.insertTab(newTab)
        }
    }

    fun updateTab(tab: CustomTab) {
        viewModelScope.launch {
            customTabRepository.updateTab(tab)
        }
    }

    fun deleteTab(tabId: String) {
        viewModelScope.launch {
            customTabRepository.deleteTab(tabId)
        }
    }

    fun reorderTabs(tabs: List<CustomTab>) {
        viewModelScope.launch {
            tabs.forEachIndexed { index, tab ->
                customTabRepository.updateTab(tab.copy(order = index))
            }
        }
    }

    fun getFilteredCategoryIds(): List<String> {
        val selectedTab = _customTabs.value.find { it.id == _selectedTabId.value }
        return selectedTab?.categoryIds ?: emptyList()
    }
}

// AddCustomTabDialog.kt - Dialog to create new custom tab
@Composable
fun AddCustomTabDialog(
    categories: List<Category>,
    onDismiss: () -> Unit,
    onConfirm: (label: String, categoryIds: List<String>, icon: String?) -> Unit
) {
    var label by remember { mutableStateOf("") }
    var selectedCategories by remember { mutableStateOf(setOf<String>()) }
    var selectedIcon by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Create Custom Tab") },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Tab label input
                OutlinedTextField(
                    value = label,
                    onValueChange = { label = it },
                    label = { Text("Tab Name") },
                    placeholder = { Text("e.g., Best Sellers") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Text(
                    text = "Select Categories",
                    style = MaterialTheme.typography.titleSmall
                )

                // Category checkboxes
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                ) {
                    items(categories) { category ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    selectedCategories = if (category.id in selectedCategories) {
                                        selectedCategories - category.id
                                    } else {
                                        selectedCategories + category.id
                                    }
                                }
                                .padding(vertical = 4.dp)
                        ) {
                            Checkbox(
                                checked = category.id in selectedCategories,
                                onCheckedChange = null
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(category.name)
                        }
                    }
                }

                // Icon selection (optional)
                Text(
                    text = "Icon (Optional)",
                    style = MaterialTheme.typography.titleSmall
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf("🌿", "🍪", "💨", "🥤", "⭐", "🔥").forEach { emoji ->
                        IconButton(
                            onClick = { selectedIcon = emoji },
                            modifier = Modifier
                                .size(40.dp)
                                .border(
                                    width = 2.dp,
                                    color = if (selectedIcon == emoji)
                                        MaterialTheme.colorScheme.primary
                                    else
                                        Color.Transparent,
                                    shape = RoundedCornerShape(8.dp)
                                )
                        ) {
                            Text(emoji, fontSize = 20.sp)
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    if (label.isNotBlank() && selectedCategories.isNotEmpty()) {
                        onConfirm(label, selectedCategories.toList(), selectedIcon)
                        onDismiss()
                    }
                },
                enabled = label.isNotBlank() && selectedCategories.isNotEmpty()
            ) {
                Text("Create")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

// ManageTabsDialog.kt - Dialog to edit/reorder/delete custom tabs
@Composable
fun ManageTabsDialog(
    customTabs: List<CustomTab>,
    onDismiss: () -> Unit,
    onReorder: (List<CustomTab>) -> Unit,
    onDelete: (String) -> Unit
) {
    var tabs by remember { mutableStateOf(customTabs.filter { !it.isDefault }) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Manage Custom Tabs") },
        text = {
            Column {
                if (tabs.isEmpty()) {
                    Text("No custom tabs created yet")
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(300.dp)
                    ) {
                        itemsIndexed(tabs) { index, tab ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Drag handle (for reordering)
                                Icon(
                                    imageVector = Icons.Default.Menu,
                                    contentDescription = "Drag to reorder",
                                    modifier = Modifier.size(20.dp)
                                )

                                // Tab info
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = tab.label,
                                        style = MaterialTheme.typography.bodyLarge,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = "${tab.categoryIds.size} categories",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }

                                // Delete button
                                IconButton(
                                    onClick = {
                                        onDelete(tab.id)
                                        tabs = tabs.filterNot { it.id == tab.id }
                                    }
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Delete,
                                        contentDescription = "Delete",
                                        tint = MaterialTheme.colorScheme.error
                                    )
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    onReorder(tabs)
                    onDismiss()
                }
            ) {
                Text("Done")
            }
        }
    )
}
```

**Usage in Sales Section:**

```kotlin
@Composable
fun SalesSection(
    cashier: Cashier?,
    customTabViewModel: CustomTabViewModel = hiltViewModel()
) {
    val customTabs by customTabViewModel.customTabs.collectAsState()
    val selectedTabId by customTabViewModel.selectedTabId.collectAsState()
    var showAddTabDialog by remember { mutableStateOf(false) }
    var showManageTabsDialog by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize()) {
        // Main sales content (product grid + cart)
        Box(modifier = Modifier.weight(1f)) {
            // ... existing sales section content ...
        }

        // Bottom navigation bar for custom tabs
        PosBottomBar(
            customTabs = customTabs,
            selectedTabId = selectedTabId,
            onTabSelected = { customTabViewModel.selectTab(it) },
            onAddTab = { showAddTabDialog = true },
            onManageTabs = { showManageTabsDialog = true }
        )
    }

    // Dialogs
    if (showAddTabDialog) {
        AddCustomTabDialog(
            categories = categoriesList, // Get from CategoryViewModel
            onDismiss = { showAddTabDialog = false },
            onConfirm = { label, categoryIds, icon ->
                customTabViewModel.addCustomTab(label, categoryIds, icon)
            }
        )
    }

    if (showManageTabsDialog) {
        ManageTabsDialog(
            customTabs = customTabs,
            onDismiss = { showManageTabsDialog = false },
            onReorder = { customTabViewModel.reorderTabs(it) },
            onDelete = { customTabViewModel.deleteTab(it) }
        )
    }
}
```

**Room Database Entity:**

```kotlin
@Entity(tableName = "custom_tabs")
data class CustomTabEntity(
    @PrimaryKey val id: String,
    val label: String,
    val categoryIds: String, // JSON array stored as string
    val color: String,
    val icon: String?,
    val order: Int,
    val isDefault: Boolean,
    val createdAt: Long,
    val updatedAt: Long
)

@Dao
interface CustomTabDao {
    @Query("SELECT * FROM custom_tabs ORDER BY `order` ASC")
    fun getAllTabs(): Flow<List<CustomTabEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTab(tab: CustomTabEntity)

    @Update
    suspend fun updateTab(tab: CustomTabEntity)

    @Delete
    suspend fun deleteTab(tab: CustomTabEntity)

    @Query("DELETE FROM custom_tabs WHERE id = :tabId")
    suspend fun deleteTabById(tabId: String)
}
```

---

### 6.1 Sales Section Screen Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           SALES SECTION                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────┐  ┌────────────────────────┐ │
│  │         PRODUCT AREA (Left 60%)         │  │   CART AREA (Right)    │ │
│  │                                         │  │                        │ │
│  │  ┌──────────────────────────────────┐  │  │  ┌──────────────────┐  │ │
│  │  │ 🔍 Search products...            │  │  │  │ 👤 Add Customer  │  │ │
│  │  └──────────────────────────────────┘  │  │  └──────────────────┘  │ │
│  │                                         │  │                        │ │
│  │  ┌──────────────────────────────────┐  │  │  ┌──────────────────┐  │ │
│  │  │ All │ Cat1 │ Cat2 │ Cat3 │ + Tab │  │  │  │ Product 1   $10 │  │ │
│  │  └──────────────────────────────────┘  │  │  │ [-] 2 [+]   $20 │  │ │
│  │                                         │  │  ├──────────────────┤  │ │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │  │  │ Product 2   $15 │  │ │
│  │  │Prod1│ │Prod2│ │Prod3│ │Prod4│      │  │  │ [-] 1 [+]   $15 │  │ │
│  │  │ $10 │ │ $15 │ │ $20 │ │ $25 │      │  │  └──────────────────┘  │ │
│  │  └─────┘ └─────┘ └─────┘ └─────┘      │  │                        │ │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │  │  ┌──────────────────┐  │ │
│  │  │Prod5│ │Prod6│ │Prod7│ │Prod8│      │  │  │ 🏷️ Discounts    │  │ │
│  │  │ $30 │ │ $12 │ │ $18 │ │ $22 │      │  │  └──────────────────┘  │ │
│  │  └─────┘ └─────┘ └─────┘ └─────┘      │  │                        │ │
│  │                                         │  │  ────────────────────  │ │
│  │  ... more products ...                  │  │  Subtotal:      $35   │ │
│  │                                         │  │  Discount:      -$5   │ │
│  │                                         │  │  Points Used:   -$2   │ │
│  │                                         │  │  ────────────────────  │ │
│  │                                         │  │  TOTAL:        $28   │ │
│  │                                         │  │                        │ │
│  │                                         │  │  ┌──────┐ ┌─────────┐ │ │
│  │                                         │  │  │ Save │ │   PAY   │ │ │
│  │                                         │  │  │Ticket│ │  $28    │ │ │
│  │                                         │  │  └──────┘ └─────────┘ │ │
│  └─────────────────────────────────────────┘  └────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Cart State Management

```kotlin
// CartStore.kt - Equivalent to useCartStore.js
data class CartItem(
    val id: String = UUID.randomUUID().toString(),
    val productId: String,
    val name: String,
    val price: Double,
    val quantity: Double,  // Double for weight-based items
    val categoryId: String? = null,
    val sku: String? = null,
    val imageUrl: String? = null,
    val isSoldByWeight: Boolean = false
) {
    val total: Double get() = price * quantity
}

data class CartDiscount(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val type: DiscountType,  // PERCENTAGE or AMOUNT
    val value: Double,
    val isCustom: Boolean = false
)

enum class DiscountType { PERCENTAGE, AMOUNT }

data class CartState(
    val items: List<CartItem> = emptyList(),
    val customer: Customer? = null,
    val discounts: List<CartDiscount> = emptyList(),
    val kioskOrderId: String? = null  // If loaded from kiosk
) {
    val subtotal: Double get() = items.sumOf { it.total }

    val discountAmount: Double get() {
        var totalDiscount = 0.0
        for (discount in discounts) {
            when (discount.type) {
                DiscountType.PERCENTAGE -> {
                    totalDiscount += subtotal * (discount.value / 100)
                }
                DiscountType.AMOUNT -> {
                    totalDiscount += discount.value
                }
            }
        }
        return minOf(totalDiscount, subtotal)  // Can't exceed subtotal
    }

    val total: Double get() = subtotal - discountAmount

    val itemCount: Int get() = items.sumOf { it.quantity.toInt() }
}

// CartViewModel.kt
@HiltViewModel
class CartViewModel @Inject constructor(
    private val productRepository: ProductRepository
) : ViewModel() {

    private val _cartState = MutableStateFlow(CartState())
    val cartState: StateFlow<CartState> = _cartState.asStateFlow()

    fun addItem(product: Product, quantity: Double = 1.0) {
        val currentItems = _cartState.value.items.toMutableList()

        // Check if product already in cart
        val existingIndex = currentItems.indexOfFirst { it.productId == product.id }

        if (existingIndex >= 0) {
            // Update quantity
            val existing = currentItems[existingIndex]
            currentItems[existingIndex] = existing.copy(
                quantity = existing.quantity + quantity
            )
        } else {
            // Add new item
            currentItems.add(CartItem(
                productId = product.id,
                name = product.name,
                price = product.price,
                quantity = quantity,
                categoryId = product.categoryId,
                sku = product.sku,
                imageUrl = product.imageUrl,
                isSoldByWeight = product.soldByWeight
            ))
        }

        _cartState.value = _cartState.value.copy(items = currentItems)
    }

    fun updateQuantity(itemId: String, newQuantity: Double) {
        if (newQuantity <= 0) {
            removeItem(itemId)
            return
        }

        val updatedItems = _cartState.value.items.map {
            if (it.id == itemId) it.copy(quantity = newQuantity) else it
        }
        _cartState.value = _cartState.value.copy(items = updatedItems)
    }

    fun removeItem(itemId: String) {
        val updatedItems = _cartState.value.items.filter { it.id != itemId }
        _cartState.value = _cartState.value.copy(items = updatedItems)
    }

    fun setCustomer(customer: Customer?) {
        _cartState.value = _cartState.value.copy(customer = customer)
    }

    fun addDiscount(discount: CartDiscount) {
        val updatedDiscounts = _cartState.value.discounts + discount
        _cartState.value = _cartState.value.copy(discounts = updatedDiscounts)
    }

    fun removeDiscount(discountId: String) {
        val updatedDiscounts = _cartState.value.discounts.filter { it.id != discountId }
        _cartState.value = _cartState.value.copy(discounts = updatedDiscounts)
    }

    fun clearDiscounts() {
        _cartState.value = _cartState.value.copy(discounts = emptyList())
    }

    fun clearCart() {
        _cartState.value = CartState()
    }

    fun loadFromKioskOrder(kioskOrder: KioskOrder) {
        val cartItems = kioskOrder.items.map { item ->
            CartItem(
                productId = item.productId,
                name = item.name,
                price = item.price,
                quantity = item.quantity.toDouble(),
                categoryId = item.categoryId
            )
        }
        _cartState.value = CartState(
            items = cartItems,
            kioskOrderId = kioskOrder.id
        )
    }
}
```

### 6.3 Payment Modal

```kotlin
// PaymentMethod.kt
enum class PaymentMethod(val displayName: String, val icon: String) {
    CASH("Cash", "💵"),
    CARD("Card", "💳"),
    CRYPTO("Crypto", "₿"),
    TRANSFER("Transfer", "🏦")
}

// PaymentModal.kt
@Composable
fun PaymentModal(
    cartState: CartState,
    pointsToUse: Int,
    pointValue: Double,
    onDismiss: () -> Unit,
    onComplete: (PaymentMethod, Double?) -> Unit
) {
    var selectedMethod by remember { mutableStateOf(PaymentMethod.CASH) }
    var cashReceived by remember { mutableStateOf("") }

    val total = cartState.total - (pointsToUse * pointValue)
    val cashAmount = cashReceived.toDoubleOrNull() ?: 0.0
    val change = if (selectedMethod == PaymentMethod.CASH) cashAmount - total else 0.0

    Dialog(onDismissRequest = onDismiss) {
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Payment", style = MaterialTheme.typography.headlineSmall)

                Spacer(modifier = Modifier.height(16.dp))

                // Payment method selection
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    PaymentMethod.values().forEach { method ->
                        FilterChip(
                            selected = selectedMethod == method,
                            onClick = { selectedMethod = method },
                            label = { Text("${method.icon} ${method.displayName}") }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Total display
                Text(
                    text = "Total: $${String.format("%.2f", total)}",
                    style = MaterialTheme.typography.headlineMedium
                )

                // Cash input (only for cash payment)
                if (selectedMethod == PaymentMethod.CASH) {
                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = cashReceived,
                        onValueChange = { cashReceived = it },
                        label = { Text("Cash Received") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Quick amount buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(onClick = { cashReceived = total.toString() }) {
                            Text("Exact")
                        }
                        listOf(10, 20, 50, 100).forEach { amount ->
                            val newAmount = (Math.ceil(total / amount) * amount).toInt()
                            Button(onClick = { cashReceived = newAmount.toString() }) {
                                Text("$$newAmount")
                            }
                        }
                    }

                    // Change display
                    if (cashAmount >= total) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Change: $${String.format("%.2f", change)}",
                            style = MaterialTheme.typography.titleLarge,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Complete button
                Button(
                    onClick = {
                        onComplete(
                            selectedMethod,
                            if (selectedMethod == PaymentMethod.CASH) cashAmount else null
                        )
                    },
                    enabled = selectedMethod != PaymentMethod.CASH || cashAmount >= total,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Complete Payment")
                }
            }
        }
    }
}
```

### 6.4 Product Grid

```kotlin
@Composable
fun ProductGrid(
    products: List<Product>,
    onProductClick: (Product) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize = 120.dp),
        contentPadding = PaddingValues(8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        modifier = modifier
    ) {
        items(products, key = { it.id }) { product ->
            ProductCard(
                product = product,
                onClick = { onProductClick(product) }
            )
        }
    }
}

@Composable
fun ProductCard(
    product: Product,
    onClick: () -> Unit
) {
    val isOutOfStock = product.trackStock && product.stock <= 0

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .clickable(enabled = !isOutOfStock) { onClick() },
        colors = CardDefaults.cardColors(
            containerColor = if (isOutOfStock)
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            else
                MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Product image
            if (product.imageUrl != null) {
                AsyncImage(
                    model = product.imageUrl,
                    contentDescription = product.name,
                    modifier = Modifier
                        .size(60.dp)
                        .clip(RoundedCornerShape(8.dp)),
                    contentScale = ContentScale.Crop
                )
            } else {
                // Color indicator or placeholder
                Box(
                    modifier = Modifier
                        .size(60.dp)
                        .background(
                            color = product.color?.toComposeColor()
                                ?: MaterialTheme.colorScheme.primaryContainer,
                            shape = RoundedCornerShape(8.dp)
                        )
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = product.name,
                style = MaterialTheme.typography.bodySmall,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center
            )

            Text(
                text = "$${String.format("%.2f", product.price)}",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )

            // Stock indicator
            if (product.trackStock) {
                Text(
                    text = if (isOutOfStock) "Out of Stock" else "Stock: ${product.stock}",
                    style = MaterialTheme.typography.labelSmall,
                    color = if (isOutOfStock)
                        MaterialTheme.colorScheme.error
                    else
                        MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
```

### 6.5 Category Tabs

```kotlin
@Composable
fun CategoryTabs(
    categories: List<Category>,
    selectedCategory: String?,
    customTabs: List<String>,
    onCategorySelect: (String?) -> Unit,
    onAddTab: () -> Unit
) {
    ScrollableTabRow(
        selectedTabIndex = categories.indexOfFirst { it.name == selectedCategory }
            .takeIf { it >= 0 } ?: 0
    ) {
        // "All" tab
        Tab(
            selected = selectedCategory == null,
            onClick = { onCategorySelect(null) },
            text = { Text("All") }
        )

        // Custom tabs (user-defined)
        customTabs.forEach { tabName ->
            Tab(
                selected = selectedCategory == tabName,
                onClick = { onCategorySelect(tabName) },
                text = { Text(tabName) }
            )
        }

        // Category tabs
        categories.forEach { category ->
            Tab(
                selected = selectedCategory == category.name,
                onClick = { onCategorySelect(category.name) },
                text = { Text(category.name) }
            )
        }

        // Add tab button
        IconButton(onClick = onAddTab) {
            Icon(Icons.Default.Add, contentDescription = "Add Tab")
        }
    }
}
```

---

## 7. Tickets Section

### 7.1 Purpose

Save/park orders to resume later. Useful when customer needs to get more items or payment is delayed.

### 7.2 Screen Layout

```
┌────────────────────────────────────────────────────────────┐
│                    TICKETS SECTION                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  🔍 Search by ticket # or customer...                      │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Ticket #T1706961234567                                │ │
│  │ Customer: John Doe                                    │ │
│  │ Items: 5 | Total: $125.50                            │ │
│  │ Saved: 10 mins ago                                    │ │
│  │                                                       │ │
│  │ [Resume]  [Delete]                                    │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Ticket #T1706961234568                                │ │
│  │ Customer: Walk-in                                     │ │
│  │ Items: 2 | Total: $45.00                             │ │
│  │ Saved: 25 mins ago                                    │ │
│  │                                                       │ │
│  │ [Resume]  [Delete]                                    │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 7.3 Ticket Data Model

```kotlin
data class Ticket(
    val id: String = "",
    val ticketNumber: String = "",
    val userId: String = "",            // Cashier who created
    val customerId: String? = null,
    val customerName: String? = null,
    val items: List<TicketItem> = emptyList(),
    val subtotal: Double = 0.0,
    val discount: Double = 0.0,
    val total: Double = 0.0,
    val status: TicketStatus = TicketStatus.PARKED,
    val createdAt: Timestamp = Timestamp.now(),
    val updatedAt: Timestamp = Timestamp.now()
)

data class TicketItem(
    val productId: String,
    val name: String,
    val price: Double,
    val quantity: Double,
    val categoryId: String? = null
)

enum class TicketStatus {
    PARKED,     // Saved, waiting to be resumed
    RESUMED,    // Loaded back to cart
    COMPLETED,  // Converted to sale
    CANCELLED   // Deleted/voided
}
```

### 7.4 Ticket Operations

```kotlin
@HiltViewModel
class TicketsViewModel @Inject constructor(
    private val ticketRepository: TicketRepository,
    private val cartViewModel: CartViewModel
) : ViewModel() {

    private val _tickets = MutableStateFlow<List<Ticket>>(emptyList())
    val tickets: StateFlow<List<Ticket>> = _tickets.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    val filteredTickets: StateFlow<List<Ticket>> = combine(
        _tickets,
        _searchQuery
    ) { tickets, query ->
        if (query.isBlank()) {
            tickets
        } else {
            tickets.filter {
                it.ticketNumber.contains(query, ignoreCase = true) ||
                it.customerName?.contains(query, ignoreCase = true) == true
            }
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(), emptyList())

    init {
        loadTickets()
    }

    private fun loadTickets() {
        viewModelScope.launch {
            ticketRepository.getParkedTickets()
                .collect { _tickets.value = it }
        }
    }

    fun resumeTicket(ticket: Ticket) {
        viewModelScope.launch {
            // Load ticket items to cart
            cartViewModel.clearCart()
            ticket.items.forEach { item ->
                cartViewModel.addItem(
                    Product(
                        id = item.productId,
                        name = item.name,
                        price = item.price,
                        categoryId = item.categoryId
                    ),
                    item.quantity
                )
            }

            // Set customer if exists
            if (ticket.customerId != null) {
                // Fetch customer and set
                val customer = customerRepository.getById(ticket.customerId)
                cartViewModel.setCustomer(customer)
            }

            // Mark ticket as resumed
            ticketRepository.updateStatus(ticket.id, TicketStatus.RESUMED)
        }
    }

    fun deleteTicket(ticketId: String) {
        viewModelScope.launch {
            ticketRepository.updateStatus(ticketId, TicketStatus.CANCELLED)
        }
    }

    fun createTicket(cartState: CartState, cashierId: String): String {
        val ticketNumber = "T${System.currentTimeMillis()}"

        val ticket = Ticket(
            ticketNumber = ticketNumber,
            userId = cashierId,
            customerId = cartState.customer?.id,
            customerName = cartState.customer?.name,
            items = cartState.items.map { item ->
                TicketItem(
                    productId = item.productId,
                    name = item.name,
                    price = item.price,
                    quantity = item.quantity,
                    categoryId = item.categoryId
                )
            },
            subtotal = cartState.subtotal,
            discount = cartState.discountAmount,
            total = cartState.total
        )

        viewModelScope.launch {
            ticketRepository.create(ticket)
        }

        return ticketNumber
    }
}
```

---

## 8. Customers Section

### 8.1 Screen Layout

```
┌────────────────────────────────────────────────────────────┐
│                   CUSTOMERS SECTION                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  🔍 Search customers...                [+ Add Customer]    │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 👤 John Doe                              ⭐ 150 pts   │ │
│  │ 📧 john@email.com                                     │ │
│  │ 📱 +1 234 567 890                                     │ │
│  │ 🎂 Expires: Mar 15, 2026                             │ │
│  │ 🛒 12 visits | Total: $1,234.50                      │ │
│  │                                                       │ │
│  │ [Select]  [Edit]  [View History]                     │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 👤 Jane Smith                            ⭐ 75 pts    │ │
│  │ 📧 jane@email.com                        ⚠️ Expiring │ │
│  │ 📱 +1 234 567 891                                     │ │
│  │                                                       │ │
│  │ [Select]  [Edit]  [View History]                     │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 8.2 Customer Data Model

```kotlin
data class Customer(
    val id: String = "",
    val name: String = "",
    val email: String? = null,
    val phone: String? = null,
    val memberId: String? = null,        // Unique member code for scanning
    val address: String? = null,
    val notes: String? = null,

    // Membership
    val isMember: Boolean = true,
    val isNoMember: Boolean = false,     // Walk-in customer flag
    val expiryDate: Timestamp? = null,   // Membership expiry

    // Points system (NEW - pointList based)
    val pointList: List<PointEntry> = emptyList(),

    // Statistics
    val visits: Int = 0,
    val totalSpent: Double = 0.0,
    val lastVisit: Timestamp? = null,

    // Metadata
    val createdAt: Timestamp = Timestamp.now(),
    val updatedAt: Timestamp = Timestamp.now()
) {
    // Calculate total points from pointList
    val totalPoints: Int get() = pointList.sumOf { it.amount }

    // Check if membership expired
    val isExpired: Boolean get() {
        val expiry = expiryDate?.toDate() ?: return false
        return expiry.before(Date())
    }

    // Check if expiring within 30 days
    val isExpiringSoon: Boolean get() {
        val expiry = expiryDate?.toDate() ?: return false
        val thirtyDaysFromNow = Calendar.getInstance().apply {
            add(Calendar.DAY_OF_MONTH, 30)
        }.time
        return expiry.before(thirtyDaysFromNow) && !isExpired
    }
}

data class PointEntry(
    val id: String = "",
    val type: PointType,           // EARNED or USED
    val amount: Int,               // Positive for earned, negative for used
    val orderNumber: String? = null,
    val receiptId: String? = null,
    val valueRedeemed: Double? = null,  // If used, the $ value
    val breakdown: List<PointBreakdown>? = null,  // If earned, per-item breakdown
    val createdAt: Timestamp = Timestamp.now()
)

enum class PointType { EARNED, USED }

data class PointBreakdown(
    val itemId: String,
    val itemName: String,
    val points: Int,
    val ruleApplied: String?
)
```

### 8.3 Customer Form

```kotlin
@Composable
fun CustomerForm(
    customer: Customer?,
    onSave: (Customer) -> Unit,
    onCancel: () -> Unit
) {
    var name by remember { mutableStateOf(customer?.name ?: "") }
    var email by remember { mutableStateOf(customer?.email ?: "") }
    var phone by remember { mutableStateOf(customer?.phone ?: "") }
    var memberId by remember { mutableStateOf(customer?.memberId ?: "") }
    var expiryDate by remember { mutableStateOf(customer?.expiryDate?.toDate()) }
    var notes by remember { mutableStateOf(customer?.notes ?: "") }

    Column(modifier = Modifier.padding(16.dp)) {
        Text(
            text = if (customer == null) "Add Customer" else "Edit Customer",
            style = MaterialTheme.typography.headlineSmall
        )

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = name,
            onValueChange = { name = it },
            label = { Text("Name *") },
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = phone,
            onValueChange = { phone = it },
            label = { Text("Phone") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = memberId,
            onValueChange = { memberId = it },
            label = { Text("Member ID (for barcode/QR)") },
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Expiry date picker
        DatePickerField(
            label = "Membership Expiry",
            selectedDate = expiryDate,
            onDateSelected = { expiryDate = it }
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = notes,
            onValueChange = { notes = it },
            label = { Text("Notes") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 3
        )

        Spacer(modifier = Modifier.height(24.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedButton(
                onClick = onCancel,
                modifier = Modifier.weight(1f)
            ) {
                Text("Cancel")
            }

            Button(
                onClick = {
                    onSave(Customer(
                        id = customer?.id ?: "",
                        name = name,
                        email = email.ifBlank { null },
                        phone = phone.ifBlank { null },
                        memberId = memberId.ifBlank { null },
                        expiryDate = expiryDate?.let { Timestamp(it) },
                        notes = notes.ifBlank { null },
                        pointList = customer?.pointList ?: emptyList(),
                        visits = customer?.visits ?: 0,
                        totalSpent = customer?.totalSpent ?: 0.0
                    ))
                },
                enabled = name.isNotBlank(),
                modifier = Modifier.weight(1f)
            ) {
                Text("Save")
            }
        }
    }
}
```

---

## 9. History Section

### 9.1 Screen Layout

```
┌────────────────────────────────────────────────────────────┐
│                    HISTORY SECTION                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  🔍 Search receipts...     📅 Date Filter     🔄 Refresh  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ #ORD-1706961234567              💵 Cash              │ │
│  │ Feb 3, 2026 10:30 AM                                 │ │
│  │ Customer: John Doe                                    │ │
│  │ Items: 5 | Total: $125.50                            │ │
│  │ Cashier: Jane Smith                                  │ │
│  │                                                       │ │
│  │ [View Details]  [Void Sale]  [Reprint]               │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ #ORD-1706961234566              💳 Card              │ │
│  │ Feb 3, 2026 10:15 AM                                 │ │
│  │ Customer: Walk-in                                     │ │
│  │ Items: 2 | Total: $45.00                             │ │
│  │ Cashier: Jane Smith                                  │ │
│  │                                    ❌ VOIDED         │ │
│  │ [View Details]                                        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 9.2 Receipt Data Model

```kotlin
data class Receipt(
    val id: String = "",
    val orderNumber: String = "",
    val receiptNumber: String = "",
    val receiptType: String = "SALE",

    // Money
    val subtotal: Double = 0.0,
    val totalDiscount: Double = 0.0,
    val discounts: List<AppliedDiscount> = emptyList(),
    val totalMoney: Double = 0.0,
    val totalTax: Double = 0.0,

    // Points
    val pointsUsed: Int = 0,
    val pointsDiscount: Double = 0.0,
    val cashbackEarned: Int = 0,

    // People
    val cashierId: String? = null,
    val cashierName: String = "Unknown",
    val customerId: String? = null,
    val customerName: String? = null,

    // Items
    val lineItems: List<ReceiptLineItem> = emptyList(),

    // Payment
    val paymentMethod: String = "cash",
    val paymentTypeName: String = "Cash",
    val cashReceived: Double = 0.0,
    val change: Double = 0.0,
    val payments: List<Payment> = emptyList(),

    // Status
    val status: String = "completed",
    val cancelledAt: Timestamp? = null,
    val voidedBy: String? = null,
    val voidReason: String? = null,

    // Kiosk
    val kioskOrderId: String? = null,

    // Timestamps
    val createdAt: Timestamp = Timestamp.now(),
    val updatedAt: Timestamp = Timestamp.now()
)

data class ReceiptLineItem(
    val itemId: String,
    val itemName: String,
    val quantity: Double,
    val price: Double,
    val totalMoney: Double,
    val sku: String? = null
)

data class AppliedDiscount(
    val id: String,
    val name: String,
    val type: String,  // "percentage" or "amount"
    val value: Double,
    val isCustom: Boolean = false
)

data class Payment(
    val paymentTypeId: String,
    val name: String,
    val type: String,
    val moneyAmount: Double,
    val paidAt: Timestamp
)
```

### 9.3 Void Sale Function

```kotlin
suspend fun voidSale(
    receiptId: String,
    reason: String,
    cashierId: String,
    cashierName: String
): Result<Unit> {
    return try {
        val receipt = receiptsRepository.getById(receiptId)
            ?: return Result.failure(Exception("Receipt not found"))

        if (receipt.status == "voided") {
            return Result.failure(Exception("Receipt already voided"))
        }

        // Update receipt status
        receiptsRepository.update(receiptId, mapOf(
            "status" to "voided",
            "cancelledAt" to Timestamp.now(),
            "voidedBy" to cashierId,
            "voidedByName" to cashierName,
            "voidReason" to reason,
            "updatedAt" to Timestamp.now()
        ))

        // Restore stock for each item
        for (item in receipt.lineItems) {
            productRepository.incrementStock(item.itemId, item.quantity)
        }

        // If customer had points deducted, restore them
        if (receipt.customerId != null && receipt.pointsUsed > 0) {
            customerRepository.addPoints(
                receipt.customerId,
                receipt.pointsUsed,
                "Void refund: ${receipt.orderNumber}"
            )
        }

        // If customer earned points, remove them
        if (receipt.customerId != null && receipt.cashbackEarned > 0) {
            customerRepository.deductPoints(
                receipt.customerId,
                receipt.cashbackEarned,
                "Void reversal: ${receipt.orderNumber}"
            )
        }

        // Log activity
        activityLogRepository.create(ActivityLog(
            userId = cashierId,
            userName = cashierName,
            action = "VOID_SALE",
            category = "SALES",
            targetId = receiptId,
            targetName = receipt.orderNumber,
            details = "Voided sale: $reason"
        ))

        Result.success(Unit)
    } catch (e: Exception) {
        Result.failure(e)
    }
}
```

---

## 10. Shifts Section

### 10.1 Screen Layout

```
┌────────────────────────────────────────────────────────────┐
│                     SHIFTS SECTION                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                 CURRENT SHIFT                         │ │
│  │                                                       │ │
│  │  Status: 🟢 ACTIVE                                   │ │
│  │  Started: Feb 3, 2026 8:00 AM                        │ │
│  │  Duration: 4h 30m                                    │ │
│  │                                                       │ │
│  │  ┌─────────────────┬─────────────────┐              │ │
│  │  │ Opening Cash    │ Calculated Cash │              │ │
│  │  │ $200.00         │ $485.50        │              │ │
│  │  └─────────────────┴─────────────────┘              │ │
│  │                                                       │ │
│  │  Cash Sales:      $285.50 (12 transactions)         │ │
│  │  Card Sales:      $150.00 (5 transactions)          │ │
│  │  Other Sales:     $45.00  (2 transactions)          │ │
│  │  ─────────────────────────────────                  │ │
│  │  Total Sales:     $480.50 (19 transactions)         │ │
│  │                                                       │ │
│  │  Pay In:          $50.00                            │ │
│  │  Pay Out:         -$20.00                           │ │
│  │                                                       │ │
│  │          [Pay In]  [Pay Out]  [End Shift]           │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ─────────────── SHIFT HISTORY ──────────────────────     │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Feb 2, 2026 | 8:00 AM - 4:30 PM                      │ │
│  │ Total Sales: $1,234.50 | Variance: +$5.00 ✅         │ │
│  │                                        [View Report] │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 10.2 Shift Data Model

```kotlin
data class Shift(
    val id: String = "",
    val cashierId: String = "",
    val cashierName: String = "",
    val status: ShiftStatus = ShiftStatus.ACTIVE,

    // Cash amounts
    val openingCash: Double = 0.0,
    val closingCash: Double? = null,
    val expectedCash: Double = 0.0,    // Calculated: opening + cash sales + payIn - payOut
    val variance: Double = 0.0,         // closing - expected

    // Transactions
    val transactions: List<ShiftTransaction> = emptyList(),

    // Cash movements
    val payIns: List<CashMovement> = emptyList(),
    val payOuts: List<CashMovement> = emptyList(),

    // Summary
    val cashSales: Double = 0.0,
    val cardSales: Double = 0.0,
    val cryptoSales: Double = 0.0,
    val transferSales: Double = 0.0,
    val totalSales: Double = 0.0,
    val transactionCount: Int = 0,

    // Timestamps
    val startedAt: Timestamp = Timestamp.now(),
    val endedAt: Timestamp? = null,
    val createdAt: Timestamp = Timestamp.now(),
    val updatedAt: Timestamp = Timestamp.now()
) {
    val totalPayIn: Double get() = payIns.sumOf { it.amount }
    val totalPayOut: Double get() = payOuts.sumOf { it.amount }

    val calculatedExpectedCash: Double get() =
        openingCash + cashSales + totalPayIn - totalPayOut

    val duration: Long get() {
        val end = endedAt?.toDate() ?: Date()
        return end.time - startedAt.toDate().time
    }
}

enum class ShiftStatus {
    ACTIVE,
    CLOSED
}

data class ShiftTransaction(
    val id: String,              // Receipt ID
    val total: Double,
    val paymentMethod: String,
    val createdAt: Timestamp
)

data class CashMovement(
    val id: String = UUID.randomUUID().toString(),
    val amount: Double,
    val reason: String,
    val createdAt: Timestamp = Timestamp.now()
)
```

### 10.3 Shift Operations

```kotlin
@HiltViewModel
class ShiftsViewModel @Inject constructor(
    private val shiftsRepository: ShiftsRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _activeShift = MutableStateFlow<Shift?>(null)
    val activeShift: StateFlow<Shift?> = _activeShift.asStateFlow()

    private val _shiftHistory = MutableStateFlow<List<Shift>>(emptyList())
    val shiftHistory: StateFlow<List<Shift>> = _shiftHistory.asStateFlow()

    init {
        loadActiveShift()
        loadShiftHistory()
    }

    private fun loadActiveShift() {
        viewModelScope.launch {
            val cashier = authRepository.currentUser.value ?: return@launch
            shiftsRepository.getActiveShift(cashier.id)
                .collect { _activeShift.value = it }
        }
    }

    fun startShift(openingCash: Double) {
        viewModelScope.launch {
            val cashier = authRepository.currentUser.value ?: return@launch

            val shift = Shift(
                cashierId = cashier.id,
                cashierName = cashier.name,
                openingCash = openingCash,
                status = ShiftStatus.ACTIVE
            )

            val shiftId = shiftsRepository.create(shift)

            // Save to local storage for offline access
            saveActiveShiftLocally(shift.copy(id = shiftId))
        }
    }

    fun endShift(closingCash: Double) {
        viewModelScope.launch {
            val shift = _activeShift.value ?: return@launch

            val expectedCash = shift.calculatedExpectedCash
            val variance = closingCash - expectedCash

            shiftsRepository.update(shift.id, mapOf(
                "status" to ShiftStatus.CLOSED.name,
                "closingCash" to closingCash,
                "expectedCash" to expectedCash,
                "variance" to variance,
                "endedAt" to Timestamp.now(),
                "updatedAt" to Timestamp.now()
            ))

            // Clear local storage
            clearActiveShiftLocally()
        }
    }

    fun addPayIn(amount: Double, reason: String) {
        viewModelScope.launch {
            val shift = _activeShift.value ?: return@launch

            val payIn = CashMovement(
                amount = amount,
                reason = reason
            )

            shiftsRepository.addPayIn(shift.id, payIn)
        }
    }

    fun addPayOut(amount: Double, reason: String) {
        viewModelScope.launch {
            val shift = _activeShift.value ?: return@launch

            val payOut = CashMovement(
                amount = amount,
                reason = reason
            )

            shiftsRepository.addPayOut(shift.id, payOut)
        }
    }

    // Called after each sale to add transaction to shift
    fun addTransaction(receiptId: String, total: Double, paymentMethod: String) {
        viewModelScope.launch {
            val shift = _activeShift.value ?: return@launch

            val transaction = ShiftTransaction(
                id = receiptId,
                total = total,
                paymentMethod = paymentMethod,
                createdAt = Timestamp.now()
            )

            shiftsRepository.addTransaction(shift.id, transaction)

            // Update sales totals
            val updates = mutableMapOf<String, Any>(
                "transactionCount" to (shift.transactionCount + 1),
                "totalSales" to (shift.totalSales + total),
                "updatedAt" to Timestamp.now()
            )

            when (paymentMethod) {
                "cash" -> updates["cashSales"] = shift.cashSales + total
                "card" -> updates["cardSales"] = shift.cardSales + total
                "crypto" -> updates["cryptoSales"] = shift.cryptoSales + total
                "transfer" -> updates["transferSales"] = shift.transferSales + total
            }

            shiftsRepository.update(shift.id, updates)
        }
    }

    fun recalculateShift() {
        viewModelScope.launch {
            val shift = _activeShift.value ?: return@launch

            // Re-fetch all transactions from receipts
            val transactions = receiptsRepository.getReceiptsForShift(
                cashierId = shift.cashierId,
                startTime = shift.startedAt,
                endTime = shift.endedAt ?: Timestamp.now()
            )

            var cashSales = 0.0
            var cardSales = 0.0
            var cryptoSales = 0.0
            var transferSales = 0.0

            transactions.forEach { receipt ->
                when (receipt.paymentMethod) {
                    "cash" -> cashSales += receipt.totalMoney
                    "card" -> cardSales += receipt.totalMoney
                    "crypto" -> cryptoSales += receipt.totalMoney
                    "transfer" -> transferSales += receipt.totalMoney
                }
            }

            shiftsRepository.update(shift.id, mapOf(
                "cashSales" to cashSales,
                "cardSales" to cardSales,
                "cryptoSales" to cryptoSales,
                "transferSales" to transferSales,
                "totalSales" to (cashSales + cardSales + cryptoSales + transferSales),
                "transactionCount" to transactions.size,
                "updatedAt" to Timestamp.now()
            ))
        }
    }
}
```

### 10.4 End Shift Modal

```kotlin
@Composable
fun EndShiftModal(
    shift: Shift,
    onDismiss: () -> Unit,
    onConfirm: (Double) -> Unit
) {
    var closingCash by remember { mutableStateOf("") }
    val closingAmount = closingCash.toDoubleOrNull() ?: 0.0
    val expectedCash = shift.calculatedExpectedCash
    val variance = closingAmount - expectedCash

    Dialog(onDismissRequest = onDismiss) {
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "End Shift",
                    style = MaterialTheme.typography.headlineSmall
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Summary
                SummaryRow("Opening Cash", shift.openingCash)
                SummaryRow("Cash Sales", shift.cashSales)
                SummaryRow("Pay In", shift.totalPayIn)
                SummaryRow("Pay Out", -shift.totalPayOut)

                Divider(modifier = Modifier.padding(vertical = 8.dp))

                SummaryRow(
                    "Expected Cash",
                    expectedCash,
                    style = MaterialTheme.typography.titleMedium
                )

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = closingCash,
                    onValueChange = { closingCash = it },
                    label = { Text("Actual Closing Cash") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth()
                )

                if (closingAmount > 0) {
                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Variance:",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            text = "$${String.format("%.2f", variance)}",
                            style = MaterialTheme.typography.titleMedium,
                            color = when {
                                variance == 0.0 -> MaterialTheme.colorScheme.primary
                                variance > 0 -> Color(0xFF4CAF50)  // Green - over
                                else -> MaterialTheme.colorScheme.error  // Red - short
                            }
                        )
                    }

                    Text(
                        text = when {
                            variance == 0.0 -> "✅ Perfect match!"
                            variance > 0 -> "⬆️ Cash over by $${String.format("%.2f", variance)}"
                            else -> "⬇️ Cash short by $${String.format("%.2f", -variance)}"
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Cancel")
                    }

                    Button(
                        onClick = { onConfirm(closingAmount) },
                        enabled = closingAmount > 0,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("End Shift")
                    }
                }
            }
        }
    }
}
```

---

## 11. Products Section

### 11.1 Screen Layout

```
┌────────────────────────────────────────────────────────────┐
│                   PRODUCTS SECTION                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  [Products]  [Categories]  [Discounts]  ←── Sub-tabs       │
│                                                            │
│  🔍 Search products...                                      │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📦 Product Name                                       │ │
│  │ SKU: PRD-001 | Category: Edibles                      │ │
│  │ Price: $25.00 | Member: $22.50                        │ │
│  │ Stock: 45 units                                       │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📦 Another Product                                    │ │
│  │ SKU: PRD-002 | Category: Beverages                    │ │
│  │ Price: $15.00 | Member: $13.50                        │ │
│  │ Stock: 0 units ⚠️ OUT OF STOCK                        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 11.2 Product Data Model

```kotlin
data class Product(
    val id: String = "",
    val name: String = "",
    val description: String? = null,
    val sku: String? = null,
    val barcode: String? = null,
    val categoryId: String? = null,
    val categoryName: String? = null,

    // Pricing
    val price: Double = 0.0,
    val memberPrice: Double? = null,
    val cost: Double? = null,

    // Stock
    val stock: Int = 0,
    val trackStock: Boolean = true,
    val lowStockThreshold: Int = 10,

    // Options
    val availableForSale: Boolean = true,
    val soldByWeight: Boolean = false,
    val color: String? = null,

    // Recipe/Bundle (for composite products)
    val stockReductions: List<StockReduction> = emptyList(),
    val reduceOwnStock: Boolean = true,

    // Media
    val imageUrl: String? = null,

    // Metadata
    val createdAt: Timestamp = Timestamp.now(),
    val updatedAt: Timestamp = Timestamp.now()
) {
    val isOutOfStock: Boolean get() = trackStock && stock <= 0
    val isLowStock: Boolean get() = trackStock && stock > 0 && stock <= lowStockThreshold
    val effectivePrice: Double get() = memberPrice ?: price
}

data class StockReduction(
    val productId: String,
    val productName: String,
    val quantity: Double
)

data class Category(
    val id: String = "",
    val name: String = "",
    val description: String? = null,
    val color: String? = null,
    val sortOrder: Int = 0,
    val active: Boolean = true,
    val createdAt: Timestamp = Timestamp.now()
)

data class Discount(
    val id: String = "",
    val name: String = "",
    val type: DiscountType = DiscountType.PERCENTAGE,
    val value: Double = 0.0,
    val minPurchase: Double? = null,
    val maxDiscount: Double? = null,
    val isActive: Boolean = true,
    val createdAt: Timestamp = Timestamp.now()
)
```

---

## 12. Kiosk Orders Section

### 12.1 Purpose

Receive orders placed by customers on self-service kiosks. Cashier can accept orders and send them to cart for processing.

### 12.2 Screen Layout

```
┌────────────────────────────────────────────────────────────┐
│                  KIOSK ORDERS SECTION                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  🔔 2 Pending Orders                     [🔊 Sound: ON]    │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 🆕 Order #K-1706961234567             ⏰ 2 mins ago  │ │
│  │ Status: PENDING                                       │ │
│  │                                                       │ │
│  │ Items:                                               │ │
│  │  • Product A x2               $20.00                 │ │
│  │  • Product B x1               $15.00                 │ │
│  │                                                       │ │
│  │ Total: $35.00                                        │ │
│  │                                                       │ │
│  │ [Send to Cart]              [Reject Order]           │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ✅ Order #K-1706961234566             Completed      │ │
│  │ Processed 10 mins ago                                │ │
│  │ Total: $45.00                                        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 12.3 Kiosk Order Data Model

```kotlin
data class KioskOrder(
    val id: String = "",
    val orderNumber: String = "",
    val status: KioskOrderStatus = KioskOrderStatus.PENDING,
    val items: List<KioskOrderItem> = emptyList(),
    val subtotal: Double = 0.0,
    val total: Double = 0.0,
    val notes: String? = null,

    // Processing
    val processedBy: String? = null,
    val processedByName: String? = null,
    val finalReceiptNumber: String? = null,

    // Timestamps
    val createdAt: Timestamp = Timestamp.now(),
    val processedAt: Timestamp? = null,
    val completedAt: Timestamp? = null,
    val rejectedAt: Timestamp? = null,
    val updatedAt: Timestamp = Timestamp.now()
)

data class KioskOrderItem(
    val productId: String,
    val name: String,
    val price: Double,
    val quantity: Int,
    val categoryId: String? = null
)

enum class KioskOrderStatus {
    PENDING,      // Waiting to be processed
    PROCESSING,   // Sent to cart, being prepared
    COMPLETED,    // Sale completed
    REJECTED,     // Declined by cashier
    CANCELLED     // Cancelled by customer
}
```

### 12.4 Kiosk Orders ViewModel

```kotlin
@HiltViewModel
class KioskOrdersViewModel @Inject constructor(
    private val kioskOrdersRepository: KioskOrdersRepository,
    private val cartViewModel: CartViewModel,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _orders = MutableStateFlow<List<KioskOrder>>(emptyList())
    val orders: StateFlow<List<KioskOrder>> = _orders.asStateFlow()

    val pendingCount: Int get() = _orders.value.count { it.status == KioskOrderStatus.PENDING }

    // Real-time listener for new orders
    init {
        viewModelScope.launch {
            kioskOrdersRepository.observePendingOrders()
                .collect { orders ->
                    val previousCount = _orders.value.count { it.status == KioskOrderStatus.PENDING }
                    _orders.value = orders

                    // Play sound if new order arrived
                    val newCount = orders.count { it.status == KioskOrderStatus.PENDING }
                    if (newCount > previousCount) {
                        playNotificationSound()
                    }
                }
        }
    }

    fun sendToCart(order: KioskOrder) {
        viewModelScope.launch {
            val cashier = authRepository.currentUser.value ?: return@launch

            // Update order status
            kioskOrdersRepository.update(order.id, mapOf(
                "status" to KioskOrderStatus.PROCESSING.name,
                "processedBy" to cashier.id,
                "processedByName" to cashier.name,
                "processedAt" to Timestamp.now(),
                "updatedAt" to Timestamp.now()
            ))

            // Load order items to cart
            cartViewModel.loadFromKioskOrder(order)
        }
    }

    fun rejectOrder(orderId: String, reason: String? = null) {
        viewModelScope.launch {
            kioskOrdersRepository.update(orderId, mapOf(
                "status" to KioskOrderStatus.REJECTED.name,
                "rejectedAt" to Timestamp.now(),
                "rejectReason" to reason,
                "updatedAt" to Timestamp.now()
            ))
        }
    }

    private fun playNotificationSound() {
        // Play notification sound using Android MediaPlayer
    }
}
```

### 12.5 Real-time Firebase Listener

```kotlin
// KioskOrdersRepository.kt
class KioskOrdersRepository @Inject constructor(
    private val firestore: FirebaseFirestore
) {
    fun observePendingOrders(): Flow<List<KioskOrder>> = callbackFlow {
        val listener = firestore.collection("kioskOrders")
            .whereIn("status", listOf(
                KioskOrderStatus.PENDING.name,
                KioskOrderStatus.PROCESSING.name
            ))
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }

                val orders = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(KioskOrder::class.java)?.copy(id = doc.id)
                } ?: emptyList()

                trySend(orders)
            }

        awaitClose { listener.remove() }
    }
}
```

---

## 13. Expenses Section

### 13.1 Purpose

Cashiers can submit expense requests (petty cash, supplies, etc.) for manager/admin approval.

### 13.2 Screen Layout

```
┌────────────────────────────────────────────────────────────┐
│                   EXPENSES SECTION                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│                                    [+ New Expense]         │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📝 Office Supplies                                    │ │
│  │ Amount: $45.00 USD                                   │ │
│  │ Category: Supplies                                    │ │
│  │ Status: ⏳ PENDING                                    │ │
│  │ Submitted: Feb 3, 2026 9:30 AM                       │ │
│  │                                                       │ │
│  │ Notes: Paper and pens for register                   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📝 Cleaning Supplies                                  │ │
│  │ Amount: $25.00 USD                                   │ │
│  │ Category: Maintenance                                 │ │
│  │ Status: ✅ APPROVED                                   │ │
│  │ Submitted: Feb 2, 2026 2:15 PM                       │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 13.3 Expense Data Model

```kotlin
data class Expense(
    val id: String = "",
    val description: String = "",
    val amount: Double = 0.0,
    val currency: String = "USD",
    val category: String = "General",
    val notes: String? = null,

    // Submitter
    val employeeId: String = "",
    val employeeName: String = "",

    // Status
    val status: ExpenseStatus = ExpenseStatus.PENDING,
    val approvedBy: String? = null,
    val approvedByName: String? = null,
    val approvedAt: Timestamp? = null,
    val rejectedBy: String? = null,
    val rejectedByName: String? = null,
    val rejectedAt: Timestamp? = null,
    val rejectReason: String? = null,

    // Timestamps
    val createdAt: Timestamp = Timestamp.now(),
    val updatedAt: Timestamp = Timestamp.now()
)

enum class ExpenseStatus {
    PENDING,
    APPROVED,
    REJECTED
}

// Available currencies
val CURRENCIES = listOf(
    Currency("USD", "$", "US Dollar"),
    Currency("EUR", "€", "Euro"),
    Currency("GBP", "£", "British Pound"),
    Currency("THB", "฿", "Thai Baht")
)

data class Currency(
    val code: String,
    val symbol: String,
    val name: String
)
```

### 13.4 Expense Form

```kotlin
@Composable
fun ExpenseForm(
    categories: List<String>,
    onSubmit: (Expense) -> Unit,
    onCancel: () -> Unit
) {
    var description by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var currency by remember { mutableStateOf("USD") }
    var category by remember { mutableStateOf(categories.firstOrNull() ?: "General") }
    var notes by remember { mutableStateOf("") }

    Column(modifier = Modifier.padding(16.dp)) {
        Text(
            text = "New Expense",
            style = MaterialTheme.typography.headlineSmall
        )

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = description,
            onValueChange = { description = it },
            label = { Text("Description *") },
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedTextField(
                value = amount,
                onValueChange = { amount = it },
                label = { Text("Amount *") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.weight(2f)
            )

            // Currency dropdown
            ExposedDropdownMenuBox(
                modifier = Modifier.weight(1f)
            ) {
                OutlinedTextField(
                    value = currency,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Currency") }
                )
                ExposedDropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false }
                ) {
                    CURRENCIES.forEach { curr ->
                        DropdownMenuItem(
                            text = { Text("${curr.symbol} ${curr.code}") },
                            onClick = {
                                currency = curr.code
                                expanded = false
                            }
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Category dropdown
        ExposedDropdownMenuBox {
            OutlinedTextField(
                value = category,
                onValueChange = {},
                readOnly = true,
                label = { Text("Category") },
                modifier = Modifier.fillMaxWidth()
            )
            ExposedDropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                categories.forEach { cat ->
                    DropdownMenuItem(
                        text = { Text(cat) },
                        onClick = {
                            category = cat
                            expanded = false
                        }
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = notes,
            onValueChange = { notes = it },
            label = { Text("Notes (optional)") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 3
        )

        Spacer(modifier = Modifier.height(24.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedButton(
                onClick = onCancel,
                modifier = Modifier.weight(1f)
            ) {
                Text("Cancel")
            }

            Button(
                onClick = {
                    val amountValue = amount.toDoubleOrNull() ?: return@Button
                    onSubmit(Expense(
                        description = description,
                        amount = amountValue,
                        currency = currency,
                        category = category,
                        notes = notes.ifBlank { null }
                    ))
                },
                enabled = description.isNotBlank() && amount.toDoubleOrNull() != null,
                modifier = Modifier.weight(1f)
            ) {
                Text("Submit")
            }
        }
    }
}
```

---

## 14. Settings Section

### 14.1 Screen Layout

```
┌────────────────────────────────────────────────────────────┐
│                   SETTINGS SECTION                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  👤 ACCOUNT                                                │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Cashier: Jane Smith                                  │ │
│  │ Email: jane@candykush.com                            │ │
│  │ Role: Cashier                                        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  🎨 APPEARANCE                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Theme                                                │ │
│  │ [☀️ Light]  [🌙 Dark]  [📱 System]                   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  🔒 SECURITY                                               │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Auto-lock after inactivity                           │ │
│  │ [Never] [1 min] [5 min] [10 min] [30 min]           │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  📱 APP INFO                                               │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Version: 1.0.1 (Build 2)                             │ │
│  │ [Check for Updates]                                  │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│            [🚪 Logout]                                     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 14.2 Settings ViewModel

```kotlin
@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val preferencesRepository: PreferencesRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    val currentUser = authRepository.currentUser

    private val _theme = MutableStateFlow(ThemeMode.SYSTEM)
    val theme: StateFlow<ThemeMode> = _theme.asStateFlow()

    private val _idleTimeout = MutableStateFlow(300000L)  // 5 minutes default
    val idleTimeout: StateFlow<Long> = _idleTimeout.asStateFlow()

    init {
        viewModelScope.launch {
            preferencesRepository.theme.collect { _theme.value = it }
        }
        viewModelScope.launch {
            preferencesRepository.idleTimeout.collect { _idleTimeout.value = it }
        }
    }

    fun setTheme(theme: ThemeMode) {
        viewModelScope.launch {
            preferencesRepository.setTheme(theme)
        }
    }

    fun setIdleTimeout(timeout: Long) {
        viewModelScope.launch {
            preferencesRepository.setIdleTimeout(timeout)
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
        }
    }
}

enum class ThemeMode {
    LIGHT,
    DARK,
    SYSTEM
}

// Timeout options
val TIMEOUT_OPTIONS = listOf(
    0L to "Never",
    60_000L to "1 minute",
    300_000L to "5 minutes",
    600_000L to "10 minutes",
    1_800_000L to "30 minutes",
    3_600_000L to "1 hour"
)
```

### 14.3 Auto-Lock Implementation

```kotlin
// IdleTimeoutManager.kt
class IdleTimeoutManager(
    private val activity: Activity,
    private val onTimeout: () -> Unit
) {
    private var lastInteractionTime = System.currentTimeMillis()
    private var timeoutMs: Long = 300_000L  // 5 minutes default
    private var checkJob: Job? = null

    fun start(coroutineScope: CoroutineScope) {
        checkJob = coroutineScope.launch {
            while (isActive) {
                delay(1000)  // Check every second

                if (timeoutMs > 0) {
                    val elapsed = System.currentTimeMillis() - lastInteractionTime
                    if (elapsed >= timeoutMs) {
                        withContext(Dispatchers.Main) {
                            onTimeout()
                        }
                    }
                }
            }
        }
    }

    fun stop() {
        checkJob?.cancel()
    }

    fun resetTimer() {
        lastInteractionTime = System.currentTimeMillis()
    }

    fun setTimeout(ms: Long) {
        timeoutMs = ms
    }
}

// In your main activity
class MainActivity : ComponentActivity() {
    private lateinit var idleTimeoutManager: IdleTimeoutManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        idleTimeoutManager = IdleTimeoutManager(this) {
            // Lock screen - return to PIN login
            navigateToLockScreen()
        }

        idleTimeoutManager.start(lifecycleScope)
    }

    override fun onUserInteraction() {
        super.onUserInteraction()
        idleTimeoutManager.resetTimer()
    }

    override fun onDestroy() {
        super.onDestroy()
        idleTimeoutManager.stop()
    }
}
```

---

## 15. Data Models

### 15.1 Complete Model Summary

```kotlin
// All data classes used in the app

// ========== USER ==========
data class CashierUser(
    val id: String,
    val name: String,
    val email: String,
    val pin: String,
    val role: String,
    val status: String,
    val token: String?,
    val permissions: CashierPermissions
)

// ========== PRODUCT ==========
data class Product(
    val id: String,
    val name: String,
    val sku: String?,
    val barcode: String?,
    val categoryId: String?,
    val price: Double,
    val memberPrice: Double?,
    val cost: Double?,
    val stock: Int,
    val trackStock: Boolean,
    val availableForSale: Boolean,
    val soldByWeight: Boolean,
    val imageUrl: String?,
    val color: String?
)

// ========== CATEGORY ==========
data class Category(
    val id: String,
    val name: String,
    val description: String?,
    val color: String?,
    val sortOrder: Int,
    val active: Boolean
)

// ========== CUSTOMER ==========
data class Customer(
    val id: String,
    val name: String,
    val email: String?,
    val phone: String?,
    val memberId: String?,
    val expiryDate: Timestamp?,
    val pointList: List<PointEntry>,
    val visits: Int,
    val totalSpent: Double
)

// ========== RECEIPT ==========
data class Receipt(
    val id: String,
    val orderNumber: String,
    val lineItems: List<ReceiptLineItem>,
    val subtotal: Double,
    val totalDiscount: Double,
    val totalMoney: Double,
    val paymentMethod: String,
    val cashReceived: Double,
    val change: Double,
    val cashierId: String?,
    val customerId: String?,
    val pointsUsed: Int,
    val cashbackEarned: Int,
    val status: String,
    val createdAt: Timestamp
)

// ========== SHIFT ==========
data class Shift(
    val id: String,
    val cashierId: String,
    val cashierName: String,
    val status: ShiftStatus,
    val openingCash: Double,
    val closingCash: Double?,
    val expectedCash: Double,
    val variance: Double,
    val cashSales: Double,
    val cardSales: Double,
    val totalSales: Double,
    val transactionCount: Int,
    val payIns: List<CashMovement>,
    val payOuts: List<CashMovement>,
    val startedAt: Timestamp,
    val endedAt: Timestamp?
)

// ========== TICKET ==========
data class Ticket(
    val id: String,
    val ticketNumber: String,
    val userId: String,
    val customerId: String?,
    val customerName: String?,
    val items: List<TicketItem>,
    val total: Double,
    val status: TicketStatus,
    val createdAt: Timestamp
)

// ========== KIOSK ORDER ==========
data class KioskOrder(
    val id: String,
    val orderNumber: String,
    val status: KioskOrderStatus,
    val items: List<KioskOrderItem>,
    val total: Double,
    val createdAt: Timestamp
)

// ========== EXPENSE ==========
data class Expense(
    val id: String,
    val description: String,
    val amount: Double,
    val currency: String,
    val category: String,
    val employeeId: String,
    val status: ExpenseStatus,
    val createdAt: Timestamp
)

// ========== DISCOUNT ==========
data class Discount(
    val id: String,
    val name: String,
    val type: DiscountType,
    val value: Double,
    val minPurchase: Double?,
    val isActive: Boolean
)
```

---

## 16. Firebase Collections

### 16.1 Collection Structure

```
Firebase Firestore
├── users/                    # User accounts (cashiers, managers, admins)
│   └── {userId}/
│       ├── name: string
│       ├── email: string
│       ├── pin: string
│       ├── role: string
│       └── status: string
│
├── products/                 # Product catalog
│   └── {productId}/
│       ├── name: string
│       ├── price: number
│       ├── stock: number
│       ├── categoryId: string
│       └── ...
│
├── categories/               # Product categories
│   └── {categoryId}/
│       ├── name: string
│       ├── color: string
│       └── sortOrder: number
│
├── customers/                # Customer profiles
│   └── {customerId}/
│       ├── name: string
│       ├── email: string
│       ├── phone: string
│       ├── pointList: array
│       └── expiryDate: timestamp
│
├── receipts/                 # Completed sales
│   └── {receiptId}/
│       ├── orderNumber: string
│       ├── lineItems: array
│       ├── totalMoney: number
│       ├── paymentMethod: string
│       └── ...
│
├── shifts/                   # Cashier shifts
│   └── {shiftId}/
│       ├── cashierId: string
│       ├── openingCash: number
│       ├── closingCash: number
│       ├── transactions: array
│       └── ...
│
├── tickets/                  # Saved/parked orders
│   └── {ticketId}/
│       ├── ticketNumber: string
│       ├── items: array
│       ├── status: string
│       └── ...
│
├── kioskOrders/              # Kiosk customer orders
│   └── {orderId}/
│       ├── orderNumber: string
│       ├── items: array
│       ├── status: string
│       └── ...
│
├── expenses/                 # Expense requests
│   └── {expenseId}/
│       ├── description: string
│       ├── amount: number
│       ├── status: string
│       └── ...
│
├── discounts/                # Available discounts
│   └── {discountId}/
│       ├── name: string
│       ├── type: string
│       ├── value: number
│       └── isActive: boolean
│
├── cashbackRules/            # Points earning rules
│   └── {ruleId}/
│       ├── name: string
│       ├── pointsPerDollar: number
│       └── isActive: boolean
│
└── settings/                 # Global settings
    └── pointUsageRules/
        ├── pointValue: number
        └── earnCashbackWhenUsingPoints: boolean
```

---

## 17. State Management

### 17.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    STATE ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐ │
│   │   UI Layer  │     │  ViewModel  │     │ Repository  │ │
│   │  (Compose)  │────►│   Layer     │────►│   Layer     │ │
│   │             │◄────│             │◄────│             │ │
│   └─────────────┘     └─────────────┘     └─────────────┘ │
│          │                   │                   │         │
│          │            ┌──────┴──────┐           │         │
│          │            │ StateFlow   │           │         │
│          │            │ SharedFlow  │           │         │
│          │            └─────────────┘           │         │
│          │                                      │         │
│          │         ┌────────────────────┐      │         │
│          └─────────│   Data Sources     │◄─────┘         │
│                    │  ┌──────────────┐  │                 │
│                    │  │  Firebase    │  │                 │
│                    │  │  Firestore   │  │                 │
│                    │  └──────────────┘  │                 │
│                    │  ┌──────────────┐  │                 │
│                    │  │    Room      │  │                 │
│                    │  │  (Offline)   │  │                 │
│                    │  └──────────────┘  │                 │
│                    │  ┌──────────────┐  │                 │
│                    │  │  DataStore   │  │                 │
│                    │  │(Preferences) │  │                 │
│                    │  └──────────────┘  │                 │
│                    └────────────────────┘                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 17.2 ViewModel Implementation Pattern

```kotlin
@HiltViewModel
class SalesViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val customerRepository: CustomerRepository,
    private val receiptRepository: ReceiptRepository,
    private val shiftRepository: ShiftRepository
) : ViewModel() {

    // UI State
    private val _uiState = MutableStateFlow(SalesUiState())
    val uiState: StateFlow<SalesUiState> = _uiState.asStateFlow()

    // Products
    private val _products = MutableStateFlow<List<Product>>(emptyList())
    val products: StateFlow<List<Product>> = _products.asStateFlow()

    // Categories
    private val _categories = MutableStateFlow<List<Category>>(emptyList())
    val categories: StateFlow<List<Category>> = _categories.asStateFlow()

    // Selected category filter
    private val _selectedCategory = MutableStateFlow<String?>(null)
    val selectedCategory: StateFlow<String?> = _selectedCategory.asStateFlow()

    // Search query
    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    // Filtered products (derived state)
    val filteredProducts: StateFlow<List<Product>> = combine(
        _products,
        _selectedCategory,
        _searchQuery
    ) { products, category, query ->
        products
            .filter { product ->
                (category == null || product.categoryName == category) &&
                (query.isBlank() ||
                 product.name.contains(query, ignoreCase = true) ||
                 product.barcode?.contains(query) == true ||
                 product.sku?.contains(query, ignoreCase = true) == true)
            }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        loadProducts()
        loadCategories()
    }

    private fun loadProducts() {
        viewModelScope.launch {
            productRepository.getAllProducts()
                .catch { e ->
                    _uiState.update { it.copy(error = e.message) }
                }
                .collect { products ->
                    _products.value = products
                }
        }
    }

    fun selectCategory(category: String?) {
        _selectedCategory.value = category
    }

    fun updateSearchQuery(query: String) {
        _searchQuery.value = query
    }
}

data class SalesUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val showPaymentModal: Boolean = false,
    val showReceiptModal: Boolean = false,
    val completedReceipt: Receipt? = null
)
```

---

## 18. Offline Support

### 18.1 Room Database Schema

```kotlin
@Database(
    entities = [
        ProductEntity::class,
        CategoryEntity::class,
        CustomerEntity::class,
        ReceiptEntity::class,
        ReceiptItemEntity::class,
        ShiftEntity::class,
        TicketEntity::class,
        TicketItemEntity::class,
        SyncQueueEntity::class
    ],
    version = 1
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun productDao(): ProductDao
    abstract fun categoryDao(): CategoryDao
    abstract fun customerDao(): CustomerDao
    abstract fun receiptDao(): ReceiptDao
    abstract fun shiftDao(): ShiftDao
    abstract fun ticketDao(): TicketDao
    abstract fun syncQueueDao(): SyncQueueDao
}

// Sync queue for offline operations
@Entity(tableName = "sync_queue")
data class SyncQueueEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val type: String,       // "receipt", "shift", "customer"
    val action: String,     // "create", "update", "delete"
    val data: String,       // JSON serialized data
    val timestamp: Long = System.currentTimeMillis(),
    val status: String = "pending",
    val attempts: Int = 0,
    val lastError: String? = null
)
```

### 18.2 Offline-First Repository Pattern

```kotlin
class ProductRepository @Inject constructor(
    private val firestore: FirebaseFirestore,
    private val productDao: ProductDao,
    private val networkMonitor: NetworkMonitor
) {
    fun getAllProducts(): Flow<List<Product>> = flow {
        // First emit from local cache
        val localProducts = productDao.getAllProducts()
        emit(localProducts.map { it.toDomain() })

        // If online, fetch from Firebase and update cache
        if (networkMonitor.isOnline()) {
            try {
                val snapshot = firestore.collection("products")
                    .whereEqualTo("availableForSale", true)
                    .get()
                    .await()

                val firebaseProducts = snapshot.documents.mapNotNull { doc ->
                    doc.toObject(Product::class.java)?.copy(id = doc.id)
                }

                // Update local cache
                productDao.deleteAll()
                productDao.insertAll(firebaseProducts.map { it.toEntity() })

                emit(firebaseProducts)
            } catch (e: Exception) {
                // Already emitted local data, just log error
                Log.e("ProductRepo", "Failed to fetch from Firebase", e)
            }
        }
    }

    suspend fun updateStock(productId: String, newStock: Int) {
        // Update locally first
        productDao.updateStock(productId, newStock)

        // If online, sync to Firebase
        if (networkMonitor.isOnline()) {
            try {
                firestore.collection("products")
                    .document(productId)
                    .update("stock", newStock)
                    .await()
            } catch (e: Exception) {
                // Queue for later sync
                syncQueueDao.insert(SyncQueueEntity(
                    type = "product",
                    action = "update",
                    data = """{"id":"$productId","stock":$newStock}"""
                ))
            }
        } else {
            // Queue for later sync
            syncQueueDao.insert(SyncQueueEntity(
                type = "product",
                action = "update",
                data = """{"id":"$productId","stock":$newStock}"""
            ))
        }
    }
}
```

### 18.3 Sync Manager

```kotlin
class SyncManager @Inject constructor(
    private val syncQueueDao: SyncQueueDao,
    private val firestore: FirebaseFirestore,
    private val networkMonitor: NetworkMonitor
) {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    init {
        // Watch for network connectivity
        scope.launch {
            networkMonitor.isOnline.collect { isOnline ->
                if (isOnline) {
                    syncPendingItems()
                }
            }
        }
    }

    suspend fun syncPendingItems() {
        val pendingItems = syncQueueDao.getPendingItems()

        for (item in pendingItems) {
            try {
                when (item.type) {
                    "receipt" -> syncReceipt(item)
                    "shift" -> syncShift(item)
                    "customer" -> syncCustomer(item)
                    "product" -> syncProduct(item)
                }

                // Mark as synced
                syncQueueDao.delete(item.id)
            } catch (e: Exception) {
                // Increment attempts, mark error
                syncQueueDao.update(item.copy(
                    attempts = item.attempts + 1,
                    lastError = e.message,
                    status = if (item.attempts >= 3) "failed" else "pending"
                ))
            }
        }
    }

    private suspend fun syncReceipt(item: SyncQueueEntity) {
        val receiptData = Json.decodeFromString<Receipt>(item.data)

        when (item.action) {
            "create" -> {
                firestore.collection("receipts")
                    .document(receiptData.id)
                    .set(receiptData)
                    .await()
            }
            "update" -> {
                firestore.collection("receipts")
                    .document(receiptData.id)
                    .update(receiptData.toMap())
                    .await()
            }
        }
    }
}
```

---

## 19. API Endpoints

### 19.1 Authentication API

```kotlin
// Base URL: https://your-domain.com/api

// Login with PIN
POST /api/mobile
Body: {
    "action": "login",
    "pin": "1234"
}
Response: {
    "success": true,
    "data": {
        "user": { ... },
        "token": "jwt_token_here"
    }
}

// Validate token
POST /api/mobile
Headers: { "Authorization": "Bearer {token}" }
Body: {
    "action": "validate-token"
}
```

### 19.2 Data Sync API

```kotlin
// Get products (with optional sync)
GET /api/mobile?action=get-products

// Get customers
GET /api/mobile?action=get-customers

// Get categories
GET /api/mobile?action=get-categories

// Get discounts
GET /api/mobile?action=get-discounts
```

### 19.3 Expense API

```kotlin
// Create expense
POST /api/mobile
Body: {
    "action": "create-expense",
    "expense": {
        "description": "Office supplies",
        "amount": 45.00,
        "currency": "USD",
        "category": "Supplies",
        "employeeId": "cashier123"
    }
}

// Get expenses for employee
GET /api/mobile?action=get-expenses&employeeId=cashier123

// Get expense categories
GET /api/mobile?action=get-expense-categories
```

### 19.4 Print API

```kotlin
// Print receipt
POST /api/print
Body: {
    "data": {
        "orderNumber": "ORD-123456",
        "items": [...],
        "total": 125.50,
        ...
    }
}
```

---

## 20. Implementation Checklist

### 20.1 Phase 1: Core Setup

- [ ] Project setup with Jetpack Compose
- [ ] Firebase integration
- [ ] Room database setup
- [ ] DataStore preferences
- [ ] Navigation structure
- [ ] Theme (light/dark) support

### 20.2 Phase 2: Authentication

- [ ] PIN login screen
- [ ] JWT token management
- [ ] Auto-lock/timeout
- [ ] Session persistence

### 20.3 Phase 3: Sales Section

- [ ] Product grid display
- [ ] Category tabs
- [ ] Search functionality
- [ ] Cart management
- [ ] Customer selection
- [ ] Discount application
- [ ] Payment modal (Cash, Card, Crypto, Transfer)
- [ ] Receipt display
- [ ] Barcode scanning

### 20.4 Phase 4: Tickets

- [ ] Create/save ticket
- [ ] List parked tickets
- [ ] Resume ticket
- [ ] Delete ticket

### 20.5 Phase 5: Customers

- [ ] Customer list
- [ ] Customer search
- [ ] Add/edit customer
- [ ] Points display
- [ ] Customer selection for cart

### 20.6 Phase 6: History

- [ ] Receipt list
- [ ] Receipt details
- [ ] Search/filter
- [ ] Void sale functionality
- [ ] Reprint receipt

### 20.7 Phase 7: Shifts

- [ ] Start shift
- [ ] Active shift display
- [ ] Pay in/out
- [ ] End shift with variance
- [ ] Shift history
- [ ] Recalculate shift

### 20.8 Phase 8: Products

- [ ] Product list view
- [ ] Categories list
- [ ] Discounts list
- [ ] Search/filter

### 20.9 Phase 9: Kiosk Orders

- [ ] Real-time order listener
- [ ] Pending orders display
- [ ] Send to cart
- [ ] Reject order
- [ ] Notification sound

### 20.10 Phase 10: Expenses

- [ ] Expense form
- [ ] Expense list
- [ ] Category selection
- [ ] Currency selection

### 20.11 Phase 11: Settings

- [ ] Theme toggle
- [ ] Idle timeout
- [ ] Account info
- [ ] Logout

### 20.12 Phase 12: Offline & Sync

- [ ] Offline product cache
- [ ] Offline receipt creation
- [ ] Sync queue
- [ ] Network monitoring
- [ ] Background sync

---

## 21. Additional Missing Features from Web POS

After reviewing the actual web POS implementation, here are **critical features** that must be included in the Android app:

### 21.1 Quick Cash Amount Buttons

In the payment modal, when "Cash" is selected, there should be **quick amount buttons** for faster checkout:

```kotlin
// Quick cash amounts
val QUICK_CASH_AMOUNTS = listOf(20, 50, 100, 200, 500, 1000)

@Composable
fun PaymentModal(/* ... */) {
    // ...

    if (paymentMethod == PaymentMethod.CASH) {
        // Quick Cash Buttons Grid
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            items(QUICK_CASH_AMOUNTS) { amount ->
                Button(
                    onClick = { cashReceived = amount.toString() },
                    variant = "outline",
                    modifier = Modifier.height(48.dp)
                ) {
                    Text("$$amount")
                }
            }

            // "Exact" button
            item {
                Button(
                    onClick = { cashReceived = finalTotal.toString() },
                    variant = "outline",
                    modifier = Modifier.height(48.dp)
                ) {
                    Text("Exact")
                }
            }
        }
    }
}
```

### 21.2 Hamburger Menu for Mobile Sidebar

On mobile/tablet, the sidebar should be **collapsible** with a hamburger menu icon:

```kotlin
@Composable
fun PosScreen(/* ... */) {
    var sidebarOpen by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            PosHeader(
                onMenuClick = { sidebarOpen = !sidebarOpen },
                /* ... */
            )
        }
    ) { padding ->
        Row {
            // Mobile: Drawer overlay
            if (sidebarOpen) {
                // Backdrop
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.5f))
                        .clickable { sidebarOpen = false }
                        .zIndex(10f)
                )

                // Sidebar with slide-in animation
                AnimatedVisibility(
                    visible = sidebarOpen,
                    enter = slideInHorizontally(initialOffsetX = { -it }),
                    exit = slideOutHorizontally(targetOffsetX = { -it })
                ) {
                    PosSidebar(
                        onTabSelected = {
                            viewModel.selectTab(it)
                            sidebarOpen = false // Close after selection
                        },
                        /* ... */
                    )
                }
            }

            // Content
            Box(modifier = Modifier.weight(1f)) {
                /* ... */
            }
        }
    }
}
```

### 21.3 Lock Screen Functionality

Cashiers should be able to **lock the screen** without logging out completely:

```kotlin
@Composable
fun PosHeader(/* ... */) {
    // Lock Screen Button
    IconButton(onClick = onLockScreen) {
        Icon(
            imageVector = Icons.Default.Lock,
            contentDescription = "Lock Screen"
        )
    }
}

@Composable
fun LockScreenDialog(
    cashier: CashierUser,
    onUnlock: () -> Unit,
    onDismiss: () -> Unit
) {
    var pin by remember { mutableStateOf("") }

    Dialog(onDismissRequest = onDismiss) {
        Card {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(24.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Lock,
                    contentDescription = null,
                    modifier = Modifier.size(64.dp)
                )

                Text("Screen Locked", style = MaterialTheme.typography.headlineSmall)
                Text("Enter PIN to unlock", color = Color.Gray)

                Spacer(modifier = Modifier.height(16.dp))

                Text("Logged in as: ${cashier.name}")

                // PIN input dots
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    repeat(4) { index ->
                        Box(
                            modifier = Modifier
                                .size(16.dp)
                                .background(
                                    color = if (index < pin.length) Color.Black else Color.Gray,
                                    shape = CircleShape
                                )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Number pad
                PinNumberPad(
                    onNumberClick = { num ->
                        if (pin.length < 4) {
                            pin += num
                            if (pin.length == 4) {
                                if (pin == cashier.pin) {
                                    onUnlock()
                                } else {
                                    toast.error("Incorrect PIN")
                                    pin = ""
                                }
                            }
                        }
                    },
                    onBackspace = { if (pin.isNotEmpty()) pin = pin.dropLast(1) },
                    onClear = { pin = "" }
                )

                Button(
                    onClick = onDismiss,
                    variant = "outline",
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Logout Instead")
                }
            }
        }
    }
}
```

### 21.4 Idle Timeout Auto-Lock

The app should automatically lock after a period of inactivity:

```kotlin
class IdleTimeoutManager(
    private val context: Context,
    private val timeoutMs: Long,
    private val onTimeout: () -> Unit
) {
    private var lastInteractionTime = System.currentTimeMillis()
    private var timerJob: Job? = null

    fun start(coroutineScope: CoroutineScope) {
        timerJob = coroutineScope.launch {
            while (isActive) {
                delay(1000L) // Check every second
                val elapsed = System.currentTimeMillis() - lastInteractionTime

                if (elapsed >= timeoutMs && timeoutMs > 0) {
                    onTimeout()
                    break
                }
            }
        }
    }

    fun reset() {
        lastInteractionTime = System.currentTimeMillis()
    }

    fun stop() {
        timerJob?.cancel()
    }
}

// In PosScreen or MainActivity
val idleTimeoutManager = remember {
    IdleTimeoutManager(
        context = context,
        timeoutMs = idleTimeoutMs,
        onTimeout = { showLockScreen = true }
    )
}

LaunchedEffect(Unit) {
    idleTimeoutManager.start(this)
}

// Track user interactions
Modifier.pointerInput(Unit) {
    detectTapGestures {
        idleTimeoutManager.reset()
    }
}
```

### 21.5 Offline Banner Warning

When offline, show a prominent banner at the top:

```kotlin
@Composable
fun OfflineBanner(isOnline: Boolean) {
    AnimatedVisibility(
        visible = !isOnline,
        enter = slideInVertically(),
        exit = slideOutVertically()
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFFFEF3C7)) // Yellow-50
                .border(1.dp, Color(0xFFFDE68A), RectangleShape)
                .padding(vertical = 8.dp, horizontal = 16.dp)
        ) {
            Row(
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.WifiOff,
                    contentDescription = null,
                    tint = Color(0xFF92400E), // Yellow-900
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "⚠️ Offline - Data will sync when connected",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF92400E)
                )
            }
        }
    }
}
```

### 21.6 Print Jobs Queue with Reprint

Cashiers need access to a **print jobs queue** to track and retry failed prints:

```kotlin
data class PrintJob(
    val id: String = UUID.randomUUID().toString(),
    val receiptNumber: String,
    val receiptId: String,
    val status: PrintStatus,
    val type: PrintType = PrintType.RECEIPT,
    val attempts: Int = 1,
    val reprints: List<ReprintRecord> = emptyList(),
    val errorMessage: String? = null,
    val createdAt: Timestamp = Timestamp.now(),
    val updatedAt: Timestamp = Timestamp.now()
)

data class ReprintRecord(
    val attemptNumber: Int,
    val reprintedBy: String,
    val reprintedByName: String,
    val reprintedAt: Timestamp,
    val reason: String? = null
)

enum class PrintStatus {
    PENDING,
    PRINTING,
    COMPLETED,
    FAILED,
    CANCELLED
}

@Composable
fun PrintJobsDialog(
    printJobs: List<PrintJob>,
    onReprint: (PrintJob) -> Unit,
    onCancel: (String) -> Unit,
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(modifier = Modifier.fillMaxWidth().heightIn(max = 600.dp)) {
            Column {
                // Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Print Queue", style = MaterialTheme.typography.titleLarge)
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, "Close")
                    }
                }

                Divider()

                // Print jobs list
                LazyColumn(
                    modifier = Modifier.weight(1f).padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(printJobs) { job ->
                        PrintJobItem(
                            job = job,
                            onReprint = { onReprint(job) },
                            onCancel = { onCancel(job.id) }
                        )
                    }
                }
            }
        }
    }
}
```

### 21.7 Weight Input Modal for Products Sold by Weight

Products sold by weight (e.g., per kg) need a special input modal:

```kotlin
@Composable
fun WeightInputDialog(
    product: Product,
    currentWeight: Double,
    onConfirm: (Double) -> Unit,
    onDismiss: () -> Unit
) {
    var weight by remember { mutableStateOf(currentWeight.toString().replace(".", ",")) }

    Dialog(onDismissRequest = onDismiss) {
        Card {
            Column(modifier = Modifier.padding(24.dp)) {
                Text("Enter Weight", style = MaterialTheme.typography.titleLarge)
                Text(product.name, color = Color.Gray)

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = weight,
                    onValueChange = { weight = it },
                    label = { Text("Weight (kg)") },
                    suffix = { Text("kg") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Quick weight buttons
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(0.1, 0.25, 0.5, 1.0, 2.0).forEach { amount ->
                        Button(
                            onClick = { weight = amount.toString().replace(".", ",") },
                            variant = "outline"
                        ) {
                            Text("${amount}kg")
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Calculate total price
                val weightValue = weight.replace(",", ".").toDoubleOrNull() ?: 0.0
                val totalPrice = weightValue * product.price

                Text(
                    "Total: ${formatCurrency(totalPrice)}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(16.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = onDismiss, variant = "outline", modifier = Modifier.weight(1f)) {
                        Text("Cancel")
                    }
                    Button(
                        onClick = {
                            val finalWeight = weight.replace(",", ".").toDoubleOrNull()
                            if (finalWeight != null && finalWeight > 0) {
                                onConfirm(finalWeight)
                            }
                        },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Confirm")
                    }
                }
            }
        }
    }
}
```

### 21.8 Tab Long-Press Context Menu

Custom category tabs should have a **long-press context menu** for edit/delete/reorder:

```kotlin
@Composable
fun CategoryTab(
    tab: CustomTab,
    isSelected: Boolean,
    onClick: () -> Unit,
    onLongPress: () -> Unit
) {
    var showContextMenu by remember { mutableStateOf(false) }

    Box {
        Button(
            onClick = onClick,
            modifier = Modifier.pointerInput(Unit) {
                detectTapGestures(
                    onLongPress = {
                        onLongPress()
                        showContextMenu = true
                    }
                )
            }
        ) {
            Text(tab.label)
        }

        // Context menu
        DropdownMenu(
            expanded = showContextMenu,
            onDismissRequest = { showContextMenu = false }
        ) {
            DropdownMenuItem(
                text = { Text("Edit") },
                onClick = { /* Edit tab */ }
            )
            DropdownMenuItem(
                text = { Text("Reorder") },
                onClick = { /* Enter drag mode */ }
            )
            DropdownMenuItem(
                text = { Text("Delete", color = Color.Red) },
                onClick = { /* Delete tab */ }
            )
        }
    }
}
```

### 21.9 Member Price Badge Display

When a customer is selected, show **member pricing** with strikethrough original price:

```kotlin
@Composable
fun CartItemCard(item: CartItem, customer: Customer?) {
    val hasMemberPrice = customer != null &&
                         item.memberPrice != null &&
                         item.memberPrice < item.originalPrice

    Column {
        Text(item.name, fontWeight = FontWeight.Bold)

        if (hasMemberPrice) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                // Original price with strikethrough
                Text(
                    text = formatCurrency(item.originalPrice),
                    style = MaterialTheme.typography.bodySmall,
                    textDecoration = TextDecoration.LineThrough,
                    color = Color.Gray
                )

                // Member price in green
                Text(
                    text = formatCurrency(item.memberPrice),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF10B981) // Green
                )

                // Member badge
                Badge(
                    containerColor = Color(0xFFDEEDFF),
                    contentColor = Color(0xFF1E40AF)
                ) {
                    Text("Member", style = MaterialTheme.typography.labelSmall)
                }
            }
        } else {
            Text(formatCurrency(item.price))
        }
    }
}
```

### 21.10 Cashback Earned Badge on Cart Items

Show **cashback points preview** for each item in the cart:

```kotlin
@Composable
fun CartItemWithCashback(
    item: CartItem,
    cashbackBreakdown: List<CashbackItemBreakdown>
) {
    val itemCashback = cashbackBreakdown.find { it.itemId == item.productId }

    Card {
        Column {
            // Item details
            Text(item.name)
            Text(formatCurrency(item.price * item.quantity))

            // Cashback badge
            if (itemCashback != null && itemCashback.points > 0) {
                Badge(
                    containerColor = Color(0xFFF0FDF4), // Green-50
                    contentColor = Color(0xFF15803D) // Green-700
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Star, contentDescription = null, modifier = Modifier.size(12.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("+${itemCashback.points} pts cashback")
                    }
                }
            }
        }
    }
}
```

---

## Summary

This documentation provides a complete guide to replicate the **Candy Kush POS Cashier App** in native Android Kotlin. The focus is entirely on **cashier operations** including:

1. **PIN-based login** for cashiers
2. **Sales processing** with cart, discounts, and multiple payment methods
3. **Shift management** with cash reconciliation
4. **Ticket/order parking** for interrupted transactions
5. **Customer selection** with points/cashback system
6. **Transaction history** with void capabilities
7. **Product browsing** (read-only for cashiers)
8. **Kiosk order integration** for self-service orders
9. **Expense submission** for petty cash requests
10. **App settings** with theme and security options

**Additional critical features:**

- Quick cash amount buttons ($20, $50, $100, Exact)
- Hamburger menu for mobile sidebar
- Lock screen with PIN unlock
- Idle timeout auto-lock
- Offline warning banner
- Print jobs queue with reprint capability
- Weight input modal for kg-based products
- Tab long-press context menu (edit/delete/reorder)
- Member pricing badges (strikethrough original, show member price)
- Cashback earned preview badges on cart items

All features maintain **offline-first** capability with local caching and sync queue for when connectivity returns.

---

**Document Version:** 2.1  
**Last Updated:** February 3, 2026  
**Author:** AI Assistant  
**Target Platform:** Android (Kotlin + Jetpack Compose)
