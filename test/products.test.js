import { api } from "./helpers.js";
import { db, resetDb } from "../src/data/db.js";

beforeEach(() => resetDb());

describe("Products API", () => {
  it("GET /api/products returns an array", async () => {
    const res = await api().get("/api/products");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(20);
  });

  it("filters by category and search text", async () => {
    const byCat = await api().get("/api/products").query({ category: "Bakery" });
    expect(byCat.body.every((p) => p.category === "Bakery")).toBe(true);
    const bySearch = await api().get("/api/products").query({ q: "MILK" });
    expect(bySearch.body).toHaveLength(1);
  });

  it("GET /api/products/:id returns one product or 404", async () => {
    expect((await api().get("/api/products/1")).body.name).toMatch(/Bananas/);
    expect((await api().get("/api/products/999")).status).toBe(404);
    expect((await api().get("/api/products/abc")).status).toBe(400);
  });

  it("POST creates a product with zero stock in every store", async () => {
    const res = await api().post("/api/products").send({ name: "Honey", category: "Pantry", price: 4.5 });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id", 21);
    const rows = db.inventory.filter((r) => r.productId === 21);
    expect(rows).toHaveLength(db.darkStores.length);
    expect(rows.every((r) => r.quantity === 0)).toBe(true);
  });

  it("POST validates required fields", async () => {
    expect((await api().post("/api/products").send({ category: "x", price: 1 })).status).toBe(400);
    expect((await api().post("/api/products").send({ name: "x", price: 1 })).status).toBe(400);
    expect((await api().post("/api/products").send({ name: "x", category: "y", price: -2 })).status).toBe(400);
  });

  it("PUT updates a product partially", async () => {
    const res = await api().put("/api/products/1").send({ price: 2.5, unit: "1.2 kg", emoji: "🍌" });
    expect(res.status).toBe(200);
    expect(res.body.price).toBe(2.5);
    expect(res.body.name).toMatch(/Bananas/);
    expect((await api().put("/api/products/999").send({ price: 1 })).status).toBe(404);
  });

  it("DELETE removes the product and its inventory rows", async () => {
    expect((await api().delete("/api/products/1")).status).toBe(204);
    expect(db.inventory.some((r) => r.productId === 1)).toBe(false);
    expect((await api().delete("/api/products/1")).status).toBe(404);
  });
});
