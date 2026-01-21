# DEBUG: Check Receipt Payment Data

## Step 1: Refresh the page and check console

After refreshing `http://localhost:3001/sales?menu=shifts`, look for:

```
🔍 Rendering shift: {
  ...
  hasProblematicOrder: "⚠️ YES - Contains O-260121-1334-224"
  ...
}
```

This will tell you which shift contains the order with the payment change.

## Step 2: Check the actual receipt data

Open browser console (F12) and run this command:

```javascript
// Check the receipt data
(async () => {
  const { getFirestore, doc, getDoc } =
    await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

  // Search for the receipt by order number
  const db = getFirestore();
  const receiptsRef = collection(db, "receipts");
  const q = query(receiptsRef, where("orderNumber", "==", "O-260121-1334-224"));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const receiptDoc = snapshot.docs[0];
    const receiptData = receiptDoc.data();

    console.log("\n📋 RECEIPT DATA FOR O-260121-1334-224:");
    console.log("Receipt ID:", receiptDoc.id);
    console.log("\n💳 PAYMENTS ARRAY (source of truth):");
    console.log(JSON.stringify(receiptData.payments, null, 2));
    console.log("\n📜 PAYMENT HISTORY:");
    console.log(JSON.stringify(receiptData.paymentHistory, null, 2));
    console.log("\n📊 OTHER PAYMENT FIELDS:");
    console.log("paymentMethod:", receiptData.paymentMethod);
    console.log("paymentTypeName:", receiptData.paymentTypeName);
    console.log("payment_method:", receiptData.payment_method);

    // Check what the recalculation would see
    const payments = receiptData.payments || [];
    if (payments.length > 0) {
      const currentPaymentMethod = (
        payments[0].type ||
        payments[0].name ||
        ""
      ).toLowerCase();
      console.log("\n✅ DETECTED PAYMENT METHOD:", currentPaymentMethod);
      console.log(
        "Should be counted as:",
        currentPaymentMethod.includes("cash")
          ? "CASH"
          : currentPaymentMethod.includes("card")
            ? "CARD"
            : "OTHER",
      );
    }
  } else {
    console.log("❌ Receipt not found!");
  }
})();
```

## Simpler Alternative (if above doesn't work):

```javascript
// Simpler check using Firebase already loaded on the page
const db = firebase.firestore();
db.collection("receipts")
  .where("orderNumber", "==", "O-260121-1334-224")
  .get()
  .then((snapshot) => {
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      console.log("📋 Receipt Data:");
      console.log("ID:", doc.id);
      console.log("Payments:", data.payments);
      console.log("Payment History:", data.paymentHistory);

      if (data.payments && data.payments.length > 0) {
        console.log("\n✅ Current payment type:", data.payments[0].type);
        console.log('Expected: should be "card"');
        console.log(
          "Actual:",
          data.payments[0].type === "card"
            ? "✅ CORRECT"
            : "❌ WRONG - Still shows as " + data.payments[0].type,
        );
      }
    }
  });
```

## What to Look For:

### ✅ CORRECT (Payment was updated):

```json
"payments": [
  {
    "type": "card",
    "name": "Card",
    "amount": 1990
  }
]
```

### ❌ WRONG (Payment NOT updated):

```json
"payments": [
  {
    "type": "cash",
    "name": "Cash",
    "amount": 1990
  }
]
```

## If payments array shows "cash":

This means the admin approval didn't actually update the `payments` array in the receipt. The issue is in the admin approval code, not in the shift recalculation.

Go to `src/app/admin/orders/page.js` around line 430 and check the `handleApprovePaymentChange` function.

## Step 3: After checking receipt, click Recalculate

1. Find the shift with ⚠️ YES marker in console
2. Click on that shift to expand it
3. Click the Recalculate button
4. You should see the alert popup
5. Check console for detailed recalculation logs

The logs will show exactly what payment method is being detected from the receipt.
