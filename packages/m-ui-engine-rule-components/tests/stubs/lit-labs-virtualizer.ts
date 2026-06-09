// Stub for @lit-labs/virtualizer in jsdom test environment.
// The real package uses IntersectionObserver + ResizeObserver at import time.
// This stub prevents those browser-only APIs from being called during unit tests.
// The IntersectionObserver polyfill in vitest.setup.ts covers runtime needs;
// this alias prevents the real browser package from loading at all in jsdom (Pitfall 3).

export function virtualize<T>(_opts: { items: T[]; renderItem: (item: T) => unknown }): T[] {
  return []; // no-op — store and unit tests don't need rendering
}

export class LitVirtualizer extends HTMLElement {}

if (typeof customElements !== "undefined" && !customElements.get("lit-virtualizer")) {
  customElements.define("lit-virtualizer", LitVirtualizer);
}
