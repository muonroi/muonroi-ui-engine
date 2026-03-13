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
    expect(screen.getByTestId("xy-node-rule-1").textContent).toContain("RULE_A");
  });

  it("emits graph changes when a node is added", () => {
    const onGraphChange = vi.fn();
    render(<MuRuleFlowEditor graph={M_GRAPH} onGraphChange={onGraphChange} />);

    fireEvent.click(screen.getByRole("button", { name: /palette compose and add nodes/i }));
    fireEvent.click(screen.getByTestId("palette-action"));

    expect(onGraphChange).toHaveBeenCalled();
    const latestGraph = onGraphChange.mock.calls.at(-1)?.[0] as MRuleFlowGraph;
    expect(latestGraph.nodes.some((node) => node.type === "action")).toBe(true);
  });

  it("loads catalog rules and adds a rule-backed condition node", async () => {
    const onGraphChange = vi.fn();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.startsWith("http://localhost:5000/api/v1/rule-catalog")) {
        return new Response(
          JSON.stringify([
            {
              category: "Shipping",
              items: [
                {
                  code: "FCD_V2_LINER_VALID",
                  displayName: "Validate Liner Code",
                  tags: ["liner", "validation"],
                  description: "Checks liner code against registry."
                }
              ]
            }
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.endsWith("/rulesets")) {
        return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      if (url.endsWith("/decision-tables")) {
        return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
    });

    render(
      <MuRuleFlowEditor
        graph={M_GRAPH}
        onGraphChange={onGraphChange}
        apiBaseUrl="http://localhost:5000/api/v1/control-plane"
        catalogApiBase="http://localhost:5000/api/v1/rule-catalog"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /palette compose and add nodes/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /validate liner code/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /validate liner code/i }));

    await waitFor(() => {
      expect(onGraphChange).toHaveBeenCalled();
    });

    const latestGraph = onGraphChange.mock.calls.at(-1)?.[0] as MRuleFlowGraph;
    const addedRule = latestGraph.nodes.find((node) => node.ruleCode === "FCD_V2_LINER_VALID");
    expect(addedRule?.type).toBe("condition");
    expect(addedRule?.label).toBe("Validate Liner Code");
    expect(addedRule?.data.contractRef?.sourceCode).toBe("FCD_V2_LINER_VALID");
  });

  it("keeps palette buttons disabled in read only mode", () => {
    render(<MuRuleFlowEditor graph={M_GRAPH} readOnly />);

    fireEvent.click(screen.getByRole("button", { name: /palette compose and add nodes/i }));
    expect(screen.getByTestId("palette-condition").hasAttribute("disabled")).toBe(true);
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
      expect(Array.from(element.shadowRoot?.querySelectorAll("button") ?? []).some((candidate) => candidate.textContent?.includes("Palette"))).toBe(
        true
      );
    });

    const paletteButton = Array.from(element.shadowRoot?.querySelectorAll("button") ?? []).find((candidate) => candidate.textContent?.includes("Palette"));
    fireEvent.click(paletteButton!);
    const actionButton = element.shadowRoot?.querySelector("[data-testid='palette-action']") as HTMLButtonElement;
    fireEvent.click(actionButton!);

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

    fireEvent.click(screen.getByRole("button", { name: /actions undo, import, export and publish/i }));
    const publishButton = screen.getByRole("button", { name: "Publish" });
    expect(publishButton.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/publish blocked/i)).toBeTruthy();
  });

  it("lets authors change edge routing inside the library editor", () => {
    const onGraphChange = vi.fn();
    render(<MuRuleFlowEditor graph={M_GRAPH} onGraphChange={onGraphChange} />);

    fireEvent.click(screen.getByTestId("xy-edge-edge-2"));
    expect(screen.getByText(/edge routing/i)).toBeTruthy();

    fireEvent.change(screen.getByDisplayValue("Always"), {
      target: { value: "on-true" }
    });

    const latestGraph = onGraphChange.mock.calls.at(-1)?.[0] as MRuleFlowGraph;
    expect(latestGraph.edges.find((edge) => edge.id === "edge-2")?.edgeType).toBe("on-true");
  });

  it("selects the referenced node when a dependency chip is clicked", async () => {
    const graph: MRuleFlowGraph = {
      metadata: { version: 1, ruleSetCode: "wf.depends" },
      nodes: [
        { id: "start", type: "trigger", label: "Start", position: { x: 0, y: 0 }, data: {} },
        { id: "rule-a", type: "condition", label: "Rule A", ruleCode: "RULE_A", position: { x: 120, y: 0 }, data: {} },
        { id: "rule-b", type: "condition", label: "Rule B", ruleCode: "RULE_B", position: { x: 240, y: 0 }, data: { dependsOn: ["RULE_A"], order: 2 } },
        { id: "end", type: "end", label: "End", position: { x: 360, y: 0 }, data: {} }
      ],
      edges: [
        { id: "e1", source: "start", target: "rule-a", edgeType: "always" },
        { id: "e2", source: "rule-a", target: "rule-b", edgeType: "always" },
        { id: "e3", source: "rule-b", target: "end", edgeType: "always" }
      ]
    };

    render(<MuRuleFlowEditor graph={graph} />);

    fireEvent.click(screen.getByTestId("xy-node-rule-b"));
    fireEvent.click(screen.getByRole("button", { name: "General" }));
    expect(screen.getByDisplayValue("Rule B")).toBeTruthy();

    fireEvent.click(screen.getByTestId("depends-chip-RULE_A"));

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: "General" }));
      expect(screen.getByDisplayValue("Rule A")).toBeTruthy();
    });
  });

  it("renders the dependency overlay and auto-layouts the graph on demand", async () => {
    const onGraphChange = vi.fn();
    const graph: MRuleFlowGraph = {
      metadata: { version: 1, ruleSetCode: "wf.layout" },
      nodes: [
        { id: "start", type: "trigger", label: "Start", position: { x: 0, y: 0 }, data: {} },
        { id: "rule-a", type: "condition", label: "Rule A", ruleCode: "RULE_A", position: { x: 400, y: 320 }, data: { order: 1 } },
        { id: "rule-b", type: "condition", label: "Rule B", ruleCode: "RULE_B", position: { x: 120, y: 40 }, data: { dependsOn: ["RULE_A"], order: 2 } },
        { id: "end", type: "end", label: "End", position: { x: 520, y: 40 }, data: {} }
      ],
      edges: [
        { id: "e1", source: "start", target: "rule-a", edgeType: "always" },
        { id: "e2", source: "rule-a", target: "rule-b", edgeType: "always" },
        { id: "e3", source: "rule-b", target: "end", edgeType: "always" }
      ]
    };

    render(<MuRuleFlowEditor graph={graph} onGraphChange={onGraphChange} />);

    expect(screen.getByTestId("rule-flow-dependency-overlay")).toBeTruthy();
    expect(screen.getByTestId("dependency-overlay-RULE_A")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /actions undo, import, export and publish the current flow/i }));
    fireEvent.click(screen.getByRole("button", { name: "Auto Layout" }));

    await waitFor(() => {
      expect(onGraphChange).toHaveBeenCalled();
    });

    const latestGraph = onGraphChange.mock.calls.at(-1)?.[0] as MRuleFlowGraph;
    const autoLaidRuleA = latestGraph.nodes.find((node) => node.id === "rule-a");
    const autoLaidRuleB = latestGraph.nodes.find((node) => node.id === "rule-b");
    expect(autoLaidRuleA?.position).toEqual({ x: 340, y: 120 });
    expect(autoLaidRuleB?.position).toEqual({ x: 600, y: 120 });
  });

  it("shows tailored decision table schema details in the inspector", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/decision-tables")) {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: "fees-v1",
                name: "Fees Table",
                hitPolicy: "FIRST",
                inputColumns: [{ id: "country", name: "country", label: "Country", dataType: "string", kind: "input" }],
                outputColumns: [{ id: "fee", name: "fee", label: "Fee", dataType: "number", kind: "output" }],
                rows: [],
                version: 3
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.endsWith("/decision-tables/fees-v1")) {
        return new Response(
          JSON.stringify({
            id: "fees-v1",
            name: "Fees Table",
            description: "Calculates shipping fees.",
            hitPolicy: "FIRST",
            inputColumns: [{ id: "country", name: "country", label: "Country", dataType: "string", kind: "input" }],
            outputColumns: [{ id: "fee", name: "fee", label: "Fee", dataType: "number", kind: "output" }],
            rows: [],
            version: 3
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/rulesets")) {
        return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
    });

    const graph: MRuleFlowGraph = {
      metadata: { version: 1, ruleSetCode: "wf.dt" },
      nodes: [
        { id: "start", type: "trigger", label: "Start", position: { x: 0, y: 0 }, data: {} },
        {
          id: "dt-1",
          type: "decision-table",
          label: "Fees Table",
          ruleCode: "fees-v1",
          position: { x: 140, y: 0 },
          data: {
            contractRef: {
              sourceType: "decision-table",
              sourceCode: "fees-v1",
              label: "Fees Table"
            }
          }
        },
        { id: "end", type: "end", label: "End", position: { x: 280, y: 0 }, data: {} }
      ],
      edges: [
        { id: "e1", source: "start", target: "dt-1", edgeType: "always" },
        { id: "e2", source: "dt-1", target: "end", edgeType: "always" }
      ]
    };

    render(<MuRuleFlowEditor graph={graph} apiBaseUrl="http://localhost:5000/api/v1/control-plane" />);

    fireEvent.click(screen.getByTestId("xy-node-dt-1"));
    fireEvent.click(screen.getByRole("button", { name: "General" }));

    await waitFor(() => {
      const overview = screen.getByTestId("decision-table-overview");
      expect(overview).toBeTruthy();
      expect(overview.textContent).toContain("Fees Table");
      expect(overview.textContent).toContain("hit policy FIRST");
      expect(overview.textContent).toContain("Country (string)");
      expect(overview.textContent).toContain("Fee (number)");
    });
  });

  it("requires explicit confirmation before publishing from the editor", async () => {
    const onPublish = vi.fn().mockResolvedValue(undefined);
    render(<MuRuleFlowEditor graph={M_GRAPH} onPublish={onPublish} />);

    fireEvent.click(screen.getByRole("button", { name: /actions undo, import, export and publish the current flow/i }));
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    expect(onPublish).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: /confirm publish/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Confirm Publish" }));

    await waitFor(() => {
      expect(onPublish).toHaveBeenCalledTimes(1);
    });
  });

  it("publishes via save plus submit when approval workflow is enabled", async () => {
    vi.spyOn(MLicenseVerifier, "hasAnyFeature").mockReturnValue(true);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/rulesets/FCD-CreateV2-Rules/export")) {
        return new Response(
          JSON.stringify({
            ruleSetJson: JSON.stringify({
              workflowName: "FCD-CreateV2-Rules",
              rules: ["FCD_V2_TAX_VALID"]
            })
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.endsWith("/rulesets/FCD-CreateV2-Rules")) {
        return new Response(
          JSON.stringify({
            savedVersion: 7,
            activeVersion: 3,
            activated: false,
            approvalWorkflowEnabled: true,
            status: "Draft"
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.endsWith("/rulesets/FCD-CreateV2-Rules/7/submit")) {
        return new Response(
          JSON.stringify({
            status: "PendingApproval"
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.endsWith("/rulesets")) {
        return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (url.endsWith("/decision-tables")) {
        return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (url.includes("/flow-contracts/") || url.includes("/authoring-contract")) {
        return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
    });

    const element = document.createElement("mu-rule-flow-designer") as LitElement & {
      apiBaseUrl: string;
      workflowCode: string;
      tenantId: string;
    };
    element.apiBaseUrl = "http://localhost:5000/api/v1/control-plane";
    element.workflowCode = "FCD-CreateV2-Rules";
    element.tenantId = "tenant-a";
    document.body.appendChild(element);
    await element.updateComplete;

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const publishComplete = vi.fn();
    element.addEventListener("publish-complete", publishComplete as EventListener);
    await (element as unknown as { MPublishGraphAsync: (graph: MRuleFlowGraph) => Promise<void> }).MPublishGraphAsync(M_GRAPH);

    await waitFor(() => {
      expect(fetchMock.mock.calls.some((call) => call[0] === "http://localhost:5000/api/v1/control-plane/rulesets/FCD-CreateV2-Rules")).toBe(true);
      expect(fetchMock.mock.calls.some((call) => call[0] === "http://localhost:5000/api/v1/control-plane/rulesets/FCD-CreateV2-Rules/7/submit")).toBe(true);
      expect(publishComplete).toHaveBeenCalled();
    });
  });
});
