import { describe, it, expect, beforeEach } from "vitest";
import { api } from "./helpers.js";
import { db, nextId, resetDb } from "../src/data/db.js";

beforeEach(() => resetDb());

function seedOrder({ createdAt = new Date().toISOString(), darkStoreId = db.darkStores[0].id } = {}) {
  const order = {
    id: nextId(db.orders),
    customerId: "guest",
    darkStoreId,
    items: [
      { productId: 1, name: "Milk", unitPrice: 2, quantity: 2, lineTotal: 4 },
      { productId: 2, name: "Bread", unitPrice: 3, quantity: 1, lineTotal: 3 }
    ],
    status: "PLACED",
    statusHistory: [{ status: "PLACED", at: createdAt }],
    createdAt
  };
  db.orders.push(order);
  return order;
}

const pickerFor = (order) => db.pickers.find((p) => p.darkStoreId === order.darkStoreId);
const claim = (order) =>
  api().post(`/api/picker/orders/${order.id}/claim`).send({ pickerId: pickerFor(order).id });
const scan = (order, productId) =>
  api().post(`/api/picker/orders/${order.id}/scan`).send({ productId });

describe("Picker queue", () => {
  it("requires darkStoreId (400)", async () => {
    expect((await api().get("/api/picker/queue")).status).toBe(400);
  });

  it("lists PLACED orders of the store, oldest first", async () => {
    const newer = seedOrder({ createdAt: "2026-01-02T10:00:00.000Z" });
    const older = seedOrder({ createdAt: "2026-01-01T10:00:00.000Z" });
    seedOrder({ darkStoreId: db.darkStores[1].id });
    const res = await api().get(`/api/picker/queue?darkStoreId=${older.darkStoreId}`);
    expect(res.status).toBe(200);
    expect(res.body.map((o) => o.id)).toEqual([older.id, newer.id]);
  });
});

describe("Picker claim", () => {
  it("claims an order (201) and moves it to PICKING", async () => {
    const order = seedOrder();
    const res = await claim(order);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("PICKING");
    expect(db.orders[0].status).toBe("PICKING");
  });

  it("rejects a second claim (409)", async () => {
    const order = seedOrder();
    await claim(order);
    expect((await claim(order)).status).toBe(409);
  });

  it("rejects invalid claims", async () => {
    const order = seedOrder();
    const url = `/api/picker/orders/${order.id}/claim`;
    expect((await api().post(url).send({})).status).toBe(400);
    expect((await api().post(url).send({ pickerId: 9999 })).status).toBe(404);
    const other = db.pickers.find((p) => p.darkStoreId !== order.darkStoreId);
    expect((await api().post(url).send({ pickerId: other.id })).status).toBe(400);
    pickerFor(order).active = false;
    expect((await api().post(url).send({ pickerId: pickerFor(order).id })).status).toBe(400);
    expect((await api().post("/api/picker/orders/9999/claim").send({ pickerId: 1 })).status).toBe(404);
  });

  it("cannot claim an order that is not PLACED (409)", async () => {
    const order = seedOrder();
    order.status = "PACKED";
    expect((await claim(order)).status).toBe(409);
  });
});

describe("Picker scan", () => {
  it("requires a claimed order (409)", async () => {
    const order = seedOrder();
    expect((await scan(order, 1)).status).toBe(409);
  });

  it("counts scans and returns the progress", async () => {
    const order = seedOrder();
    await claim(order);
    const res = await scan(order, 1);
    expect(res.status).toBe(200);
    expect(res.body.complete).toBe(false);
    expect(res.body.lines.find((l) => l.productId === 1).scanned).toBe(1);
  });

  it("rejects unknown products, missing ids and over-scanning (400)", async () => {
    const order = seedOrder();
    await claim(order);
    expect((await scan(order, 999)).status).toBe(400);
    expect((await api().post(`/api/picker/orders/${order.id}/scan`).send({})).status).toBe(400);
    await scan(order, 2);
    expect((await scan(order, 2)).status).toBe(400);
  });
});

describe("Picker pack", () => {
  it("cannot pack before claiming (409) or before everything is scanned (409)", async () => {
    const order = seedOrder();
    const url = `/api/picker/orders/${order.id}/pack`;
    expect((await api().post(url)).status).toBe(409);
    await claim(order);
    await scan(order, 1);
    expect((await api().post(url)).status).toBe(409);
  });

  it("happy path ends in PACKED with pickDurationSeconds", async () => {
    const order = seedOrder();
    await claim(order);
    await scan(order, 1);
    await scan(order, 1);
    const last = await scan(order, 2);
    expect(last.body.complete).toBe(true);
    const res = await api().post(`/api/picker/orders/${order.id}/pack`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("PACKED");
    expect(typeof res.body.pickDurationSeconds).toBe("number");
    expect(res.body.withinTarget).toBe(true);
    expect(db.orders[0].status).toBe("PACKED");
    expect((await api().post(`/api/picker/orders/${order.id}/pack`)).status).toBe(409);
  });
});

describe("Picker tasks", () => {
  it("lists the tasks of a picker and validates pickerId", async () => {
    const order = seedOrder();
    await claim(order);
    const pickerId = pickerFor(order).id;
    const mine = await api().get(`/api/picker/tasks?pickerId=${pickerId}`);
    expect(mine.status).toBe(200);
    expect(mine.body).toHaveLength(1);
    expect((await api().get("/api/picker/tasks?pickerId=999")).body).toHaveLength(0);
    expect((await api().get("/api/picker/tasks")).body).toHaveLength(1);
    expect((await api().get("/api/picker/tasks?pickerId=abc")).status).toBe(400);
  });
});