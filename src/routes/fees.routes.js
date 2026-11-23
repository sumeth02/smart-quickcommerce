import express from "express";
import { db, nextId } from "../data/db.js";
import { feeConfig, getStoreDemand } from "../services/deliveryFee.js";
import { badRequest, notFound, parseId } from "../utils/httpError.js";

const router = express.Router();

const CONFIG_KEYS = [
  "baseFee",
  "smallCartThreshold",
  "smallCartFee",
  "freeDeliveryThreshold",
  "maxMultiplier"
];

function validateRule(body, { partial = false } = {}) {
  const { label, startHour, endHour, multiplier } = body ?? {};
  const out = {};

  if (label !== undefined || !partial) {
    if (typeof label !== "string" || !label.trim()) {
      throw badRequest("label is required");
    }
    out.label = label.trim();
  }
  if (startHour !== undefined || !partial) {
    if (!Number.isInteger(startHour) || startHour < 0 || startHour > 23) {
      throw badRequest("startHour must be an integer between 0 and 23");
    }
    out.startHour = startHour;
  }
  if (endHour !== undefined || !partial) {
    if (!Number.isInteger(endHour) || endHour < 0 || endHour > 23) {
      throw badRequest("endHour must be an integer between 0 and 23");
    }
    out.endHour = endHour;
  }
  if (multiplier !== undefined || !partial) {
    if (typeof multiplier !== "number" || !Number.isFinite(multiplier) || multiplier < 1 || multiplier > 3) {
      throw badRequest("multiplier must be a number between 1 and 3");
    }
    out.multiplier = Math.round(multiplier * 100) / 100;
  }

  return out;
}

const findRule = (id) => {
  const rule = db.feeRules.find((r) => r.id === id);
  if (!rule) throw notFound("Fee rule not found");
  return rule;
};

// GET /api/fees/config
router.get("/config", (_req, res) => {
  res.json(feeConfig);
});

// PUT /api/fees/config
router.put("/config", (req, res) => {
  const body = req.body ?? {};
  const next = { ...feeConfig };

  for (const key of CONFIG_KEYS) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== "number" || !Number.isFinite(body[key]) || body[key] < 0) {
        throw badRequest(`${key} must be a number >= 0`);
      }
      next[key] = body[key];
    }
  }

  if (next.freeDeliveryThreshold <= next.smallCartThreshold) {
    throw badRequest("freeDeliveryThreshold must be > smallCartThreshold");
  }

  Object.assign(feeConfig, next);
  res.json(feeConfig);
});

// GET /api/fees/surge/:darkStoreId
router.get("/surge/:darkStoreId", (req, res) => {
  const darkStoreId = parseId(req.params.darkStoreId);
  res.json(getStoreDemand(darkStoreId));
});

// GET /api/fees/rules
router.get("/rules", (_req, res) => {
  res.json(db.feeRules);
});

// GET /api/fees/rules/:id
router.get("/rules/:id", (req, res) => {
  res.json(findRule(parseId(req.params.id)));
});

// POST /api/fees/rules
router.post("/rules", (req, res) => {
  const data = validateRule(req.body);
  const rule = { id: nextId(db.feeRules), ...data };
  db.feeRules.push(rule);
  res.status(201).json(rule);
});

// PUT /api/fees/rules/:id
router.put("/rules/:id", (req, res) => {
  const rule = findRule(parseId(req.params.id));
  Object.assign(rule, validateRule(req.body, { partial: true }));
  res.json(rule);
});

// DELETE /api/fees/rules/:id
router.delete("/rules/:id", (req, res) => {
  const id = parseId(req.params.id);
  findRule(id);
  db.feeRules = db.feeRules.filter((r) => r.id !== id);
  res.status(204).end();
});

export default router;