// The server must start with seed data even when no test calls resetDb().
import { db } from "../../src/data/db.js";

describe("db seed on startup", () => {
  it("loads dark stores, products and inventory when imported", () => {
    expect(db.darkStores.length).toBeGreaterThan(0);
    expect(db.products.length).toBeGreaterThan(0);
    expect(db.inventory.length).toBe(db.darkStores.length * db.products.length);
  });
});
