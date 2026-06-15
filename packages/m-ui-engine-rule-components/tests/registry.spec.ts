import { describe, expect, it } from "vitest";
import "../src/registry.js";

describe("rule components registry", () => {
  it("registers decision table custom element", () => {
    expect(customElements.get("mu-decision-table")).toBeDefined();
  });

  it("registers decision table list custom element", () => {
    expect(customElements.get("mu-decision-table-list")).toBeDefined();
  });

  it("registers feel playground custom element", () => {
    expect(customElements.get("mu-feel-playground")).toBeDefined();
  });

  // Phase 19 — BA Workspace Shell components
  it("registers mu-document-list custom element", () => {
    expect(customElements.get("mu-document-list")).toBeDefined();
  });

  it("registers mu-ba-status-badge custom element", () => {
    expect(customElements.get("mu-ba-status-badge")).toBeDefined();
  });

  it("registers mu-source-badge custom element", () => {
    expect(customElements.get("mu-source-badge")).toBeDefined();
  });

  it("registers mu-coverage-badge custom element", () => {
    expect(customElements.get("mu-coverage-badge")).toBeDefined();
  });

  it("registers mu-empty-state custom element", () => {
    expect(customElements.get("mu-empty-state")).toBeDefined();
  });
});
