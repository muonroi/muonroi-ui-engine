/**
 * Spec for mu-ba-status-badge (Phase 19, plan 01).
 *
 * Proves:
 *   - variant="active" renders success tone (badge--success class present)
 *   - variant="pending" renders warning tone
 *   - variant="draft" renders info tone
 *   - An unknown/unmapped variant still renders the supplied label (never blank — D-07)
 *   - Zero hardcoded Vietnamese strings in the component (D-18)
 *   - label attribute is rendered verbatim in the shadowRoot
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "../src/components/ba-status-badge/mu-ba-status-badge.js";

type MuBaStatusBadgeEl = HTMLElement & {
  updateComplete: Promise<boolean>;
  variant: string;
  label: string;
};

function makeEl(): MuBaStatusBadgeEl {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = document.createElement("mu-ba-status-badge") as any;
  document.body.appendChild(el);
  return el as MuBaStatusBadgeEl;
}

describe("mu-ba-status-badge", () => {
  let el: MuBaStatusBadgeEl;

  beforeEach(() => {
    el = makeEl();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  describe("variant tone mapping", () => {
    it("variant=active renders badge--success class", async () => {
      el.setAttribute("variant", "active");
      el.setAttribute("label", "Đang áp dụng");
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      const badge = shadow.querySelector(".badge--success");
      expect(badge).not.toBeNull();
    });

    it("variant=pending renders badge--warning class", async () => {
      el.setAttribute("variant", "pending");
      el.setAttribute("label", "Đang duyệt");
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      const badge = shadow.querySelector(".badge--warning");
      expect(badge).not.toBeNull();
    });

    it("variant=draft renders badge--info class", async () => {
      el.setAttribute("variant", "draft");
      el.setAttribute("label", "Bản nháp");
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      const badge = shadow.querySelector(".badge--info");
      expect(badge).not.toBeNull();
    });

    it("variant=approved renders badge--info class", async () => {
      el.setAttribute("variant", "approved");
      el.setAttribute("label", "Đã duyệt");
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      const badge = shadow.querySelector(".badge--info");
      expect(badge).not.toBeNull();
    });

    it("variant=rejected renders badge--error class", async () => {
      el.setAttribute("variant", "rejected");
      el.setAttribute("label", "Bị từ chối");
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      const badge = shadow.querySelector(".badge--error");
      expect(badge).not.toBeNull();
    });

    it("unknown variant renders badge--neutral and still renders the label (D-07 — never blank)", async () => {
      el.setAttribute("variant", "somethingUnknown");
      el.setAttribute("label", "Custom Label");
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      const badge = shadow.querySelector(".badge--neutral");
      expect(badge).not.toBeNull();
      expect(badge!.textContent?.trim()).toBe("Custom Label");
    });
  });

  describe("label rendering (D-07, D-18)", () => {
    it("renders the supplied label text verbatim inside shadowRoot", async () => {
      el.setAttribute("variant", "active");
      el.setAttribute("label", "Đang áp dụng");
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      const badge = shadow.querySelector(".badge");
      expect(badge).not.toBeNull();
      expect(badge!.textContent?.trim()).toBe("Đang áp dụng");
    });

    it("renders an empty badge when label is not set (no hardcoded fallback text)", async () => {
      el.setAttribute("variant", "active");
      // no label attribute
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      // There should be no hardcoded Vietnamese text
      const badge = shadow.querySelector(".badge");
      expect(badge).not.toBeNull();
      expect(badge!.textContent?.trim()).toBe("");
    });
  });
});
