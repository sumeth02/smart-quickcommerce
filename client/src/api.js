const api = {
  // --- EXISTING APP METHODS ---
  async getProducts() {
    const res = await fetch('/api/products');
    return res.json();
  },
  async getDarkStores() {
    const res = await fetch('/api/darkstores');
    return res.json();
  },
  async quoteOrder(payload) {
    const res = await fetch('/api/orders/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },
  async placeOrder(payload) {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  // --- NEW AUTH METHODS ---
  async login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Login failed');
    }
    return res.json();
  },

  async register(data) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Registration failed');
    }
    return res.json();
  },

  getCustomerId() {
    const customer = localStorage.getItem('customer');
    if (customer) {
      try {
        return JSON.parse(customer).id;
      } catch (e) {
        return 'guest-id';
      }
    }
    return 'guest-id';
  }
};

export default api;