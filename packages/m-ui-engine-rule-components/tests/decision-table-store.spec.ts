import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MDecisionTableModel, MDecisionTableVersionInfo } from "../src/models.js";
import { MCreateDecisionTableStore } from "../src/store/decision-table-store.js";

function MCreateTable(id: string, version: number): MDecisionTableModel {
  return {
    id,
    name: "Decision Table",
    description: "",
    hitPolicy: "First",
    inputColumns: [
      {
        id: "in-1",
        name: "input_1",
        label: "Input 1",
        dataType: "string",
        kind: "input"
      }
    ],
    outputColumns: [
      {
        id: "out-1",
        name: "output_1",
        label: "Output 1",
        dataType: "string",
        kind: "output"
      }
    ],
    rows: [
      {
        id: "row-1",
        order: 0,
        inputCells: [{ columnId: "in-1", expression: "-" }],
        outputCells: [{ columnId: "out-1", expression: "ok" }]
      }
    ],
    version
  };
}

describe("decision table store version history", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads version list from /versions endpoint", async () => {
    const store = MCreateDecisionTableStore();
    store.setState({ table: MCreateTable("table-1", 5) });

    const history: MDecisionTableVersionInfo[] = [
      {
        tableId: "table-1",
        version: 5,
        changeType: "Updated",
        actor: "operator",
        reason: null,
        timestamp: "2026-03-06T09:00:00Z"
      }
    ];

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => history
    } as Response);

    await store.getState().loadHistory("/api/v1/decision-tables/{id}/versions");

    expect(fetchSpy).toHaveBeenCalledWith("/api/v1/decision-tables/table-1/versions");
    expect(store.getState().versionHistory).toEqual(history);
  });

  it("loads and caches snapshot from /versions/{v}", async () => {
    const store = MCreateDecisionTableStore();
    store.setState({
      table: MCreateTable("table-1", 5),
      versionHistory: [
        {
          tableId: "table-1",
          version: 4,
          changeType: "Updated",
          actor: "operator",
          reason: "fix output",
          timestamp: "2026-03-06T08:00:00Z"
        }
      ]
    });

    const versionFour = MCreateTable("table-1", 4);
    versionFour.rows[0].outputCells[0].expression = "legacy";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => versionFour
    } as Response);

    const first = await store.getState().loadVersionSnapshot("/api/v1/decision-tables/{id}/versions/{v}", 4);
    const second = await store.getState().loadVersionSnapshot("/api/v1/decision-tables/{id}/versions/{v}", 4);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith("/api/v1/decision-tables/table-1/versions/4");
    expect(first?.changeType).toBe("Updated");
    expect(first?.table.version).toBe(4);
    expect(second).toBe(first);
  });
});
