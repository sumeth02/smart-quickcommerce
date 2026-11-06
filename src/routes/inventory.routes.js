// Inventory management and low-stock alerts (SCRUM-40).
import express from "express";
import { db, nextId } from "../data/db.js";
import { badRequest, conflict, notFound, parseId } from "../utils/httpError.js";
import { checkLowStock } from "../services/alertService.js";

const router = express.Router();

const isNonNegativeInt = (v) => Number.isInteger(v) && v >= 0;

const findRow = (id) => {
  const row = db.inventory.find((r) => r.id === id);
  if (!row) throw notFound("Inventory row not found");
  return row;
};

// GET /api/inventory?darkStoreId=1&productId=2&lowStock=true
router.get("/", (req, res) => {
  const { darkStoreId, productId, lowStock } = req.query;
  let rows = db.inventory;
  if (darkStoreId) rows = rows.filter((r) => r.darkStoreId === Number(darkStoreId));
  if (productId) rows = rows.filter((r) => r.productId === Number(productId));
  if (lowStock === "true") rows = rows.filter((r) => r.quantity <= r.lowStockThreshold);
  res.json(rows);
});

// Alerts: declared before /:id so "alerts" is not read as an id.
router.get("/alerts", (req, res) => {
  const { status } = req.query;
  if (status && !["OPEN", "RESOLVED"].includes(status)) {
    throw badRequest("status must be OPEN or RESOLVED");
  }
  res.json(status ? db.inventoryAlerts.filter((a) => a.status === status) : db.inventoryAlerts);
});

router.put("/alerts/:id/resolve", (req, res) => {
  const id = parseId(req.params.id);
  const alert = db.inventoryAlerts.find((a) => a.id === id);
  if (!alert) throw notFound("Alert not found");
  alert.status = "RESOLVED";
  res.json(alert);
});

router.get("/:id", (req, res) => res.json(findRow(parseId(req.params.id))));

router.post("/", (req, res) => {
  const { darkStoreId, productId, quantity = 0, lowStockThreshold = 5 } = req.body ?? {};
  if (!db.darkStores.some((s) => s.id === darkStoreId)) throw badRequest("darkStoreId does not exist");
  if (!db.products.some((p) => p.id === productId)) throw badRequest("productId does not exist");
  if (!isNonNegativeInt(quantity)) throw badRequest("quantity must be an integer >= 0");
  if (!isNonNegativeInt(lowStockThreshold)) throw badRequest("lowStockThreshold must be an integer >= 0");
  if (db.inventory.some((r) => r.darkStoreId === darkStoreId && r.productId === productId)) {
    throw conflict("Inventory row already exists for this store and product");
  }
  const row = { id: nextId(db.inventory), darkStoreId, productId, quantity, lowStockThreshold };
  db.inventory.push(row);
  checkLowStock(row);
  res.status(201).json(row);
});

router.put("/:id", (req, res) => {
  const row = findRow(parseId(req.params.id));
  const { quantity, lowStockThreshold } = req.body ?? {};
  if (quantity !== undefined) {
    if (!isNonNegativeInt(quantity)) throw badRequest("quantity must be an integer >= 0");
    row.quantity = quantity;
  }
  if (lowStockThreshold !== undefined) {
    if (!isNonNegativeInt(lowStockThreshold)) throw badRequest("lowStockThreshold must be an integer >= 0");
    row.lowStockThreshold = lowStockThreshold;
  }
  checkLowStock(row);
  res.json(row);
});

router.patch("/:id/adjust", (req, res) => {
  const row = findRow(parseId(req.params.id));
  const { delta } = req.body ?? {};
  if (!Number.isInteger(delta)) throw badRequest("delta must be an integer");
  if (row.quantity + delta < 0) throw conflict("Stock cannot go below 0");
  row.quantity += delta;
  checkLowStock(row);
  res.json(row);
});

router.delete("/:id", (req, res) => {
  const id = parseId(req.params.id);
  findRow(id);
  db.inventory = db.inventory.filter((r) => r.id !== id);
  for (const alert of db.inventoryAlerts) {
    if (alert.inventoryId === id && alert.status === "OPEN") alert.status = "RESOLVED";
  }
  res.status(204).end();
});

export default router;