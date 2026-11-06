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
  cancelOrder: (id) => request(`/api/orders/${id}`, { method: "DELETE" })
};

// Guest id until the auth module (SCRUM-12/13) provides a real customer account.
export function getCustomerId() {
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
