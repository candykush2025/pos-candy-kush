/**
 * Migration Script: Fix Old Expense Records
 * 
 * This script updates old expense records in Firestore that are missing
 * the new approval workflow fields.
 * 
 * Run this once to fix existing data.
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

// Firebase config (same as your app)
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateExpenses() {
  try {
    console.log("🔄 Starting expense migration...");
    
    const expensesRef = collection(db, "expenses");
    const snapshot = await getDocs(expensesRef);
    
    console.log(`📊 Found ${snapshot.size} expenses`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const docSnapshot of snapshot.docs) {
      const expense = docSnapshot.data();
      const expenseId = docSnapshot.id;
      
      // Check if expense needs migration
      const needsMigration = 
        expense.status === undefined ||
        expense.category === undefined ||
        expense.employeeId === undefined;
      
      if (needsMigration) {
        console.log(`\n🔧 Updating expense: ${expenseId}`);
        console.log(`   Current data:`, expense);
        
        const updates = {};
        
        // Add missing fields with defaults
        if (expense.status === undefined) {
          updates.status = "pending";
        }
        
        if (expense.category === undefined) {
          updates.category = "General";
        }
        
        if (expense.employeeId === undefined) {
          updates.employeeId = null;
        }
        
        if (expense.employeeName === undefined) {
          updates.employeeName = "Unknown";
        }
        
        if (expense.approvedBy === undefined) {
          updates.approvedBy = null;
        }
        
        if (expense.approvedByName === undefined) {
          updates.approvedByName = null;
        }
        
        if (expense.approvedAt === undefined) {
          updates.approvedAt = null;
        }
        
        if (expense.approvalNotes === undefined) {
          updates.approvalNotes = null;
        }
        
        // Update the document
        await updateDoc(doc(db, "expenses", expenseId), updates);
        
        console.log(`   ✅ Updated with:`, updates);
        updated++;
      } else {
        skipped++;
      }
    }
    
    console.log("\n" + "=".repeat(50));
    console.log("✅ Migration complete!");
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log("=".repeat(50));
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrateExpenses();
