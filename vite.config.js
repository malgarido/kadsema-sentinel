import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
// BASE_PATH lets the GitHub Pages workflow serve from /<repo>/.
// Defaults to "/" for root hosting (Netlify, Vercel, custom domain).
export default defineConfig({
  base: process.env.BASE_PATH || "/",
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    // store.supabase.js uses top-level await; requires ES2022+
    target: "es2022",
  },
});
