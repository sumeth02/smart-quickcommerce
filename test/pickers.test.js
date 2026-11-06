import { describe, it, expect, beforeEach } from "vitest";
import { api } from "./helpers.js";
import { db, resetDb } from "../src/data/db.js";

beforeEach(() => resetDb());

describe("Pickers CRUD", () => {
  it("GET /api/pickers returns the seeded pickers, with a store filter", async () => {
    const all = await api().get("/api/pickers");
    expect(all.status).toBe(200);
    expect(all.body.length).toBeGreaterThan(0);
    const storeId = db.darkStores[0].id;
    const filtered = await api().get(`/api/pickers?darkStoreId=${storeId}`);
    expect(filtered.body.every((p) => p.darkStoreId === storeId)).toBe(true);
  });

  it("GET /api/pickers/:id returns one picker, 404 or 400 otherwise", async () => {
    const picker = db.pickers[0];
    expect((await api().get(`/api/pickers/${picker.id}`)).status).toBe(200);
    expect((await api().get("/api/pickers/9999")).status).toBe(404);
    expect((await api().get("/api/pickers/abc")).status).toBe(400);
  });

  it("POST creates a picker (201) and rejects invalid data (400)", async () => {
    const storeId = db.darkStores[0].id;
    const ok = await api().post("/api/pickers").send({ name: "Alex", darkStoreId: storeId });
    expect(ok.status).toBe(201);
    expect(ok.body).toHaveProperty("id");
    expect(ok.body.active).toBe(true);
    expect((await api().post("/api/pickers").send({ darkStoreId: storeId })).status).toBe(400);
    expect((await api().post("/api/pickers").send({ name: "Alex", darkStoreId: 9999 })).status).toBe(400);
  });

  it("PUT updates a picker and validates input", async () => {
    const picker = db.pickers[0];
    const ok = await api().put(`/api/pickers/${picker.id}`).send({ name: "Renamed", active: false });
    expect(ok.status).toBe(200);
    expect(ok.body.name).toBe("Renamed");
    expect(ok.body.active).toBe(false);
    expect((await api().put(`/api/pickers/${picker.id}`).send({ active: "yes" })).status).toBe(400);
    expect((await api().put("/api/pickers/9999").send({ name: "X" })).status).toBe(404);
  });

  it("DELETE removes a picker (204), then 404", async () => {
    const picker = db.pickers[0];
    expect((await api().delete(`/api/pickers/${picker.id}`)).status).toBe(204);
    expect((await api().delete(`/api/pickers/${picker.id}`)).status).toBe(404);
  });
});