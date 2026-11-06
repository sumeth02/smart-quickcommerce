// Platform routes carried over from the DevOps lab: /version, /info, /health, /boom.
import express from "express";
import { getPackageInfo, getRuntimeInfo } from "../utils/appInfo.js";
import { formatStatus } from "../utils/status.js";

const router = express.Router();

router.get("/version", (_req, res) => res.json({ version: getPackageInfo().version }));

router.get("/info", (_req, res) => res.json({ ...getPackageInfo(), ...getRuntimeInfo() }));

router.get("/health", (_req, res) => {
  const { uptime } = getRuntimeInfo();
  res.json({ status: "ok", uptime, label: formatStatus(uptime) });
});

router.get("/boom", () => {
  throw new Error("Simulated failure");
});

export default router;
