import { db, defaultFeeConfig, feeConfig } from "../data/db.js";

export { defaultFeeConfig, feeConfig };

const ACTIVE_ORDER_STATUSES = new Set(["PLACED", "PICKING", "PACKED"]);
const DEMAND_WINDOW_MS = 15 * 60 * 1000;

function isRuleActive(rule, currentHour) {
  if (rule.startHour <= rule.endHour) {
    return currentHour >= rule.startHour && currentHour <= rule.endHour;
  }
  // Overnight window (e.g., 22 to 2)
  return currentHour >= rule.startHour || currentHour <= rule.endHour;
}

/**
 * Computes active order count (last 15 min), available riders, and surge multiplier
 * for a given dark store.
 */
export function getStoreDemand(darkStoreId, now = new Date()) {
  const nowMs = now.getTime();
  const windowStart = nowMs - DEMAND_WINDOW_MS;

  const activeOrders = (db.orders ?? []).filter(
    (o) =>
      o.darkStoreId === darkStoreId &&
      ACTIVE_ORDER_STATUSES.has(o.status) &&
      new Date(o.createdAt).getTime() >= windowStart
  ).length;

  const availableRiders = (db.riders ?? []).filter(
    (r) => r.darkStoreId === darkStoreId && r.status === "AVAILABLE"
  ).length;

  const ratio = activeOrders / Math.max(availableRiders, 1);

  let multiplier = 1;
  if (ratio >= 4) {
    multiplier = 1.5;
  } else if (ratio >= 2) {
    multiplier = 1.25;
  }

  const currentHour = now.getHours();
  for (const rule of db.feeRules ?? []) {
    if (isRuleActive(rule, currentHour)) {
      multiplier *= rule.multiplier;
    }
  }

  const capped = Math.min(multiplier, feeConfig.maxMultiplier);
  return {
    darkStoreId,
    activeOrders,
    availableRiders,
    multiplier: Math.round(capped * 100) / 100
  };
}

export function getDemandMultiplier(darkStoreId, now = new Date()) {
  return getStoreDemand(darkStoreId, now).multiplier;
}

export function calculateDeliveryFee({ subtotal, darkStoreId, now = new Date() }) {
  let deliveryFee = feeConfig.baseFee;
  let smallCartFee = 0;
  let reason = "standard";
  let multiplier = 1;

  if (subtotal >= feeConfig.freeDeliveryThreshold) {
    deliveryFee = 0;
    reason = "free-delivery";
  } else {
    if (subtotal < feeConfig.smallCartThreshold) {
      smallCartFee = feeConfig.smallCartFee;
    }

    multiplier = getDemandMultiplier(darkStoreId, now);
    if (multiplier > 1) {
      deliveryFee = Math.round(feeConfig.baseFee * multiplier * 100) / 100;
      reason = "high-demand";
    }
  }

  return { deliveryFee, smallCartFee, multiplier, reason };
}