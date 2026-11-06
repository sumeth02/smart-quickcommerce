// Product catalogue CRUD (admin side of SCRUM-14).
import express from "express";
import { db, nextId } from "../data/db.js";
import { badRequest, notFound, parseId } from "../utils/httpError.js";

const router = express.Router();

function validateProduct(body, { partial = false } = {}) {
  const { name, category, price, unit, emoji } = body ?? {};
  const out = {};
  if (name !== undefined || !partial) {
    if (typeof name !== "string" || !name.trim()) throw badRequest("name is required");
    out.name = name.trim();
  }
  if (category !== undefined || !partial) {
    if (typeof category !== "string" || !category.trim()) throw badRequest("category is required");
    out.category = category.trim();
  }
  if (price !== undefined || !partial) {
    if (typeof price !== "number" || !(price > 0)) throw badRequest("price must be a positive number");
    out.price = Math.round(price * 100) / 100;
  }
  if (unit !== undefined) out.unit = String(unit);
  if (emoji !== undefined) out.emoji = String(emoji);
  return out;
}

const findProduct = (id) => {
  const product = db.products.find((p) => p.id === id);
  if (!product) throw notFound("Product not found");
  return product;
};

// GET /api/products?category=Bakery&q=milk
router.get("/", (req, res) => {
  const { category, q } = req.query;
  let products = db.products;
  if (category) products = products.filter((p) => p.category === category);
  if (q) products = products.filter((p) => p.name.toLowerCase().includes(String(q).toLowerCase()));
  res.json(products);
});

router.get("/:id", (req, res) => res.json(findProduct(parseId(req.params.id))));

router.post("/", (req, res) => {
  const data = validateProduct(req.body);
  const product = { id: nextId(db.products), unit: "1 pc", emoji: "🛒", ...data };
  db.products.push(product);
  // New products start with zero stock in every dark store.
  for (const store of db.darkStores) {
    db.inventory.push({ id: nextId(db.inventory), darkStoreId: store.id, productId: product.id, quantity: 0, lowStockThreshold: 5 });
  }
  res.status(201).json(product);
});

router.put("/:id", (req, res) => {
  const product = findProduct(parseId(req.params.id));
  Object.assign(product, validateProduct(req.body, { partial: true }));
  res.json(product);
});

router.delete("/:id", (req, res) => {
  const id = parseId(req.params.id);
  findProduct(id);
  db.products = db.products.filter((p) => p.id !== id);
  db.inventory = db.inventory.filter((r) => r.productId !== id);
  res.status(204).end();
});

export default router;
