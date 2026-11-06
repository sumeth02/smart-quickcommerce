import { api, NEAR_BASTILLE, FAR_AWAY } from "./helpers.js";
import { db, resetDb } from "../src/data/db.js";

beforeEach(() => resetDb());

describe("Dark stores API", () => {
  it("GET /api/darkstores returns all stores", async () => {
    const res = await api().get("/api/darkstores");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  it("GET /api/darkstores/nearest finds the store covering the address", async () => {
    const res = await api().get("/api/darkstores/nearest").query(NEAR_BASTILLE);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(2);
    expect(res.body.distanceKm).toBeLessThan(3);
  });

  it("nearest returns 404 out of range and 400 without coordinates", async () => {
    expect((await api().get("/api/darkstores/nearest").query(FAR_AWAY)).status).toBe(404);
    expect((await api().get("/api/darkstores/nearest")).status).toBe(400);
  });

  it("nearest skips closed stores", async () => {
    db.darkStores.find((s) => s.id === 2).isOpen = false;
    const res = await api().get("/api/darkstores/nearest").query(NEAR_BASTILLE);
    expect(res.status).toBe(404);
  });

  it("GET by id returns a store or 404", async () => {
    expect((await api().get("/api/darkstores/1")).body.name).toMatch(/Défense/);
    expect((await api().get("/api/darkstores/42")).status).toBe(404);
  });

  it("POST creates a store with an empty inventory", async () => {
    const res = await api().post("/api/darkstores").send({ name: "Dark Store - Nation", address: "Place de la Nation", lat: 48.848, lng: 2.3959 });
    expect(res.status).toBe(201);
    expect(res.body.radiusKm).toBe(3);
    expect(db.inventory.filter((r) => r.darkStoreId === res.body.id)).toHaveLength(db.products.length);
  });

  it("POST validates fields", async () => {
    expect((await api().post("/api/darkstores").send({ address: "x", lat: 1, lng: 1 })).status).toBe(400);
    expect((await api().post("/api/darkstores").send({ name: "x", lat: 1, lng: 1 })).status).toBe(400);
    expect((await api().post("/api/darkstores").send({ name: "x", address: "y", lat: 200, lng: 1 })).status).toBe(400);
    expect((await api().post("/api/darkstores").send({ name: "x", address: "y", lat: 1, lng: 1, radiusKm: 10 })).status).toBe(400);
  });

  it("PUT updates opening status", async () => {
    const res = await api().put("/api/darkstores/1").send({ isOpen: false, radiusKm: 2.5 });
    expect(res.body.isOpen).toBe(false);
    expect(res.body.radiusKm).toBe(2.5);
  });

  it("DELETE removes a store and its inventory", async () => {
    expect((await api().delete("/api/darkstores/3")).status).toBe(204);
    expect(db.inventory.some((r) => r.darkStoreId === 3)).toBe(false);
    expect((await api().delete("/api/darkstores/3")).status).toBe(404);
  });
});
