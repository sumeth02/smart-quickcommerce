// Thin wrapper around the SQGS REST API.
async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
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
  // Auth (Joseph – SCRUM-38)
  register: (data) => request("/api/auth/register", { method: "POST", body: data }).then(saveSession),
  login: (email, password) => request("/api/auth/login", { method: "POST", body: { email, password } }).then(saveSession)
};

function saveSession(res) {
  try {
    localStorage.setItem("token", res.token);
    localStorage.setItem("customer", JSON.stringify(res.customer));
  } catch {
    /* storage unavailable */
  }
  return res;
}

export function getCurrentCustomer() {
  try {
    return JSON.parse(localStorage.getItem("customer") || "null");
  } catch {
    return null;
  }
}

export function logout() {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("customer");
  } catch {
    /* storage unavailable */
  }
}

// Logged-in customer's id, or a guest id when nobody is logged in.
export function getCustomerId() {
  const customer = getCurrentCustomer();
  if (customer?.id) return `customer-${customer.id}`;
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
