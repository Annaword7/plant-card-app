import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // In dev mode, proxy /api calls to Express server
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
