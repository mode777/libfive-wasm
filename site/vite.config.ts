import { defineConfig } from "vite";

/** Project Pages mount at /libfive-wasm/; local dev and preview stay at /. */
const base = process.env.SITE_BASE ?? "/";

export default defineConfig({
  base,
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
  },
  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: ["libfive-wasm"],
  },
  server: {
    fs: {
      allow: [".."],
    },
  },
});
