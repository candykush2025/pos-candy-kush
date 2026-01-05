# Product Management Feature - POS

## Overview

Comprehensive product management system in the POS with add, edit, delete functionality and advanced features including stock tracking, visual representation (color/image), and automatic SKU generation.

## Features Implemented

### Product Form Fields

#### Basic Information

- **Name** (Required) - Product name
- **Category** (Required) - Dropdown list from existing categories
- **Sold By** (Required) - Dropdown: "Each" or "Weight (kg)"

#### Pricing

- **Price** (Required) - Selling price in ฿ (Thai Baht)
- **Cost** (Optional) - Cost price for profit tracking

#### Identification

- **SKU** (Required) - Auto-generated starting from 10001
  - Format: 10001, 10002, 10003...
  - Based on total products count
  - Can be manually edited
- **Barcode** (Optional) - Can scan or enter manually

#### Stock Tracking

- **Track Stock** - Toggle switch (ON/OFF)
- When enabled, shows:
  - **In Stock** (Required) - Current stock quantity
  - **Low Stock Alert** (Required) - Alert threshold
- When adding initial stock:
  - Creates stock movement entry
  - Records cashier details
  - Logs as "purchase" type

#### Visual Representation

Two options: **Color** or **Image**

**Color Option:**

- 8 predefined colors available:
  - GREY (#9CA3AF)
  - RED (#EF4444)
  - PINK (#EC4899)
  - ORANGE (#F97316)
  - YELLOW (#EAB308)
  - GREEN (#22C55E)
  - BLUE (#3B82F6)
  - PURPLE (#A855F7)
- Shows as colored circle in product list

**Image Option:**

- Upload button with preview
- Max file size: 5MB
- Accepted formats: JPG, PNG, GIF
- Can edit uploaded image
- Can delete and re-upload
- Shows image thumbnail in product list

## User Interface

### Products List View

Each product card displays:

- **Left**: Color circle or image thumbnail
- **Center**:
  - Product name (large, bold)
  - SKU and category (small, gray)
  - Stock info if tracked (extra small)
- **Right**:
  - Price (large, green)
  - Edit button (outline)
  - Delete button (red outline)

### Add Product Button

- Located in header next to search bar
- Visible only on "Products" tab
- Blue primary button with "+" icon

### Product Modal

- Large modal (max-w-3xl)
- Scrollable content
- Clean, organized sections:
  1. Basic info (Name)
  2. Category & Sold By (2 columns)
  3. Price & Cost (2 columns)
  4. SKU & Barcode (2 columns)
  5. Track Stock section (with toggle)
  6. Display representation (Color/Image)
  7. Action buttons (Cancel/Create)

## Technical Implementation

### State Management

```javascript
const [productFormData, setProductFormData] = useState({
  name: "",
  category: "",
  soldBy: "each",
  price: "",
  cost: "",
  sku: "",
  barcode: "",
  trackStock: false,
  inStock: "",
  lowStock: "",
  representationType: "color",
  color: "GREY",
  image: null,
  imagePreview: null,
});
```

### Key Functions

#### `generateNextSKU()`

- Finds highest SKU number from products
- Returns next number (e.g., 10001, 10002...)
- Fallback: 10001 if no products exist

#### `handleAddProduct()`

- Opens modal
- Resets form data
- Auto-generates next SKU

#### `handleEditProduct(product)`

- Opens modal with product data
- Determines representation type from existing data
- Shows image preview if exists

#### `handleImageUpload(e)`

- Validates file type (must be image)
- Validates file size (max 5MB)
- Creates base64 preview
- Stores file and preview in state

#### `handleSubmitProduct(e)`

- Creates product data object
- Saves to Firebase
- If stock tracking enabled and initial stock > 0:
  - Creates stock movement entry
  - Records cashier info
  - Logs purchase type
- Reloads product list
- Shows success toast

### Stock Movement Integration

When adding a product with initial stock:

```javascript
const stockMovement = {
  productId: productData.sku,
  productName: productData.name,
  type: "purchase",
  quantity: parseFloat(inStock),
  from: 0,
  to: parseFloat(inStock),
  note: "Initial stock from POS",
  cashierId: user?.id || null,
  cashierName: user?.name || "System",
  createdAt: new Date(),
};
```

## Data Structure

### Product Object

```javascript
{
  id: "auto-generated",
  name: "Coffee",
  category: "Beverages",
  soldBy: "each", // or "weight"
  price: 50.00,
  cost: 30.00,
  sku: "10001",
  barcode: "1234567890",
  trackStock: true,
  inStock: 100,
  lowStock: 10,
  color: "GREY", // if representation is color
  image: "base64...", // if representation is image
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

## Validation Rules

### Required Fields

- Name
- Category
- Sold By
- Price
- SKU

### Conditional Required

- If Track Stock is ON:
  - In Stock (required)
  - Low Stock (required)

### Optional Fields

- Cost
- Barcode
- Image (if using image representation)

### File Validation

- Type: Must be image/\*
- Size: Max 5MB
- Shows error toast if validation fails

## UI/UX Features

### Stock Tracking Toggle

- Custom toggle switch design
- Blue when enabled
- Shows/hides stock fields dynamically
- Smooth transitions

### Color Selection

- Grid of 8 colors (4 columns)
- Visual preview with colored circles
- Border highlights selected color
- Hover effect: scale up slightly
- Shows color name below

### Image Upload

- Drag visual with upload icon
- Clear instructions (max size, formats)
- Preview with edit/delete buttons
- Floating action buttons on image
- Smooth hover effects

### Form Validation

- Browser native validation
- Required field indicators (\*)
- Helpful placeholder text
- Inline help text for complex fields

## Integration Points

### Firebase Collections

- **products** - Main product data
- **stockMovements** - Stock tracking history (TODO)
- **purchaseOrders** - Purchase records (TODO)

### Related Features

- Categories dropdown (from categories collection)
- Cashier info (from active cashier session)
- Product display in SalesSection
- Stock alerts in dashboard (TODO)

## Future Enhancements

### Planned Features

- [ ] Stock movements collection implementation
- [ ] Purchase orders tracking
- [ ] Low stock alerts dashboard
- [ ] Bulk product import (CSV)
- [ ] Product variants (size, color options)
- [ ] Product tags/labels
- [ ] Multi-image support
- [ ] Product history/audit log
- [ ] Barcode scanner integration
- [ ] Print product labels
- [ ] Product bundles/packages
- [ ] Discount rules per product

### Improvements

- [ ] Image optimization (compress before upload)
- [ ] Image cropping tool
- [ ] Stock adjustment feature
- [ ] Quick edit mode (inline editing)
- [ ] Duplicate product feature
- [ ] Export products list
- [ ] Product statistics dashboard

## Usage Guide

### Adding a New Product

1. **Navigate to Products**

   - Click "Products" in left menu
   - Click "Add Product" button

2. **Fill Required Fields**

   - Enter product name
   - Select category from dropdown
   - Choose "Each" or "Weight"
   - Enter price

3. **Add Identification**

   - SKU is auto-generated (can edit)
   - Add barcode if available (optional)

4. **Configure Stock (Optional)**

   - Toggle "Track Stock" ON
   - Enter current stock quantity
   - Set low stock alert threshold

5. **Choose Display Type**

   - Option 1: Select a color from palette
   - Option 2: Upload product image

6. **Save Product**
   - Click "Create Product"
   - Product appears in list immediately

### Editing a Product

1. Find product in list
2. Click Edit button (pencil icon)
3. Modify any fields
4. Click "Update Product"

### Deleting a Product

1. Find product in list
2. Click Delete button (trash icon)
3. Confirm deletion
4. Product removed from list

## Stock Movement Logic

When initial stock is added:

- If stock = 0: No movement recorded
- If stock > 0:
  - Type: "purchase"
  - From: 0
  - To: Initial stock quantity
  - Cashier: Current logged-in cashier
  - Note: "Initial stock from POS"

This provides audit trail showing:

- Who added the stock
- When it was added
- Initial quantity

## Best Practices

### SKU Management

- Let system auto-generate SKUs
- Keep SKUs sequential
- Don't reuse deleted SKUs
- Use SKU as primary identifier

### Stock Tracking

- Enable for physical products
- Set realistic low stock thresholds
- Review low stock alerts daily
- Update stock after receiving shipments

### Images

- Use clear, well-lit photos
- Square images work best
- Compress before upload
- Use colors for simple items

### Pricing

- Always set cost for profit tracking
- Update prices regularly
- Consider setting minimum stock for popular items

## Troubleshooting

### Image Won't Upload

- Check file size (must be < 5MB)
- Check file type (must be image)
- Try compressing image first
- Try different format (JPG instead of PNG)

### SKU Conflicts

- SKUs must be unique
- System prevents duplicates
- Edit SKU manually if needed
- Check existing products first

### Stock Not Tracking

- Ensure "Track Stock" toggle is ON
- Both In Stock and Low Stock required
- Values must be numbers
- Cannot be negative

### Category Not Available

- Categories created in admin panel
- Must have at least one category
- Contact admin if missing categories
