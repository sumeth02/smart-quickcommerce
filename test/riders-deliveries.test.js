import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { db, resetDb } from "../src/data/db.js";

describe("Riders & Deliveries API (SCRUM-42)", () => {
  beforeEach(() => {
    resetDb();
  });

  it("lists seeded riders and filters by status", async () => {
    const res = await request(app).get("/api/riders?status=AVAILABLE");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("creates, updates status, and deletes a rider", async () => {
    const created = await request(app)
      .post("/api/riders")
      .send({ name: "Test Rider", darkStoreId: 1, vehicle: "e-bike" });
    expect(created.status).toBe(201);
    expect(created.body.name).toBe("Test Rider");
    expect(created.body.status).toBe("AVAILABLE");

    const updated = await request(app)
      .patch(`/api/riders/${created.body.id}/status`)
      .send({ status: "OFFLINE" });
    expect(updated.status).toBe(200);
    expect(updated.body.status).toBe("OFFLINE");

    const deleted = await request(app).delete(`/api/riders/${created.body.id}`);
    expect(deleted.status).toBe(204);
  });

  it("creates a delivery for an order and updates its status", async () => {
    db.orders.push({
      id: 101,
      customerId: "c1",
      darkStoreId: 1,
      deliveryAddress: "12 Rue de Rivoli, Paris",
      status: "READY_FOR_DELIVERY"
    });

    const dispatched = await request(app)
      .post("/api/deliveries")
      .send({ orderId: 101 });
    expect(dispatched.status).toBe(201);
    expect(dispatched.body.orderId).toBe(101);
    expect(dispatched.body.status).toBe("ASSIGNED");

    const byOrder = await request(app).get("/api/deliveries/order/101");
    expect(byOrder.status).toBe(200);
    expect(byOrder.body.id).toBe(dispatched.body.id);

    const statusRes = await request(app)
      .patch(`/api/deliveries/${dispatched.body.id}/status`)
      .send({ status: "DELIVERED" });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBe("DELIVERED");
  });
});
