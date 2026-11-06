// Payments (SCRUM-16). Payments are created by checkout; this router exposes them read-only,
// plus confirming a cash-on-delivery payment once the rider collects it.
import express from "express";
import { db } from "../data/db.js";
import { conflict, notFound, parseId } from "../utils/httpError.js";

const router = express.Router();

router.get("/", (req, res) => {
  const { orderId } = req.query;
  res.json(orderId ? db.payments.filter((p) => p.orderId === Number(orderId)) : db.payments);
});

router.get("/:id", (req, res) => {
  const payment = db.payments.find((p) => p.id === parseId(req.params.id));
  if (!payment) throw notFound("Payment not found");
  res.json(payment);
});

// PUT /api/payments/:id/confirm — mark a cash-on-delivery payment as collected.
router.put("/:id/confirm", (req, res) => {
  const payment = db.payments.find((p) => p.id === parseId(req.params.id));
  if (!payment) throw notFound("Payment not found");
  if (payment.status !== "PENDING") throw conflict("Only pending payments can be confirmed");
  payment.status = "PAID";
  const order = db.orders.find((o) => o.id === payment.orderId);
  if (order) order.paymentStatus = "PAID";
  res.json(payment);
});

export default router;
