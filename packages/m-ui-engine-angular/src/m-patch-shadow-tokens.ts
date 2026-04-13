/**
 * Runtime :host token injector for Shadow DOM components.
 *
 * LightningCSS (Vite 6+ / Angular 20+) strips :host selectors from CSS
 * during dependency pre-bundling. This module patches Shadow DOM elements
 * by duplicating :root token rules as :host rules via CSSStyleSheet.insertRule().
 *
 * @see https://github.com/parcel-bundler/lightningcss/issues/738
 * @see https://github.com/parcel-bundler/lightningcss/issues/759
 */

/** Tracks patched shadow roots to avoid double-injection */
export const M_PATCHED_ROOTS = new WeakSet<ShadowRoot>();

/**
 * Patch a single element's Shadow DOM adoptedStyleSheets.
 * Finds :root rules containing --mu-* tokens and injects :host duplicates.
 * No-op if :host tokens already present or element has no shadow root.
 *
 * @returns true if :host rules were injected, false otherwise
 */
export function MPatchElement(el: Element): boolean {
  const sr = el.shadowRoot;
  if (!sr || M_PATCHED_ROOTS.has(sr)) return false;

  const sheets = sr.adoptedStyleSheets;
  if (!sheets || sheets.length === 0) return false;
  const sheet = sheets[0];
  const rules = sheet.cssRules;
  if (!rules || rules.length === 0) return false;

  // Skip if :host already has --mu- tokens
  for (let i = 0; i < rules.length; i++) {
    if (rules[i].cssText.startsWith(":host") && rules[i].cssText.includes("--mu-surface-canvas")) {
      M_PATCHED_ROOTS.add(sr);
      return false;
    }
  }

  // Clone :root --mu- token blocks as :host rules
  let injected = false;
  for (let i = 0; i < rules.length; i++) {
    const text = rules[i].cssText;
    if (!text.includes("--mu-") || !text.startsWith(":root")) continue;
    const match = text.match(/\{([^}]+)\}/);
    if (match) {
      try { sheet.insertRule(`:host{${match[1]}}`, rules.length); injected = true; } catch { /* ignore */ }
    }
  }
  if (injected) M_PATCHED_ROOTS.add(sr);
  return injected;
}

/** All mu-* custom element selectors to scan */
export const M_MU_SELECTORS = "mu-rule-flow-designer, mu-decision-table, mu-decision-table-list, mu-rule-trace-viewer, mu-rule-result-panel, mu-nrules-editor, mu-feel-playground, mu-rule-test-runner, mu-ui-engine-app, mu-dt-version-diff, mu-cep-window-config, mu-cep-event-stream, mu-quota-indicator, mu-schema-watcher, mu-upgrade-prompt";

/**
 * Patch all mu-* elements currently in the DOM and watch for new ones.
 * Uses Lit updateComplete for proper lifecycle timing + MutationObserver
 * for dynamically added elements.
 */
export function MPatchShadowDomTokens(): void {
  const patchMuElement = async (el: Element) => {
    if ("updateComplete" in el) {
      try { await (el as unknown as { updateComplete: Promise<boolean> }).updateComplete; } catch { /* ignore */ }
    }
    MPatchElement(el);
  };

  const patchAll = () => {
    document.querySelectorAll(M_MU_SELECTORS).forEach(el => patchMuElement(el));
  };

  // Patch existing elements — defer for Lit first render
  requestAnimationFrame(() => queueMicrotask(patchAll));

  // Watch for future mu-* elements
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node instanceof Element && node.tagName.startsWith("MU-")) {
          patchMuElement(node);
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
