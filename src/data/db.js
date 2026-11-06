// In-memory database shared by every module.
// Each collection is a plain array; resetDb() restores the seed (used by tests).
// Team modules (auth, inventory alerts, picker, riders, deliveries, fees) add
// their own collections here.

import { seedDarkStores, seedProducts, seedInventory } from "./seed.js";

export const db = {
  darkStores: [],
  products: [],
  inventory: [],
  orders: [],
  payments: []
};

export function resetDb() {
  db.darkStores = seedDarkStores();
  db.products = seedProducts();
  db.inventory = seedInventory();
  db.orders = [];
  db.payments = [];
}

export function nextId(collection) {
  return collection.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

resetDb();
