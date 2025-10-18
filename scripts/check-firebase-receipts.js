/**
 * Firebase Receipt Data Checker
 *
 * This script checks what receipt data is actually stored in Firebase
 * to help debug why dashboard totals don't match Loyverse
 *
 * Usage: node scripts/check-firebase-receipts.js
 */

const admin = require("firebase-admin");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  // For local testing, you'd need service account key
  // For now, we'll use the client SDK approach
};

console.log("🔍 Checking Firebase Receipt Data...\n");

// Since we can't use admin SDK without service account,
// let's create a simpler check script that you can run in browser console

const browserScript = `
// Run this in your browser console while on the admin page

(async () => {
  const { receiptsService } = await import('/src/lib/db/receiptsService.js');
  
  console.log('📊 Fetching all receipts from Firebase...');
  const receipts = await receiptsService.getAll({ orderBy: ['createdAt', 'desc'] });
  
  console.log('\\n📊 TOTAL RECEIPTS IN FIREBASE:', receipts.length);
  
  // Group by month
  const byMonth = {};
  receipts.forEach(receipt => {
    const date = receipt.createdAt?.toDate ? receipt.createdAt.toDate() : new Date(receipt.createdAt);
    const monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
    
    if (!byMonth[monthKey]) {
      byMonth[monthKey] = { count: 0, total: 0, receipts: [] };
    }
    
    byMonth[monthKey].count++;
    byMonth[monthKey].total += (receipt.totalMoney || 0);
    byMonth[monthKey].receipts.push({
      num: receipt.receiptNumber,
      date: date.toISOString(),
      total: receipt.totalMoney
    });
  });
  
  console.log('\\n📊 RECEIPTS BY MONTH:');
  Object.keys(byMonth).sort().forEach(month => {
    console.log(\`\\n\${month}:\`);
    console.log(\`  Count: \${byMonth[month].count}\`);
    console.log(\`  Total: ฿\${byMonth[month].total.toLocaleString()}\`);
    console.log(\`  First 5 receipts:\`, byMonth[month].receipts.slice(0, 5));
  });
  
  // October 2025 specific
  const oct2025 = byMonth['2025-10'];
  if (oct2025) {
    console.log('\\n📊 OCTOBER 2025 DETAILS:');
    console.log('  Total receipts:', oct2025.count);
    console.log('  Total revenue: ฿' + oct2025.total.toLocaleString());
    console.log('  Expected from Loyverse: ฿328,021.60');
    console.log('  Difference:', oct2025.total - 328021.60);
    
    // Check for duplicates
    const receiptNumbers = oct2025.receipts.map(r => r.num);
    const duplicates = receiptNumbers.filter((num, index) => receiptNumbers.indexOf(num) !== index);
    if (duplicates.length > 0) {
      console.log('  ⚠️ DUPLICATE RECEIPT NUMBERS FOUND:', duplicates);
    }
  }
  
  return { receipts, byMonth };
})();
`;

console.log("📋 BROWSER CONSOLE SCRIPT:");
console.log("=".repeat(60));
console.log("Copy and paste this into your browser console (F12)");
console.log("while on the admin dashboard page:");
console.log("=".repeat(60));
console.log(browserScript);
console.log("=".repeat(60));

console.log("\n💡 Or check the dashboard console logs after refreshing!");
