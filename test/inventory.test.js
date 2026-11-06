import { describe, it, expect, beforeEach } from "vitest";
import { api } from "./helpers.js";
import { db, resetDb } from "../src/data/db.js";

beforeEach(() => resetDb());

const firstRow = () => db.inventory[0];

describe("Inventory CRUD", () => {
  it("GET /api/inventory returns an array", async () => {
    const res = await api().get("/api/inventory");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("filters by darkStoreId and productId", async () => {
    const row = firstRow();
    const byStore = await api().get(`/api/inventory?darkStoreId=${row.darkStoreId}`);
    expect(byStore.body.every((r) => r.darkStoreId === row.darkStoreId)).toBe(true);
    const byProduct = await api().get(`/api/inventory?productId=${row.productId}`);
    expect(byProduct.body.every((r) => r.productId === row.productId)).toBe(true);
  });

  it("filters low stock rows", async () => {
    const row = firstRow();
    await api().put(`/api/inventory/${row.id}`).send({ quantity: 0 });
    const res = await api().get("/api/inventory?lowStock=true");
    expect(res.body.some((r) => r.id === row.id)).toBe(true);
  });

  it("GET /api/inventory/:id returns one row, 404 or 400 otherwise", async () => {
    const row = firstRow();
    expect((await api().get(`/api/inventory/${row.id}`)).status).toBe(200);
    expect((await api().get("/api/inventory/99999")).status).toBe(404);
    expect((await api().get("/api/inventory/abc")).status).toBe(400);
  });

  it("POST creates a row (201) after the pair was removed", async () => {
    const row = firstRow();
    await api().delete(`/api/inventory/${row.id}`);
    const res = await api()
      .post("/api/inventory")
      .send({ darkStoreId: row.darkStoreId, productId: row.productId, quantity: 20 });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.lowStockThreshold).toBe(5);
  });

  it("POST rejects duplicates (409) and invalid data (400)", async () => {
    const row = firstRow();
    const dup = await api()
      .post("/api/inventory")
      .send({ darkStoreId: row.darkStoreId, productId: row.productId });
    expect(dup.status).toBe(409);
    const badStore = await api().post("/api/inventory").send({ darkStoreId: 9999, productId: row.productId });
    expect(badStore.status).toBe(400);
    const badProduct = await api().post("/api/inventory").send({ darkStoreId: row.darkStoreId, productId: 9999 });
    expect(badProduct.status).toBe(400);
    const badQty = await api()
      .post("/api/inventory")
      .send({ darkStoreId: row.darkStoreId, productId: row.productId, quantity: -1 });
    expect(badQty.status).toBe(400);
  });

  it("PUT updates a row and validates input", async () => {
    const row = firstRow();
    const ok = await api().put(`/api/inventory/${row.id}`).send({ quantity: 50, lowStockThreshold: 7 });
    expect(ok.status).toBe(200);
    expect(ok.body.quantity).toBe(50);
    expect(ok.body.lowStockThreshold).toBe(7);
    expect((await api().put(`/api/inventory/${row.id}`).send({ quantity: -5 })).status).toBe(400);
    expect((await api().put(`/api/inventory/${row.id}`).send({ lowStockThreshold: "x" })).status).toBe(400);
    expect((await api().put("/api/inventory/99999").send({ quantity: 1 })).status).toBe(404);
  });

  it("PATCH /:id/adjust changes stock but never below 0", async () => {
    const row = firstRow();
    await api().put(`/api/inventory/${row.id}`).send({ quantity: 10 });
    const up = await api().patch(`/api/inventory/${row.id}/adjust`).send({ delta: 5 });
    expect(up.status).toBe(200);
    expect(up.body.quantity).toBe(15);
    expect((await api().patch(`/api/inventory/${row.id}/adjust`).send({ delta: -100 })).status).toBe(409);
    expect((await api().patch(`/api/inventory/${row.id}/adjust`).send({ delta: "a" })).status).toBe(400);
  });

  it("DELETE removes a row (204), then 404", async () => {
    const row = firstRow();
    expect((await api().delete(`/api/inventory/${row.id}`)).status).toBe(204);
    expect((await api().get(`/api/inventory/${row.id}`)).status).toBe(404);
    expect((await api().delete(`/api/inventory/${row.id}`)).status).toBe(404);
  });
});

describe("Low-stock alerts", () => {
  it("creates one OPEN alert when stock falls under the threshold, without duplicates", async () => {
    const row = firstRow();
    await api().put(`/api/inventory/${row.id}`).send({ quantity: row.lowStockThreshold });
    await api().patch(`/api/inventory/${row.id}/adjust`).send({ delta: -1 });
    const res = await api().get("/api/inventory/alerts?status=OPEN");
    expect(res.status).toBe(200);
    const mine = res.body.filter((a) => a.inventoryId === row.id);
    expect(mine).toHaveLength(1);
    expect(mine[0].status).toBe("OPEN");
  });

  it("resolves the alert when stock goes back above the threshold", async () => {
    const row = firstRow();
    await api().put(`/api/inventory/${row.id}`).send({ quantity: 0 });
    await api().patch(`/api/inventory/${row.id}/adjust`).send({ delta: row.lowStockThreshold + 10 });
    const open = await api().get("/api/inventory/alerts?status=OPEN");
    expect(open.body.some((a) => a.inventoryId === row.id)).toBe(false);
    const resolved = await api().get("/api/inventory/alerts?status=RESOLVED");
    expect(resolved.body.some((a) => a.inventoryId === row.id)).toBe(true);
  });

  it("lists all alerts and rejects an invalid status", async () => {
    expect((await api().get("/api/inventory/alerts")).status).toBe(200);
    expect((await api().get("/api/inventory/alerts?status=NOPE")).status).toBe(400);
  });

  it("PUT /alerts/:id/resolve closes an alert (404 if unknown)", async () => {
    const row = firstRow();
    await api().put(`/api/inventory/${row.id}`).send({ quantity: 0 });
    const alert = db.inventoryAlerts[0];
    const res = await api().put(`/api/inventory/alerts/${alert.id}/resolve`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("RESOLVED");
    expect((await api().put("/api/inventory/alerts/99999/resolve")).status).toBe(404);
  });

  it("closes open alerts when the inventory row is deleted", async () => {
    const row = firstRow();
    await api().put(`/api/inventory/${row.id}`).send({ quantity: 0 });
    await api().delete(`/api/inventory/${row.id}`);
    expect(db.inventoryAlerts.every((a) => a.status === "RESOLVED")).toBe(true);
  });
});