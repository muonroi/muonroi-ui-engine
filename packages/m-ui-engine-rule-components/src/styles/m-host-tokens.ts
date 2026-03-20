/**
 * Runtime :host token injector for Shadow DOM components.
 *
 * LightningCSS (Vite 6+ / Angular 20+) strips :host selectors from CSS
 * during dependency pre-bundling — even standalone :host blocks and
 * @layer-wrapped blocks. The only reliable approach is runtime injection
 * via CSSStyleSheet.insertRule() after adoptedStyleSheets are applied.
 *
 * Call MInjectHostTokens(shadowRoot) in connectedCallback(). It runs once
 * per shadow root — subsequent calls are no-ops.
 *
 * @see https://github.com/parcel-bundler/lightningcss/issues/738
 */

const M_INJECTED = new WeakSet<ShadowRoot>();

export function MInjectHostTokens(sr: ShadowRoot): void {
  if (M_INJECTED.has(sr)) return;
  M_INJECTED.add(sr);

  const sheets = sr.adoptedStyleSheets;
  if (!sheets || sheets.length === 0) return;

  const sheet = sheets[0];
  const rules = sheet.cssRules;
  if (!rules) return;

  // Check if :host already has --mu- tokens (no fix needed)
  for (let i = 0; i < rules.length; i++) {
    const text = rules[i].cssText;
    if (text.startsWith(":host") && text.includes("--mu-surface-canvas")) return;
  }

  // Find :root rules with --mu- tokens and duplicate as :host
  for (let i = 0; i < rules.length; i++) {
    const text = rules[i].cssText;
    if (!text.includes("--mu-")) continue;
    if (!text.startsWith(":root")) continue;

    const match = text.match(/\{([^}]+)\}/);
    if (!match) continue;

    try {
      sheet.insertRule(`:host{${match[1]}}`, rules.length);
    } catch { /* ignore parse errors */ }
  }
}
