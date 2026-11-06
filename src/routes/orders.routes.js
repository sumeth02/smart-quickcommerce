// Orders: quick checkout, confirmation and lifecycle (SCRUM-15, SCRUM-17, SCRUM-18).
import express from "express";
import { db } from "../data/db.js";
import { badRequest, parseId } from "../utils/httpError.js";
import { buildQuote, createOrder, getOrder, updateOrderStatus, ORDER_STATUS } from "../services/orderService.js";

const router = express.Router();

// POST /api/orders/quote — price the basket and show the delivery fee before paying.
router.post("/quote", (req, res) => res.json(buildQuote(req.body ?? {})));

// GET /api/orders?customerId=c1&status=PLACED&darkStoreId=1
router.get("/", (req, res) => {
  const { customerId, status, darkStoreId } = req.query;
  let orders = db.orders;
  if (customerId) orders = orders.filter((o) => o.customerId === String(customerId));
  if (status) orders = orders.filter((o) => o.status === status);
  if (darkStoreId) orders = orders.filter((o) => o.darkStoreId === Number(darkStoreId));
  res.json(orders);
});

router.get("/:id", (req, res) => res.json(getOrder(parseId(req.params.id))));

// POST /api/orders — quick checkout: validates stock, takes payment, confirms the order.
router.post("/", (req, res) => {
  const order = createOrder(req.body ?? {});
  res.status(201).json({ message: "Order confirmed", order });
});

// PUT /api/orders/:id — { status } moves the order along its lifecycle.
router.put("/:id", (req, res) => {
  const { status } = req.body ?? {};
  if (!status) throw badRequest("status is required");
  res.json(updateOrderStatus(parseId(req.params.id), status));
});

// DELETE /api/orders/:id — customer cancels (only before packing); stock is released.
router.delete("/:id", (req, res) => {
  updateOrderStatus(parseId(req.params.id), ORDER_STATUS.CANCELLED);
  res.status(204).end();
});

export default router;
