import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MLicenseVerifier } from "@muonroi/ui-engine-core";
import { MuRuleFlowEditor, MEnsureRuleFlowGraph } from "../src/components/rule-flow/MuRuleFlowEditor";
import type { MRuleFlowGraph } from "../src/models";
import { MGetReactFlowTestState, MResetReactFlowTestState } from "./stubs/xyflow-react";
import "../src/components/rule-flow/mu-rule-flow-designer";
import { MConfigureRuleComponentRuntime, MResetRuleComponentRuntimeForTests } from "../src/runtime/request-context";
import type { LitElement } from "lit";

const M_GRAPH: MRuleFlowGraph = {
  nodes: [
    {
      id: "trigger-start",
      type: "trigger",
      label: "Start",
      position: { x: 80, y: 180 },
      data: {}
    },
    {
      id: "rule-1",
      type: "condition",
      label: "RULE_A",
      ruleCode: "RULE_A",
      position: { x: 280, y: 180 },
      data: {}
    },
    {
      id: "end-success",
      type: "end",
      label: "Complete",
      position: { x: 500, y: 180 },
      data: {}
    }
  ],
  edges: [
    {
      id: "edge-1",
      source: "trigger-start",
      target: "rule-1",
      edgeType: "always",
      label: "always"
    },
    {
      id: "edge-2",
      source: "rule-1",
      target: "end-success",
      edgeType: "always",
      label: "always"
    }
  ],
  metadata: {
    version: 1,
    ruleSetCode: "wf.new"
  }
};

describe("rule flow editor", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({}), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    MLicenseVerifier.MResetForTests();
    MResetRuleComponentRuntimeForTests();
    MResetReactFlowTestState();
    document.body.innerHTML = "";
  });

  it("normalizes invalid graph input", () => {
    const graph = MEnsureRuleFlowGraph({
      nodes: [{ id: "", type: "oops", position: {}, data: null }]
    });

    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].type).toBe("action");
    expect(graph.metadata.version).toBe(1);
  });

  it("renders nodes from graph prop", () => {
    render(<MuRuleFlowEditor graph={M_GRAPH} />);

    expect(screen.getByTestId("xy-node-trigger-start")).toBeTruthy();
    expect(screen.getByText("RULE_A")).toBeTruthy();
  });

  it("emits graph changes when a node is added", () => {
    const onGraphChange = vi.fn();
    render(<MuRuleFlowEditor graph={M_GRAPH} onGraphChange={onGraphChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Action" }));

    expect(onGraphChange).toHaveBeenCalled();
    const latestGraph = onGraphChange.mock.calls.at(-1)?.[0] as MRuleFlowGraph;
    expect(latestGraph.nodes.some((node) => node.type === "action")).toBe(true);
  });

  it("keeps palette buttons disabled in read only mode", () => {
    render(<MuRuleFlowEditor graph={M_GRAPH} readOnly />);

    expect(screen.getByRole("button", { name: "Condition" }).hasAttribute("disabled")).toBe(true);
  });

  it("shows a local fallback when license status is unlicensed", () => {
    render(<MuRuleFlowEditor graph={M_GRAPH} licenseStatus="unlicensed" />);

    expect(screen.getByText(/requires a Muonroi commercial license/i)).toBeTruthy();
  });

  it("renders the license gate for the web component when the verifier blocks access", async () => {
    vi.spyOn(MLicenseVerifier, "hasAnyFeature").mockReturnValue(false);
    const element = document.createElement("mu-rule-flow-designer") as LitElement;
    document.body.appendChild(element);
    await element.updateComplete;

    expect(element.shadowRoot?.textContent).toContain("License required");
  });

  it("mounts the editor inside the web component when the verifier allows access", async () => {
    vi.spyOn(MLicenseVerifier, "hasAnyFeature").mockReturnValue(true);
    const element = document.createElement("mu-rule-flow-designer") as LitElement & { graph: MRuleFlowGraph };
    element.graph = M_GRAPH;
    document.body.appendChild(element);
    await element.updateComplete;

    await waitFor(() => {
      expect(element.shadowRoot?.querySelector("[data-testid='xyflow-root']")).toBeTruthy();
    });
  });

  it("dispatches graph-change from the web component", async () => {
    vi.spyOn(MLicenseVerifier, "hasAnyFeature").mockReturnValue(true);
    const element = document.createElement("mu-rule-flow-designer") as LitElement & { graph: MRuleFlowGraph };
    element.graph = M_GRAPH;
    const handler = vi.fn();
    element.addEventListener("graph-change", handler as EventListener);
    document.body.appendChild(element);
    await element.updateComplete;

    await waitFor(() => {
      expect(Array.from(element.shadowRoot?.querySelectorAll("button") ?? []).some((candidate) => candidate.textContent?.includes("Action"))).toBe(
        true
      );
    });

    const button = Array.from(element.shadowRoot?.querySelectorAll("button") ?? []).find((candidate) => candidate.textContent?.includes("Action"));
    fireEvent.click(button!);

    await waitFor(() => {
      expect(handler).toHaveBeenCalled();
    });
  });

  it("loads workflow export with tenant-aware headers", async () => {
    vi.spyOn(MLicenseVerifier, "hasAnyFeature").mockReturnValue(true);
    MConfigureRuleComponentRuntime({ tenantId: "tenant-a" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ruleSetJson: JSON.stringify({
            workflowName: "FCD-CreateV2-Rules",
            rules: ["FCD_V2_TAX_VALID"]
          })
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    const element = document.createElement("mu-rule-flow-designer") as LitElement & {
      apiBaseUrl: string;
      workflowCode: string;
    };
    element.apiBaseUrl = "http://localhost:5000/api/v1/control-plane";
    element.workflowCode = "FCD-CreateV2-Rules";
    document.body.appendChild(element);
    await element.updateComplete;

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:5000/api/v1/control-plane/rulesets/FCD-CreateV2-Rules/export");
    expect(new Headers(init?.headers).get("x-tenant-id")).toBe("tenant-a");
  });

  it("does not trigger viewport refit when a dragged node commits its new position", async () => {
    render(<MuRuleFlowEditor graph={M_GRAPH} />);
    MResetReactFlowTestState();
    const state = MGetReactFlowTestState();
    state.lastProps?.onMoveStart?.();
    state.lastProps?.onNodesChange?.([
      {
        id: "rule-1",
        type: "position",
        position: { x: 320, y: 180 },
        dragging: false
      } as never
    ]);

    await new Promise((resolve) => window.setTimeout(resolve, 450));
    expect(MGetReactFlowTestState().fitViewCalls).toBe(0);
  });

  it("disables publish when validation errors exist", () => {
    const invalidGraph: MRuleFlowGraph = {
      metadata: { version: 1, ruleSetCode: "wf.invalid" },
      nodes: [
        { id: "start", type: "trigger", label: "Start", position: { x: 0, y: 0 }, data: {} },
        { id: "sub", type: "sub-flow", label: "Child Flow", ruleCode: "RULE_SUB", position: { x: 140, y: 0 }, data: { subFlowConfig: { targetFlowCode: "child-flow", inputMappings: [], outputMappings: [], childTriggerSchema: { contractName: "child-trigger", fields: [{ path: "orderId", label: "orderId", dataType: "string", required: true }] } } } },
        { id: "end", type: "end", label: "End", position: { x: 280, y: 0 }, data: {} }
      ],
      edges: [
        { id: "e1", source: "start", target: "sub", edgeType: "always" },
        { id: "e2", source: "sub", target: "end", edgeType: "always" }
      ]
    };

    render(<MuRuleFlowEditor graph={invalidGraph} onPublish={vi.fn()} />);

    const publishButton = screen.getByRole("button", { name: "Publish" });
    expect(publishButton.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/publish blocked/i)).toBeTruthy();
  });
});
