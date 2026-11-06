// Mock payment gateway (SCRUM-16). No card data is stored: the client sends a
// payment method and an opaque token. The token "tok_fail" simulates a declined payment.

import { db, nextId } from "../data/db.js";
import { badRequest } from "../utils/httpError.js";

export const PAYMENT_METHODS = ["card", "wallet", "cash_on_delivery"];

export function validatePayment(payment) {
  if (!payment || !PAYMENT_METHODS.includes(payment.method)) {
    throw badRequest(`payment.method must be one of: ${PAYMENT_METHODS.join(", ")}`);
  }
}

export function processPayment({ orderId, amount, method, token }) {
  const declined = method !== "cash_on_delivery" && token === "tok_fail";
  const payment = {
    id: nextId(db.payments),
    orderId,
    amount,
    currency: "EUR",
    method,
    status: declined ? "FAILED" : method === "cash_on_delivery" ? "PENDING" : "PAID",
    transactionRef: declined ? null : `TX-${Date.now().toString(36).toUpperCase()}-${orderId}`,
    createdAt: new Date().toISOString()
  };
  db.payments.push(payment);
  return payment;
}
