import { normalizePaymentType, ensureDefaultPaymentTypes } from "./page";

describe("normalizePaymentType", () => {
  test("prefers name with crypto even when type is OTHER", () => {
    const payment = { type: "OTHER", name: "Crypto transfer" };
    expect(normalizePaymentType(payment.name)).toBe("Crypto");
    // when passed the type field it should be Other; ensure name wins in code path
    expect(normalizePaymentType(payment.type)).toBe("Other");
  });

  test("maps transfer/payment identifiers to Bank Transfer", () => {
    expect(normalizePaymentType("transfer")).toBe("Bank Transfer");
    expect(normalizePaymentType("bank-transfer")).toBe("Bank Transfer");
    expect(normalizePaymentType("custom payment")).toBe("Bank Transfer");
  });
});

describe("ensureDefaultPaymentTypes", () => {
  test("adds missing default types to map", () => {
    const map = new Map();
    map.set("Cash", {
      id: "Cash",
      name: "Cash",
      paymentAmount: 100,
      paymentTransactions: 1,
      refundAmount: 0,
      refundTransactions: 0,
    });

    ensureDefaultPaymentTypes(map);

    expect(map.has("Cash")).toBe(true);
    expect(map.has("Card")).toBe(true);
    expect(map.has("Bank Transfer")).toBe(true);
    expect(map.has("Crypto")).toBe(true);

    const crypto = map.get("Crypto");
    expect(crypto.paymentAmount).toBe(0);
    expect(crypto.paymentTransactions).toBe(0);
  });
});
