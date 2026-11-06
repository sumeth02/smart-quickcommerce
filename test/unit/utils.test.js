import { distanceKm, findNearestStore, isValidCoordinate } from "../../src/utils/geo.js";
import { formatStatus } from "../../src/utils/status.js";
import { calculateDeliveryFee, getDemandMultiplier } from "../../src/services/deliveryFee.js";
import { onStockChange, reserveStock, releaseStock, getAvailableQuantity } from "../../src/services/stockService.js";
import { errorHandler } from "../../src/utils/errorHandler.js";
import { parseId } from "../../src/utils/httpError.js";
import { resetDb } from "../../src/data/db.js";

const mockRes = () => {
  const res = { statusCode: 0, body: null };
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (b) => ((res.body = b), res);
  return res;
};

describe("geo utils", () => {
  it("computes distances in km", () => {
    expect(distanceKm({ lat: 48.8566, lng: 2.3522 }, { lat: 48.8566, lng: 2.3522 })).toBe(0);
    const parisLyon = distanceKm({ lat: 48.8566, lng: 2.3522 }, { lat: 45.764, lng: 4.8357 });
    expect(parisLyon).toBeGreaterThan(380);
    expect(parisLyon).toBeLessThan(400);
  });

  it("validates coordinates", () => {
    expect(isValidCoordinate(48, 2)).toBe(true);
    expect(isValidCoordinate(91, 2)).toBe(false);
    expect(isValidCoordinate(NaN, 2)).toBe(false);
  });

  it("returns the closest store within radius", () => {
    const stores = [
      { id: 1, lat: 0, lng: 0, radiusKm: 3, isOpen: true },
      { id: 2, lat: 0, lng: 0.01, radiusKm: 3, isOpen: true }
    ];
    expect(findNearestStore(stores, { lat: 0, lng: 0.009 }).store.id).toBe(2);
    expect(findNearestStore(stores, { lat: 1, lng: 1 })).toBeNull();
  });
});

describe("formatStatus", () => {
  it("covers every branch", () => {
    expect(formatStatus(10)).toBe("warming-up");
    expect(formatStatus(600)).toBe("healthy");
    expect(formatStatus(3600)).toBe("steady");
  });
});

describe("calculateDeliveryFee (baseline)", () => {
  it("applies base, small-cart and free-delivery rules", () => {
    expect(getDemandMultiplier(1)).toBe(1);
    expect(calculateDeliveryFee({ subtotal: 5, darkStoreId: 1 })).toMatchObject({ deliveryFee: 1.99, smallCartFee: 1.5, reason: "standard" });
    expect(calculateDeliveryFee({ subtotal: 15, darkStoreId: 1 }).smallCartFee).toBe(0);
    expect(calculateDeliveryFee({ subtotal: 30, darkStoreId: 1 })).toMatchObject({ deliveryFee: 0, reason: "free-delivery" });
  });
});

describe("stockService", () => {
  beforeEach(() => resetDb());

  it("notifies listeners on every stock change and can unsubscribe", () => {
    const seen = [];
    const off = onStockChange((row) => seen.push(row.quantity));
    const start = getAvailableQuantity(1, 1);
    reserveStock(1, [{ productId: 1, quantity: 1 }]);
    releaseStock(1, [{ productId: 1, quantity: 1 }, { productId: 999, quantity: 1 }]);
    off();
    reserveStock(1, [{ productId: 1, quantity: 1 }]);
    expect(seen).toEqual([start - 1, start]);
    expect(getAvailableQuantity(1, 999)).toBe(0);
  });
});

describe("errorHandler", () => {
  it("defaults to 500 with a message", () => {
    const res = mockRes();
    errorHandler({}, {}, res, () => {});
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: true, message: "Internal server error" });
  });

  it("keeps the status and details of HTTP errors", () => {
    const res = mockRes();
    errorHandler({ status: 409, message: "Conflict", details: [1] }, {}, res, () => {});
    expect(res.statusCode).toBe(409);
    expect(res.body.details).toEqual([1]);
  });
});

describe("parseId", () => {
  it("accepts positive integers only", () => {
    expect(parseId("4")).toBe(4);
    expect(() => parseId("0")).toThrow("Invalid id");
  });
});
