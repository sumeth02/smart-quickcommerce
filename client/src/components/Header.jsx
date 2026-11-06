export default function Header({
  location, locations, onLocationChange, store, search, onSearch,
  cartCount, cartTotal, onOpenCart, onOpenOrders
}) {
  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) =>
      onLocationChange({ label: "Current location", lat: pos.coords.latitude, lng: pos.coords.longitude })
    );
  };

  return (
    <header className="header">
      <div className="brand">
        <span className="logo">QB</span>
        <div>
          <strong>QuickBasket</strong>
          <small>{store ? `⚡ ~10 min · ${store.name.replace("Dark Store - ", "")}` : "Finding your store…"}</small>
        </div>
      </div>

      <label className="location">
        <span>Deliver to</span>
        <select
          value={location.label}
          onChange={(e) => {
            if (e.target.value === "__gps") return useMyLocation();
            onLocationChange(locations.find((l) => l.label === e.target.value));
          }}
        >
          {locations.map((l) => (
            <option key={l.label} value={l.label}>{l.label}</option>
          ))}
          {location.label === "Current location" && <option value="Current location">Current location</option>}
          <option value="__gps">📍 Use my location</option>
        </select>
      </label>

      <input
        className="search"
        type="search"
        placeholder="Search milk, bread, eggs…"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />

      <div className="header-actions">
        <button className="ghost" onClick={onOpenOrders}>My orders</button>
        <button className="cart-btn" onClick={onOpenCart}>
          🛒 {cartCount > 0 ? `${cartCount} · €${cartTotal.toFixed(2)}` : "Cart"}
        </button>
      </div>
    </header>
  );
}
