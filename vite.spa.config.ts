import path from "node:path";
import tailwindcss from "@tailwindcss/postcss";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  css: { postcss: { plugins: [tailwindcss()] } },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "./"),
    },
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: false,
    minify: true,
    lib: {
      entry: path.resolve(process.cwd(), "app/client-entry.tsx"),
      name: "BadmintonHub",
      fileName: () => "app-bundle.js",
      formats: ["iife"],
    },
  },
});
