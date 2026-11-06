import { db, nextId } from "../data/db.js";
import { onStockChange } from "./stockService.js";

export function checkLowStock(row) {
  const openAlert = db.inventoryAlerts.find(
    (a) => a.inventoryId === row.id && a.status === "OPEN"
  );

  if (row.quantity <= row.lowStockThreshold) {
    if (!openAlert) {
      db.inventoryAlerts.push({
        id: nextId(db.inventoryAlerts),
        inventoryId: row.id,
        darkStoreId: row.darkStoreId,
        productId: row.productId,
        quantity: row.quantity,
        status: "OPEN",
        message: `Low stock: ${row.quantity} left (threshold ${row.lowStockThreshold})`,
        createdAt: new Date().toISOString()
      });
    }
  } else if (openAlert) {
    openAlert.status = "RESOLVED";
  }
}

onStockChange(checkLowStock);