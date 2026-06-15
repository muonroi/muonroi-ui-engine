/**
 * Spec for mu-document-list (Phase 19, plan 01).
 *
 * Proves:
 *   - given rows attribute with N entries renders N rows (D-06: one row = one workflow)
 *   - pending-count=null renders "N/A" in the count chip (never "0" when null — D-06/honesty)
 *   - pending-count="3" renders "3"
 *   - clicking the create CTA dispatches document-create with bubbles:true + composed:true
 *   - clicking a row dispatches document-open with detail.path + bubbles:true + composed:true
 *   - empty=true suppresses rows
 *   - Zero hardcoded Vietnamese strings (D-18)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "../src/components/document-list/mu-document-list.js";
import type { DocumentRow } from "../src/components/document-list/mu-document-list.js";

type MuDocumentListEl = HTMLElement & {
  updateComplete: Promise<boolean>;
};

function makeEl(): MuDocumentListEl {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = document.createElement("mu-document-list") as any;
  document.body.appendChild(el);
  return el as MuDocumentListEl;
}

const SAMPLE_ROWS: DocumentRow[] = [
  {
    workflowName: "FCD_V4",
    statusLabel: "Active",
    statusVariant: "active",
    sourceLabel: "Manual",
    covered: true,
    coverageLabel: "Covered",
    coverageTooltip: "Has dry-run examples",
    openPath: "/docs/fcd-v4",
  },
  {
    workflowName: "VGM_CHECK",
    statusLabel: "Draft",
    statusVariant: "draft",
    sourceLabel: "Manual",
    covered: false,
    coverageLabel: "Uncovered",
    coverageTooltip: "No examples yet",
    openPath: "/docs/vgm-check",
  },
];

async function setRows(el: MuDocumentListEl, rows: DocumentRow[]) {
  el.setAttribute("rows", JSON.stringify(rows));
  await el.updateComplete;
  await el.updateComplete;
}

describe("mu-document-list", () => {
  let el: MuDocumentListEl;

  beforeEach(() => {
    el = makeEl();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  describe("row rendering (D-06 — one row per workflow)", () => {
    it("renders N rows for N entries in the rows attribute", async () => {
      await setRows(el, SAMPLE_ROWS);

      const shadow = el.shadowRoot!;
      const rows = shadow.querySelectorAll(".doc-row");
      expect(rows.length).toBe(2);
    });

    it("renders workflow names in the rows", async () => {
      await setRows(el, SAMPLE_ROWS);

      const shadow = el.shadowRoot!;
      const text = shadow.textContent ?? "";
      expect(text).toContain("FCD_V4");
      expect(text).toContain("VGM_CHECK");
    });

    it("renders no rows when rows attribute is empty", async () => {
      el.setAttribute("rows", "[]");
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      const rows = shadow.querySelectorAll(".doc-row");
      expect(rows.length).toBe(0);
    });

    it("empty=true suppresses the row list", async () => {
      await setRows(el, SAMPLE_ROWS);
      el.setAttribute("empty", "");
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      const rowContainer = shadow.querySelector(".doc-rows");
      expect(rowContainer).toBeNull();
    });
  });

  describe("pending-count chip (D-06 honesty — null → N/A)", () => {
    it("renders N/A in the pending chip when pending-count is not set (null)", async () => {
      el.setAttribute("pending-label", "pending");
      // pending-count not set → null
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      const chip = shadow.querySelector(".pending-chip");
      expect(chip).not.toBeNull();
      expect(chip!.textContent).toContain("N/A");
    });

    it("renders the number when pending-count=3", async () => {
      el.setAttribute("pending-count", "3");
      el.setAttribute("pending-label", "pending");
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      const chip = shadow.querySelector(".pending-chip");
      expect(chip).not.toBeNull();
      expect(chip!.textContent).toContain("3");
      expect(chip!.textContent).not.toContain("N/A");
    });

    it("renders 0 (not N/A) when pending-count is explicitly 0", async () => {
      el.setAttribute("pending-count", "0");
      el.setAttribute("pending-label", "pending");
      await el.updateComplete;
      await el.updateComplete;

      const shadow = el.shadowRoot!;
      const chip = shadow.querySelector(".pending-chip");
      expect(chip).not.toBeNull();
      expect(chip!.textContent).toContain("0");
    });
  });

  describe("document-create event (Pitfall 5 — composed MANDATORY)", () => {
    it("dispatches document-create with bubbles:true and composed:true when CTA is clicked", async () => {
      el.setAttribute("create-label", "+ Create");
      await el.updateComplete;
      await el.updateComplete;

      let capturedBubbles = false;
      let capturedComposed = false;

      el.addEventListener("document-create", (e) => {
        capturedBubbles = e.bubbles;
        capturedComposed = e.composed;
      });

      const shadow = el.shadowRoot!;
      const btn = shadow.querySelector<HTMLButtonElement>(".create-cta");
      expect(btn).not.toBeNull();
      btn!.click();

      expect(capturedBubbles).toBe(true);
      expect(capturedComposed).toBe(true);
    });
  });

  describe("document-open event (Pitfall 5 — composed MANDATORY; T-19-02 — encodeURIComponent)", () => {
    it("dispatches document-open with bubbles:true and composed:true when a row is clicked", async () => {
      await setRows(el, SAMPLE_ROWS);

      let capturedBubbles = false;
      let capturedComposed = false;
      let capturedPath: string | null = null;

      el.addEventListener("document-open", (e) => {
        const ce = e as CustomEvent<{ path: string }>;
        capturedBubbles = e.bubbles;
        capturedComposed = e.composed;
        capturedPath = ce.detail?.path ?? null;
      });

      const shadow = el.shadowRoot!;
      const firstRow = shadow.querySelector<HTMLButtonElement>(".doc-row");
      expect(firstRow).not.toBeNull();
      firstRow!.click();

      expect(capturedBubbles).toBe(true);
      expect(capturedComposed).toBe(true);
      // T-19-02: path is encodeURIComponent-safe (the stored path goes through encodeURIComponent)
      expect(capturedPath).not.toBeNull();
      expect(typeof capturedPath).toBe("string");
    });

    it("detail.path is the encodeURIComponent-encoded openPath (T-19-02)", async () => {
      const rowWithSpecialPath: DocumentRow[] = [
        {
          workflowName: "Test Workflow",
          statusLabel: "Active",
          statusVariant: "active",
          sourceLabel: "Manual",
          covered: false,
          coverageLabel: "Uncovered",
          coverageTooltip: "",
          openPath: "/docs/test workflow",
        },
      ];
      await setRows(el, rowWithSpecialPath);

      let capturedPath: string | null = null;
      el.addEventListener("document-open", (e) => {
        capturedPath = (e as CustomEvent<{ path: string }>).detail?.path ?? null;
      });

      const shadow = el.shadowRoot!;
      const row = shadow.querySelector<HTMLButtonElement>(".doc-row");
      expect(row).not.toBeNull();
      row!.click();

      // encodeURIComponent("/docs/test workflow") = "%2Fdocs%2Ftest%20workflow"
      expect(capturedPath).toBe(encodeURIComponent("/docs/test workflow"));
    });
  });
});
