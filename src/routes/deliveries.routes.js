import express from "express";
import { db, nextId } from "../data/db.js";
import { badRequest, notFound, parseId } from "../utils/httpError.js";

const router = express.Router();

const DELIVERY_STATUSES = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "CANCELLED"];

function estimateRoute(store, deliveryAddress) {
  const distanceKm = store ? 1.8 : 2.0;
  const estimatedMinutes = Math.max(5, Math.round(distanceKm * 4));
  return {
    origin: store ? store.name : "Dark Store",
    destination: deliveryAddress || "Customer Address",
    distanceKm,
    estimatedMinutes
  };
}

router.get("/", (req, res) => {
  const { status, riderId } = req.query;
  let deliveries = db.deliveries;
  if (status) deliveries = deliveries.filter((d) => d.status === String(status).toUpperCase());
  if (riderId) deliveries = deliveries.filter((d) => d.riderId === Number(riderId));
  res.status(200).json(deliveries);
});

router.get("/order/:orderId", (req, res) => {
  const orderId = parseId(req.params.orderId);
  const delivery = db.deliveries.find((d) => d.orderId === orderId);
  if (!delivery) throw notFound("Delivery not found for order");
  res.status(200).json(delivery);
});

router.get("/:id", (req, res) => {
  const id = parseId(req.params.id);
  const delivery = db.deliveries.find((d) => d.id === id);
  if (!delivery) throw notFound("Delivery not found");
  res.status(200).json(delivery);
});

router.post("/", (req, res) => {
  const { orderId, riderId, deliveryAddress } = req.body ?? {};
  const parsedOrderId = Number(orderId);
  if (!Number.isInteger(parsedOrderId) || parsedOrderId <= 0) {
    throw badRequest("orderId must be a positive integer");
  }

  const order = db.orders.find((o) => o.id === parsedOrderId);
  if (!order) throw notFound("Order not found");

  const existing = db.deliveries.find((d) => d.orderId === parsedOrderId && d.status !== "CANCELLED");
  if (existing) throw badRequest("Active delivery already exists for this order");

  let rider;
  if (riderId !== undefined) {
    const parsedRiderId = Number(riderId);
    if (!Number.isInteger(parsedRiderId) || parsedRiderId <= 0) {
      throw badRequest("riderId must be a positive integer");
    }
    rider = db.riders.find((r) => r.id === parsedRiderId);
    if (!rider) throw notFound("Rider not found");
  } else {
    rider = db.riders.find((r) => r.darkStoreId === order.darkStoreId && r.status === "AVAILABLE")
      || db.riders.find((r) => r.status === "AVAILABLE");
    if (!rider) throw badRequest("No available rider found");
  }

  const store = db.darkStores.find((s) => s.id === order.darkStoreId);
  const destination = deliveryAddress || order.deliveryAddress || "Customer Address";
  const route = estimateRoute(store, destination);

  rider.status = "DELIVERING";
  order.status = "OUT_FOR_DELIVERY";

  const delivery = {
    id: nextId(db.deliveries),
    orderId: parsedOrderId,
    riderId: rider.id,
    darkStoreId: order.darkStoreId,
    deliveryAddress: destination,
    status: "ASSIGNED",
    route,
    assignedAt: new Date().toISOString()
  };

  db.deliveries.push(delivery);
  res.status(201).json(delivery);
});

router.put("/:id", (req, res) => {
  const id = parseId(req.params.id);
  const index = db.deliveries.findIndex((d) => d.id === id);
  if (index === -1) throw notFound("Delivery not found");

  const { deliveryAddress, status } = req.body ?? {};
  if (status !== undefined) {
    const normalized = String(status).toUpperCase();
    if (!DELIVERY_STATUSES.includes(normalized)) throw badRequest("Invalid delivery status");
    db.deliveries[index].status = normalized;
  }
  if (deliveryAddress !== undefined) {
    db.deliveries[index].deliveryAddress = String(deliveryAddress);
  }

  res.status(200).json(db.deliveries[index]);
});

router.patch("/:id/status", (req, res) => {
  const id = parseId(req.params.id);
  const delivery = db.deliveries.find((d) => d.id === id);
  if (!delivery) throw notFound("Delivery not found");

  const { status } = req.body ?? {};
  const normalized = status ? String(status).toUpperCase() : "";
  if (!DELIVERY_STATUSES.includes(normalized)) {
    throw badRequest("Invalid delivery status");
  }

  delivery.status = normalized;
  const rider = db.riders.find((r) => r.id === delivery.riderId);
  const order = db.orders.find((o) => o.id === delivery.orderId);

  if (normalized === "DELIVERED" || normalized === "CANCELLED") {
    if (rider) rider.status = "AVAILABLE";
    if (order && normalized === "DELIVERED") order.status = "DELIVERED";
  }

  res.status(200).json(delivery);
});

router.delete("/:id", (req, res) => {
  const id = parseId(req.params.id);
  const index = db.deliveries.findIndex((d) => d.id === id);
  if (index === -1) throw notFound("Delivery not found");

  const [removed] = db.deliveries.splice(index, 1);
  const rider = db.riders.find((r) => r.id === removed.riderId);
  if (rider) rider.status = "AVAILABLE";

  res.status(204).end();
});

export default router;
