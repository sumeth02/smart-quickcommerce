import { api, NEAR_BASTILLE, FAR_AWAY } from "./helpers.js";
import { db, resetDb } from "../src/data/db.js";
import { getStockRow } from "../src/services/stockService.js";

beforeEach(() => resetDb());

const checkout = (overrides = {}) => ({
  customerId: "c1",
  darkStoreId: 1,
  items: [{ productId: 1, quantity: 2 }, { productId: 9, quantity: 1 }],
  payment: { method: "card", token: "tok_visa" },
  ...overrides
});

describe("Quote (see delivery fee before paying)", () => {
  it("prices the basket with fees and ETA", async () => {
    const res = await api().post("/api/orders/quote").send({ darkStoreId: 1, items: [{ productId: 1, quantity: 2 }] });
    expect(res.status).toBe(200);
    expect(res.body.subtotal).toBe(3.98);
    expect(res.body.deliveryFee).toBe(1.99);
    expect(res.body.smallCartFee).toBe(1.5);
    expect(res.body.total).toBe(7.47);
    expect(res.body.etaMinutes).toBeLessThanOrEqual(15);
  });

  it("gives free delivery above the threshold and merges duplicate lines", async () => {
    const res = await api().post("/api/orders/quote").send({
      darkStoreId: 1,
      items: [{ productId: 13, quantity: 3 }, { productId: 13, quantity: 3 }]
    });
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].quantity).toBe(6);
    expect(res.body.deliveryFee).toBe(0);
    expect(res.body.feeReason).toBe("free-delivery");
  });

  it("uses the address to pick the nearest store and compute ETA", async () => {
    const res = await api().post("/api/orders/quote").send({ address: NEAR_BASTILLE, items: [{ productId: 5, quantity: 1 }] });
    expect(res.body.darkStoreId).toBe(2);
    expect(res.body.distanceKm).toBeLessThan(3);
  });

  it("rejects bad baskets and addresses", async () => {
    expect((await api().post("/api/orders/quote").send({ darkStoreId: 1, items: [] })).status).toBe(400);
    expect((await api().post("/api/orders/quote").send({ darkStoreId: 1, items: [{ productId: 1, quantity: 0 }] })).status).toBe(400);
    expect((await api().post("/api/orders/quote").send({ darkStoreId: 1, items: [{ productId: 999, quantity: 1 }] })).status).toBe(404);
    expect((await api().post("/api/orders/quote").send({ darkStoreId: 99, items: [{ productId: 1, quantity: 1 }] })).status).toBe(404);
    expect((await api().post("/api/orders/quote").send({ address: FAR_AWAY, items: [{ productId: 1, quantity: 1 }] })).status).toBe(400);
    expect((await api().post("/api/orders/quote").send({ address: { lat: "x" }, items: [{ productId: 1, quantity: 1 }] })).status).toBe(400);
    expect((await api().post("/api/orders/quote").send({ darkStoreId: 1, address: FAR_AWAY, items: [{ productId: 1, quantity: 1 }] })).status).toBe(400);
    expect((await api().post("/api/orders/quote").send({ darkStoreId: 99, address: NEAR_BASTILLE, items: [{ productId: 1, quantity: 1 }] })).status).toBe(404);
  });

  it("accepts an explicit store when the address is inside its radius", async () => {
    const res = await api().post("/api/orders/quote").send({ darkStoreId: 2, address: NEAR_BASTILLE, items: [{ productId: 1, quantity: 1 }] });
    expect(res.status).toBe(200);
    expect(res.body.darkStoreId).toBe(2);
  });

  it("refuses quotes from a closed store", async () => {
    db.darkStores[0].isOpen = false;
    const res = await api().post("/api/orders/quote").send({ darkStoreId: 1, items: [{ productId: 1, quantity: 1 }] });
    expect(res.status).toBe(409);
  });
});

describe("Orders API (quick checkout)", () => {
  it("POST /api/orders places an order, takes payment and decrements stock", async () => {
    const before = getStockRow(1, 1).quantity;
    const res = await api().post("/api/orders").send(checkout());
    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Order confirmed");
    expect(res.body.order).toMatchObject({ id: 1, status: "PLACED", paymentStatus: "PAID", customerId: "c1" });
    expect(getStockRow(1, 1).quantity).toBe(before - 2);
    expect(db.payments).toHaveLength(1);
  });

  it("returns 409 with shortages and leaves stock untouched", async () => {
    getStockRow(1, 9).quantity = 0;
    const before = getStockRow(1, 1).quantity;
    const res = await api().post("/api/orders").send(checkout());
    expect(res.status).toBe(409);
    expect(res.body.details[0]).toMatchObject({ productId: 9, requested: 1, available: 0 });
    expect(getStockRow(1, 1).quantity).toBe(before);
  });

  it("returns 402 for a declined payment and releases the stock", async () => {
    const before = getStockRow(1, 1).quantity;
    const res = await api().post("/api/orders").send(checkout({ payment: { method: "card", token: "tok_fail" } }));
    expect(res.status).toBe(402);
    expect(getStockRow(1, 1).quantity).toBe(before);
    expect(db.orders).toHaveLength(0);
    expect(db.payments[0]).toMatchObject({ status: "FAILED", orderId: null });
  });

  it("supports cash on delivery as a pending payment", async () => {
    const res = await api().post("/api/orders").send(checkout({ payment: { method: "cash_on_delivery" } }));
    expect(res.body.order.paymentStatus).toBe("PENDING");
  });

  it("validates customer and payment method", async () => {
    expect((await api().post("/api/orders").send(checkout({ customerId: undefined }))).status).toBe(400);
    expect((await api().post("/api/orders").send(checkout({ payment: { method: "bitcoin" } }))).status).toBe(400);
    expect((await api().post("/api/orders").send({})).status).toBe(400);
  });

  it("GET lists and filters orders; GET by id", async () => {
    await api().post("/api/orders").send(checkout());
    await api().post("/api/orders").send(checkout({ customerId: "c2", darkStoreId: 2 }));
    expect((await api().get("/api/orders")).body).toHaveLength(2);
    expect((await api().get("/api/orders").query({ customerId: "c2" })).body).toHaveLength(1);
    expect((await api().get("/api/orders").query({ darkStoreId: 1, status: "PLACED" })).body).toHaveLength(1);
    expect((await api().get("/api/orders/1")).body.id).toBe(1);
    expect((await api().get("/api/orders/9")).status).toBe(404);
  });

  it("PUT moves the order through the lifecycle and rejects invalid jumps", async () => {
    await api().post("/api/orders").send(checkout());
    expect((await api().put("/api/orders/1").send({})).status).toBe(400);
    expect((await api().put("/api/orders/1").send({ status: "FLYING" })).status).toBe(400);
    expect((await api().put("/api/orders/1").send({ status: "DELIVERED" })).status).toBe(409);
    for (const status of ["PICKING", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"]) {
      const res = await api().put("/api/orders/1").send({ status });
      expect(res.body.status).toBe(status);
    }
    const order = (await api().get("/api/orders/1")).body;
    expect(order.statusHistory.map((h) => h.status)).toEqual(["PLACED", "PICKING", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"]);
  });

  it("DELETE cancels an order and restores stock", async () => {
    const before = getStockRow(1, 1).quantity;
    await api().post("/api/orders").send(checkout());
    expect((await api().delete("/api/orders/1")).status).toBe(204);
    expect(getStockRow(1, 1).quantity).toBe(before);
    expect((await api().delete("/api/orders/1")).status).toBe(409);
  });
});

describe("Payments API", () => {
  it("lists payments, filters by order and gets by id", async () => {
    await api().post("/api/orders").send(checkout());
    expect((await api().get("/api/payments")).body).toHaveLength(1);
    expect((await api().get("/api/payments").query({ orderId: 1 })).body[0].status).toBe("PAID");
    expect((await api().get("/api/payments/1")).body.currency).toBe("EUR");
    expect((await api().get("/api/payments/5")).status).toBe(404);
  });

  it("confirms a cash-on-delivery payment once", async () => {
    await api().post("/api/orders").send(checkout({ payment: { method: "cash_on_delivery" } }));
    const res = await api().put("/api/payments/1/confirm");
    expect(res.body.status).toBe("PAID");
    expect(db.orders[0].paymentStatus).toBe("PAID");
    expect((await api().put("/api/payments/1/confirm")).status).toBe(409);
    expect((await api().put("/api/payments/7/confirm")).status).toBe(404);
  });
});
