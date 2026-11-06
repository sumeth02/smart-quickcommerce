export default function ProductGrid({ products, cart, onChange }) {
  if (products.length === 0) {
    return <div className="empty-state"><p>No products match your search.</p></div>;
  }
  return (
    <section className="grid">
      {products.map((p) => {
        const qty = cart[p.id] ?? 0;
        const low = p.stock > 0 && p.stock <= 5;
        return (
          <article key={p.id} className={p.inStock ? "card" : "card out"}>
            <div className="card-img" aria-hidden="true">{p.emoji}</div>
            <span className="eta">⏱ 10 MINS</span>
            <h3>{p.name}</h3>
            <p className="unit">{p.unit}</p>
            {low && <p className="low">Only {p.stock} left</p>}
            <div className="card-foot">
              <strong>€{p.price.toFixed(2)}</strong>
              {!p.inStock ? (
                <span className="soldout">Out of stock</span>
              ) : qty === 0 ? (
                <button className="add" onClick={() => onChange(p.id, 1)}>ADD</button>
              ) : (
                <div className="stepper">
                  <button aria-label={`Remove one ${p.name}`} onClick={() => onChange(p.id, -1)}>−</button>
                  <span>{qty}</span>
                  <button aria-label={`Add one ${p.name}`} onClick={() => onChange(p.id, 1)} disabled={qty >= p.stock}>+</button>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
