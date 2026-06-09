// Stub for @lit-labs/virtualizer in jsdom test environment.
// The real package uses IntersectionObserver + ResizeObserver at import time.
// This stub prevents those browser-only APIs from being called during unit tests.
// The IntersectionObserver polyfill in vitest.setup.ts covers runtime needs;
// this alias prevents the real browser package from loading at all in jsdom (Pitfall 3).
//
// Updated: renderItem IS called for each item so that Lit template assertions work
// in unit tests (the real virtualizer would do the same, just lazily by viewport).

export function virtualize<T>(opts: { items: T[]; renderItem: (item: T) => unknown }): unknown[] {
  // Call renderItem for every item — mirrors the real virtualizer's behaviour for
  // small datasets; tests can assert on the rendered DOM.
  return opts.items.map((item) => opts.renderItem(item));
}

export class LitVirtualizer extends HTMLElement {}

if (typeof customElements !== "undefined" && !customElements.get("lit-virtualizer")) {
  customElements.define("lit-virtualizer", LitVirtualizer);
}
