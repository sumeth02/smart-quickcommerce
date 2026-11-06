// Delivery fee calculation used by the quote and checkout endpoints.
//
// Baseline version: flat base fee + small-cart surcharge + free delivery above a threshold.
// Joseph's story (SCRUM-29 "Manage dynamic delivery fees") replaces `getDemandMultiplier`
// with a real demand-based multiplier and adds the admin /api/fees configuration routes.

export const feeConfig = {
  baseFee: 1.99,
  smallCartThreshold: 10,
  smallCartFee: 1.5,
  freeDeliveryThreshold: 30
};

const round2 = (n) => Math.round(n * 100) / 100;

/** Demand multiplier (1 = normal). Placeholder until dynamic pricing is implemented. */
export function getDemandMultiplier(_darkStoreId) {
  return 1;
}

export function calculateDeliveryFee({ subtotal, darkStoreId }) {
  if (subtotal >= feeConfig.freeDeliveryThreshold) {
    return { deliveryFee: 0, smallCartFee: 0, multiplier: 1, reason: "free-delivery" };
  }
  const multiplier = getDemandMultiplier(darkStoreId);
  const deliveryFee = round2(feeConfig.baseFee * multiplier);
  const smallCartFee = subtotal < feeConfig.smallCartThreshold ? feeConfig.smallCartFee : 0;
  return { deliveryFee, smallCartFee, multiplier, reason: multiplier > 1 ? "high-demand" : "standard" };
}
