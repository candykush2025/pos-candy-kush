import { matchesPaymentQuery } from "./page";

describe("matchesPaymentQuery", () => {
  test("matches payment_type_id in payments array", () => {
    const receipt = {
      payments: [{ payment_type_id: "transfer", money_amount: 480 }],
    };
    expect(matchesPaymentQuery(receipt, "transfer")).toBe(true);
  });

  test("matches payment name case-insensitive", () => {
    const receipt = {
      payments: [{ name: "Transfer" }],
    };
    expect(matchesPaymentQuery(receipt, "transfer")).toBe(true);
  });

  test("matches top-level paymentMethod", () => {
    const receipt = {
      paymentMethod: "cash",
    };
    expect(matchesPaymentQuery(receipt, "cash")).toBe(true);
  });

  test("does not match when no payment type found", () => {
    const receipt = {
      payments: [{ name: "Card" }],
    };
    expect(matchesPaymentQuery(receipt, "transfer")).toBe(false);
  });
});
