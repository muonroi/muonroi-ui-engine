import { defineConfig } from "vite";
import { resolve } from "node:path";
import type { Connect } from "vite";
import { LIVING_DOC, TRACEABILITY } from "./preview/mock-data.js";

/**
 * Dev-only Vite config for the standalone Phase 4 Living Docs preview.
 * Run: `npm run preview:demo` — serves preview/index.html with a mock FCD API
 * so the components render without a backend. NOT part of the library build.
 */
function mockApi(): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = (req.url ?? "").split("?")[0];
    res.setHeader("Content-Type", "application/json");

    if (/^\/api\/v1\/living-docs\//.test(url)) {
      res.end(JSON.stringify(LIVING_DOC));
      return;
    }
    if (/^\/api\/v1\/traceability\//.test(url)) {
      res.end(JSON.stringify(TRACEABILITY));
      return;
    }
    next();
  };
}

export default defineConfig({
  root: resolve(__dirname),
  server: {
    port: 5180,
    open: "/preview/index.html",
  },
  plugins: [
    {
      name: "mock-living-docs-api",
      configureServer(server) {
        server.middlewares.use(mockApi());
      },
    },
  ],
});
