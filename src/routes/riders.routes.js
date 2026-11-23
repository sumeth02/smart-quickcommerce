import express from "express";
import { db, nextId } from "../data/db.js";
import { badRequest, notFound, parseId } from "../utils/httpError.js";

const router = express.Router();

const ALLOWED_STATUSES = ["AVAILABLE", "DELIVERING", "OFFLINE"];

// GET /api/riders?darkStoreId=1&status=AVAILABLE
router.get("/", (req, res) => {
  const { darkStoreId, status } = req.query;
  let riders = db.riders;
  if (darkStoreId) riders = riders.filter((r) => r.darkStoreId === Number(darkStoreId));
  if (status) riders = riders.filter((r) => r.status === String(status).toUpperCase());
  res.status(200).json(riders);
});

// GET /api/riders/:id
router.get("/:id", (req, res) => {
  const id = parseId(req.params.id);
  const rider = db.riders.find((r) => r.id === id);
  if (!rider) throw notFound("Rider not found");
  res.status(200).json(rider);
});

// POST /api/riders
router.post("/", (req, res) => {
  const { name, darkStoreId, vehicle } = req.body ?? {};
  if (!name || !String(name).trim()) throw badRequest("name is required");
  const storeId = darkStoreId !== undefined ? Number(darkStoreId) : 1;
  if (!Number.isInteger(storeId) || storeId <= 0) throw badRequest("darkStoreId must be a positive integer");
  const store = db.darkStores.find((s) => s.id === storeId);
  if (!store) throw notFound("Dark store not found");

  const rider = {
    id: nextId(db.riders),
    name: String(name).trim(),
    darkStoreId: storeId,
    vehicle: vehicle ? String(vehicle).trim() : "e-bike",
    status: "AVAILABLE"
  };
  db.riders.push(rider);
  res.status(201).json(rider);
});

// PUT /api/riders/:id
router.put("/:id", (req, res) => {
  const id = parseId(req.params.id);
  const index = db.riders.findIndex((r) => r.id === id);
  if (index === -1) throw notFound("Rider not found");

  const { name, darkStoreId, vehicle, status } = req.body ?? {};
  if (status !== undefined && !ALLOWED_STATUSES.includes(String(status).toUpperCase())) {
    throw badRequest("Invalid rider status");
  }
  if (darkStoreId !== undefined) {
    const storeId = Number(darkStoreId);
    if (!Number.isInteger(storeId) || storeId <= 0) throw badRequest("darkStoreId must be a positive integer");
    if (!db.darkStores.some((s) => s.id === storeId)) throw notFound("Dark store not found");
  }

  db.riders[index] = {
    ...db.riders[index],
    ...(name !== undefined ? { name: String(name).trim() } : {}),
    ...(darkStoreId !== undefined ? { darkStoreId: Number(darkStoreId) } : {}),
    ...(vehicle !== undefined ? { vehicle: String(vehicle).trim() } : {}),
    ...(status !== undefined ? { status: String(status).toUpperCase() } : {})
  };
  res.status(200).json(db.riders[index]);
});

// PATCH /api/riders/:id/status
router.patch("/:id/status", (req, res) => {
  const id = parseId(req.params.id);
  const rider = db.riders.find((r) => r.id === id);
  if (!rider) throw notFound("Rider not found");

  const { status } = req.body ?? {};
  const normalized = status ? String(status).toUpperCase() : "";
  if (!ALLOWED_STATUSES.includes(normalized)) {
    throw badRequest("status must be AVAILABLE, DELIVERING, or OFFLINE");
  }
  rider.status = normalized;
  res.status(200).json(rider);
});

// DELETE /api/riders/:id
router.delete("/:id", (req, res) => {
  const id = parseId(req.params.id);
  const index = db.riders.findIndex((r) => r.id === id);
  if (index === -1) throw notFound("Rider not found");
  db.riders.splice(index, 1);
  res.status(204).end();
});

export default router;
