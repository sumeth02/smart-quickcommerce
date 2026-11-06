import { useEffect, useState } from "react";
import { api } from "../api.js";

const STEPS = [
  { status: "PLACED", label: "Order confirmed", icon: "✅" },
  { status: "PICKING", label: "Packing your items", icon: "🧺" },
  { status: "PACKED", label: "Packed & ready", icon: "📦" },
  { status: "OUT_FOR_DELIVERY", label: "Rider on the way", icon: "🛵" },
  { status: "DELIVERED", label: "Delivered", icon: "🏠" }
];

const time = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function OrderTracking({ orderId, customerId, onSelect, onClose, onCancelled }) {
  const [order, setOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let timer;
    const load = () => {
      const req = orderId === "list" ? api.myOrders(customerId).then(setOrders) : api.getOrder(orderId).then(setOrder);
      req.catch((err) => setError(err.message));
    };
    load();
    timer = setInterval(load, 3000); // live tracking (SCRUM-28)
    return () => clearInterval(timer);
  }, [orderId, customerId]);

  const cancel = async () => {
    try {
      await api.cancelOrder(order.id);
      setOrder({ ...order, status: "CANCELLED" });
      onCancelled();
    } catch (err) {
      setError(err.message);
    }
  };

  const reached = (status) => order?.statusHistory.find((h) => h.status === status);

  return (
    <div className="overlay" onClick={onClose}>
      <aside className="panel" onClick={(e) => e.stopPropagation()} aria-label="Orders">
        <div className="panel-head">
          <h2>{orderId === "list" ? "My orders" : `Order #${orderId}`}</h2>
          <button className="icon" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {error && <p className="error">{error}</p>}

        {orderId === "list" ? (
          orders.length === 0 ? (
            <div className="empty-state"><span className="empty-emoji">🧾</span><p>No orders yet.</p></div>
          ) : (
            <ul className="order-list">
              {[...orders].reverse().map((o) => (
                <li key={o.id}>
                  <button onClick={() => onSelect(o.id)}>
                    <strong>Order #{o.id}</strong>
                    <span className={`pill ${o.status.toLowerCase()}`}>{o.status.replaceAll("_", " ")}</span>
                    <small>{o.items.length} items · €{o.total.toFixed(2)} · {time(o.createdAt)}</small>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : !order ? (
          <p>Loading…</p>
        ) : (
          <>
            {order.status === "CANCELLED" ? (
              <div className="eta-banner cancelled">Order cancelled — your items were returned to stock.</div>
            ) : (
              <div className="eta-banner">
                {order.status === "DELIVERED" ? "Delivered. Enjoy! 🎉" : `⚡ Arriving in about ${order.etaMinutes} minutes`}
              </div>
            )}

            <ol className="timeline">
              {STEPS.map((step) => {
                const hit = reached(step.status);
                return (
                  <li key={step.status} className={hit ? "done" : ""}>
                    <span className="dot">{step.icon}</span>
                    <div><strong>{step.label}</strong>{hit && <small>{time(hit.at)}</small>}</div>
                  </li>
                );
              })}
            </ol>

            <dl className="bill">
              {order.items.map((l) => (
                <div key={l.productId}><dt>{l.quantity} × {l.name}</dt><dd>€{l.lineTotal.toFixed(2)}</dd></div>
              ))}
              <div><dt>Delivery</dt><dd>€{(order.deliveryFee + order.smallCartFee).toFixed(2)}</dd></div>
              <div className="grand"><dt>Paid ({order.paymentStatus.toLowerCase()})</dt><dd>€{order.total.toFixed(2)}</dd></div>
            </dl>

            {["PLACED", "PICKING"].includes(order.status) && (
              <button className="ghost danger" onClick={cancel}>Cancel order</button>
            )}
            <button className="ghost" onClick={() => onSelect("list")}>← All orders</button>
          </>
        )}
      </aside>
    </div>
  );
}
