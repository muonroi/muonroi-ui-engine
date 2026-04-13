import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useRuleFlowHistory } from "../src/hooks/useRuleFlowHistory";
import type { MRuleFlowGraph } from "../src/models";

const M_BASE_GRAPH: MRuleFlowGraph = {
  metadata: { version: 1, ruleSetCode: "wf.history" },
  nodes: [
    { id: "start", type: "trigger", label: "Start", position: { x: 0, y: 0 }, data: {} },
    { id: "end", type: "end", label: "End", position: { x: 240, y: 0 }, data: {} }
  ],
  edges: []
};

describe("useRuleFlowHistory", () => {
  it("deduplicates identical commits and supports undo/redo", () => {
    const { result } = renderHook(() => useRuleFlowHistory(M_BASE_GRAPH));

    act(() => {
      result.current.commit(M_BASE_GRAPH);
    });
    expect(result.current.canUndo).toBe(false);

    const nextGraph: MRuleFlowGraph = {
      ...M_BASE_GRAPH,
      nodes: [
        ...M_BASE_GRAPH.nodes,
        { id: "rule-a", type: "condition", label: "Rule A", ruleCode: "RULE_A", position: { x: 120, y: 0 }, data: {} }
      ]
    };

    act(() => {
      result.current.commit(nextGraph);
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.present.nodes).toHaveLength(3);

    act(() => {
      result.current.undo();
    });
    expect(result.current.present.nodes).toHaveLength(2);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });
    expect(result.current.present.nodes).toHaveLength(3);
  });
});
