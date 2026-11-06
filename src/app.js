import authRoutes from './routes/auth.routes.js';
import customerRoutes from './routes/customers.routes.js';
import feeRoutes from './routes/fees.routes.js'; // Added for Phase 2
import express from "express";
import cors from "cors";
import coreRoutes from "./routes/core.routes.js";
import productRoutes from "./routes/products.routes.js";
import darkStoreRoutes from "./routes/darkStores.routes.js";
import catalogRoutes from "./routes/catalog.routes.js";
import orderRoutes from "./routes/orders.routes.js";
import paymentRoutes from "./routes/payments.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import replenishmentRoutes from "./routes/replenishment.routes.js";
import pickerRoutes from "./routes/picker.routes.js";
import pickerStaffRoutes from "./routes/pickers.routes.js";
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
      "/api/auth", "/api/customers", "/api/fees", "/api/inventory", "/api/replenishments",
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

// Team modules are mounted here
app.use("/api/auth", authRoutes);                 // Joseph  – SCRUM-38
app.use("/api/customers", customerRoutes);        // Joseph  – SCRUM-38
app.use("/api/fees", feeRoutes);                  // Joseph  – SCRUM-39
app.use("/api/inventory", inventoryRoutes);       // Russine – SCRUM-40
app.use("/api/replenishments", replenishmentRoutes); // Russine – SCRUM-40
app.use("/api/picker", pickerRoutes);
app.use("/api/pickers", pickerStaffRoutes);       // Russine – SCRUM-22/23/24
// app.use("/api/riders", riderRoutes);         // Dhruvi  – SCRUM-25
// app.use("/api/deliveries", deliveryRoutes);  // Dhruvi  – SCRUM-25/26/27/28

app.use(notFoundHandler);
app.use(errorHandler);

export default app;