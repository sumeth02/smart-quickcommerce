// Mother-warehouse replenishment of dark stores (SCRUM-40).
import express from "express";
import { db, nextId } from "../data/db.js";
import { badRequest, conflict, notFound, parseId } from "../utils/httpError.js";
import { checkLowStock } from "../services/alertService.js";

const router = express.Router();

const findReplenishment = (id) => {
  const replenishment = db.replenishments.find((r) => r.id === id);
  if (!replenishment) throw notFound("Replenishment not found");
  return replenishment;
};

router.get("/", (_req, res) => res.json(db.replenishments));

router.get("/:id", (req, res) => res.json(findReplenishment(parseId(req.params.id))));

router.post("/", (req, res) => {
  const { darkStoreId, items } = req.body ?? {};
  if (!db.darkStores.some((s) => s.id === darkStoreId)) throw badRequest("darkStoreId does not exist");
  if (!Array.isArray(items) || items.length === 0) throw badRequest("items must be a non-empty array");
  for (const item of items) {
    if (!db.products.some((p) => p.id === item?.productId)) throw badRequest("productId does not exist");
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw badRequest("quantity must be a positive integer");
    }
  }
  const replenishment = {
    id: nextId(db.replenishments),
    darkStoreId,
    items: items.map(({ productId, quantity }) => ({ productId, quantity })),
    status: "REQUESTED",
    createdAt: new Date().toISOString()
  };
  db.replenishments.push(replenishment);
  res.status(201).json(replenishment);
});

router.put("/:id/ship", (req, res) => {
  const replenishment = findReplenishment(parseId(req.params.id));
  if (replenishment.status !== "REQUESTED") throw conflict("Only a REQUESTED replenishment can be shipped");
  replenishment.status = "SHIPPED";
  replenishment.shippedAt = new Date().toISOString();
  res.json(replenishment);
});

router.put("/:id/receive", (req, res) => {
  const replenishment = findReplenishment(parseId(req.params.id));
  if (replenishment.status !== "SHIPPED") throw conflict("Only a SHIPPED replenishment can be received");
  for (const { productId, quantity } of replenishment.items) {
    let row = db.inventory.find(
      (r) => r.darkStoreId === replenishment.darkStoreId && r.productId === productId
    );
    if (row) {
      row.quantity += quantity;
    } else {
      row = {
        id: nextId(db.inventory),
        darkStoreId: replenishment.darkStoreId,
        productId,
        quantity,
        lowStockThreshold: 5
      };
      db.inventory.push(row);
    }
    checkLowStock(row);
  }
  replenishment.status = "RECEIVED";
  replenishment.receivedAt = new Date().toISOString();
  res.json(replenishment);
});

router.delete("/:id", (req, res) => {
  const replenishment = findReplenishment(parseId(req.params.id));
  if (replenishment.status !== "REQUESTED") throw conflict("Only a REQUESTED replenishment can be deleted");
  db.replenishments = db.replenishments.filter((r) => r.id !== replenishment.id);
  res.status(204).end();
});

export default router;