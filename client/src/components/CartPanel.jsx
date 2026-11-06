import { useEffect, useState } from "react";
import { api } from "../api.js";

const PAYMENT_OPTIONS = [
  { value: "card", label: "💳 Card" },
  { value: "wallet", label: "📱 Wallet" },
  { value: "cash_on_delivery", label: "💶 Cash on delivery" }
];

export default function CartPanel({ cart, products, store, location, customerId, onChange, onClose, onOrderPlaced }) {
  const [quote, setQuote] = useState(null);
  const [method, setMethod] = useState("card");
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);

  const items = Object.entries(cart).map(([productId, quantity]) => ({ productId: Number(productId), quantity }));
  const cartKey = JSON.stringify(items);

  // Live quote: the customer sees the delivery fee before paying (SCRUM-17).
  useEffect(() => {
    if (items.length === 0) return setQuote(null);
    api
      .quote({ darkStoreId: store.id, address: { lat: location.lat, lng: location.lng }, items })
      .then((q) => { setQuote(q); setError(""); })
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey, store.id]);

  const placeOrder = async () => {
    setPlacing(true);
    setError("");
    try {
      const { order } = await api.placeOrder({
        customerId,
        darkStoreId: store.id,
        address: { lat: location.lat, lng: location.lng, label: location.label },
        items,
        payment: { method, token: method === "cash_on_delivery" ? undefined : "tok_demo" }
      });
      onOrderPlaced(order);
    } catch (err) {
      setError(
        err.status === 409 && err.details
          ? `Out of stock: ${err.details.map((d) => products.find((p) => p.id === d.productId)?.name).join(", ")}`
          : err.message
      );
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <aside className="panel" onClick={(e) => e.stopPropagation()} aria-label="Cart">
        <div className="panel-head">
          <h2>My cart</h2>
          <button className="icon" onClick={onClose} aria-label="Close cart">✕</button>
        </div>

        {items.length === 0 ? (
          <div className="empty-state"><span className="empty-emoji">🧺</span><p>Your cart is empty.</p></div>
        ) : (
          <>
            <div className="eta-banner">⚡ Delivery in {quote?.etaMinutes ?? "~10"} minutes</div>
            <ul className="cart-lines">
              {items.map(({ productId, quantity }) => {
                const p = products.find((x) => x.id === productId);
                if (!p) return null;
                return (
                  <li key={productId}>
                    <span className="line-emoji">{p.emoji}</span>
                    <div className="line-info"><strong>{p.name}</strong><small>{p.unit}</small></div>
                    <div className="stepper small">
                      <button onClick={() => onChange(productId, -1)}>−</button>
                      <span>{quantity}</span>
                      <button onClick={() => onChange(productId, 1)} disabled={quantity >= p.stock}>+</button>
                    </div>
                    <strong className="line-total">€{(p.price * quantity).toFixed(2)}</strong>
                  </li>
                );
              })}
            </ul>

            {quote && (
              <dl className="bill">
                <div><dt>Items total</dt><dd>€{quote.subtotal.toFixed(2)}</dd></div>
                <div>
                  <dt>Delivery fee {quote.feeReason === "high-demand" && <em>(high demand)</em>}</dt>
                  <dd>{quote.deliveryFee === 0 ? <span className="free">FREE</span> : `€${quote.deliveryFee.toFixed(2)}`}</dd>
                </div>
                {quote.smallCartFee > 0 && <div><dt>Small cart fee</dt><dd>€{quote.smallCartFee.toFixed(2)}</dd></div>}
                <div className="grand"><dt>To pay</dt><dd>€{quote.total.toFixed(2)}</dd></div>
                {quote.deliveryFee > 0 && <p className="hint">Free delivery on orders above €30</p>}
              </dl>
            )}

            <fieldset className="pay">
              <legend>Payment method</legend>
              {PAYMENT_OPTIONS.map((o) => (
                <label key={o.value} className={method === o.value ? "pay-opt active" : "pay-opt"}>
                  <input type="radio" name="pay" value={o.value} checked={method === o.value} onChange={() => setMethod(o.value)} />
                  {o.label}
                </label>
              ))}
            </fieldset>

            {error && <p className="error">{error}</p>}

            <button className="checkout" onClick={placeOrder} disabled={placing || !quote}>
              {placing ? "Placing order…" : `Pay €${quote ? quote.total.toFixed(2) : "…"} · Place order`}
            </button>
          </>
        )}
      </aside>
    </div>
  );
}
