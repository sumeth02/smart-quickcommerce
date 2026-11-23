import { describe, it, expect, beforeEach } from "vitest";
import { api } from "./helpers.js";
import { resetDb } from "../src/data/db.js";
import { signToken } from "../src/services/authService.js";

describe("Authentication & Customers API (SCRUM-38)", () => {
  beforeEach(() => {
    resetDb();
  });

  describe("POST /api/auth/register", () => {
    it("registers a new customer and returns 201 without passwordHash", async () => {
      const res = await api().post("/api/auth/register").send({
        name: "Joseph Rayar",
        email: "Joseph@Example.com",
        password: "password123",
        phone: "+33600000000"
      });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeTruthy();
      expect(res.body.customer).toMatchObject({
        id: 1,
        name: "Joseph Rayar",
        email: "joseph@example.com",
        phone: "+33600000000"
      });
      expect(res.body.customer).not.toHaveProperty("passwordHash");
    });

    it("rejects missing name, invalid email, and short password with 400", async () => {
      const noName = await api().post("/api/auth/register").send({
        email: "valid@example.com",
        password: "password123"
      });
      expect(noName.status).toBe(400);

      const badEmail = await api().post("/api/auth/register").send({
        name: "Test",
        email: "not-an-email",
        password: "password123"
      });
      expect(badEmail.status).toBe(400);

      const shortPass = await api().post("/api/auth/register").send({
        name: "Test",
        email: "valid@example.com",
        password: "short"
      });
      expect(shortPass.status).toBe(400);
    });

    it("rejects duplicate email with 409", async () => {
      await api().post("/api/auth/register").send({
        name: "First User",
        email: "dup@example.com",
        password: "password123"
      });

      const res = await api().post("/api/auth/register").send({
        name: "Second User",
        email: "DUP@example.com",
        password: "password456"
      });
      expect(res.status).toBe(409);
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      await api().post("/api/auth/register").send({
        name: "Alice",
        email: "alice@example.com",
        password: "secretPassword"
      });
    });

    it("logs in with valid credentials and returns customer + token", async () => {
      const res = await api().post("/api/auth/login").send({
        email: "alice@example.com",
        password: "secretPassword"
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
      expect(res.body.customer.email).toBe("alice@example.com");
      expect(res.body.customer).not.toHaveProperty("passwordHash");
    });

    it("returns 401 on wrong password or unknown email, and 400 on missing fields", async () => {
      const wrongPass = await api().post("/api/auth/login").send({
        email: "alice@example.com",
        password: "wrongPassword"
      });
      expect(wrongPass.status).toBe(401);

      const unknown = await api().post("/api/auth/login").send({
        email: "nobody@example.com",
        password: "secretPassword"
      });
      expect(unknown.status).toBe(401);

      const missing = await api().post("/api/auth/login").send({ email: "alice@example.com" });
      expect(missing.status).toBe(400);
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns the current customer when given a valid Bearer token", async () => {
      const reg = await api().post("/api/auth/register").send({
        name: "Bob",
        email: "bob@example.com",
        password: "password123"
      });

      const res = await api()
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${reg.body.token}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: reg.body.customer.id, email: "bob@example.com" });
      expect(res.body).not.toHaveProperty("passwordHash");
    });

    it("returns 401 without token, with garbled token, or with expired token", async () => {
      const noToken = await api().get("/api/auth/me");
      expect(noToken.status).toBe(401);

      const garbled = await api()
        .get("/api/auth/me")
        .set("Authorization", "Bearer not.a.real.token");
      expect(garbled.status).toBe(401);

      const expiredToken = signToken({ id: 1, email: "x@y.com" }, { expiresInSeconds: -5 });
      const expired = await api()
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${expiredToken}`);
      expect(expired.status).toBe(401);
    });

    it("returns 404 if the token refers to a deleted customer", async () => {
      const ghostToken = signToken({ id: 999, email: "ghost@example.com" });
      const res = await api()
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${ghostToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe("/api/customers CRUD", () => {
    it("lists, gets, updates, and deletes customers without leaking passwordHash", async () => {
      const c1 = await api().post("/api/auth/register").send({
        name: "User One",
        email: "one@example.com",
        password: "password123"
      });
      const c2 = await api().post("/api/auth/register").send({
        name: "User Two",
        email: "two@example.com",
        password: "password123"
      });

      // GET /
      const list = await api().get("/api/customers");
      expect(list.status).toBe(200);
      expect(list.body).toHaveLength(2);
      expect(list.body[0]).not.toHaveProperty("passwordHash");

      // GET /:id
      const one = await api().get(`/api/customers/${c1.body.customer.id}`);
      expect(one.status).toBe(200);
      expect(one.body.name).toBe("User One");

      // PUT /:id
      const updated = await api()
        .put(`/api/customers/${c1.body.customer.id}`)
        .send({ name: "User One Updated", phone: "0699999999", email: "one.new@example.com" });
      expect(updated.status).toBe(200);
      expect(updated.body).toMatchObject({
        name: "User One Updated",
        phone: "0699999999",
        email: "one.new@example.com"
      });

      // PUT /:id validation & duplicate email conflict
      const badUpdate = await api()
        .put(`/api/customers/${c1.body.customer.id}`)
        .send({ name: "   " });
      expect(badUpdate.status).toBe(400);

      const badEmail = await api()
        .put(`/api/customers/${c1.body.customer.id}`)
        .send({ email: "invalid" });
      expect(badEmail.status).toBe(400);

      const conflictUpdate = await api()
        .put(`/api/customers/${c1.body.customer.id}`)
        .send({ email: c2.body.customer.email });
      expect(conflictUpdate.status).toBe(409);

      // DELETE /:id
      const del = await api().delete(`/api/customers/${c1.body.customer.id}`);
      expect(del.status).toBe(204);

      const afterDel = await api().get(`/api/customers/${c1.body.customer.id}`);
      expect(afterDel.status).toBe(404);
    });
  });
});