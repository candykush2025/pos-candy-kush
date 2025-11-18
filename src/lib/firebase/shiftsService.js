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
  // Create a new shift when cashier logs in
  async createShift(shiftData, userId, userName) {
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
      updateData.totalCashSales = shift.totalCashSales + transaction.total;
      updateData.expectedCash =
        shift.startingCash + (shift.totalCashSales || 0) + transaction.total;
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
      orderBy(orderByField, orderDirection)
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
      orderBy(orderByField, orderDirection)
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
      where("status", "==", "active")
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
      orderBy("startTime", "desc")
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
      orderBy("startTime", "desc")
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
        0
      ),
      totalVariance: completedShifts.reduce(
        (sum, s) => sum + (s.variance || 0),
        0
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
};

export default shiftsService;
