/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// VITE_BASE is set by the GitHub Pages workflow to "/<repo-name>/". Locally it is "/".
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [react()],
  server: { fs: { allow: [".."] } }, // shared core lives in ../supabase/functions/_shared
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    css: false,
  },
});
