/**
 * Spec for mu-traceability-matrix.
 *
 * Proves (C-02 honesty constraint):
 *   - Three distinct badge classes coexist simultaneously (badge--success / badge--info / badge--warning)
 *   - DryRunExampleOnly is NEVER rendered with badge--success
 *
 * Proves (D-09, D-10, D-11):
 *   - Rows grouped by requirement → two requirement group headers for two requirements
 *   - filter-coverage="None" renders only the None-state row
 *   - filterRule set to a nodeId renders only that node's row
 *   - Clicking a filter button dispatches "matrix-filter-change" with detail.coverage
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { TraceabilityMatrixRow } from "../src/models/living-docs-models.js";
import type { MuTraceabilityMatrix } from "../src/components/traceability-matrix/mu-traceability-matrix.js";
import "../src/components/traceability-matrix/mu-traceability-matrix.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRow(
  nodeId: string,
  title: string,
  state: TraceabilityMatrixRow["testCoverage"]["state"],
  requirementIds: string[]
): TraceabilityMatrixRow {
  return {
    nodeId,
    title,
    nodeType: "feel",
    requirements: requirementIds.map((id) => ({ requirementId: id, title: `Req ${id}` })),
    testCoverage: { state }
  };
}

/** Build a component instance, append to body, and return it. */
function makeMatrix(): MuTraceabilityMatrix & {
  updateComplete: Promise<boolean>;
  filterRule: string;
  filterCoverage: string;
  _activeCoverageFilter: string;
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = document.createElement("mu-traceability-matrix") as any;
  document.body.appendChild(el);
  return el;
}

// ---------------------------------------------------------------------------
// Three rows — one of each coverage state — across two requirements
// ---------------------------------------------------------------------------
const ROW_UNIT_TESTED = makeRow("VGM_CHECK", "VGM Check", "UnitTestLinked", ["REQ-01"]);
const ROW_DRY_RUN    = makeRow("WEIGHT_CHECK", "Weight Check", "DryRunExampleOnly", ["REQ-02"]);
const ROW_NONE       = makeRow("CUSTOMS_CHECK", "Customs Check", "None", ["REQ-01", "REQ-02"]);

async function setRows(el: ReturnType<typeof makeMatrix>, rows: TraceabilityMatrixRow[]) {
  // Bypass the API call by directly setting the internal state property.
  // The component exposes _rows as @state so we can force it via Object.assign.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (el as any)._rows = rows;
  await el.updateComplete;
  await el.updateComplete;
}

// ---------------------------------------------------------------------------
describe("mu-traceability-matrix", () => {
  let el: ReturnType<typeof makeMatrix>;

  beforeEach(() => {
    el = makeMatrix();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  // -------------------------------------------------------------------------
  // C-02: Three distinct badge classes
  // -------------------------------------------------------------------------
  describe("C-02 — three distinct coverage badges", () => {
    it("renders badge--success, badge--info, and badge--warning simultaneously (three distinct classes)", async () => {
      await setRows(el, [ROW_UNIT_TESTED, ROW_DRY_RUN, ROW_NONE]);

      const shadow = el.shadowRoot!;
      const successBadges = shadow.querySelectorAll(".badge--success");
      const infoBadges    = shadow.querySelectorAll(".badge--info");
      const warningBadges = shadow.querySelectorAll(".badge--warning");

      expect(successBadges.length).toBeGreaterThan(0);
      expect(infoBadges.length).toBeGreaterThan(0);
      expect(warningBadges.length).toBeGreaterThan(0);
    });

    it("DryRunExampleOnly row has badge--info and NOT badge--success", async () => {
      await setRows(el, [ROW_DRY_RUN]);

      const shadow = el.shadowRoot!;
      const infoBadges    = shadow.querySelectorAll(".badge--info");
      const successBadges = shadow.querySelectorAll(".badge--success");

      expect(infoBadges.length).toBeGreaterThan(0);
      expect(successBadges.length).toBe(0);
    });

    it("UnitTestLinked row has badge--success and NOT badge--info", async () => {
      await setRows(el, [ROW_UNIT_TESTED]);

      const shadow = el.shadowRoot!;
      const successBadges = shadow.querySelectorAll(".badge--success");
      const infoBadges    = shadow.querySelectorAll(".badge--info");

      expect(successBadges.length).toBeGreaterThan(0);
      expect(infoBadges.length).toBe(0);
    });

    it("None row has badge--warning and NOT badge--success or badge--info", async () => {
      await setRows(el, [ROW_NONE]);

      const shadow = el.shadowRoot!;
      const warningBadges = shadow.querySelectorAll(".badge--warning");
      const successBadges = shadow.querySelectorAll(".badge--success");
      const infoBadges    = shadow.querySelectorAll(".badge--info");

      expect(warningBadges.length).toBeGreaterThan(0);
      expect(successBadges.length).toBe(0);
      expect(infoBadges.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // D-09: Grouping by requirement
  // -------------------------------------------------------------------------
  describe("D-09 — grouped by requirement", () => {
    it("renders two requirement group headers for rows across two requirements", async () => {
      await setRows(el, [ROW_UNIT_TESTED, ROW_DRY_RUN, ROW_NONE]);

      const shadow = el.shadowRoot!;
      // REQ-01 and REQ-02 should appear as group headers
      const headers = shadow.querySelectorAll(".matrix-req-title");
      const headerIds = Array.from(headers).map((h) => h.textContent ?? "");

      const hasReq01 = headerIds.some((t) => t.includes("REQ-01"));
      const hasReq02 = headerIds.some((t) => t.includes("REQ-02"));
      expect(hasReq01).toBe(true);
      expect(hasReq02).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // D-10: Coverage-state filter
  // -------------------------------------------------------------------------
  describe("D-10 — coverage filter", () => {
    it("filter-coverage=None renders only the None-state row", async () => {
      await setRows(el, [ROW_UNIT_TESTED, ROW_DRY_RUN, ROW_NONE]);

      el.filterCoverage = "none";
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      // Only the None badge should be present; success and info badges gone
      const warningBadges = shadow.querySelectorAll(".badge--warning");
      const successBadges = shadow.querySelectorAll(".badge--success");
      const infoBadges    = shadow.querySelectorAll(".badge--info");

      expect(warningBadges.length).toBeGreaterThan(0);
      expect(successBadges.length).toBe(0);
      expect(infoBadges.length).toBe(0);
    });

    it("clicking 'No coverage' filter button dispatches matrix-filter-change with detail.coverage='none'", async () => {
      await setRows(el, [ROW_UNIT_TESTED, ROW_DRY_RUN, ROW_NONE]);

      let capturedCoverage: string | null = null;
      el.addEventListener("matrix-filter-change", (e) => {
        capturedCoverage = (e as CustomEvent<{ coverage: string }>).detail.coverage;
      });

      const shadow = el.shadowRoot!;
      const filterBtns = shadow.querySelectorAll<HTMLButtonElement>(".filter-btn");
      // "No coverage" is the second button (index 1) — first explicit filter (D-10)
      const noCoverageBtn = Array.from(filterBtns).find(
        (btn) => btn.textContent?.trim() === "No coverage"
      );
      expect(noCoverageBtn).not.toBeUndefined();
      noCoverageBtn!.click();

      expect(capturedCoverage).toBe("none");
    });

    it("clicking 'Example only' filter button dispatches matrix-filter-change with detail.coverage='dry-run-example-only'", async () => {
      await setRows(el, [ROW_UNIT_TESTED, ROW_DRY_RUN, ROW_NONE]);

      let capturedCoverage: string | null = null;
      el.addEventListener("matrix-filter-change", (e) => {
        capturedCoverage = (e as CustomEvent<{ coverage: string }>).detail.coverage;
      });

      const shadow = el.shadowRoot!;
      const filterBtns = shadow.querySelectorAll<HTMLButtonElement>(".filter-btn");
      const btn = Array.from(filterBtns).find(
        (b) => b.textContent?.trim() === "Example only"
      );
      expect(btn).not.toBeUndefined();
      btn!.click();

      expect(capturedCoverage).toBe("dry-run-example-only");
    });

    it("filter-coverage=dry-run-example-only renders only the DryRunExampleOnly row", async () => {
      await setRows(el, [ROW_UNIT_TESTED, ROW_DRY_RUN, ROW_NONE]);

      el.filterCoverage = "dry-run-example-only";
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      const infoBadges    = shadow.querySelectorAll(".badge--info");
      const successBadges = shadow.querySelectorAll(".badge--success");
      const warningBadges = shadow.querySelectorAll(".badge--warning");

      expect(infoBadges.length).toBeGreaterThan(0);
      expect(successBadges.length).toBe(0);
      expect(warningBadges.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // D-11: filter-rule pre-filter
  // -------------------------------------------------------------------------
  describe("D-11 — filter-rule pre-filter", () => {
    it("filterRule=VGM_CHECK renders only the VGM_CHECK node row", async () => {
      await setRows(el, [ROW_UNIT_TESTED, ROW_DRY_RUN, ROW_NONE]);

      el.filterRule = "VGM_CHECK";
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      // Only badge--success should appear (VGM_CHECK is UnitTestLinked)
      const successBadges = shadow.querySelectorAll(".badge--success");
      const infoBadges    = shadow.querySelectorAll(".badge--info");
      const warningBadges = shadow.querySelectorAll(".badge--warning");

      expect(successBadges.length).toBeGreaterThan(0);
      expect(infoBadges.length).toBe(0);
      expect(warningBadges.length).toBe(0);
    });

    it("filterRule=CUSTOMS_CHECK renders only the CUSTOMS_CHECK node row", async () => {
      await setRows(el, [ROW_UNIT_TESTED, ROW_DRY_RUN, ROW_NONE]);

      el.filterRule = "CUSTOMS_CHECK";
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      // Only badge--warning should appear (CUSTOMS_CHECK is None)
      const warningBadges = shadow.querySelectorAll(".badge--warning");
      const successBadges = shadow.querySelectorAll(".badge--success");
      const infoBadges    = shadow.querySelectorAll(".badge--info");

      expect(warningBadges.length).toBeGreaterThan(0);
      expect(successBadges.length).toBe(0);
      expect(infoBadges.length).toBe(0);
    });
  });
});
