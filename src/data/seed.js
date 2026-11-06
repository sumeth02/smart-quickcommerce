// Seed data for the in-memory store.
// Dark stores serve a 3 km radius (SRS §2.4). Coordinates are around Paris.

export const seedDarkStores = () => [
  { id: 1, name: "Dark Store - La Défense", address: "Parvis de La Défense, Puteaux", lat: 48.8918, lng: 2.2389, radiusKm: 3, isOpen: true },
  { id: 2, name: "Dark Store - Bastille", address: "Place de la Bastille, Paris 11e", lat: 48.8532, lng: 2.3692, radiusKm: 3, isOpen: true },
  { id: 3, name: "Dark Store - Montparnasse", address: "Bd du Montparnasse, Paris 14e", lat: 48.8422, lng: 2.3211, radiusKm: 3, isOpen: true }
];

export const seedProducts = () => [
  { id: 1, name: "Bananas (1 kg)", category: "Fruits & Vegetables", price: 1.99, unit: "1 kg", emoji: "🍌" },
  { id: 2, name: "Gala Apples (6 pcs)", category: "Fruits & Vegetables", price: 2.79, unit: "6 pcs", emoji: "🍎" },
  { id: 3, name: "Tomatoes (500 g)", category: "Fruits & Vegetables", price: 1.89, unit: "500 g", emoji: "🍅" },
  { id: 4, name: "Avocados (2 pcs)", category: "Fruits & Vegetables", price: 2.49, unit: "2 pcs", emoji: "🥑" },
  { id: 5, name: "Whole Milk (1 L)", category: "Dairy & Eggs", price: 1.15, unit: "1 L", emoji: "🥛" },
  { id: 6, name: "Free-range Eggs (12)", category: "Dairy & Eggs", price: 3.49, unit: "12 pcs", emoji: "🥚" },
  { id: 7, name: "Greek Yogurt (4 x 125 g)", category: "Dairy & Eggs", price: 2.29, unit: "4 x 125 g", emoji: "🥣" },
  { id: 8, name: "Emmental Cheese (250 g)", category: "Dairy & Eggs", price: 2.99, unit: "250 g", emoji: "🧀" },
  { id: 9, name: "Baguette", category: "Bakery", price: 1.1, unit: "1 pc", emoji: "🥖" },
  { id: 10, name: "Croissants (4 pcs)", category: "Bakery", price: 3.2, unit: "4 pcs", emoji: "🥐" },
  { id: 11, name: "Basmati Rice (1 kg)", category: "Pantry", price: 2.95, unit: "1 kg", emoji: "🍚" },
  { id: 12, name: "Penne Pasta (500 g)", category: "Pantry", price: 1.25, unit: "500 g", emoji: "🍝" },
  { id: 13, name: "Olive Oil (500 ml)", category: "Pantry", price: 5.9, unit: "500 ml", emoji: "🫒" },
  { id: 14, name: "Orange Juice (1 L)", category: "Beverages", price: 2.39, unit: "1 L", emoji: "🧃" },
  { id: 15, name: "Sparkling Water (6 x 1 L)", category: "Beverages", price: 3.1, unit: "6 x 1 L", emoji: "💧" },
  { id: 16, name: "Ground Coffee (250 g)", category: "Beverages", price: 4.6, unit: "250 g", emoji: "☕" },
  { id: 17, name: "Dark Chocolate (100 g)", category: "Snacks", price: 1.79, unit: "100 g", emoji: "🍫" },
  { id: 18, name: "Salted Chips (150 g)", category: "Snacks", price: 1.99, unit: "150 g", emoji: "🥔" },
  { id: 19, name: "Toilet Paper (6 rolls)", category: "Household", price: 3.99, unit: "6 rolls", emoji: "🧻" },
  { id: 20, name: "Dish Soap (500 ml)", category: "Household", price: 2.15, unit: "500 ml", emoji: "🧼" }
];

// One inventory row per (darkStore, product). lowStockThreshold drives low-stock alerts.
export const seedInventory = () => {
  const rows = [];
  let id = 1;
  for (const store of seedDarkStores()) {
    for (const product of seedProducts()) {
      // Deterministic but varied stock so each store looks different.
      const quantity = (product.id * 7 + store.id * 13) % 40;
      rows.push({ id: id++, darkStoreId: store.id, productId: product.id, quantity, lowStockThreshold: 5 });
    }
  }
  return rows;
};
