// Real-time stock synchronisation (SCRUM-20).
// Checkout reserves stock atomically: either every line is available and all are
// decremented, or nothing changes. Cancelling an order releases the stock.

import { db } from "../data/db.js";
import { conflict } from "../utils/httpError.js";

// Listeners notified after any stock change (Russine's low-stock alert module subscribes here).
const listeners = new Set();
export function onStockChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function emit(row) {
  for (const listener of listeners) listener(row);
}

export function getStockRow(darkStoreId, productId) {
  return db.inventory.find((r) => r.darkStoreId === darkStoreId && r.productId === productId);
}

export function getAvailableQuantity(darkStoreId, productId) {
  return getStockRow(darkStoreId, productId)?.quantity ?? 0;
}

/** Throws 409 listing every unavailable line; otherwise decrements all lines. */
export function reserveStock(darkStoreId, items) {
  const shortages = items
    .map(({ productId, quantity }) => ({ productId, requested: quantity, available: getAvailableQuantity(darkStoreId, productId) }))
    .filter((line) => line.available < line.requested);

  if (shortages.length > 0) throw conflict("Some items are out of stock", shortages);

  for (const { productId, quantity } of items) {
    const row = getStockRow(darkStoreId, productId);
    row.quantity -= quantity;
    emit(row);
  }
}

export function releaseStock(darkStoreId, items) {
  for (const { productId, quantity } of items) {
    const row = getStockRow(darkStoreId, productId);
    if (row) {
      row.quantity += quantity;
      emit(row);
    }
  }
}
