import { useState } from "react";
import AuthModal from "./AuthModal.jsx";
import { getCurrentCustomer, logout } from "../api.js";

export default function Header({
  location, locations, onLocationChange, store, search, onSearch,
  cartCount, cartTotal, onOpenCart, onOpenOrders
}) {
  const [user, setUser] = useState(getCurrentCustomer);
  const [showAuth, setShowAuth] = useState(false);

  const handleLogout = () => {
    logout();
    setUser(null);
    window.location.reload(); // switch back to the guest cart and orders
  };

  const handleLogin = (customer) => {
    setUser(customer);
    window.location.reload(); // load this customer's orders
  };

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
        {user ? (
          <button className="ghost" onClick={handleLogout} title="Log out">👤 {user.name} · Log out</button>
        ) : (
          <button className="ghost" onClick={() => setShowAuth(true)}>Log in</button>
        )}
        <button className="ghost" onClick={onOpenOrders}>My orders</button>
        <button className="cart-btn" onClick={onOpenCart}>
          🛒 {cartCount > 0 ? `${cartCount} · €${cartTotal.toFixed(2)}` : "Cart"}
        </button>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onLoginSuccess={handleLogin} />}
    </header>
  );
}
