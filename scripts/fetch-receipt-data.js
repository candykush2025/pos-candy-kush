/**
 * Loyverse Receipt Data Fetcher
 *
 * This script fetches real receipt data from Loyverse API and saves it to DataMapping.md
 * to help understand the exact data structure and how to calculate revenue correctly.
 *
 * Usage: node scripts/fetch-receipt-data.js
 */

const fs = require("fs");
const path = require("path");

// Load environment variables from .env.local
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

// Loyverse API Configuration - Check both possible variable names
const LOYVERSE_API_TOKEN =
  process.env.NEXT_PUBLIC_LOYVERSE_API_TOKEN ||
  process.env.LOYVERSE_ACCESS_TOKEN ||
  "YOUR_API_TOKEN_HERE";
const LOYVERSE_API_URL = "https://api.loyverse.com/v1.0";

/**
 * Fetch receipts from Loyverse API
 */
async function fetchReceipts(limit = 5) {
  try {
    console.log("🔄 Fetching receipts from Loyverse API...");

    const response = await fetch(
      `${LOYVERSE_API_URL}/receipts?limit=${limit}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${LOYVERSE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Loyverse API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log(`✅ Fetched ${data.receipts?.length || 0} receipts`);

    return data.receipts || [];
  } catch (error) {
    console.error("❌ Error fetching receipts:", error.message);
    throw error;
  }
}

/**
 * Format receipt data for markdown display
 */
function formatReceiptForMarkdown(receipt, index) {
  let markdown = `\n## Receipt ${index + 1}: ${
    receipt.receipt_number || receipt.id
  }\n\n`;
  markdown += `### Basic Info\n`;
  markdown += `- **Receipt Number**: ${receipt.receipt_number}\n`;
  markdown += `- **Receipt Type**: ${receipt.receipt_type}\n`;
  markdown += `- **Date**: ${receipt.receipt_date}\n`;
  markdown += `- **Created**: ${receipt.created_at}\n\n`;

  markdown += `### Financial Data (CRITICAL FOR CALCULATIONS)\n`;
  markdown += `\`\`\`javascript\n`;
  markdown += `totalMoney: ${receipt.total_money}\n`;
  markdown += `totalTax: ${receipt.total_tax}\n`;
  markdown += `totalDiscount: ${receipt.total_discount}\n`;
  markdown += `tip: ${receipt.tip || 0}\n`;
  markdown += `surcharge: ${receipt.surcharge || 0}\n`;
  markdown += `\`\`\`\n\n`;

  markdown += `**CALCULATION CHECK:**\n`;
  markdown += `- If total_money = ${receipt.total_money}\n`;
  markdown += `- Then in Baht = ${
    receipt.total_money / 100
  } (if stored in satang)\n`;
  markdown += `- Or in Baht = ${receipt.total_money} (if already in Baht)\n\n`;

  // Line Items
  if (receipt.line_items && receipt.line_items.length > 0) {
    markdown += `### Line Items (${receipt.line_items.length} items)\n\n`;
    receipt.line_items.forEach((item, idx) => {
      markdown += `#### Item ${idx + 1}: ${item.item_name}\n`;
      markdown += `\`\`\`javascript\n`;
      markdown += `item_name: "${item.item_name}"\n`;
      markdown += `quantity: ${item.quantity}\n`;
      markdown += `price: ${item.price}\n`;
      markdown += `total_money: ${item.total_money}\n`;
      markdown += `total_discount: ${item.total_discount || 0}\n`;
      markdown += `cost: ${item.cost || 0}\n`;
      markdown += `sku: "${item.sku || "N/A"}"\n`;
      markdown += `\`\`\`\n`;
      markdown += `**Item Calculation**: ${item.quantity} × ${item.price} = ${item.total_money}\n`;
      markdown += `**In Baht (if satang)**: ${item.total_money / 100}\n\n`;
    });
  }

  // Payments
  if (receipt.payments && receipt.payments.length > 0) {
    markdown += `### Payments (${receipt.payments.length} payment methods)\n\n`;
    receipt.payments.forEach((payment, idx) => {
      markdown += `#### Payment ${idx + 1}\n`;
      markdown += `\`\`\`javascript\n`;
      markdown += `payment_type_id: "${payment.payment_type_id}"\n`;
      markdown += `paid_money: ${payment.paid_money}\n`;
      markdown += `type: "${payment.type}"\n`;
      markdown += `paid_at: "${payment.paid_at}"\n`;
      markdown += `\`\`\`\n`;
      markdown += `**In Baht (if satang)**: ${payment.paid_money / 100}\n\n`;
    });
  }

  // Full JSON
  markdown += `### Complete Receipt JSON\n`;
  markdown += `\`\`\`json\n`;
  markdown += JSON.stringify(receipt, null, 2);
  markdown += `\n\`\`\`\n\n`;

  markdown += `---\n\n`;

  return markdown;
}

/**
 * Analyze receipts and create calculation guide
 */
function createCalculationGuide(receipts) {
  let guide = `# Loyverse Receipt Data Analysis\n\n`;
  guide += `**Generated**: ${new Date().toISOString()}\n`;
  guide += `**Total Receipts Analyzed**: ${receipts.length}\n\n`;

  // Calculate totals
  let totalRevenueCents = 0;
  let totalRevenueBaht = 0;

  receipts.forEach((receipt) => {
    totalRevenueCents += receipt.total_money || 0;
  });

  totalRevenueBaht = totalRevenueCents / 100;

  guide += `## Revenue Analysis\n\n`;
  guide += `### Sum of all total_money values:\n`;
  guide += `- **Raw sum**: ${totalRevenueCents}\n`;
  guide += `- **Divided by 100**: ${totalRevenueBaht}\n\n`;

  guide += `### How to determine correct calculation:\n`;
  guide += `1. Look at Receipt 1 in Loyverse dashboard\n`;
  guide += `2. Compare the display amount to the total_money value below\n`;
  guide += `3. If Loyverse shows ฿${receipts[0]?.total_money} → Already in Baht (no division needed)\n`;
  guide += `4. If Loyverse shows ฿${
    receipts[0]?.total_money / 100
  } → Stored in satang (divide by 100)\n\n`;

  guide += `### Example from Receipt 1:\n`;
  if (receipts[0]) {
    guide += `- **total_money**: ${receipts[0].total_money}\n`;
    guide += `- **As Baht (no conversion)**: ฿${receipts[0].total_money}\n`;
    guide += `- **As Satang → Baht (÷100)**: ฿${
      receipts[0].total_money / 100
    }\n\n`;
  }

  guide += `## 🔍 VERIFICATION STEPS:\n\n`;
  guide += `1. **Open Loyverse Dashboard** in browser\n`;
  guide += `2. **Go to Receipts** section\n`;
  guide += `3. **Find Receipt**: ${receipts[0]?.receipt_number}\n`;
  guide += `4. **Check the total amount** displayed\n`;
  guide += `5. **Compare** to total_money value: ${receipts[0]?.total_money}\n`;
  guide += `6. **If they match** → Use value directly (no division)\n`;
  guide += `7. **If Loyverse shows 1/100th** → Divide by 100 in code\n\n`;

  guide += `---\n\n`;

  return guide;
}

/**
 * Main function
 */
async function main() {
  try {
    console.log("🚀 Starting Loyverse Receipt Data Fetch...\n");

    // Check API token
    if (!LOYVERSE_API_TOKEN || LOYVERSE_API_TOKEN === "YOUR_API_TOKEN_HERE") {
      console.error("❌ ERROR: LOYVERSE_API_TOKEN not set!");
      console.log("\nTo fix this:");
      console.log("1. Create a .env.local file in the project root");
      console.log("2. Add: NEXT_PUBLIC_LOYVERSE_API_TOKEN=your_actual_token");
      console.log("3. Run this script again\n");
      process.exit(1);
    }

    // Fetch receipts
    const receipts = await fetchReceipts(5);

    if (!receipts || receipts.length === 0) {
      console.log(
        "⚠️ No receipts found. Make sure you have receipts in your Loyverse account."
      );
      process.exit(0);
    }

    // Create markdown content
    let markdownContent = createCalculationGuide(receipts);

    // Add individual receipt details
    markdownContent += `# Detailed Receipt Data\n\n`;
    receipts.forEach((receipt, index) => {
      markdownContent += formatReceiptForMarkdown(receipt, index);
    });

    // Add summary at the end
    markdownContent += `\n\n# Summary Table\n\n`;
    markdownContent += `| Receipt # | total_money | ÷100 (Baht) | Items | Payments |\n`;
    markdownContent += `|-----------|-------------|-------------|-------|----------|\n`;
    receipts.forEach((receipt) => {
      markdownContent += `| ${receipt.receipt_number} | ${
        receipt.total_money
      } | ${receipt.total_money / 100} | ${receipt.line_items?.length || 0} | ${
        receipt.payments?.length || 0
      } |\n`;
    });

    // Save to file
    const outputPath = path.join(process.cwd(), "DataMapping.md");
    fs.writeFileSync(outputPath, markdownContent, "utf8");

    console.log("\n✅ SUCCESS!");
    console.log(`📄 Data saved to: ${outputPath}`);
    console.log(`📊 Total receipts: ${receipts.length}`);
    console.log(
      `💰 Total revenue (raw): ${receipts.reduce(
        (sum, r) => sum + (r.total_money || 0),
        0
      )}`
    );
    console.log(
      `💰 Total revenue (÷100): ${
        receipts.reduce((sum, r) => sum + (r.total_money || 0), 0) / 100
      }`
    );
    console.log("\n🔍 Next steps:");
    console.log("1. Open DataMapping.md");
    console.log('2. Check the "VERIFICATION STEPS" section');
    console.log(
      "3. Compare Loyverse dashboard amounts with total_money values"
    );
    console.log("4. Update dashboard calculations accordingly\n");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
