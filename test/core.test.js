import { api } from "./helpers.js";

describe("Platform routes", () => {
  it("GET / returns API name", async () => {
    const res = await api().get("/");
    expect(res.status).toBe(200);
    expect(res.body.name).toMatch(/Quick-Commerce/);
  });

  it("GET /api lists endpoints", async () => {
    const res = await api().get("/api");
    expect(res.body.endpoints).toContain("/api/orders");
  });

  it("GET /version returns the package version", async () => {
    const res = await api().get("/version");
    expect(res.status).toBe(200);
    expect(res.body.version).toBe("1.0.0");
  });

  it("GET /info returns name, version, node and uptime", async () => {
    const res = await api().get("/info");
    expect(res.body).toHaveProperty("name", "smart-quickcommerce");
    expect(res.body).toHaveProperty("node");
    expect(typeof res.body.uptime).toBe("number");
  });

  it("GET /health returns ok with an uptime label", async () => {
    const res = await api().get("/health");
    expect(res.body.status).toBe("ok");
    expect(["warming-up", "healthy", "steady"]).toContain(res.body.label);
  });

  it("GET /boom returns a 500 error payload", async () => {
    const res = await api().get("/boom");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: true, message: "Simulated failure" });
  });

  it("unknown routes return 404 JSON", async () => {
    const res = await api().get("/nope");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe(true);
  });
});
