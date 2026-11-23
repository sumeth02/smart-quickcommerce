export default function Header({
  location,
  locations,
  onLocationChange,
  store,
  search,
  onSearch,
  cartCount,
  cartTotal,
  onOpenCart,
  onOpenOrders,
  customer,
  onOpenAuth,
  onLogout
}) {
  return (
    <header className="header">
      <div className="brand">
        <div className="logo">⚡</div>
        <div>
          <strong>SQGS</strong>
          <small>{store ? `10 min · ${store.name}` : "10-min groceries"}</small>
        </div>
      </div>

      <label className="location">
        Deliver to
        <select
          aria-label="Delivery location"
          value={location.label}
          onChange={(e) => {
            const next = locations.find((l) => l.label === e.target.value);
            if (next) onLocationChange(next);
          }}
        >
          {locations.map((loc) => (
            <option key={loc.label} value={loc.label}>
              {loc.label}
            </option>
          ))}
        </select>
      </label>

      <input
        className="search"
        type="search"
        placeholder="Search milk, bread, snacks…"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />

      <div className="header-actions">
        {customer ? (
          <span className="auth-user">
            👤 {customer.name}
            <button
              type="button"
              className="auth-logout"
              onClick={onLogout}
              title="Log out"
            >
              Log out
            </button>
          </span>
        ) : (
          <button type="button" className="ghost" onClick={onOpenAuth}>
            Log in
          </button>
        )}

        <button type="button" className="ghost" onClick={onOpenOrders}>
          Orders
        </button>

        <button type="button" className="cart-btn" onClick={onOpenCart}>
          {cartCount > 0
            ? `🛒 ${cartCount} · €${cartTotal.toFixed(2)}`
            : "🛒 Cart"}
        </button>
      </div>
    </header>
  );
}