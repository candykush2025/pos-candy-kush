import { customerApprovalService } from "@/lib/firebase/customerApprovalService";

/**
 * Determine if a customer is eligible to earn cashback/points.
 * Rules:
 * - Must not be a 'no member' (isNoMember !== true)
 * - If expiryDate exists, it must not be expired
 * - If expiryDate is missing, assume member is eligible
 */
export function isCustomerEligibleForPoints(customer) {
  if (!customer) return false;
  if (customer.isNoMember === true) return false;

  if (!customer.expiryDate) return true;

  return !customerApprovalService.isCustomerExpired(customer.expiryDate);
}

export default {
  isCustomerEligibleForPoints,
};
