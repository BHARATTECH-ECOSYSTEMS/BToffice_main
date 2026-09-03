import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // true binds both 0.0.0.0 and :: — plain "0.0.0.0" is IPv4-only on
    // Windows, which makes ::1 (IPv6 loopback, what some browsers try
    // first for "localhost") come back connection-refused.
    host: true,
    port: 5173,
    strictPort: true,
  },
});

