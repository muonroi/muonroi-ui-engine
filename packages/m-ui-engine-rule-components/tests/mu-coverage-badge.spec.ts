/**
 * Spec for mu-coverage-badge (Phase 19, plan 01).
 *
 * Proves:
 *   - covered=true renders badge--covered (success class)
 *   - covered=false renders badge--uncovered — NO badge--covered class (D-08 honesty)
 *   - covered=false: title attribute equals the supplied tooltip
 *   - Zero hardcoded Vietnamese strings (D-18)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "../src/components/coverage-badge/mu-coverage-badge.js";

type MuCoverageBadgeEl = HTMLElement & {
  updateComplete: Promise<boolean>;
  covered: boolean;
  label: string;
  tooltip: string;
};

function makeEl(): MuCoverageBadgeEl {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = document.createElement("mu-coverage-badge") as any;
  document.body.appendChild(el);
  return el as MuCoverageBadgeEl;
}

describe("mu-coverage-badge", () => {
  let el: MuCoverageBadgeEl;

  beforeEach(() => {
    el = makeEl();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  describe("covered=true (D-08 — success tone for tested state)", () => {
    it("renders badge--covered class when covered=true", async () => {
      el.setAttribute("covered", "");
      el.setAttribute("label", "Đã kiểm thử");
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      const badge = shadow.querySelector(".badge--covered");
      expect(badge).not.toBeNull();
    });

    it("badge--uncovered class is ABSENT when covered=true", async () => {
      el.setAttribute("covered", "");
      el.setAttribute("label", "Đã kiểm thử");
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      const badge = shadow.querySelector(".badge--uncovered");
      expect(badge).toBeNull();
    });
  });

  describe("covered=false — D-08 honesty: NEVER green for untested state", () => {
    it("renders badge--uncovered class when covered=false (attribute absent)", async () => {
      el.setAttribute("label", "Chưa kiểm thử");
      // covered not set → false by default
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      const badge = shadow.querySelector(".badge--uncovered");
      expect(badge).not.toBeNull();
    });

    it("badge--covered class is ABSENT when covered=false (D-08 — never green for untested)", async () => {
      el.setAttribute("label", "Chưa kiểm thử");
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      const badge = shadow.querySelector(".badge--covered");
      expect(badge).toBeNull();
    });

    it("title attribute equals the supplied tooltip for uncovered state", async () => {
      const honestTooltip = "Đã kiểm thử nghĩa là có ví dụ thử nghiệm (dry-run) đã chạy — chưa hẳn là có kiểm thử đơn vị (unit test) thực sự.";
      el.setAttribute("label", "Chưa kiểm thử");
      el.setAttribute("tooltip", honestTooltip);
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      const badge = shadow.querySelector(".badge--uncovered");
      expect(badge).not.toBeNull();
      expect(badge!.getAttribute("title")).toBe(honestTooltip);
    });
  });

  describe("label rendering (D-18 — no hardcoded strings)", () => {
    it("renders supplied label verbatim", async () => {
      el.setAttribute("label", "Custom Coverage Label");
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      const badge = shadow.querySelector(".badge");
      expect(badge).not.toBeNull();
      expect(badge!.textContent?.trim()).toBe("Custom Coverage Label");
    });

    it("renders empty when no label provided (no hardcoded Vietnamese fallback)", async () => {
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      const badge = shadow.querySelector(".badge");
      expect(badge).not.toBeNull();
      expect(badge!.textContent?.trim()).toBe("");
    });
  });
});
