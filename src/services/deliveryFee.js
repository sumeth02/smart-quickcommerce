import { db } from '../data/db.js';

export const defaultFeeConfig = {
  baseFee: 1.99,
  smallCartThreshold: 15.00,
  smallCartFee: 1.50,
  freeDeliveryThreshold: 30.00,
  maxMultiplier: 2
};

export let feeConfig = { ...defaultFeeConfig };

export function getDemandMultiplier(darkStoreId) {
  const now = Date.now();
  const fifteenMinsAgo = now - 15 * 60 * 1000;
  
  const activeOrders = db.orders.filter(o => 
    o.darkStoreId === darkStoreId &&
    ['PLACED', 'PICKING', 'PACKED'].includes(o.status) &&
    new Date(o.createdAt).getTime() >= fifteenMinsAgo
  ).length;

  const riders = db.riders || [];
  const availableRiders = riders.filter(r => 
    r.darkStoreId === darkStoreId && 
    r.status === 'AVAILABLE'
  ).length;

  const ratio = activeOrders / Math.max(availableRiders, 1);
  
  let multiplier = 1;
  if (ratio >= 4) multiplier = 1.5;
  else if (ratio >= 2) multiplier = 1.25;

  const currentHour = new Date().getHours();
  const activeRules = (db.feeRules || []).filter(rule => 
    currentHour >= rule.startHour && currentHour < rule.endHour
  );
  
  for (const rule of activeRules) {
    multiplier = Math.max(multiplier, rule.multiplier);
  }

  return Math.min(multiplier, feeConfig.maxMultiplier);
}

export function calculateDeliveryFee({ subtotal, darkStoreId }) {
  let deliveryFee = feeConfig.baseFee;
  let smallCartFee = 0;
  let reason = 'standard';
  let multiplier = 1;

  if (subtotal >= feeConfig.freeDeliveryThreshold) {
    deliveryFee = 0;
    reason = 'free-delivery';
  } else {
    if (subtotal < feeConfig.smallCartThreshold) {
      smallCartFee = feeConfig.smallCartFee;
    }
    
    multiplier = getDemandMultiplier(darkStoreId);
    if (multiplier > 1) {
      deliveryFee *= multiplier;
      reason = 'high-demand';
    }
  }

  return { deliveryFee, smallCartFee, multiplier, reason };
}