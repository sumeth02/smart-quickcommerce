import { describe, it, expect, beforeEach } from "vitest";
import { api, NEAR_BASTILLE } from "./helpers.js";
import { resetDb, db } from "../src/data/db.js";
import { getDemandMultiplier, calculateDeliveryFee } from "../src/services/deliveryFee.js";

describe("Dynamic Delivery Fees API (SCRUM-39)", () => {
  beforeEach(() => {
    resetDb();
  });

  describe("/api/fees/config", () => {
    it("gets and updates fee config and rejects invalid values", async () => {
      const getRes = await api().get("/api/fees/config");
      expect(getRes.status).toBe(200);
      expect(getRes.body).toHaveProperty("baseFee");
      expect(getRes.body).toHaveProperty("maxMultiplier");

      const putRes = await api()
        .put("/api/fees/config")
        .send({ baseFee: 2.5, maxMultiplier: 2.5 });
      expect(putRes.status).toBe(200);
      expect(putRes.body.baseFee).toBe(2.5);
      expect(putRes.body.maxMultiplier).toBe(2.5);

      const negRes = await api().put("/api/fees/config").send({ baseFee: -1 });
      expect(negRes.status).toBe(400);

      const badThreshold = await api()
        .put("/api/fees/config")
        .send({ smallCartThreshold: 50, freeDeliveryThreshold: 40 });
      expect(badThreshold.status).toBe(400);
    });
  });

  describe("/api/fees/rules CRUD", () => {
    it("creates, lists, gets, updates, validates, and deletes fee rules", async () => {
      const created = await api().post("/api/fees/rules").send({
        label: "Evening rush",
        startHour: 18,
        endHour: 21,
        multiplier: 1.2
      });
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({
        id: 1,
        label: "Evening rush",
        startHour: 18,
        endHour: 21,
        multiplier: 1.2
      });

      const list = await api().get("/api/fees/rules");
      expect(list.status).toBe(200);
      expect(list.body).toHaveLength(1);

      const one = await api().get(`/api/fees/rules/${created.body.id}`);
      expect(one.status).toBe(200);
      expect(one.body.label).toBe("Evening rush");

      const updated = await api()
        .put(`/api/fees/rules/${created.body.id}`)
        .send({ label: "Peak evening", multiplier: 1.4 });
      expect(updated.status).toBe(200);
      expect(updated.body).toMatchObject({ label: "Peak evening", multiplier: 1.4 });

      // Validation errors
      expect((await api().post("/api/fees/rules").send({ label: "", startHour: 10, endHour: 12, multiplier: 1.2 })).status).toBe(400);
      expect((await api().post("/api/fees/rules").send({ label: "Bad hour", startHour: -1, endHour: 12, multiplier: 1.2 })).status).toBe(400);
      expect((await api().post("/api/fees/rules").send({ label: "Bad end", startHour: 10, endHour: 25, multiplier: 1.2 })).status).toBe(400);
      expect((await api().post("/api/fees/rules").send({ label: "Bad mult", startHour: 10, endHour: 12, multiplier: 4 })).status).toBe(400);

      // Delete + 404
      const del = await api().delete(`/api/fees/rules/${created.body.id}`);
      expect(del.status).toBe(204);
      expect((await api().get(`/api/fees/rules/${created.body.id}`)).status).toBe(404);
    });
  });

  describe("Surge pricing, capping, and order quote integration", () => {
    it("computes demand multiplier tiers, handles missing/available riders, and caps at maxMultiplier", async () => {
      db.riders = [];
      const nowIso = new Date().toISOString();

      // 2 active orders, 0 riders => ratio 2 => multiplier 1.25
      db.orders.push(
        { id: 901, darkStoreId: 2, status: "PLACED", createdAt: nowIso },
        { id: 902, darkStoreId: 2, status: "PICKING", createdAt: nowIso }
      );
      const surgeMid = await api().get("/api/fees/surge/2");
      expect(surgeMid.status).toBe(200);
      expect(surgeMid.body).toMatchObject({
        darkStoreId: 2,
        activeOrders: 2,
        availableRiders: 0,
        multiplier: 1.25
      });

      // 4 active orders, 0 riders => ratio 4 => multiplier 1.5
      db.orders.push(
        { id: 903, darkStoreId: 2, status: "PACKED", createdAt: nowIso },
        { id: 904, darkStoreId: 2, status: "PLACED", createdAt: nowIso }
      );
      const surgeHigh = await api().get("/api/fees/surge/2");
      expect(surgeHigh.body.multiplier).toBe(1.5);

      // Add a time-of-day rule active right now that pushes 1.5 * 2 = 3 => capped at maxMultiplier (2)
      const currentHour = new Date().getHours();
      await api().post("/api/fees/rules").send({
        label: "Mega rush",
        startHour: currentHour,
        endHour: currentHour,
        multiplier: 2
      });
      const capped = await api().get("/api/fees/surge/2");
      expect(capped.body.multiplier).toBe(2);

      // Adding available riders lowers the demand ratio
      db.riders = [
        { id: 1, darkStoreId: 2, status: "AVAILABLE" },
        { id: 2, darkStoreId: 2, status: "AVAILABLE" },
        { id: 3, darkStoreId: 2, status: "AVAILABLE" }
      ];
      db.feeRules = [];
      const cooled = await api().get("/api/fees/surge/2");
      expect(cooled.body.availableRiders).toBe(3);
      expect(cooled.body.multiplier).toBe(1);

      // Overnight time-of-day rule check (22 to 2)
      db.feeRules.push({ id: 99, label: "Late night", startHour: 22, endHour: 2, multiplier: 1.3 });
      const lateDate = new Date("2026-11-23T23:00:00");
      expect(getDemandMultiplier(2, lateDate)).toBe(1.3);

      // Free delivery still overrides surge when subtotal >= freeDeliveryThreshold
      const freeRes = calculateDeliveryFee({ subtotal: 35, darkStoreId: 2, now: lateDate });
      expect(freeRes.deliveryFee).toBe(0);
      expect(freeRes.reason).toBe("free-delivery");
    });

    it("returns high-demand on POST /api/orders/quote when active orders are high and no riders are available", async () => {
      db.riders = [];
      const nowIso = new Date().toISOString();
      for (let i = 0; i < 4; i += 1) {
        db.orders.push({ id: 950 + i, darkStoreId: 2, status: "PLACED", createdAt: nowIso });
      }

      const quote = await api()
        .post("/api/orders/quote")
        .send({
          darkStoreId: 2,
          address: NEAR_BASTILLE,
          items: [{ productId: 1, quantity: 1 }]
        });

      expect(quote.status).toBe(200);
      expect(quote.body.feeReason).toBe("high-demand");
      expect(quote.body.deliveryFee).toBeGreaterThan(1.99);
    });
  });
});