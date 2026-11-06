import { useEffect, useMemo, useState } from "react";
import { api, getCustomerId } from "./api.js";
import Header from "./components/Header.jsx";
import ProductGrid from "./components/ProductGrid.jsx";
import CartPanel from "./components/CartPanel.jsx";
import OrderTracking from "./components/OrderTracking.jsx";

export const LOCATIONS = [
  { label: "La Défense", lat: 48.8925, lng: 2.2365 },
  { label: "Bastille", lat: 48.8566, lng: 2.3735 },
  { label: "Montparnasse", lat: 48.8437, lng: 2.3245 }
];

export default function App() {
  const customerId = useMemo(getCustomerId, []);
  const [location, setLocation] = useState(LOCATIONS[1]);
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState("");
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState({}); // productId -> quantity
  const [cartOpen, setCartOpen] = useState(false);
  const [trackingId, setTrackingId] = useState(null);

  const loadCatalog = () => {
    setCatalogError("");
    api
      .catalog(location)
      .then(setCatalog)
      .catch((err) => {
        setCatalog(null);
        setCatalogError(err.message);
      });
  };

  useEffect(loadCatalog, [location]);
  useEffect(() => setCart({}), [catalog?.store?.id]); // a cart belongs to one dark store

  const products = catalog?.products ?? [];
  const visible = products.filter(
    (p) =>
      (category === "All" || p.category === category) &&
      p.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const changeQty = (productId, delta) =>
    setCart((prev) => {
      const product = products.find((p) => p.id === productId);
      const next = Math.max(0, Math.min((prev[productId] ?? 0) + delta, product?.stock ?? 0));
      const copy = { ...prev };
      if (next === 0) delete copy[productId];
      else copy[productId] = next;
      return copy;
    });

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = Object.entries(cart).reduce(
    (sum, [id, qty]) => sum + (products.find((p) => p.id === Number(id))?.price ?? 0) * qty,
    0
  );

  const onOrderPlaced = (order) => {
    setCart({});
    setCartOpen(false);
    setTrackingId(order.id);
    loadCatalog(); // stock changed
  };

  return (
    <div className="app">
      <Header
        location={location}
        locations={LOCATIONS}
        onLocationChange={setLocation}
        store={catalog?.store}
        search={search}
        onSearch={setSearch}
        cartCount={cartCount}
        cartTotal={cartTotal}
        onOpenCart={() => setCartOpen(true)}
        onOpenOrders={() => setTrackingId("list")}
      />

      <main className="main">
        {catalogError ? (
          <div className="empty-state">
            <span className="empty-emoji">📍</span>
            <h2>We don't deliver here yet</h2>
            <p>{catalogError}. Pick another location above.</p>
          </div>
        ) : !catalog ? (
          <div className="empty-state"><p>Loading nearby store…</p></div>
        ) : (
          <>
            <section className="hero">
              <div>
                <p className="hero-kicker">Delivering from {catalog.store.name}</p>
                <h1>Groceries at your door in <span>10 minutes</span></h1>
              </div>
              <div className="hero-badge">⚡ {catalog.store.distanceKm ?? "–"} km away</div>
            </section>

            <nav className="categories" aria-label="Categories">
              {["All", ...catalog.categories].map((c) => (
                <button key={c} className={c === category ? "chip active" : "chip"} onClick={() => setCategory(c)}>
                  {c}
                </button>
              ))}
            </nav>

            <ProductGrid products={visible} cart={cart} onChange={changeQty} />
          </>
        )}
      </main>

      {cartOpen && catalog && (
        <CartPanel
          cart={cart}
          products={products}
          store={catalog.store}
          location={location}
          customerId={customerId}
          onChange={changeQty}
          onClose={() => setCartOpen(false)}
          onOrderPlaced={onOrderPlaced}
        />
      )}

      {trackingId && (
        <OrderTracking
          orderId={trackingId}
          customerId={customerId}
          onSelect={setTrackingId}
          onClose={() => setTrackingId(null)}
          onCancelled={loadCatalog}
        />
      )}

      {cartCount > 0 && !cartOpen && (
        <button className="floating-cart" onClick={() => setCartOpen(true)}>
          <span>{cartCount} item{cartCount > 1 ? "s" : ""} · €{cartTotal.toFixed(2)}</span>
          <strong>View cart →</strong>
        </button>
      )}
    </div>
  );
}
