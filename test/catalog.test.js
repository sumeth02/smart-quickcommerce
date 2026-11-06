import { api, NEAR_BASTILLE, FAR_AWAY } from "./helpers.js";
import { resetDb } from "../src/data/db.js";
import { getStockRow } from "../src/services/stockService.js";

beforeEach(() => resetDb());

describe("Catalog (localized browsing)", () => {
  it("returns products with live stock for a store", async () => {
    const res = await api().get("/api/catalog").query({ storeId: 1 });
    expect(res.status).toBe(200);
    expect(res.body.store.id).toBe(1);
    expect(res.body.categories).toContain("Bakery");
    const banana = res.body.products.find((p) => p.id === 1);
    expect(banana.stock).toBe(getStockRow(1, 1).quantity);
  });

  it("resolves the store from coordinates", async () => {
    const res = await api().get("/api/catalog").query(NEAR_BASTILLE);
    expect(res.body.store.id).toBe(2);
    expect(res.body.store.distanceKm).toBeGreaterThan(0);
  });

  it("filters by category, text and availability", async () => {
    getStockRow(1, 9).quantity = 0;
    const res = await api().get("/api/catalog").query({ storeId: 1, category: "Bakery", inStock: "true" });
    expect(res.body.products.map((p) => p.id)).toEqual([10]);
    const text = await api().get("/api/catalog").query({ storeId: 1, q: "coffee" });
    expect(text.body.products).toHaveLength(1);
  });

  it("handles invalid input", async () => {
    expect((await api().get("/api/catalog")).status).toBe(400);
    expect((await api().get("/api/catalog").query({ storeId: 99 })).status).toBe(404);
    expect((await api().get("/api/catalog").query(FAR_AWAY)).status).toBe(404);
    expect((await api().get("/api/catalog").query({ lat: "x", lng: 2 })).status).toBe(400);
  });
});
