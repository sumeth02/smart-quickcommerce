import { seedDarkStores, seedProducts, seedInventory } from "./seed.js";

export const db = {
  darkStores: [],
  products: [],
  inventory: [],
  orders: [],
  payments: [],
  customers: [],
  feeRules: [],
  inventoryAlerts: [],
  replenishments: [],
  pickers: [],
  pickTasks: []
};

export function resetDb() {
  db.darkStores = seedDarkStores();
  let pickerId = 1;
  db.pickers = db.darkStores.flatMap((store) =>
    [1, 2].map((n) => ({ id: pickerId++, name: `Picker ${n} (${store.name})`, darkStoreId: store.id, active: true }))
  );
  db.pickTasks = [];
  db.products = seedProducts();
  db.inventory = seedInventory();
  db.orders = [];
  db.payments = [];
  db.customers = [];
  db.feeRules = [];
  db.inventoryAlerts = [];
  db.replenishments = [];
}

export function nextId(collection) {
  if (!collection || collection.length === 0) return 1;
  return collection.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}
resetDb();
