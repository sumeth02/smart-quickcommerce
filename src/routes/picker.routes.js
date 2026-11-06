// Picker app: queue, claim, scan and pack orders (SCRUM-41).
import express from "express";
import { db, nextId } from "../data/db.js";
import { badRequest, conflict, notFound, parseId } from "../utils/httpError.js";
import { ORDER_STATUS, getOrder, updateOrderStatus } from "../services/orderService.js";

const router = express.Router();
const TARGET_SECONDS = 120;

const findTask = (orderId) => db.pickTasks.find((t) => t.orderId === orderId);

function progress(order, task) {
  const lines = order.items.map((line) => ({
    productId: line.productId,
    name: line.name,
    required: line.quantity,
    scanned: task.scanned[line.productId] ?? 0
  }));
  return { lines, complete: lines.every((l) => l.scanned >= l.required) };
}

// GET /api/picker/queue?darkStoreId=1 : orders waiting to be picked, oldest first
router.get("/queue", (req, res) => {
  const darkStoreId = Number(req.query.darkStoreId);
  if (!Number.isInteger(darkStoreId)) throw badRequest("darkStoreId query parameter is required");
  const queue = db.orders
    .filter((o) => o.darkStoreId === darkStoreId && o.status === ORDER_STATUS.PLACED)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id);
  res.json(queue);
});

router.post("/orders/:id/claim", (req, res) => {
  const order = getOrder(parseId(req.params.id));
  const { pickerId } = req.body ?? {};
  if (!Number.isInteger(pickerId)) throw badRequest("pickerId is required");
  const picker = db.pickers.find((p) => p.id === pickerId);
  if (!picker) throw notFound("Picker not found");
  if (!picker.active) throw badRequest("Picker is not active");
  if (picker.darkStoreId !== order.darkStoreId) throw badRequest("Picker works in another dark store");
  if (findTask(order.id)) throw conflict("Order already claimed");
  updateOrderStatus(order.id, ORDER_STATUS.PICKING);
  const task = {
    id: nextId(db.pickTasks),
    orderId: order.id,
    pickerId,
    status: "PICKING",
    startedAt: new Date().toISOString(),
    scanned: Object.fromEntries(order.items.map((l) => [l.productId, 0]))
  };
  db.pickTasks.push(task);
  res.status(201).json(task);
});

router.post("/orders/:id/scan", (req, res) => {
  const order = getOrder(parseId(req.params.id));
  const task = findTask(order.id);
  if (!task || task.status !== "PICKING") throw conflict("Order is not being picked");
  const productId = Number(req.body?.productId);
  if (!Number.isInteger(productId)) throw badRequest("productId is required");
  const line = order.items.find((l) => l.productId === productId);
  if (!line) throw badRequest("Product is not part of this order");
  if ((task.scanned[productId] ?? 0) >= line.quantity) throw badRequest("Product already fully scanned");
  task.scanned[productId] = (task.scanned[productId] ?? 0) + 1;
  res.json(progress(order, task));
});

router.post("/orders/:id/pack", (req, res) => {
  const order = getOrder(parseId(req.params.id));
  const task = findTask(order.id);
  if (!task || task.status !== "PICKING") throw conflict("Order is not being picked");
  if (!progress(order, task).complete) throw conflict("Every item must be scanned before packing");
  updateOrderStatus(order.id, ORDER_STATUS.PACKED);
  const now = new Date();
  task.status = "PACKED";
  task.packedAt = now.toISOString();
  task.pickDurationSeconds = Math.round((now - new Date(task.startedAt)) / 1000);
  task.withinTarget = task.pickDurationSeconds <= TARGET_SECONDS;
  res.json(task);
});

router.get("/tasks", (req, res) => {
  const { pickerId } = req.query;
  const id = pickerId === undefined ? null : parseId(pickerId);
  res.json(id === null ? db.pickTasks : db.pickTasks.filter((t) => t.pickerId === id));
});

export default router;