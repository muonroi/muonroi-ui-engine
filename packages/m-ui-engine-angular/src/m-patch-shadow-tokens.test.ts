import { describe, it, expect } from "vitest";
import { MPatchElement, M_PATCHED_ROOTS } from "./m-patch-shadow-tokens.js";

/**
 * Creates a mock element with Shadow DOM and adoptedStyleSheets.
 * jsdom lacks adoptedStyleSheets, so we build the minimal API surface.
 */
function createMockElement(cssTexts: string[]) {
  const insertedRules: string[] = [];

  const rulesObj: Record<number | "length", unknown> = { length: cssTexts.length };
  cssTexts.forEach((text, i) => { rulesObj[i] = { cssText: text }; });

  const sheet = {
    get cssRules() { return rulesObj as unknown as CSSRuleList; },
    insertRule(rule: string, index: number) { insertedRules.push(rule); return index; },
  } as unknown as CSSStyleSheet;

  const shadowRoot = { adoptedStyleSheets: [sheet] } as unknown as ShadowRoot;
  const element = { shadowRoot } as unknown as Element;

  return { element, shadowRoot, insertedRules };
}

describe("MPatchElement", () => {
  it("should inject :host rule when :root has --mu- tokens", () => {
    const { element, insertedRules } = createMockElement([
      "@layer properties { * { --tw-shadow: initial } }",
      ":root { --mu-surface-canvas: blue; --mu-node-trigger: red }",
    ]);

    const result = MPatchElement(element);

    expect(result).toBe(true);
    expect(insertedRules).toHaveLength(1);
    expect(insertedRules[0]).toMatch(/^:host\{/);
    expect(insertedRules[0]).toContain("--mu-surface-canvas: blue");
    expect(insertedRules[0]).toContain("--mu-node-trigger: red");
  });

  it("should inject multiple :host rules for multiple :root blocks", () => {
    const { element, insertedRules } = createMockElement([
      ":root { --mu-surface-canvas: blue }",
      "[data-theme=dark] { --mu-surface-canvas: black }",
      ":root { --color-mu-primary: var(--mu-color-interactive) }",
    ]);

    const result = MPatchElement(element);

    expect(result).toBe(true);
    expect(insertedRules).toHaveLength(2);
    expect(insertedRules[0]).toContain("--mu-surface-canvas");
    expect(insertedRules[1]).toContain("--color-mu-primary");
  });

  it("should skip when :host already has --mu-surface-canvas", () => {
    const { element, insertedRules } = createMockElement([
      ":root { --mu-surface-canvas: blue }",
      ":host { --mu-surface-canvas: blue }",
    ]);

    const result = MPatchElement(element);

    expect(result).toBe(false);
    expect(insertedRules).toHaveLength(0);
  });

  it("should skip when element has no shadow root", () => {
    const element = { shadowRoot: null } as unknown as Element;
    expect(MPatchElement(element)).toBe(false);
  });

  it("should skip when adoptedStyleSheets is empty", () => {
    const element = { shadowRoot: { adoptedStyleSheets: [] } } as unknown as Element;
    expect(MPatchElement(element)).toBe(false);
  });

  it("should skip when no cssRules", () => {
    const sheet = { cssRules: null } as unknown as CSSStyleSheet;
    const element = { shadowRoot: { adoptedStyleSheets: [sheet] } } as unknown as Element;
    expect(MPatchElement(element)).toBe(false);
  });

  it("should skip when cssRules is empty", () => {
    const { element, insertedRules } = createMockElement([]);
    expect(MPatchElement(element)).toBe(false);
    expect(insertedRules).toHaveLength(0);
  });

  it("should not inject for :root rules without --mu- tokens", () => {
    const { element, insertedRules } = createMockElement([
      ":root { --font-sans: Arial }",
      ":root { --color-red-500: red }",
    ]);

    expect(MPatchElement(element)).toBe(false);
    expect(insertedRules).toHaveLength(0);
  });

  it("should not inject for non-:root rules with --mu- tokens", () => {
    const { element, insertedRules } = createMockElement([
      "[data-theme=dark] { --mu-surface-canvas: black }",
      ".theme { --mu-node-trigger: green }",
    ]);

    expect(MPatchElement(element)).toBe(false);
    expect(insertedRules).toHaveLength(0);
  });

  it("should guard against double-patching via WeakSet", () => {
    const { element, shadowRoot, insertedRules } = createMockElement([
      ":root { --mu-surface-canvas: blue }",
    ]);

    expect(MPatchElement(element)).toBe(true);
    expect(insertedRules).toHaveLength(1);

    // Second call — WeakSet guard
    expect(MPatchElement(element)).toBe(false);
    expect(insertedRules).toHaveLength(1);

    expect(M_PATCHED_ROOTS.has(shadowRoot)).toBe(true);
  });

  it("should handle insertRule throwing gracefully", () => {
    const rulesObj: Record<number | "length", unknown> = {
      length: 1,
      0: { cssText: ":root { --mu-surface-canvas: blue }" },
    };
    const sheet = {
      get cssRules() { return rulesObj as unknown as CSSRuleList; },
      insertRule() { throw new Error("SecurityError"); },
    } as unknown as CSSStyleSheet;
    const element = { shadowRoot: { adoptedStyleSheets: [sheet] } } as unknown as Element;

    expect(MPatchElement(element)).toBe(false);
  });
});
