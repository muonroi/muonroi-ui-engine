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
});
