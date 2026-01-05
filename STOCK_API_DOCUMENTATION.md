# Stock Check API Documentation

## Overview

This API allows external applications (like kiosks) to check real-time stock levels for products in the POS system.

## Base URL

**Production:**

```
https://pos-candy-kush.vercel.app/api
```

**Local Development:**

```
http://localhost:3000/api
```

---

## Endpoints

### 1. Get Product List

Get a list of all products in the POS system. Use this to get product IDs (itemId) for stock checking.

**Endpoint:** `GET /api/products/list`

**Parameters:**

| Parameter     | Type    | Required | Description                                    |
| ------------- | ------- | -------- | ---------------------------------------------- |
| categoryId    | string  | No       | Filter by category ID                          |
| availableOnly | boolean | No       | Only return products available for sale (true) |
| inStockOnly   | boolean | No       | Only return products with stock (true)         |

**Request Example:**

```bash
# Get all products
curl "https://pos-candy-kush.vercel.app/api/products/list"

# Get only available products
curl "https://pos-candy-kush.vercel.app/api/products/list?availableOnly=true"

# Get only in-stock products
curl "https://pos-candy-kush.vercel.app/api/products/list?inStockOnly=true"

# Get products by category
curl "https://pos-candy-kush.vercel.app/api/products/list?categoryId=CAT001"

# Using JavaScript fetch
fetch('https://pos-candy-kush.vercel.app/api/products/list?availableOnly=true')
  .then(response => response.json())
  .then(data => console.log(data));
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "itemId": "ABC123",
      "name": "Product Name",
      "sku": "10001",
      "barcode": "1234567890",
      "price": 100.0,
      "cost": 60.0,
      "stock": 50,
      "trackStock": true,
      "lowStock": 10,
      "isLowStock": false,
      "isOutOfStock": false,
      "availableForSale": true,
      "categoryId": "CAT001",
      "imageUrl": "https://example.com/image.jpg",
      "color": "#FF5733",
      "description": "Product description"
    }
  ],
  "count": 1,
  "filters": {
    "categoryId": null,
    "availableOnly": true,
    "inStockOnly": false
  }
}
```

**Response Fields:**

| Field            | Type    | Description                               |
| ---------------- | ------- | ----------------------------------------- |
| success          | boolean | Whether the request was successful        |
| data             | array   | Array of product objects                  |
| count            | number  | Number of products returned               |
| filters          | object  | Applied filters                           |
| itemId           | string  | Product ID (use this for stock check API) |
| name             | string  | Product name                              |
| sku              | string  | Product SKU                               |
| barcode          | string  | Product barcode                           |
| price            | number  | Selling price                             |
| cost             | number  | Purchase cost                             |
| stock            | number  | Current stock quantity                    |
| trackStock       | boolean | Whether stock tracking is enabled         |
| lowStock         | number  | Low stock alert threshold                 |
| isLowStock       | boolean | Whether current stock is below threshold  |
| isOutOfStock     | boolean | Whether product is out of stock           |
| availableForSale | boolean | Whether product is available for sale     |
| categoryId       | string  | Category ID                               |
| imageUrl         | string  | Product image URL                         |
| color            | string  | Product color (hex code)                  |
| description      | string  | Product description                       |

**Error Response - Server Error (500 Internal Server Error):**

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Error details here"
}
```

---

### 2. Check Stock

Check the current stock level for a specific product.

**Endpoint:** `GET /api/stock/check`

**Parameters:**

| Parameter | Type   | Required | Description                   |
| --------- | ------ | -------- | ----------------------------- |
| itemId    | string | Yes      | The product ID to check stock |

**Request Example:**

```bash
# Using curl (Production)
curl "https://pos-candy-kush.vercel.app/api/stock/check?itemId=ABC123"

# Using curl (Local Development)
curl "http://localhost:3000/api/stock/check?itemId=ABC123"

# Using JavaScript fetch (Production)
fetch('https://pos-candy-kush.vercel.app/api/stock/check?itemId=ABC123')
  .then(response => response.json())
  .then(data => console.log(data));

# Using axios (Production)
axios.get('https://pos-candy-kush.vercel.app/api/stock/check', {
  params: { itemId: 'ABC123' }
})
.then(response => console.log(response.data));
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "itemId": "ABC123",
    "name": "Product Name",
    "sku": "10001",
    "barcode": "1234567890",
    "stock": 50,
    "trackStock": true,
    "lowStock": 10,
    "isLowStock": false,
    "isOutOfStock": false,
    "availableForSale": true,
    "price": 100.0,
    "cost": 60.0,
    "categoryId": "CAT001"
  }
}
```

**Response Fields:**

| Field            | Type    | Description                                        |
| ---------------- | ------- | -------------------------------------------------- |
| success          | boolean | Whether the request was successful                 |
| data             | object  | Stock information object                           |
| itemId           | string  | Product ID                                         |
| name             | string  | Product name                                       |
| sku              | string  | Product SKU (Stock Keeping Unit)                   |
| barcode          | string  | Product barcode                                    |
| stock            | number  | Current stock quantity                             |
| trackStock       | boolean | Whether stock tracking is enabled                  |
| lowStock         | number  | Low stock alert threshold                          |
| isLowStock       | boolean | Whether current stock is below low stock threshold |
| isOutOfStock     | boolean | Whether product is out of stock (0 or less)        |
| availableForSale | boolean | Whether product is available for sale              |
| price            | number  | Selling price                                      |
| cost             | number  | Purchase cost                                      |
| categoryId       | string  | Category ID the product belongs to                 |

**Error Response - Missing itemId (400 Bad Request):**

```json
{
  "success": false,
  "error": "itemId is required",
  "message": "Please provide an itemId parameter"
}
```

**Error Response - Product Not Found (404 Not Found):**

```json
{
  "success": false,
  "error": "Product not found",
  "message": "No product found with itemId: ABC123"
}
```

**Error Response - Server Error (500 Internal Server Error):**

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Error details here"
}
```

---

## Integration Examples

### React/Next.js Example

```javascript
import { useState, useEffect } from "react";

function StockChecker({ productId }) {
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use production URL
  const API_URL = "https://pos-candy-kush.vercel.app";

  useEffect(() => {
    async function checkStock() {
      try {
        setLoading(true);
        const response = await fetch(
          `${API_URL}/api/stock/check?itemId=${productId}`
        );
        const data = await response.json();

        if (data.success) {
          setStock(data.data);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (productId) {
      checkStock();
    }
  }, [productId]);

  if (loading) return <div>Loading stock...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!stock) return null;

  return (
    <div>
      <h3>{stock.name}</h3>
      <p>Stock: {stock.stock}</p>
      {stock.isOutOfStock && <span>Out of Stock</span>}
      {stock.isLowStock && <span>Low Stock Warning</span>}
    </div>
  );
}
```

### Vanilla JavaScript Example

```javascript
// Configuration
const API_URL = "https://pos-candy-kush.vercel.app";

async function checkProductStock(itemId) {
  try {
    const response = await fetch(`${API_URL}/api/stock/check?itemId=${itemId}`);

    const result = await response.json();

    if (result.success) {
      const stock = result.data;
      console.log(`Product: ${stock.name}`);
      console.log(`Current Stock: ${stock.stock}`);
      console.log(`Available: ${!stock.isOutOfStock}`);
      return stock;
    } else {
      console.error(`Error: ${result.error}`);
      return null;
    }
  } catch (error) {
    console.error("Failed to check stock:", error);
    return null;
  }
}

// Usage
checkProductStock("ABC123");
```

### Complete Integration Example - Product List + Stock Check

```javascript
// Configuration
const API_URL = "https://pos-candy-kush.vercel.app";

// Get all products and their stock levels
async function getAllProductsWithStock() {
  try {
    // First, get the product list
    const response = await fetch(
      `${API_URL}/api/products/list?availableOnly=true`
    );
    const result = await response.json();

    if (result.success) {
      console.log(`Found ${result.count} products`);

      // Display products with stock info
      result.data.forEach((product) => {
        console.log(`
          Product: ${product.name}
          Item ID: ${product.itemId}
          SKU: ${product.sku}
          Price: ฿${product.price}
          Stock: ${product.stock}
          Status: ${
            product.isOutOfStock
              ? "OUT OF STOCK"
              : product.isLowStock
              ? "LOW STOCK"
              : "IN STOCK"
          }
        `);
      });

      return result.data;
    }
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return [];
  }
}

// Get specific product and check stock
async function getProductByBarcode(barcode) {
  try {
    // Get all products
    const response = await fetch(`${API_URL}/api/products/list`);
    const result = await response.json();

    if (result.success) {
      // Find product by barcode
      const product = result.data.find((p) => p.barcode === barcode);

      if (product) {
        console.log(`Found: ${product.name}`);
        console.log(`Item ID: ${product.itemId}`);
        console.log(`Stock: ${product.stock}`);
        return product;
      } else {
        console.log(`No product found with barcode: ${barcode}`);
        return null;
      }
    }
  } catch (error) {
    console.error("Failed to search product:", error);
    return null;
  }
}

// Usage Examples
getAllProductsWithStock();
getProductByBarcode("1234567890");
```

### Kiosk Integration Example

```javascript
// Complete Kiosk System with Product List and Stock Check
class KioskStockDisplay {
  constructor(apiBaseUrl) {
    this.apiUrl = apiBaseUrl;
    this.products = [];
  }

  // Load all products on kiosk startup
  async loadProducts() {
    try {
      const response = await fetch(
        `${this.apiUrl}/api/products/list?availableOnly=true&inStockOnly=true`
      );
      const result = await response.json();

      if (result.success) {
        this.products = result.data;
        console.log(`Loaded ${result.count} products`);
        this.displayProductGrid();
        return this.products;
      }
    } catch (error) {
      this.showError("Failed to load products");
      console.error(error);
    }
  }

  // Display all products in a grid
  displayProductGrid() {
    const container = document.getElementById("product-grid");
    container.innerHTML = "";

    this.products.forEach((product) => {
      const productCard = this.createProductCard(product);
      container.appendChild(productCard);
    });
  }

  // Create product card element
  createProductCard(product) {
    const card = document.createElement("div");
    card.className = "product-card";
    card.onclick = () => this.selectProduct(product.itemId);

    card.innerHTML = `
      <img src="${product.imageUrl || "/placeholder.png"}" alt="${
      product.name
    }">
      <h3>${product.name}</h3>
      <p class="price">฿${product.price}</p>
      <p class="stock">Stock: ${product.stock}</p>
      ${
        product.isLowStock ? '<span class="badge warning">Low Stock</span>' : ""
      }
    `;

    return card;
  }

  // Find product by barcode (when scanning)
  async findProductByBarcode(barcode) {
    const product = this.products.find((p) => p.barcode === barcode);

    if (product) {
      // Check real-time stock before displaying
      await this.selectProduct(product.itemId);
    } else {
      this.showError(`Product not found: ${barcode}`);
    }
  }

  // Select product and check real-time stock
  async selectProduct(itemId) {
    try {
      const response = await fetch(
        `${this.apiUrl}/api/stock/check?itemId=${itemId}`
      );
      const result = await response.json();

      if (!result.success) {
        this.showError(result.error);
        return;
      }

      const stock = result.data;

      // Update kiosk display
      this.updateDisplay({
        name: stock.name,
        price: stock.price,
        stock: stock.stock,
        available: stock.availableForSale && !stock.isOutOfStock,
      });

      // Show warnings
      if (stock.isOutOfStock) {
        this.showOutOfStock();
      } else if (stock.isLowStock) {
        this.showLowStockWarning();
      }
    } catch (error) {
      this.showError("Failed to connect to POS system");
    }
  }

  updateDisplay(data) {
    // Update your kiosk UI here
    document.getElementById("product-name").textContent = data.name;
    document.getElementById("product-price").textContent = `฿${data.price}`;
    document.getElementById("stock-level").textContent = `Stock: ${data.stock}`;

    const buyButton = document.getElementById("buy-button");
    buyButton.disabled = !data.available;
  }

  showError(message) {
    console.error(message);
    alert(message);
  }

  showOutOfStock() {
    document.getElementById("stock-status").textContent = "OUT OF STOCK";
    document.getElementById("stock-status").className = "error";
  }

  showLowStockWarning() {
    document.getElementById("stock-status").textContent = "LIMITED STOCK";
    document.getElementById("stock-status").className = "warning";
  }
}

// Initialize kiosk with production URL and load products
const kiosk = new KioskStockDisplay("https://pos-candy-kush.vercel.app");

// Load products on startup
kiosk.loadProducts();

// Handle barcode scanner
function onBarcodeScanned(barcode) {
  kiosk.findProductByBarcode(barcode);
}

// Handle product selection from grid
function onProductSelected(itemId) {
  kiosk.selectProduct(itemId);
}
```

---

## Rate Limiting

Currently, there are no rate limits on this API. However, for production use, it's recommended to:

- Cache stock data for 5-10 seconds to avoid excessive requests
- Implement exponential backoff for failed requests
- Monitor your usage to avoid overwhelming the server

---

## Security Considerations

### For Production Deployment:

1. **Enable CORS** - Configure allowed origins in `next.config.mjs`:

```javascript
async headers() {
  return [
    {
      source: "/api/:path*",
      headers: [
        { key: "Access-Control-Allow-Origin", value: "https://your-kiosk-domain.com" },
        { key: "Access-Control-Allow-Methods", value: "GET" },
      ],
    },
  ];
}
```

2. **Add API Key Authentication** (Optional):

```javascript
// In route.js, add authentication check
const apiKey = request.headers.get("x-api-key");
if (apiKey !== process.env.STOCK_API_KEY) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

3. **Use HTTPS** - Always use HTTPS in production
4. **Monitor Usage** - Set up logging and monitoring for API calls

---

## Testing

### Test with Browser (Production)

Simply open in your browser:

```
https://pos-candy-kush.vercel.app/api/stock/check?itemId=YOUR_PRODUCT_ID
```

### Test with Browser (Local Development)

```
http://localhost:3000/api/stock/check?itemId=YOUR_PRODUCT_ID
```

### Test with Postman

**Production:**

1. Create a new GET request
2. URL: `https://pos-candy-kush.vercel.app/api/stock/check`
3. Add Query Parameter: `itemId` = `YOUR_PRODUCT_ID`
4. Send request

**Local Development:**

1. Create a new GET request
2. URL: `http://localhost:3000/api/stock/check`
3. Add Query Parameter: `itemId` = `YOUR_PRODUCT_ID`
4. Send request

### Test with cURL

**Production:**

```bash
curl -X GET "https://pos-candy-kush.vercel.app/api/stock/check?itemId=YOUR_PRODUCT_ID"
```

**Local Development:**

```bash
curl -X GET "http://localhost:3000/api/stock/check?itemId=YOUR_PRODUCT_ID"
```

---

## Support

For issues or questions about the Stock Check API:

1. Check the error message in the response
2. Verify the itemId exists in your POS system
3. Check server logs for detailed error information
4. Ensure your Firebase configuration is correct

---

## Changelog

### Version 1.0.0 (2025-10-30)

- Initial release
- GET /api/stock/check endpoint
- Real-time stock level checking
- Low stock and out-of-stock indicators
