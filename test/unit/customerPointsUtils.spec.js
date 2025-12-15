const {
  isCustomerEligibleForPoints,
} = require("../../src/lib/services/customerPointsUtils");
const customerApprovalService = require("../../src/lib/firebase/customerApprovalService");

describe("isCustomerEligibleForPoints", () => {
  test("returns false for null customer", () => {
    expect(isCustomerEligibleForPoints(null)).toBe(false);
  });

  test("returns false for isNoMember true", () => {
    const cust = { isNoMember: true };
    expect(isCustomerEligibleForPoints(cust)).toBe(false);
  });

  test("returns true if no expiryDate is present and isMember", () => {
    const cust = { isNoMember: false };
    expect(isCustomerEligibleForPoints(cust)).toBe(true);
  });

  test("returns false if expiryDate present and expired", () => {
    const cust = { isNoMember: false, expiryDate: "2020-01-01" };
    // Mock the approval service
    jest
      .spyOn(customerApprovalService, "isCustomerExpired")
      .mockReturnValue(true);
    expect(isCustomerEligibleForPoints(cust)).toBe(false);
    customerApprovalService.isCustomerExpired.mockRestore();
  });

  test("returns true if expiryDate present and not expired", () => {
    const cust = { isNoMember: false, expiryDate: "2099-01-01" };
    jest
      .spyOn(customerApprovalService, "isCustomerExpired")
      .mockReturnValue(false);
    expect(isCustomerEligibleForPoints(cust)).toBe(true);
    customerApprovalService.isCustomerExpired.mockRestore();
  });
});
