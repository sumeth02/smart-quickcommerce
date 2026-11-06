// Picker staff CRUD (SCRUM-41).
import express from "express";
import { db, nextId } from "../data/db.js";
import { badRequest, notFound, parseId } from "../utils/httpError.js";

const router = express.Router();

const findPicker = (id) => {
  const picker = db.pickers.find((p) => p.id === id);
  if (!picker) throw notFound("Picker not found");
  return picker;
};

function validatePicker(body, { partial = false } = {}) {
  const { name, darkStoreId, active } = body ?? {};
  const out = {};
  if (name !== undefined || !partial) {
    if (typeof name !== "string" || !name.trim()) throw badRequest("name is required");
    out.name = name.trim();
  }
  if (darkStoreId !== undefined || !partial) {
    if (!db.darkStores.some((s) => s.id === darkStoreId)) throw badRequest("darkStoreId does not exist");
    out.darkStoreId = darkStoreId;
  }
  if (active !== undefined) {
    if (typeof active !== "boolean") throw badRequest("active must be a boolean");
    out.active = active;
  }
  return out;
}

router.get("/", (req, res) => {
  const { darkStoreId } = req.query;
  res.json(darkStoreId ? db.pickers.filter((p) => p.darkStoreId === Number(darkStoreId)) : db.pickers);
});

router.get("/:id", (req, res) => res.json(findPicker(parseId(req.params.id))));

router.post("/", (req, res) => {
  const data = validatePicker(req.body);
  const picker = { id: nextId(db.pickers), active: true, ...data };
  db.pickers.push(picker);
  res.status(201).json(picker);
});

router.put("/:id", (req, res) => {
  const picker = findPicker(parseId(req.params.id));
  Object.assign(picker, validatePicker(req.body, { partial: true }));
  res.json(picker);
});

router.delete("/:id", (req, res) => {
  const id = parseId(req.params.id);
  findPicker(id);
  db.pickers = db.pickers.filter((p) => p.id !== id);
  res.status(204).end();
});

export default router;