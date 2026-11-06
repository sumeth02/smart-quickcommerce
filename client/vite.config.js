import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The API runs on :3000 (npm run dev at the repo root). Vite proxies /api to it.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000"
    }
  }
});
