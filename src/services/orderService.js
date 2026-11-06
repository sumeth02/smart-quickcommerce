// Order placement, quick checkout and order lifecycle (SCRUM-15, SCRUM-17, SCRUM-18).

import { db, nextId } from "../data/db.js";
import { badRequest, conflict, notFound, HttpError } from "../utils/httpError.js";
import { distanceKm, findNearestStore, isValidCoordinate } from "../utils/geo.js";
import { calculateDeliveryFee } from "./deliveryFee.js";
import { reserveStock, releaseStock, getAvailableQuantity } from "./stockService.js";
import { processPayment, validatePayment } from "./paymentService.js";

export const ORDER_STATUS = Object.freeze({
  PLACED: "PLACED",
  PICKING: "PICKING",
  PACKED: "PACKED",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED"
});

// Allowed lifecycle transitions (picker and rider modules move orders along this graph).
export const TRANSITIONS = Object.freeze({
  PLACED: ["PICKING", "CANCELLED"],
  PICKING: ["PACKED", "CANCELLED"],
  PACKED: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: []
});

const PICK_PACK_MINUTES = 2; // SRS §3.2.1 target
const RIDER_SPEED_KMH = 15;
const round2 = (n) => Math.round(n * 100) / 100;

function normaliseItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw badRequest("items must be a non-empty array");
  const merged = new Map();
  for (const item of items) {
    const productId = Number(item?.productId);
    const quantity = Number(item?.quantity);
    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity <= 0) {
      throw badRequest("Each item needs an integer productId and a positive integer quantity");
    }
    merged.set(productId, (merged.get(productId) ?? 0) + quantity);
  }
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

function resolveStore(darkStoreId, address) {
  if (address && isValidCoordinate(Number(address.lat), Number(address.lng))) {
    const point = { lat: Number(address.lat), lng: Number(address.lng) };
    if (darkStoreId) {
      const store = db.darkStores.find((s) => s.id === Number(darkStoreId));
      if (!store) throw notFound("Dark store not found");
      const d = distanceKm(point, store);
      if (d > store.radiusKm) throw badRequest("Address is outside this dark store's delivery radius");
      return { store, distanceKm: round2(d) };
    }
    const nearest = findNearestStore(db.darkStores, point);
    if (!nearest) throw badRequest("No dark store delivers to this address yet");
    return nearest;
  }
  if (address) throw badRequest("address.lat and address.lng must be valid coordinates");
  const store = db.darkStores.find((s) => s.id === Number(darkStoreId));
  if (!store) throw notFound("Dark store not found");
  return { store, distanceKm: null };
}

/** Prices the basket without changing anything — used by "see the fee before paying". */
export function buildQuote({ darkStoreId, address, items }) {
  const lines = normaliseItems(items);
  const { store, distanceKm: distance } = resolveStore(darkStoreId, address);
  if (!store.isOpen) throw conflict("This dark store is currently closed");

  const pricedLines = lines.map(({ productId, quantity }) => {
    const product = db.products.find((p) => p.id === productId);
    if (!product) throw notFound(`Product ${productId} not found`);
    return {
      productId,
      name: product.name,
      unitPrice: product.price,
      quantity,
      lineTotal: round2(product.price * quantity),
      available: getAvailableQuantity(store.id, productId)
    };
  });

  const subtotal = round2(pricedLines.reduce((sum, l) => sum + l.lineTotal, 0));
  const fee = calculateDeliveryFee({ subtotal, darkStoreId: store.id });
  const total = round2(subtotal + fee.deliveryFee + fee.smallCartFee);
  const travelMinutes = distance === null ? 8 : Math.ceil((distance / RIDER_SPEED_KMH) * 60);

  return {
    darkStoreId: store.id,
    darkStoreName: store.name,
    distanceKm: distance,
    items: pricedLines,
    subtotal,
    deliveryFee: fee.deliveryFee,
    smallCartFee: fee.smallCartFee,
    feeReason: fee.reason,
    total,
    etaMinutes: PICK_PACK_MINUTES + travelMinutes,
    allAvailable: pricedLines.every((l) => l.available >= l.quantity)
  };
}

export function createOrder({ customerId, darkStoreId, address, items, payment }) {
  if (!customerId) throw badRequest("customerId is required");
  validatePayment(payment);

  const quote = buildQuote({ darkStoreId, address, items });
  reserveStock(quote.darkStoreId, quote.items);

  const orderId = nextId(db.orders);
  const paymentResult = processPayment({ orderId, amount: quote.total, method: payment.method, token: payment.token });
  if (paymentResult.status === "FAILED") {
    releaseStock(quote.darkStoreId, quote.items);
    paymentResult.orderId = null; // no order is created for a declined payment
    throw new HttpError(402, "Payment declined", { paymentId: paymentResult.id });
  }

  const now = new Date().toISOString();
  const order = {
    id: orderId,
    customerId: String(customerId),
    darkStoreId: quote.darkStoreId,
    address: address ?? null,
    items: quote.items.map(({ available: _available, ...line }) => line),
    subtotal: quote.subtotal,
    deliveryFee: quote.deliveryFee,
    smallCartFee: quote.smallCartFee,
    total: quote.total,
    etaMinutes: quote.etaMinutes,
    paymentId: paymentResult.id,
    paymentStatus: paymentResult.status,
    status: ORDER_STATUS.PLACED,
    statusHistory: [{ status: ORDER_STATUS.PLACED, at: now }],
    createdAt: now
  };
  db.orders.push(order);
  return order;
}

export function getOrder(id) {
  const order = db.orders.find((o) => o.id === id);
  if (!order) throw notFound("Order not found");
  return order;
}

/** Moves an order to a new status, enforcing the lifecycle graph. */
export function updateOrderStatus(id, nextStatus) {
  const order = getOrder(id);
  if (!Object.values(ORDER_STATUS).includes(nextStatus)) throw badRequest("Unknown order status");
  if (!TRANSITIONS[order.status].includes(nextStatus)) {
    throw conflict(`Cannot move order from ${order.status} to ${nextStatus}`);
  }
  if (nextStatus === ORDER_STATUS.CANCELLED) releaseStock(order.darkStoreId, order.items);
  order.status = nextStatus;
  order.statusHistory.push({ status: nextStatus, at: new Date().toISOString() });
  return order;
}
