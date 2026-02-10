const fs = require("fs");
const path = require("path");
const axios = require("axios");

/**
 * Database Extractor for Candy Kush POS
 * Extracts all product data, categories, and images from APIs
 */

// API endpoints
const API_BASE_URL = "https://pos-candy-kush.vercel.app";
const KIOSK_API_BASE_URL = "https://candy-kush-kiosk.vercel.app";

/**
 * Sanitize filename to remove invalid characters
 */
function sanitizeFilename(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, "_") // Replace invalid characters with underscore
    .replace(/\s+/g, "_") // Replace spaces with underscore
    .replace(/_{2,}/g, "_") // Replace multiple underscores with single
    .replace(/^_+|_+$/g, "") // Remove leading/trailing underscores
    .toLowerCase();
}

/**
 * Download image from URL and save to pos-image folder
 */
async function downloadImage(imageUrl, filename) {
  try {
    const response = await axios({
      method: "GET",
      url: imageUrl,
      responseType: "stream",
      timeout: 30000, // 30 second timeout
    });

    const imagePath = path.join(__dirname, "..", "..", "pos-image", filename);

    // Ensure pos-image directory exists
    const imageDir = path.dirname(imagePath);
    if (!fs.existsSync(imageDir)) {
      fs.mkdirSync(imageDir, { recursive: true });
    }

    // Save image
    const writer = fs.createWriteStream(imagePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  } catch (error) {
    console.error(`Failed to download image ${imageUrl}:`, error.message);
    return null;
  }
}

/**
 * Fetch all products from API
 */
async function fetchProducts() {
  try {
    console.log("📦 Fetching products from API...");
    const response = await axios.get(`${API_BASE_URL}/api/products/list`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch products:", error.message);
    throw error;
  }
}

/**
 * Fetch all categories from API
 */
async function fetchCategories() {
  try {
    console.log("📂 Fetching categories from API...");
    const response = await axios.get(`${KIOSK_API_BASE_URL}/api/categories`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch categories:", error.message);
    // Try alternative endpoint
    try {
      console.log("🔄 Trying alternative categories endpoint...");
      const response = await axios.get(`${API_BASE_URL}/api/categories`);
      return response.data;
    } catch (altError) {
      console.error(
        "Alternative categories endpoint also failed:",
        altError.message,
      );
      return { data: [], count: 0 };
    }
  }
}

/**
 * Extract all products and categories
 */
async function extractData() {
  try {
    console.log("🔄 Starting data extraction from APIs...");

    // Fetch categories
    const categoriesResponse = await fetchCategories();
    const categories = categoriesResponse.data || categoriesResponse;
    console.log(
      `✅ Found ${Array.isArray(categories) ? categories.length : 0} categories`,
    );

    // Fetch products
    const productsResponse = await fetchProducts();
    const products = productsResponse.data || productsResponse;
    console.log(
      `✅ Found ${Array.isArray(products) ? products.length : 0} products`,
    );

    // Create category lookup map
    const categoryMap = {};
    if (Array.isArray(categories)) {
      categories.forEach((cat) => {
        categoryMap[cat.id || cat.itemId] = cat;
      });
    }

    // Prepare data structure
    const extractedData = {
      metadata: {
        extractedAt: new Date().toISOString(),
        totalProducts: Array.isArray(products) ? products.length : 0,
        totalCategories: Array.isArray(categories) ? categories.length : 0,
        version: "1.0",
        source: "API",
      },
      categories: Array.isArray(categories) ? categories : [],
      products: Array.isArray(products)
        ? products.map((product) => ({
            ...product,
            categoryName: product.categoryId
              ? categoryMap[product.categoryId]?.name
              : null,
            categoryColor: product.categoryId
              ? categoryMap[product.categoryId]?.color
              : null,
          }))
        : [],
    };

    // Save to JSON file
    const jsonPath = path.join(__dirname, "product-data-complete.json");
    fs.writeFileSync(jsonPath, JSON.stringify(extractedData, null, 2));
    console.log(`💾 Product data saved to: ${jsonPath}`);

    // Extract images
    console.log("🖼️  Downloading product images...");
    let imageCount = 0;
    let failedImages = 0;

    if (Array.isArray(products)) {
      for (const product of products) {
        if (product.imageUrl && product.imageUrl.trim()) {
          // Create filename based on product name (store name)
          const filename = `${sanitizeFilename(product.name)}.jpg`;

          console.log(`Downloading image for: ${product.name} -> ${filename}`);

          try {
            await downloadImage(product.imageUrl, filename);
            imageCount++;
            console.log(`✅ Downloaded: ${filename}`);
          } catch (error) {
            failedImages++;
            console.error(
              `❌ Failed to download image for ${product.name}:`,
              error.message,
            );
          }

          // Add small delay to avoid overwhelming the server
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    console.log(`\n🎉 Extraction complete!`);
    console.log(`📊 Summary:`);
    console.log(
      `   - Categories: ${Array.isArray(categories) ? categories.length : 0}`,
    );
    console.log(
      `   - Products: ${Array.isArray(products) ? products.length : 0}`,
    );
    console.log(`   - Images downloaded: ${imageCount}`);
    console.log(`   - Images failed: ${failedImages}`);
    console.log(`📁 Images saved to: pos-image/ folder`);
    console.log(`📄 Data saved to: product-data-complete.json`);
  } catch (error) {
    console.error("❌ Error during extraction:", error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log("🚀 Starting Candy Kush POS Database Extractor");
  console.log("=".repeat(50));

  await extractData();
}

// Handle process termination
process.on("SIGINT", () => {
  console.log("\n⚠️  Received SIGINT, exiting...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n⚠️  Received SIGTERM, exiting...");
  process.exit(0);
});

// Run the extraction
main().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
