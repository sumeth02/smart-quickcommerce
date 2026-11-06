import { describe, it, expect, beforeEach } from "vitest";
import { api } from "./helpers.js";
import { db, resetDb } from "../src/data/db.js";

beforeEach(() => resetDb());

const payload = (quantity = 30) => {
  const row = db.inventory[0];
  return { darkStoreId: row.darkStoreId, items: [{ productId: row.productId, quantity }] };
};

describe("Replenishments", () => {
  it("POST creates a REQUESTED replenishment (201)", async () => {
    const res = await api().post("/api/replenishments").send(payload());
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("REQUESTED");
    expect(res.body).toHaveProperty("id");
  });

  it("POST rejects invalid data (400)", async () => {
    const good = payload();
    expect((await api().post("/api/replenishments").send({ ...good, darkStoreId: 9999 })).status).toBe(400);
    expect((await api().post("/api/replenishments").send({ ...good, items: [] })).status).toBe(400);
    expect((await api().post("/api/replenishments").send({ ...good, items: [null] })).status).toBe(400);
    const badProduct = { ...good, items: [{ productId: 9999, quantity: 5 }] };
    expect((await api().post("/api/replenishments").send(badProduct)).status).toBe(400);
    const badQty = { ...good, items: [{ productId: good.items[0].productId, quantity: 0 }] };
    expect((await api().post("/api/replenishments").send(badQty)).status).toBe(400);
  });

  it("GET lists and reads replenishments", async () => {
    const created = await api().post("/api/replenishments").send(payload());
    const list = await api().get("/api/replenishments");
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect((await api().get(`/api/replenishments/${created.body.id}`)).status).toBe(200);
    expect((await api().get("/api/replenishments/99999")).status).toBe(404);
    expect((await api().get("/api/replenishments/abc")).status).toBe(400);
  });

  it("enforces the REQUESTED -> SHIPPED -> RECEIVED order (409 otherwise)", async () => {
    const created = await api().post("/api/replenishments").send(payload());
    const id = created.body.id;
    expect((await api().put(`/api/replenishments/${id}/receive`)).status).toBe(409);
    const shipped = await api().put(`/api/replenishments/${id}/ship`);
    expect(shipped.status).toBe(200);
    expect(shipped.body.status).toBe("SHIPPED");
    expect((await api().put(`/api/replenishments/${id}/ship`)).status).toBe(409);
    expect((await api().delete(`/api/replenishments/${id}`)).status).toBe(409);
  });

  it("receiving adds stock and resolves the low-stock alert", async () => {
    const row = db.inventory[0];
    await api().put(`/api/inventory/${row.id}`).send({ quantity: 0 });
    const open = await api().get("/api/inventory/alerts?status=OPEN");
    expect(open.body.some((a) => a.inventoryId === row.id)).toBe(true);

    const created = await api().post("/api/replenishments").send(payload(row.lowStockThreshold + 20));
    const id = created.body.id;
    await api().put(`/api/replenishments/${id}/ship`);
    const received = await api().put(`/api/replenishments/${id}/receive`);
    expect(received.status).toBe(200);
    expect(received.body.status).toBe("RECEIVED");

    const after = await api().get(`/api/inventory/${row.id}`);
    expect(after.body.quantity).toBe(row.lowStockThreshold + 20);
    const stillOpen = await api().get("/api/inventory/alerts?status=OPEN");
    expect(stillOpen.body.some((a) => a.inventoryId === row.id)).toBe(false);
  });

  it("receiving creates the inventory row if it does not exist", async () => {
    const row = db.inventory[0];
    await api().delete(`/api/inventory/${row.id}`);
    const created = await api().post("/api/replenishments").send({
      darkStoreId: row.darkStoreId,
      items: [{ productId: row.productId, quantity: 12 }]
    });
    const id = created.body.id;
    await api().put(`/api/replenishments/${id}/ship`);
    await api().put(`/api/replenishments/${id}/receive`);
    const rows = await api().get(`/api/inventory?darkStoreId=${row.darkStoreId}&productId=${row.productId}`);
    expect(rows.body).toHaveLength(1);
    expect(rows.body[0].quantity).toBe(12);
  });

  it("DELETE works only while REQUESTED", async () => {
    const created = await api().post("/api/replenishments").send(payload());
    expect((await api().delete(`/api/replenishments/${created.body.id}`)).status).toBe(204);
    expect((await api().delete(`/api/replenishments/${created.body.id}`)).status).toBe(404);
  });
});