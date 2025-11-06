# Candy Kush Products API Documentation

## Base URL

```
Production: https://candy-kush-kiosk.vercel.app/api
Development: http://localhost:3000/api
```

## Authentication & CORS

This API uses **CORS-based access control**. Only the following origins are allowed:

- ✅ `https://pos-candy-kush.vercel.app` (Production POS)
- ✅ `http://localhost:3000` (Local development)
- ✅ `http://localhost:3001` (Local development)

### Headers Required

```
Origin: https://pos-candy-kush.vercel.app
```

---

## Endpoints

### 1. Get All Products

Fetch all products from the products collection with optional filtering.

**Endpoint:**

```
GET /api/products
```

**Query Parameters:**

| Parameter       | Type    | Required | Description                               |
| --------------- | ------- | -------- | ----------------------------------------- |
| `categoryId`    | string  | No       | Filter by category ID                     |
| `subcategoryId` | string  | No       | Filter by subcategory ID                  |
| `isActive`      | boolean | No       | Filter by active status (true/false)      |
| `search`        | string  | No       | Search in product name (case-insensitive) |

**Example Requests:**

```javascript
// Fetch all products
fetch("https://your-domain.vercel.app/api/products", {
  headers: {
    Origin: "https://pos-candy-kush.vercel.app",
  },
});

// Fetch products by category
fetch("https://your-domain.vercel.app/api/products?categoryId=flowers", {
  headers: {
    Origin: "https://pos-candy-kush.vercel.app",
  },
});

// Fetch active products only
fetch("https://your-domain.vercel.app/api/products?isActive=true", {
  headers: {
    Origin: "https://pos-candy-kush.vercel.app",
  },
});

// Search products
fetch("https://your-domain.vercel.app/api/products?search=kush", {
  headers: {
    Origin: "https://pos-candy-kush.vercel.app",
  },
});
```

**Response Format:**

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "product123",
        "productId": "PROD001",
        "name": "OG Kush",
        "description": "Premium indoor strain",
        "sku": "SKU-001",

        "categoryId": "flowers",
        "categoryName": "Flowers",
        "categoryImage": "/categories/flowers.jpg",

        "subcategoryId": "indica",
        "subcategoryName": "Indica",
        "subcategoryImage": "/subcategories/indica.jpg",

        "hasVariants": true,
        "variants": [
          {
            "name": "1g",
            "price": 300,
            "memberPrice": 270,
            "sku": "SKU-001-1G"
          }
        ],

        "price": 300,
        "memberPrice": 270,

        "mainImage": "/products/og-kush.jpg",
        "images": [
          {
            "url": "/products/og-kush-1.jpg",
            "path": "products/prod001/image1.jpg",
            "name": "image1.jpg"
          }
        ],
        "backgroundImage": "/backgrounds/product-bg.jpg",
        "backgroundFit": "contain",
        "textColor": "#000000",

        "modelUrl": "/models/product.glb",
        "modelRotationX": 90,
        "modelRotationY": 75,
        "modelRotationZ": 2.5,

        "isActive": true,
        "isFeatured": false,
        "notes": "Premium quality",

        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-15T00:00:00Z"
      }
    ],
        "loyverseVariantId": "var_456"
      }
    ],
    "categories": [
      {
        "id": "flowers",
        "name": "Flowers",
        "image": "/categories/flowers.jpg",
        "backgroundImage": "/backgrounds/flowers-bg.jpg",
        "backgroundFit": "cover",
        "displayOrder": 1,
        "isActive": true
      }
    ],
    "subcategories": [
      {
        "id": "indica",
        "name": "Indica",
        "categoryId": "flowers",
        "image": "/subcategories/indica.jpg",
        "backgroundImage": "/backgrounds/indica-bg.jpg",
        "backgroundFit": "cover",
        "displayOrder": 1,
        "isActive": true
      }
    ]
  },
  "meta": {
    "total": 150,
    "filtered": 45,
    "timestamp": "2025-11-06T12:00:00Z",
    "filters": {
      "categoryId": "flowers",
      "subcategoryId": null,
      "isActive": "true",
      "search": null
    }
  }
}
```

**Error Responses:**

```json
// 403 Forbidden - Unauthorized origin
{
  "success": false,
  "error": "Unauthorized origin",
  "message": "This API can only be accessed from authorized domains"
}

// 500 Internal Server Error
{
  "success": false,
  "error": "Internal server error",
  "message": "Failed to fetch products"
}
```

---

## Product Object Schema

### Product Fields

| Field              | Type      | Description                                              |
| ------------------ | --------- | -------------------------------------------------------- |
| `id`               | string    | Unique product ID                                        |
| `productId`        | string    | Product identifier (same as id)                          |
| `name`             | string    | Product name                                             |
| `description`      | string    | Product description                                      |
| `sku`              | string    | Stock Keeping Unit code                                  |
| `categoryId`       | string    | Category ID reference                                    |
| `categoryName`     | string    | Category display name                                    |
| `categoryImage`    | string    | Category image URL                                       |
| `subcategoryId`    | string    | Subcategory ID reference                                 |
| `subcategoryName`  | string    | Subcategory display name                                 |
| `subcategoryImage` | string    | Subcategory image URL                                    |
| `hasVariants`      | boolean   | Whether product has variants                             |
| `variants`         | array     | Array of variant objects (name, price, memberPrice, sku) |
| `price`            | number    | Base price in THB (for non-variant products)             |
| `memberPrice`      | number    | Member discount price (for non-variant products)         |
| `mainImage`        | string    | Primary product image URL                                |
| `images`           | array     | Array of image objects with url, path, name              |
| `backgroundImage`  | string    | Background image URL for product display                 |
| `backgroundFit`    | string    | CSS background-fit value (cover, contain, etc.)          |
| `textColor`        | string    | Text color hex code for product display                  |
| `modelUrl`         | string    | 3D model file URL (.glb format)                          |
| `modelRotationX`   | number    | 3D model X-axis rotation value                           |
| `modelRotationY`   | number    | 3D model Y-axis rotation value                           |
| `modelRotationZ`   | number    | 3D model Z-axis rotation value                           |
| `notes`            | string    | Additional product notes                                 |
| `isActive`         | boolean   | Product active status                                    |
| `isFeatured`       | boolean   | Featured product flag                                    |
| `createdAt`        | timestamp | Creation timestamp                                       |
| `updatedAt`        | timestamp | Last update timestamp                                    |

---

## Usage Examples

### React/Next.js Example

```javascript
import { useState, useEffect } from "react";

function ProductsList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch(
          "https://your-kiosk-domain.vercel.app/api/products?isActive=true"
        );

        const data = await response.json();

        if (data.success) {
          setProducts(data.data.products);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {products.map((product) => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <p>{product.description}</p>
          <p>Price: ฿{product.price}</p>
          <p>
            Stock: {product.stock} {product.stockUnit}
          </p>
        </div>
      ))}
    </div>
  );
}
```

### Fetch Products by Category

```javascript
async function getProductsByCategory(categoryId) {
  const response = await fetch(
    `https://your-kiosk-domain.vercel.app/api/products?categoryId=${categoryId}&isActive=true`
  );

  const data = await response.json();
  return data.success ? data.data.products : [];
}

// Usage
const flowerProducts = await getProductsByCategory("flowers");
```

### Search Products

```javascript
async function searchProducts(searchTerm) {
  const response = await fetch(
    `https://your-kiosk-domain.vercel.app/api/products?search=${encodeURIComponent(
      searchTerm
    )}&isActive=true`
  );

  const data = await response.json();
  return data.success ? data.data.products : [];
}

// Usage
const results = await searchProducts("kush");
```

---

## Rate Limiting

Currently, there are no rate limits implemented. However, it's recommended to:

- Cache responses on the client side
- Implement debouncing for search queries
- Avoid excessive API calls

---

## Security Notes

1. **CORS Protection**: Only requests from `https://pos-candy-kush.vercel.app` are allowed
2. **Read-Only**: This API only supports GET requests (no POST/PUT/DELETE)
3. **No Authentication Required**: Access is controlled via CORS
4. **Public Data**: All returned data is considered public

---

## Support

For issues or questions:

- Check the kiosk application logs
- Verify CORS origin matches exactly
- Ensure Firestore rules allow read access to products collection

---

## Changelog

### Version 1.0.0 (2025-11-06)

- Initial API release
- GET /api/products endpoint
- CORS-based access control
- Filtering by category, subcategory, active status
- Search functionality
