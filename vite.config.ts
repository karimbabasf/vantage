import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// @ts-expect-error process is a nodejs global
const apiPort = process.env.VANTAGE_PORT ?? "7777";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
    // r3f pulls a second react copy under pnpm without this, and the panels vanish.
    dedupe: ["react", "react-dom"],
  },

  server: {
    port: 1420,
    strictPort: true,
    // Same-origin in dev, so the app never needs CORS and the server can stay strict
    // about who it answers. With no server running the health probe fails and the UI
    // falls back to mock data.
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${apiPort}`,
        changeOrigin: false,
      },
    },
    watch: {
      ignored: ["**/server/**"],
    },
  },
});
