import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));

export function getPackageInfo() {
  return { name: pkg.name, version: pkg.version };
}

export function getRuntimeInfo() {
  return { node: process.version, uptime: Math.round(process.uptime()) };
}
