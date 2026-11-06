// Dark store CRUD + nearest-store lookup (SCRUM-14).
import express from "express";
import { db, nextId } from "../data/db.js";
import { badRequest, notFound, parseId } from "../utils/httpError.js";
import { findNearestStore, isValidCoordinate } from "../utils/geo.js";

const router = express.Router();

function validateStore(body, { partial = false } = {}) {
  const { name, address, lat, lng, radiusKm, isOpen } = body ?? {};
  const out = {};
  if (name !== undefined || !partial) {
    if (typeof name !== "string" || !name.trim()) throw badRequest("name is required");
    out.name = name.trim();
  }
  if (address !== undefined || !partial) {
    if (typeof address !== "string" || !address.trim()) throw badRequest("address is required");
    out.address = address.trim();
  }
  if (lat !== undefined || lng !== undefined || !partial) {
    if (!isValidCoordinate(lat, lng)) throw badRequest("lat and lng must be valid coordinates");
    out.lat = lat;
    out.lng = lng;
  }
  if (radiusKm !== undefined) {
    if (typeof radiusKm !== "number" || radiusKm <= 0 || radiusKm > 5) throw badRequest("radiusKm must be between 0 and 5");
    out.radiusKm = radiusKm;
  }
  if (isOpen !== undefined) out.isOpen = Boolean(isOpen);
  return out;
}

const findStore = (id) => {
  const store = db.darkStores.find((s) => s.id === id);
  if (!store) throw notFound("Dark store not found");
  return store;
};

router.get("/", (_req, res) => res.json(db.darkStores));

// GET /api/darkstores/nearest?lat=48.85&lng=2.36  (must be declared before /:id)
router.get("/nearest", (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!isValidCoordinate(lat, lng)) throw badRequest("lat and lng query parameters are required");
  const nearest = findNearestStore(db.darkStores, { lat, lng });
  if (!nearest) return res.status(404).json({ error: true, message: "No dark store delivers to this location yet" });
  res.json({ ...nearest.store, distanceKm: nearest.distanceKm });
});

router.get("/:id", (req, res) => res.json(findStore(parseId(req.params.id))));

router.post("/", (req, res) => {
  const store = { id: nextId(db.darkStores), radiusKm: 3, isOpen: true, ...validateStore(req.body) };
  db.darkStores.push(store);
  for (const product of db.products) {
    db.inventory.push({ id: nextId(db.inventory), darkStoreId: store.id, productId: product.id, quantity: 0, lowStockThreshold: 5 });
  }
  res.status(201).json(store);
});

router.put("/:id", (req, res) => {
  const store = findStore(parseId(req.params.id));
  Object.assign(store, validateStore(req.body, { partial: true }));
  res.json(store);
});

router.delete("/:id", (req, res) => {
  const id = parseId(req.params.id);
  findStore(id);
  db.darkStores = db.darkStores.filter((s) => s.id !== id);
  db.inventory = db.inventory.filter((r) => r.darkStoreId !== id);
  res.status(204).end();
});

export default router;
