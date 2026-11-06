import { seedDarkStores, seedProducts, seedInventory } from "./seed.js";

export const db = {
  darkStores: [],
  products: [],
  inventory: [],
  orders: [],
  payments: [],
  customers: [], // Added for auth
  feeRules: []   // Added for dynamic fees
};

export function resetDb() {
  db.darkStores = seedDarkStores();
  db.products = seedProducts();
  db.inventory = seedInventory();
  db.orders = [];
  db.payments = [];
  db.customers = [];
  db.feeRules = [];
}

export function nextId(collection) {
  if (!collection || collection.length === 0) return 1;
  return collection.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}