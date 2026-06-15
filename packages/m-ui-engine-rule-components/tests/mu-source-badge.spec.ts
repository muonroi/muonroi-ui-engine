/**
 * Spec for mu-source-badge (Phase 19, plan 01).
 *
 * Proves:
 *   - label attribute renders verbatim in shadowRoot
 *   - badge uses the neutral info chip styling (badge--source)
 *   - Zero hardcoded Vietnamese strings (D-18)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "../src/components/source-badge/mu-source-badge.js";

type MuSourceBadgeEl = HTMLElement & {
  updateComplete: Promise<boolean>;
  label: string;
};

function makeEl(): MuSourceBadgeEl {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = document.createElement("mu-source-badge") as any;
  document.body.appendChild(el);
  return el as MuSourceBadgeEl;
}

describe("mu-source-badge", () => {
  let el: MuSourceBadgeEl;

  beforeEach(() => {
    el = makeEl();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it("renders the supplied label text verbatim inside shadowRoot", async () => {
    el.setAttribute("label", "Tự viết");
    await el.updateComplete;
    await el.updateComplete;

    const shadow = el.shadowRoot!;
    const badge = shadow.querySelector(".badge--source");
    expect(badge).not.toBeNull();
    expect(badge!.textContent?.trim()).toBe("Tự viết");
  });

  it("badge--source class is present (neutral info chip styling)", async () => {
    el.setAttribute("label", "Custom Source");
    await el.updateComplete;
    await el.updateComplete;

    const shadow = el.shadowRoot!;
    const badge = shadow.querySelector(".badge--source");
    expect(badge).not.toBeNull();
  });

  it("renders empty when label not provided (no hardcoded fallback text — D-18)", async () => {
    await el.updateComplete;
    await el.updateComplete;

    const shadow = el.shadowRoot!;
    const badge = shadow.querySelector(".badge--source");
    expect(badge).not.toBeNull();
    expect(badge!.textContent?.trim()).toBe("");
  });

  it("accepts variant attribute without error", async () => {
    el.setAttribute("label", "Jira");
    el.setAttribute("variant", "jira");
    await el.updateComplete;
    await el.updateComplete;

    const shadow = el.shadowRoot!;
    const badge = shadow.querySelector(".badge--source");
    expect(badge).not.toBeNull();
    expect(badge!.textContent?.trim()).toBe("Jira");
  });
});
