import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";

const COLLECTION_NAME = "shifts";

export const shiftsService = {
  // Get all active shifts for a user
  async getActiveShifts(userId) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId),
      where("status", "==", "active"),
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  },

  // Auto-close a shift with expected cash (for cleaning up old shifts)
  async autoCloseShift(shiftId, reason = "Auto-closed due to new shift") {
    const docRef = doc(db, COLLECTION_NAME, shiftId);
    const shiftSnap = await getDoc(docRef);

    if (!shiftSnap.exists()) {
      return null;
    }

    const shift = shiftSnap.data();
    const expectedCash = shift.expectedCash || shift.startingCash || 0;

    const updateData = {
      endTime: Timestamp.now(),
      actualCash: expectedCash, // Use expected cash as actual
      endingCash: expectedCash,
      variance: 0, // No variance when auto-closing
      status: "completed",
      notes: shift.notes ? `${shift.notes} | ${reason}` : reason,
      updatedAt: Timestamp.now(),
      autoClosedAt: Timestamp.now(),
      autoCloseReason: reason,
    };

    await updateDoc(docRef, updateData);
    return { id: shiftId, ...shift, ...updateData };
  },

  // Create a new shift OR return existing active shift
  async createShift(shiftData, userId, userName) {
    // Get all active shifts for this user
    const activeShifts = await this.getActiveShifts(userId);

    // If multiple active shifts exist (legacy issue), close them all
    if (activeShifts.length > 1) {
      console.log(
        `Found ${activeShifts.length} active shifts for user ${userName}, auto-closing all...`,
      );
      for (const shift of activeShifts) {
        await this.autoCloseShift(
          shift.id,
          "Auto-closed: Multiple shifts detected",
        );
      }
      // After closing all, proceed to create a new shift
    } else if (activeShifts.length === 1) {
      // If exactly one active shift exists, return it (continue with existing shift)
      console.log(
        `User ${userName} already has an active shift, continuing with existing shift`,
      );
      return activeShifts[0];
    }

    // Create new shift
    const docRef = doc(collection(db, COLLECTION_NAME));
    const shift = {
      ...shiftData,
      id: docRef.id,
      userId: userId,
      userName: userName,
      startTime: Timestamp.now(),
      endTime: null,
      startingCash: shiftData.startingCash || 0,
      endingCash: null,
      expectedCash: shiftData.startingCash || 0, // Will be updated with sales
      actualCash: null,
      variance: null, // Difference between expected and actual
      status: "active", // active, completed, pending
      totalSales: 0,
      grossSales: 0,
      totalCashSales: 0,
      totalCardSales: 0,
      totalOtherSales: 0,
      totalCashRefunds: 0,
      totalRefunds: 0,
      totalDiscounts: 0,
      totalPaidIn: 0,
      totalPaidOut: 0,
      transactionCount: 0,
      transactions: [], // Array of transaction IDs
      cashMovements: [], // Array of pay in/pay out transactions
      notes: shiftData.notes || "",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: userId,
      createdByName: userName,
    };
    await setDoc(docRef, shift);
    return shift;
  },

  // Update shift with transaction
  async addTransaction(shiftId, transaction) {
    const docRef = doc(db, COLLECTION_NAME, shiftId);
    const shiftSnap = await getDoc(docRef);

    if (!shiftSnap.exists()) {
      throw new Error("Shift not found");
    }

    const shift = shiftSnap.data();
    const newTransactions = [...(shift.transactions || []), transaction.id];

    // Calculate new totals
    const newTotalSales = shift.totalSales + transaction.total;
    const newTransactionCount = shift.transactionCount + 1;

    let updateData = {
      transactions: newTransactions,
      totalSales: newTotalSales,
      transactionCount: newTransactionCount,
      updatedAt: Timestamp.now(),
    };

    // Update payment method totals
    if (transaction.paymentMethod === "cash") {
      const newTotalCashSales = (shift.totalCashSales || 0) + transaction.total;
      updateData.totalCashSales = newTotalCashSales;
      // Expected cash = starting + cash sales - cash refunds + paid in - paid out
      updateData.expectedCash =
        (shift.startingCash || 0) +
        newTotalCashSales -
        (shift.totalCashRefunds || 0) +
        (shift.totalPaidIn || 0) -
        (shift.totalPaidOut || 0);
    } else if (transaction.paymentMethod === "card") {
      updateData.totalCardSales = shift.totalCardSales + transaction.total;
    } else {
      updateData.totalOtherSales = shift.totalOtherSales + transaction.total;
    }

    await updateDoc(docRef, updateData);
    return { id: shiftId, ...shift, ...updateData };
  },

  // End shift when cashier logs out
  async endShift(shiftId, endingData, userId = null, userName = null) {
    const docRef = doc(db, COLLECTION_NAME, shiftId);
    const shiftSnap = await getDoc(docRef);

    if (!shiftSnap.exists()) {
      throw new Error("Shift not found");
    }

    const shift = shiftSnap.data();
    const actualCash = endingData.actualCash || 0;
    const expectedCash = shift.expectedCash || shift.startingCash;
    const variance = actualCash - expectedCash;

    const updateData = {
      endTime: Timestamp.now(),
      actualCash: actualCash,
      endingCash: actualCash,
      variance: variance,
      status: "completed",
      notes: endingData.notes || shift.notes || "",
      updatedAt: Timestamp.now(),
      updatedBy: userId,
      updatedByName: userName,
    };

    await updateDoc(docRef, updateData);
    return { id: shiftId, ...shift, ...updateData };
  },

  // Get all shifts
  async getAll(options = {}) {
    const { orderByField = "startTime", orderDirection = "desc" } = options;

    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy(orderByField, orderDirection),
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  },

  // Get shifts by user
  async getByUser(userId, options = {}) {
    const { orderByField = "startTime", orderDirection = "desc" } = options;

    const q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId),
      orderBy(orderByField, orderDirection),
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  },

  // Get active shift for a user
  async getActiveShift(userId) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId),
      where("status", "==", "active"),
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    };
  },

  // Get today's shifts for a user (active or completed today)
  async getTodayShifts(userId) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId),
      where("startTime", ">=", Timestamp.fromDate(startOfDay)),
      where("startTime", "<=", Timestamp.fromDate(endOfDay)),
      orderBy("startTime", "desc"),
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  },

  // Get shift by ID
  async getById(id) {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      };
    }
    return null;
  },

  // Update shift notes
  async updateNotes(id, notes) {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      notes,
      updatedAt: Timestamp.now(),
    });
  },

  // Add cash movement (Pay In / Pay Out)
  async addCashMovement(shiftId, movement) {
    const docRef = doc(db, COLLECTION_NAME, shiftId);
    const shiftSnap = await getDoc(docRef);

    if (!shiftSnap.exists()) {
      throw new Error("Shift not found");
    }

    const shift = shiftSnap.data();
    const cashMovements = shift.cashMovements || [];
    cashMovements.push(movement);

    // Calculate new totals
    const totalPaidIn =
      (shift.totalPaidIn || 0) +
      (movement.type === "payin" ? movement.amount : 0);
    const totalPaidOut =
      (shift.totalPaidOut || 0) +
      (movement.type === "payout" ? movement.amount : 0);

    // Update expected cash
    const expectedCash =
      (shift.startingCash || 0) +
      (shift.totalCashSales || 0) -
      (shift.totalCashRefunds || 0) +
      totalPaidIn -
      totalPaidOut;

    await updateDoc(docRef, {
      cashMovements,
      totalPaidIn,
      totalPaidOut,
      expectedCash,
      updatedAt: Timestamp.now(),
    });

    return {
      id: shiftId,
      ...shift,
      cashMovements,
      totalPaidIn,
      totalPaidOut,
      expectedCash,
    };
  },

  // Get shifts by date range
  async getByDateRange(startDate, endDate) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("startTime", ">=", Timestamp.fromDate(startDate)),
      where("startTime", "<=", Timestamp.fromDate(endDate)),
      orderBy("startTime", "desc"),
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  },

  // Get shift statistics
  async getStatistics(userId = null) {
    let shifts;

    if (userId) {
      shifts = await this.getByUser(userId);
    } else {
      shifts = await this.getAll();
    }

    const completedShifts = shifts.filter((s) => s.status === "completed");

    return {
      totalShifts: shifts.length,
      completedShifts: completedShifts.length,
      activeShifts: shifts.filter((s) => s.status === "active").length,
      totalSales: completedShifts.reduce(
        (sum, s) => sum + (s.totalSales || 0),
        0,
      ),
      totalVariance: completedShifts.reduce(
        (sum, s) => sum + (s.variance || 0),
        0,
      ),
      shiftsWithShortage: completedShifts.filter((s) => (s.variance || 0) < 0)
        .length,
      shiftsWithSurplus: completedShifts.filter((s) => (s.variance || 0) > 0)
        .length,
      averageVariance:
        completedShifts.length > 0
          ? completedShifts.reduce((sum, s) => sum + (s.variance || 0), 0) /
            completedShifts.length
          : 0,
    };
  },

  // Recalculate expected cash and variance for a completed shift
  async recalculateShift(shiftId) {
    console.log(`\n🔄 ============================================`);
    console.log(`🔄 RECALCULATE SHIFT STARTED`);
    console.log(`🔄 Shift ID: ${shiftId}`);
    console.log(`🔄 ============================================\n`);

    const docRef = doc(db, COLLECTION_NAME, shiftId);
    const shiftSnap = await getDoc(docRef);

    if (!shiftSnap.exists()) {
      console.error(`❌ Shift ${shiftId} not found!`);
      throw new Error("Shift not found");
    }

    const shift = shiftSnap.data();
    console.log(`✅ Shift found:`, {
      id: shiftId,
      userName: shift.userName,
      status: shift.status,
      transactionCount: shift.transactions?.length || 0,
      currentTotalCashSales: shift.totalCashSales || 0,
      currentTotalCardSales: shift.totalCardSales || 0,
    });

    // Fetch all receipts that belong to this shift to check for refunds AND recalculate payment methods
    let totalRefunds = 0;
    let totalCashRefunds = 0;
    let totalCashSales = 0;
    let totalCardSales = 0;
    let totalBankTransferSales = 0;
    let totalCryptoSales = 0;
    let totalOtherSales = 0;
    let totalPaymentChangesAffectingCash = 0; // Track adjustments to actualCash

    if (shift.transactions && shift.transactions.length > 0) {
      const receiptsCollectionRef = collection(db, "receipts");

      for (const transactionId of shift.transactions) {
        try {
          let receipt = null;
          let receiptDocId = null;

          // Try fetching by document ID first
          const receiptDocRef = doc(receiptsCollectionRef, transactionId);
          const receiptSnap = await getDoc(receiptDocRef);

          if (receiptSnap.exists()) {
            receipt = receiptSnap.data();
            receiptDocId = receiptSnap.id;
          } else {
            // Not a document ID, try querying by orderNumber
            const receiptsQuery = query(
              receiptsCollectionRef,
              where("orderNumber", "==", transactionId),
            );
            const receiptsSnapshot = await getDocs(receiptsQuery);

            if (!receiptsSnapshot.empty) {
              const receiptDoc = receiptsSnapshot.docs[0];
              receipt = receiptDoc.data();
              receiptDocId = receiptDoc.id;
            } else {
              continue; // Skip to next transaction
            }
          }

          // Now process the receipt
          if (receipt) {
            const receiptTotal = receipt.total_money || 0;

            // Determine the CURRENT payment method (considering payment history changes)
            let currentPaymentMethod = "";
            let hasPaymentChange = false;

            // Check if there's a payment history with approved changes
            if (receipt.paymentHistory && receipt.paymentHistory.length > 0) {
              const approvedChanges = receipt.paymentHistory.filter(
                (h) => h.status === "approved",
              );
              if (approvedChanges.length > 0) {
                hasPaymentChange = true;
                const latestChange =
                  approvedChanges[approvedChanges.length - 1];

                // Track cash adjustments
                const oldMethod = (
                  latestChange.oldMethod ||
                  latestChange.oldPaymentMethod ||
                  ""
                ).toLowerCase();
                const newMethod = (
                  latestChange.newMethod ||
                  latestChange.newPaymentMethod ||
                  ""
                ).toLowerCase();

                // If changed FROM cash TO something else, subtract from actualCash
                if (oldMethod === "cash" && newMethod !== "cash") {
                  totalPaymentChangesAffectingCash -= receiptTotal;
                }
                // If changed FROM something else TO cash, add to actualCash
                else if (oldMethod !== "cash" && newMethod === "cash") {
                  totalPaymentChangesAffectingCash += receiptTotal;
                }
              }
            }

            // ALWAYS check the payments array first - this is the source of truth
            const payments = receipt.payments || [];

            if (payments.length > 0) {
              currentPaymentMethod = (
                payments[0].type ||
                payments[0].name ||
                ""
              ).toLowerCase();
            } else {
              const paymentMethod = (
                receipt.payment_method ||
                receipt.paymentMethod ||
                ""
              ).toLowerCase();
              const paymentTypeName = (
                receipt.paymentTypeName || ""
              ).toLowerCase();

              if (paymentMethod) {
                currentPaymentMethod = paymentMethod;
              } else if (paymentTypeName) {
                currentPaymentMethod = paymentTypeName;
              }
              console.log(
                `   💳 Fallback payment method: "${currentPaymentMethod}"`,
              );
            }

            // Categorize sales by current payment method (only if not refunded)
            const isRefunded = receipt.isRefunded || receipt.refund;
            if (!isRefunded) {
              if (currentPaymentMethod.includes("cash")) {
                totalCashSales += receiptTotal;
              } else if (
                currentPaymentMethod.includes("card") ||
                currentPaymentMethod.includes("credit")
              ) {
                totalCardSales += receiptTotal;
              } else if (
                currentPaymentMethod.includes("bank") ||
                currentPaymentMethod.includes("transfer")
              ) {
                totalBankTransferSales += receiptTotal;
              } else if (
                currentPaymentMethod.includes("crypto") ||
                currentPaymentMethod.includes("bitcoin") ||
                currentPaymentMethod.includes("btc")
              ) {
                totalCryptoSales += receiptTotal;
              } else {
                totalOtherSales += receiptTotal;
              }
            }

            // Check if this receipt has been refunded
            if (isRefunded) {
              const refundAmount =
                receipt.refundAmount || receipt.total_money || 0;
              totalRefunds += refundAmount;

              // Check if it was a cash payment (based on current/final payment method)
              if (currentPaymentMethod.includes("cash")) {
                totalCashRefunds += refundAmount;
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching receipt ${transactionId}:`, error);
        }
      }
    }

    // Update shift with recalculated totals
    const updatedShiftData = {
      totalRefunds,
      totalCashRefunds,
      totalCashSales,
      totalCardSales,
      totalBankTransferSales,
      totalCryptoSales,
      totalOtherSales,
    };

    // Calculate expected cash
    const expectedCash =
      (shift.startingCash || 0) +
      totalCashSales -
      totalCashRefunds +
      (shift.totalPaidIn || 0) -
      (shift.totalPaidOut || 0);

    // Calculate actualCash from the formula
    const calculatedActualCash =
      (shift.startingCash || 0) +
      totalCashSales -
      totalCashRefunds +
      (shift.totalPaidIn || 0) -
      (shift.totalPaidOut || 0);

    const variance = calculatedActualCash - expectedCash;

    const updateData = {
      ...updatedShiftData,
      actualCash: calculatedActualCash,
      expectedCash,
      variance,
      updatedAt: Timestamp.now(),
      recalculatedAt: Timestamp.now(),
    };

    await updateDoc(docRef, updateData);

    return {
      id: shiftId,
      ...shift,
      ...updateData,
    };
  },
};

export default shiftsService;
