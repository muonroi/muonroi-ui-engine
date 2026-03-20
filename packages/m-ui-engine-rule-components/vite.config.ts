import { defineConfig, type Plugin } from "vite";
import { resolve } from "node:path";

/**
 * Vite plugin: ensure :host selectors survive downstream CSS minifiers.
 *
 * LightningCSS (default in Vite 6+ / Angular 20+) strips :host from
 * top-level `:root, :host { ... }` rules during dependency pre-bundling.
 * This plugin duplicates :root token blocks as :host blocks in the final
 * CSS string so tokens always resolve inside Shadow DOM.
 *
 * @see https://github.com/parcel-bundler/lightningcss/issues/738
 */
function MDesignTokenHostPlugin(): Plugin {
  return {
    name: "muonroi-design-token-host",
    enforce: "post",
    transform(code, id) {
      if (!id.endsWith("?inline") || !id.includes(".css")) return;
      if (!code.includes("--mu-")) return;

      // CSS ?inline results in a raw CSS string.
      // Find :root (with or without :host) blocks containing --mu- tokens
      // and append a standalone :host{...} copy that survives LightningCSS.
      const transformed = code.replace(
        /:root(?:,\s*:host)?\s*\{((?:[^}]*--mu-[^}]*))\}/g,
        (match, props) => `${match}:host{${props}}`
      );

      return transformed !== code ? transformed : undefined;
    }
  };
}

export default defineConfig({
  plugins: [MDesignTokenHostPlugin()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "MuonroiRuleComponents",
      formats: ["es", "iife"],
      fileName: (format) =>
        format === "iife" ? "muonroi-rule-components.iife.js" : "muonroi-rule-components.esm.js"
    },
    rollupOptions: {
      external: ["@muonroi/ui-engine-core"],
      output: {
        globals: {
          "@muonroi/ui-engine-core": "MuonroiUiEngineCore"
        },
        assetFileNames: (chunkInfo) =>
          chunkInfo.name?.endsWith(".css") ? "muonroi-rule-components.css" : "assets/[name]-[hash][extname]"
      }
    }
  }
});
