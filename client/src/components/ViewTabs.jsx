export default function ViewTabs({ view, onChange }) {
  return (
    <nav className="view-tabs" aria-label="Views">
      <button className={view === "shop" ? "chip active" : "chip"} onClick={() => onChange("shop")}>
        🛒 Shop
      </button>
      <button className={view === "picker" ? "chip active" : "chip"} onClick={() => onChange("picker")}>
        📦 Picker
      </button>
    </nav>
  );
}