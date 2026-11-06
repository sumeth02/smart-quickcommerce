import express from "express";
import cors from "cors";
import coreRoutes from "./routes/core.routes.js";
import productRoutes from "./routes/products.routes.js";
import darkStoreRoutes from "./routes/darkStores.routes.js";
import catalogRoutes from "./routes/catalog.routes.js";
import orderRoutes from "./routes/orders.routes.js";
import paymentRoutes from "./routes/payments.routes.js";
import { errorHandler, notFoundHandler } from "./utils/errorHandler.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => res.json({ name: "Smart Quick-Commerce Grocery System API", docs: "/api" }));
app.get("/api", (_req, res) =>
  res.json({
    endpoints: [
      "/api/products", "/api/darkstores", "/api/darkstores/nearest", "/api/catalog",
      "/api/orders", "/api/orders/quote", "/api/payments",
      "/version", "/info", "/health"
    ]
  })
);

// Platform
app.use("/", coreRoutes);

// Customer ordering (Sumeth)
app.use("/api/products", productRoutes);
app.use("/api/darkstores", darkStoreRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);

// Team modules are mounted here — see docs/TEAM_TASKS.md
// app.use("/api/auth", authRoutes);            // Joseph  – SCRUM-12/13
// app.use("/api/fees", feeRoutes);             // Joseph  – SCRUM-29
// app.use("/api/inventory", inventoryRoutes);  // Russine – SCRUM-19/21/30
// app.use("/api/picker", pickerRoutes);        // Russine – SCRUM-22/23/24
// app.use("/api/riders", riderRoutes);         // Dhruvi  – SCRUM-25
// app.use("/api/deliveries", deliveryRoutes);  // Dhruvi  – SCRUM-25/26/27/28

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
