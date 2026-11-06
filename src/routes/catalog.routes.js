// Localized inventory browsing (SCRUM-14): products of ONE dark store with live stock.
import express from "express";
import { db } from "../data/db.js";
import { badRequest, notFound } from "../utils/httpError.js";
import { findNearestStore, isValidCoordinate } from "../utils/geo.js";
import { getAvailableQuantity } from "../services/stockService.js";

const router = express.Router();

// GET /api/catalog?storeId=2  or  /api/catalog?lat=48.85&lng=2.37  [&category=...&q=...&inStock=true]
router.get("/", (req, res) => {
  const { storeId, lat, lng, category, q, inStock } = req.query;
  let store;
  let distance = null;

  if (storeId !== undefined) {
    store = db.darkStores.find((s) => s.id === Number(storeId));
    if (!store) throw notFound("Dark store not found");
  } else if (lat !== undefined && lng !== undefined) {
    const point = { lat: Number(lat), lng: Number(lng) };
    if (!isValidCoordinate(point.lat, point.lng)) throw badRequest("lat and lng must be valid coordinates");
    const nearest = findNearestStore(db.darkStores, point);
    if (!nearest) throw notFound("No dark store delivers to this location yet");
    store = nearest.store;
    distance = nearest.distanceKm;
  } else {
    throw badRequest("Provide storeId or lat/lng");
  }

  let products = db.products.map((p) => {
    const stock = getAvailableQuantity(store.id, p.id);
    return { ...p, stock, inStock: stock > 0 };
  });
  if (category) products = products.filter((p) => p.category === category);
  if (q) products = products.filter((p) => p.name.toLowerCase().includes(String(q).toLowerCase()));
  if (inStock === "true") products = products.filter((p) => p.inStock);

  const categories = [...new Set(db.products.map((p) => p.category))];
  res.json({ store: { ...store, distanceKm: distance }, categories, products });
});

export default router;
