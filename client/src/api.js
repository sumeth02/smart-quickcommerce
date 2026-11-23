// Thin wrapper around the SQGS REST API.
const TOKEN_KEY = "sqgs.authToken";
const CUSTOMER_KEY = "sqgs.authCustomer";

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredCustomer() {
  try {
    const raw = localStorage.getItem(CUSTOMER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAuth({ customer, token }) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
  } catch {
    // Ignore storage errors (e.g. private browsing restrictions)
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_KEY);
  } catch {
    // Ignore storage errors
  }
}

async function request(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const res = await fetch(path, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || `Request failed (${res.status})`);
    error.status = res.status;
    error.details = data.details;
    throw error;
  }
  return data;
}

export const api = {
  catalog: ({ lat, lng }) => request(`/api/catalog?lat=${lat}&lng=${lng}`),
  quote: (body) => request("/api/orders/quote", { method: "POST", body }),
  placeOrder: (body) => request("/api/orders", { method: "POST", body }),
  getOrder: (id) => request(`/api/orders/${id}`),
  myOrders: (customerId) => request(`/api/orders?customerId=${encodeURIComponent(customerId)}`),
  cancelOrder: (id) => request(`/api/orders/${id}`, { method: "DELETE" }),
  register: (body) => request("/api/auth/register", { method: "POST", body }),
  login: (body) => request("/api/auth/login", { method: "POST", body }),
  me: () => request("/api/auth/me")
};

// Returns the logged-in customer's id, falling back to a persistent guest id.
export function getCustomerId() {
  const customer = getStoredCustomer();
  if (customer?.id !== undefined && customer?.id !== null) {
    return String(customer.id);
  }
  try {
    let id = localStorage.getItem("sqgs.customerId");
    if (!id) {
      id = `guest-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("sqgs.customerId", id);
    }
    return id;
  } catch {
    return "guest-session";
  }
}