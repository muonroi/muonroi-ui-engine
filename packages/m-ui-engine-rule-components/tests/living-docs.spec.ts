/**
 * Component spec for mu-living-docs.
 * Tests: render sections from docJson + dispatch living-docs-node-trace-requested event.
 *
 * TDD RED pass — component not yet implemented; tests will fail until Task 1 GREEN.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { DecisionNarrative, LivingDocModel } from "../src/models/living-docs-models.js";
import "../src/components/living-docs/mu-living-docs.js";

function makeDoc(sections: DecisionNarrative[]): LivingDocModel {
  return {
    workflow: "FCD_V4",
    version: 1,
    tenantId: "t1",
    generatedAt: "2026-06-09T00:00:00Z",
    generatedFromVersionHash: "abc123",
    sections,
    factDictionary: [],
    coverage: {
      unitTestLinkedCount: 0,
      dryRunExampleCount: 0,
      noCoverageCount: 0,
      totalNodes: sections.length
    }
  };
}

function makeSection(nodeId: string, title: string): DecisionNarrative {
  return {
    nodeId,
    title,
    inputs: [],
    outputs: [],
    logicProse: `Prose for ${title}`,
    sourceKind: "feel"
  };
}

describe("mu-living-docs", () => {
  let el: HTMLElement & { updateComplete: Promise<boolean>; docJson: string };

  beforeEach(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    el = document.createElement("mu-living-docs") as any;
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it("renders section titles when docJson is set to a 2-section model", async () => {
    const doc = makeDoc([
      makeSection("node-001", "VGM Tolerance Check"),
      makeSection("node-002", "Container Weight Rule")
    ]);
    el.docJson = JSON.stringify(doc);
    await el.updateComplete;

    const shadow = el.shadowRoot!;
    const text = shadow.textContent ?? "";
    expect(text).toContain("VGM Tolerance Check");
    expect(text).toContain("Container Weight Rule");
  });

  it("dispatches living-docs-node-trace-requested with detail.nodeId when trace button clicked", async () => {
    const section = makeSection("node-001", "VGM Tolerance Check");
    const doc = makeDoc([section]);
    el.docJson = JSON.stringify(doc);
    await el.updateComplete;

    let capturedDetail: { nodeId: string } | null = null;
    el.addEventListener("living-docs-node-trace-requested", (e) => {
      capturedDetail = (e as CustomEvent<{ nodeId: string }>).detail;
    });

    const traceBtn = el.shadowRoot!.querySelector<HTMLElement>(".node-trace-btn");
    expect(traceBtn).not.toBeNull();
    traceBtn!.click();

    expect(capturedDetail).not.toBeNull();
    expect(capturedDetail!.nodeId).toBe("node-001");
  });
});
