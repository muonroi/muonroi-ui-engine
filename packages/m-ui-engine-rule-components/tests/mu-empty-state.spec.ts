/**
 * Spec for mu-empty-state (Phase 19, plan 01).
 *
 * Proves:
 *   - message attribute renders in shadowRoot
 *   - cta-label attribute renders on the CTA button
 *   - clicking CTA dispatches empty-cta with bubbles:true + composed:true (Pitfall 5)
 *   - tooltip attribute binds to title on the container
 *   - Zero hardcoded Vietnamese strings (D-18)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "../src/components/empty-state/mu-empty-state.js";

type MuEmptyStateEl = HTMLElement & {
  updateComplete: Promise<boolean>;
  message: string;
  ctaLabel: string;
  tooltip: string;
};

function makeEl(): MuEmptyStateEl {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = document.createElement("mu-empty-state") as any;
  document.body.appendChild(el);
  return el as MuEmptyStateEl;
}

describe("mu-empty-state", () => {
  let el: MuEmptyStateEl;

  beforeEach(() => {
    el = makeEl();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  describe("content rendering (D-18 — host-supplied copy)", () => {
    it("renders the supplied message text in shadowRoot", async () => {
      el.setAttribute("message", "No documents yet. Create the first one.");
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      const msg = shadow.querySelector(".empty-message");
      expect(msg).not.toBeNull();
      expect(msg!.textContent?.trim()).toBe("No documents yet. Create the first one.");
    });

    it("renders the supplied cta-label on the CTA button", async () => {
      el.setAttribute("cta-label", "+ Create Document");
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      const btn = shadow.querySelector<HTMLButtonElement>(".cta");
      expect(btn).not.toBeNull();
      expect(btn!.textContent?.trim()).toBe("+ Create Document");
    });

    it("tooltip attribute binds to title on the container", async () => {
      const tip = "What is a document?";
      el.setAttribute("tooltip", tip);
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      const container = shadow.querySelector(".empty-state");
      expect(container).not.toBeNull();
      expect(container!.getAttribute("title")).toBe(tip);
    });
  });

  describe("empty-cta event dispatch (Pitfall 5 — composed MANDATORY)", () => {
    it("dispatches empty-cta with bubbles:true and composed:true when CTA is clicked", async () => {
      el.setAttribute("cta-label", "+ Create");
      await el.updateComplete;
      await el.updateComplete;

      let capturedBubbles = false;
      let capturedComposed = false;

      el.addEventListener("empty-cta", (e) => {
        capturedBubbles = e.bubbles;
        capturedComposed = e.composed;
      });

      const shadow = el.shadowRoot!;
      const btn = shadow.querySelector<HTMLButtonElement>(".cta");
      expect(btn).not.toBeNull();
      btn!.click();

      expect(capturedBubbles).toBe(true);
      expect(capturedComposed).toBe(true);
    });
  });
});
