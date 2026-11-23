import express from "express";
import { db, nextId } from "../data/db.js";
import {
  hashPassword,
  verifyPassword,
  signToken,
  sanitizeCustomer
} from "../services/authService.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError, badRequest, conflict, notFound } from "../utils/httpError.js";

const router = express.Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register
router.post("/register", (req, res) => {
  const { name, email, password, phone } = req.body ?? {};

  if (typeof name !== "string" || !name.trim()) {
    throw badRequest("name is required");
  }
  if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    throw badRequest("Valid email is required");
  }
  if (typeof password !== "string" || password.length < 8) {
    throw badRequest("password must be at least 8 characters");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const exists = db.customers.some((c) => c.email === normalizedEmail);
  if (exists) {
    throw conflict("Email already registered");
  }

  const customer = {
    id: nextId(db.customers),
    name: name.trim(),
    email: normalizedEmail,
    phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  };

  db.customers.push(customer);

  const token = signToken({ id: customer.id, email: customer.email, name: customer.name });
  res.status(201).json({ customer: sanitizeCustomer(customer), token });
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    throw badRequest("email and password are required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const customer = db.customers.find((c) => c.email === normalizedEmail);
  if (!customer || !verifyPassword(password, customer.passwordHash)) {
    throw new HttpError(401, "Invalid email or password");
  }

  const token = signToken({ id: customer.id, email: customer.email, name: customer.name });
  res.json({ customer: sanitizeCustomer(customer), token });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  const customer = db.customers.find((c) => c.id === req.user.id);
  if (!customer) {
    throw notFound("Customer not found");
  }
  res.json(sanitizeCustomer(customer));
});

export default router;