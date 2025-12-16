import { getPaymentIconForReceipt } from "./HistorySection";
import { buildSearchPool } from "./HistorySection";

describe("getPaymentIconForReceipt", () => {
  test("returns crypto icon when name contains crypto", () => {
    const receipt = { payments: [{ name: "Crypto transfer" }] };
    expect(getPaymentIconForReceipt(receipt)).toBe("₿");
  });

  test("prefers name over type when type is OTHER", () => {
    const receipt = { payments: [{ type: "OTHER", name: "Crypto transfer" }] };
    expect(getPaymentIconForReceipt(receipt)).toBe("₿");
  });

  test("returns bank icon for transfer types", () => {
    const receipt = { payments: [{ payment_type_name: "Transfer" }] };
    expect(getPaymentIconForReceipt(receipt)).toBe("🏦");
  });

  test("falls back to receipt.paymentMethod when payments empty", () => {
    const receipt = { payments: [], paymentMethod: "crypto" };
    expect(getPaymentIconForReceipt(receipt)).toBe("₿");
  });

  test("buildSearchPool includes transfer and crypto tokens", () => {
    const r1 = {
      payments: [
        { type: "OTHER", name: "Crypto transfer", payment_type_id: "d813" },
      ],
    };
    const pool1 = buildSearchPool(r1);
    expect(pool1.some((t) => String(t).toLowerCase().includes("crypto"))).toBe(
      true
    );

    const r2 = { payments: [{ payment_type_name: "Transfer" }] };
    const pool2 = buildSearchPool(r2);
    expect(
      pool2.some((t) => String(t).toLowerCase().includes("transfer"))
    ).toBe(true);
  });

  test("includes top-level paymentTypeName and paymentType fields", () => {
    const r1 = { paymentTypeName: "Transfer" };
    expect(buildSearchPool(r1).some((t) => t.includes("transfer"))).toBe(true);

    const r2 = { payment_type: "crypto" };
    expect(buildSearchPool(r2).some((t) => t.includes("crypto"))).toBe(true);
  });

  test("prefers a descriptive payment entry later in array", () => {
    const receipt = { payments: [{ type: "OTHER" }, { name: "Transfer" }] };
    expect(getPaymentIconForReceipt(receipt)).toBe("🏦");
  });
});
