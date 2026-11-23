import express from "express";
import { db } from "../data/db.js";
import { sanitizeCustomer } from "../services/authService.js";
import { badRequest, conflict, notFound, parseId } from "../utils/httpError.js";

const router = express.Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const findCustomer = (id) => {
  const customer = db.customers.find((c) => c.id === id);
  if (!customer) throw notFound("Customer not found");
  return customer;
};

function validateCustomerUpdate(body, currentId) {
  const { name, email, phone } = body ?? {};
  const out = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) throw badRequest("name must be a non-empty string");
    out.name = name.trim();
  }
  if (email !== undefined) {
    if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      throw badRequest("Valid email is required");
    }
    const normalizedEmail = email.trim().toLowerCase();
    const duplicate = db.customers.some((c) => c.email === normalizedEmail && c.id !== currentId);
    if (duplicate) throw conflict("Email already registered");
    out.email = normalizedEmail;
  }
  if (phone !== undefined) {
    out.phone = phone === null || phone === "" ? null : String(phone).trim();
  }

  return out;
}

// GET /api/customers
router.get("/", (_req, res) => {
  res.json(db.customers.map(sanitizeCustomer));
});

// GET /api/customers/:id
router.get("/:id", (req, res) => {
  const customer = findCustomer(parseId(req.params.id));
  res.json(sanitizeCustomer(customer));
});

// PUT /api/customers/:id
router.put("/:id", (req, res) => {
  const customer = findCustomer(parseId(req.params.id));
  Object.assign(customer, validateCustomerUpdate(req.body, customer.id));
  res.json(sanitizeCustomer(customer));
});

// DELETE /api/customers/:id
router.delete("/:id", (req, res) => {
  const id = parseId(req.params.id);
  findCustomer(id);
  db.customers = db.customers.filter((c) => c.id !== id);
  res.status(204).end();
});

export default router;