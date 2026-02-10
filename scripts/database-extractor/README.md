# Candy Kush POS Database Extractor

This script extracts all product data, categories, and images from the Candy Kush POS IndexedDB database.

## Features

- ✅ Extracts all products with complete data (name, price, stock, barcode, SKU, etc.)
- ✅ Extracts all product categories
- ✅ Downloads all product images and saves them with sanitized filenames
- ✅ Saves complete data to JSON format
- ✅ Creates organized folder structure for images

## Output

### JSON Data File

- **File**: `product-data-complete.json`
- **Location**: `scripts/database-extractor/`
- **Contents**:
  - All product categories
  - All products with category information
  - Metadata (extraction timestamp, counts)

### Images Folder

- **Folder**: `scripts/database-extractor/pos-image/`
- **Location**: Project scripts folder
- **Naming**: Images are named using the product name (sanitized)
  - Example: "Blue Dream" → `blue_dream.jpg`
  - Invalid characters are replaced with underscores
  - All lowercase for consistency

## Usage

### Prerequisites

- Node.js installed
- POS application must have been run at least once to create the IndexedDB database
- Internet connection for downloading images

### Running the Script

1. Navigate to the project root directory:

   ```bash
   cd /path/to/pos-candy-kush
   ```

2. Run the extraction script:
   ```bash
   node scripts/database-extractor/extract-products.js
   ```

### Example Output

```
🚀 Starting Candy Kush POS Database Extractor
==================================================
🔄 Starting data extraction from APIs...
📂 Fetching categories from API...
✅ Found 13 categories
📦 Fetching products from API...
✅ Found 263 products
💾 Product data saved to: scripts/database-extractor/product-data-complete.json
🖼️  Downloading product images...
Downloading image for: Blue Dream -> blue_dream.jpg
✅ Downloaded: blue_dream.jpg
...

🎉 Extraction complete!
📊 Summary:
   - Categories: 13
   - Products: 263
   - Images downloaded: 45
   - Images failed: 0
📁 Images saved to: scripts/database-extractor/pos-image/ folder
📄 Data saved to: product-data-complete.json
```

## Data Structure

### JSON Output Format

```json
{
  "metadata": {
    "extractedAt": "2024-01-29T10:30:00.000Z",
    "totalProducts": 247,
    "totalCategories": 15,
    "version": "1.0"
  },
  "categories": [
    {
      "id": "cat_123",
      "name": "Flower",
      "color": "#4CAF50",
      "source": "loyverse",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    }
  ],
  "products": [
    {
      "id": "prod_456",
      "name": "Blue Dream",
      "barcode": "123456789",
      "sku": "BD-001",
      "categoryId": "cat_123",
      "categoryName": "Flower",
      "categoryColor": "#4CAF50",
      "price": 12.99,
      "stock": 50,
      "imageUrl": "https://example.com/image.jpg",
      "source": "loyverse",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

## Troubleshooting

### Database Not Found

- Make sure the POS application has been run at least once
- Check that IndexedDB is enabled in your browser
- Verify you're running the script from the correct directory

### Image Download Failures

- Some images may fail to download due to network issues or invalid URLs
- The script will continue processing other images
- Failed downloads are logged but don't stop the extraction

### Permission Issues

- Ensure you have write permissions in the project directory
- The script will create necessary folders automatically

## Technical Details

- Uses Dexie.js to access IndexedDB (same library as the POS app)
- Downloads images with 30-second timeout
- Sanitizes filenames to remove invalid characters
- Includes error handling and graceful degradation
- Maintains original data integrity
