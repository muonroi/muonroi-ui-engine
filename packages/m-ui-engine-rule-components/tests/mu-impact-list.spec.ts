/**
 * Spec for mu-impact-list (Phase 05, plan 03).
 *
 * Proves (C-01 honesty constraint — T-05-08):
 *   - DryRunExampleOnly case renders badge--info ("Example only"), NEVER badge--success
 *
 * Proves (C-05 / D-11):
 *   - The "trace this rule" affordance dispatches living-docs-node-trace-requested
 *     with detail.nodeId and bubbles+composed
 *
 * Proves (D-05):
 *   - Impact row renders approver and impactType columns
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { ImpactListResponse } from "../src/models/living-docs-models.js";
import "../src/components/impact-list/mu-impact-list.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MuImpactListEl = HTMLElement & {
  updateComplete: Promise<boolean>;
  _data: ImpactListResponse | null;
};

function makeEl(): MuImpactListEl {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = document.createElement("mu-impact-list") as any;
  document.body.appendChild(el);
  return el as MuImpactListEl;
}

const SAMPLE_RESPONSE: ImpactListResponse = {
  workflow: "FCD_V4",
  fromVersion: 1,
  toVersion: 2,
  rows: [
    {
      nodeId: "vgm-check",
      title: "VGM Check",
      requirements: [
        {
          id: "00000000-0000-0000-0000-000000000001",
          title: "VGM Requirement",
          sourceRef: null,
          approver: "John Doe"
        }
      ],
      testCoverage: {
        state: "DryRunExampleOnly",
        exampleId: "abc123",
        unitTestCode: null
      },
      impactType: "allow→block"
    },
    {
      nodeId: "weight-check",
      title: "Weight Check",
      requirements: [],
      testCoverage: {
        state: "UnitTestLinked",
        exampleId: null,
        unitTestCode: "WeightCheckTests.AllowsUnderLimit"
      },
      impactType: "none"
    }
  ],
  uatChecklist: [
    {
      nodeId: "vgm-check",
      title: "VGM Check",
      cases: [
        {
          exampleId: "abc123",
          expectedOutcome: "block",
          coverageBadge: "DryRunExampleOnly"
        }
      ]
    }
  ]
};

async function setData(el: MuImpactListEl, data: ImpactListResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (el as any)._data = data;
  await el.updateComplete;
  await el.updateComplete;
}

// ---------------------------------------------------------------------------
describe("mu-impact-list", () => {
  let el: MuImpactListEl;

  beforeEach(() => {
    el = makeEl();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  // -------------------------------------------------------------------------
  // C-01 / T-05-08: DryRunExampleOnly badge honesty
  // -------------------------------------------------------------------------
  describe("C-01 — DryRunExampleOnly badge honesty", () => {
    it("renders badge--info for DryRunExampleOnly UAT case (never badge--success)", async () => {
      await setData(el, SAMPLE_RESPONSE);

      const shadow = el.shadowRoot!;
      const infoBadges    = shadow.querySelectorAll(".badge--info");
      const successBadges = shadow.querySelectorAll(".badge--success");

      expect(infoBadges.length).toBeGreaterThan(0);
      expect(successBadges.length).toBe(0);
    });

    it("badge--info element contains 'Example only' text for DryRunExampleOnly", async () => {
      await setData(el, SAMPLE_RESPONSE);

      const shadow = el.shadowRoot!;
      const infoBadges = Array.from(shadow.querySelectorAll(".badge--info"));
      const hasExampleOnlyLabel = infoBadges.some(
        (b) => b.textContent?.includes("Example only")
      );
      expect(hasExampleOnlyLabel).toBe(true);
    });

    it("UnitTestLinked row has badge--success", async () => {
      await setData(el, SAMPLE_RESPONSE);

      const shadow = el.shadowRoot!;
      const successBadges = shadow.querySelectorAll(".badge--success");
      expect(successBadges.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // C-05 / D-11: trace-jump CustomEvent
  // -------------------------------------------------------------------------
  describe("C-05 — living-docs-node-trace-requested dispatch", () => {
    it("dispatches living-docs-node-trace-requested with detail.nodeId when trace button is clicked", async () => {
      await setData(el, SAMPLE_RESPONSE);

      let capturedNodeId: string | null = null;
      let capturedBubbles = false;
      let capturedComposed = false;

      el.addEventListener("living-docs-node-trace-requested", (e) => {
        const ce = e as CustomEvent<{ nodeId: string }>;
        capturedNodeId = ce.detail?.nodeId ?? null;
        capturedBubbles = e.bubbles;
        capturedComposed = e.composed;
      });

      const shadow = el.shadowRoot!;
      const traceBtn = shadow.querySelector<HTMLButtonElement>(".trace-btn");
      expect(traceBtn).not.toBeNull();
      traceBtn!.click();

      expect(capturedNodeId).toBe("vgm-check");
      expect(capturedBubbles).toBe(true);
      expect(capturedComposed).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // D-05: Impact list columns — approver + impactType
  // -------------------------------------------------------------------------
  describe("D-05 — impact list columns", () => {
    it("renders the approver for a requirement that has one", async () => {
      await setData(el, SAMPLE_RESPONSE);

      const shadow = el.shadowRoot!;
      const text = shadow.textContent ?? "";
      expect(text).toContain("John Doe");
    });

    it("renders the impactType for an affected rule", async () => {
      await setData(el, SAMPLE_RESPONSE);

      const shadow = el.shadowRoot!;
      const text = shadow.textContent ?? "";
      // "allow→block" uses U+2192
      expect(text).toContain("allow→block");
    });

    it("renders the UAT checklist grouped by rule nodeId", async () => {
      await setData(el, SAMPLE_RESPONSE);

      const shadow = el.shadowRoot!;
      const text = shadow.textContent ?? "";
      expect(text).toContain("VGM Check");
    });
  });
});
