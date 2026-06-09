import { beforeEach, describe, expect, it, vi } from "vitest";
import { MCreateLivingDocsStore } from "../src/store/living-docs-store.js";
import type { LivingDocModel } from "../src/models/living-docs-models.js";

function makeDoc(workflow: string, version: number): LivingDocModel {
  return {
    workflow,
    version,
    tenantId: "tenant-test",
    generatedAt: "2026-06-09T00:00:00Z",
    generatedFromVersionHash: "abc123",
    sections: [],
    factDictionary: [],
    coverage: {
      unitTestLinkedCount: 0,
      dryRunExampleCount: 0,
      noCoverageCount: 0,
      totalNodes: 0
    }
  };
}

describe("living-docs-store", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads doc JSON and sets doc state on success", async () => {
    const store = MCreateLivingDocsStore();
    const doc = makeDoc("FCD_V4", 1);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => doc
      })
    );

    await store.getState().loadDoc("http://api", "FCD_V4", 1);

    expect(store.getState().doc?.workflow).toBe("FCD_V4");
    expect(store.getState().doc?.version).toBe(1);
    expect(store.getState().isLoading).toBe(false);
    expect(store.getState().error).toBeNull();
  });

  it("throws and sets error state when fetch returns non-ok response", async () => {
    const store = MCreateLivingDocsStore();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404
      })
    );

    await expect(store.getState().loadDoc("http://api", "FCD_V4", 99)).rejects.toThrow();

    expect(store.getState().doc).toBeNull();
    expect(store.getState().isLoading).toBe(false);
    expect(store.getState().error).not.toBeNull();
  });

  it("setPendingVersion sets pendingVersion state", () => {
    const store = MCreateLivingDocsStore();
    store.getState().setPendingVersion(5);
    expect(store.getState().pendingVersion).toBe(5);
    store.getState().setPendingVersion(null);
    expect(store.getState().pendingVersion).toBeNull();
  });

  it("clearError nulls the error field", () => {
    const store = MCreateLivingDocsStore();
    store.setState({ error: "some error" });
    store.getState().clearError();
    expect(store.getState().error).toBeNull();
  });
});
