import { defineConfig } from "vite";
import {contentPlugin} from './scripts/content-store.mjs';
import react from "@vitejs/plugin-react";

export default defineConfig({
  ssr: {noExternal: ['@fontsource-variable/fredoka','@fontsource-variable/dm-sans','@phosphor-icons/react']},
  build: {
    outDir: "dist/client",
    rollupOptions: { input: { main: "index.html", directions: "directions.html" } },
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react(),contentPlugin(import.meta.url)],
});
