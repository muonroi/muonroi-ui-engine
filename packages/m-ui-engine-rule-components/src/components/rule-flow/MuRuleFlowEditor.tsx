import "@xyflow/react/dist/style.css";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  type Connection,
  type Edge,
  type EdgeChange,
  Handle,
  MiniMap,
  type Node,
  type NodeChange,
  Position,
  ReactFlow,
  ReactFlowProvider
} from "@xyflow/react";
import type {
  MRuleFlowEdge,
  MRuleFlowGraph,
  MRuleFlowMetadata,
  MRuleFlowNode,
  MRuleFlowNodeType
} from "../../models.js";
import { MCreateEmptyRuleFlowGraph } from "../../models.js";

export interface MuRuleFlowEditorProps {
  graph: MRuleFlowGraph;
  onGraphChange?: (graph: MRuleFlowGraph) => void;
  readOnly?: boolean;
  theme?: "light" | "dark";
  height?: number | string;
  apiBaseUrl?: string;
  onPublish?: (graph: MRuleFlowGraph) => Promise<void> | void;
  licenseStatus?: "licensed" | "trial" | "unlicensed";
}

type MCanvasNodeData = {
  label: string;
  ruleCode?: string;
  feelExpression?: string;
  nodeType: MRuleFlowNodeType;
};

const M_NODE_TITLES: Record<MRuleFlowNodeType, string> = {
  trigger: "Trigger",
  condition: "Condition",
  action: "Action",
  "decision-table": "Decision Table",
  "sub-flow": "Sub Flow",
  end: "End"
};

const M_NODE_ACCENTS: Record<MRuleFlowNodeType, string> = {
  trigger: "#16a34a",
  condition: "#7c3aed",
  action: "#2563eb",
  "decision-table": "#ea580c",
  "sub-flow": "#0891b2",
  end: "#dc2626"
};

const M_NODE_DEFAULT_LABELS: Record<MRuleFlowNodeType, string> = {
  trigger: "New Trigger",
  condition: "New Condition",
  action: "New Action",
  "decision-table": "Decision Table",
  "sub-flow": "Sub Flow",
  end: "End"
};

const M_BASE_NODE_STYLE: React.CSSProperties = {
  minWidth: 168,
  borderRadius: 16,
  border: "1px solid rgba(15, 23, 42, 0.12)",
  background: "#ffffff",
  boxShadow: "0 14px 30px rgba(15, 23, 42, 0.10)",
  padding: "12px 14px"
};

type MCommitOptions = {
  pushHistory?: boolean;
  notify?: boolean;
};

function MRuleFlowNodeCard({ data, selected }: { data: MCanvasNodeData; selected?: boolean }): React.JSX.Element {
  const accent = M_NODE_ACCENTS[data.nodeType];
  const borderStyle = selected ? `2px solid ${accent}` : `1px solid rgba(15, 23, 42, 0.12)`;

  return (
    <div
      style={{
        ...M_BASE_NODE_STYLE,
        border: borderStyle,
        borderLeft: `8px solid ${accent}`,
        borderRadius: data.nodeType === "end" ? 999 : data.nodeType === "condition" ? 24 : 16
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ color: accent, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {M_NODE_TITLES[data.nodeType]}
        </span>
        <strong style={{ fontSize: 14 }}>{data.label}</strong>
        {data.ruleCode ? <span style={{ fontSize: 12, color: "#475569" }}>Rule: {data.ruleCode}</span> : null}
        {data.feelExpression ? (
          <span
            style={{
              display: "inline-block",
              maxWidth: 200,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: 12,
              color: "#334155"
            }}
          >
            FEEL: {data.feelExpression}
          </span>
        ) : null}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const M_NODE_TYPES = {
  trigger: MRuleFlowNodeCard,
  condition: MRuleFlowNodeCard,
  action: MRuleFlowNodeCard,
  "decision-table": MRuleFlowNodeCard,
  "sub-flow": MRuleFlowNodeCard,
  end: MRuleFlowNodeCard
};

export function MuRuleFlowEditor({
  graph,
  onGraphChange,
  readOnly = false,
  theme = "light",
  height = 640,
  apiBaseUrl,
  onPublish,
  licenseStatus = "licensed"
}: MuRuleFlowEditorProps): React.JSX.Element {
  const initialGraph = useMemo(() => MEnsureRuleFlowGraph(graph), [graph]);
  const [nodes, setNodes] = useState<Node<MCanvasNodeData>[]>(() => MGraphToCanvasNodes(initialGraph));
  const [edges, setEdges] = useState<Edge[]>(() => MGraphToCanvasEdges(initialGraph));
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>("");
  const metadataRef = useRef<MRuleFlowMetadata>(initialGraph.metadata);
  const historyRef = useRef<MRuleFlowGraph[]>([initialGraph]);
  const historyIndexRef = useRef(0);
  const lastGraphSignatureRef = useRef(MSerializeRuleFlowGraph(initialGraph));

  useEffect(() => {
    const nextGraph = MEnsureRuleFlowGraph(graph);
    const nextSignature = MSerializeRuleFlowGraph(nextGraph);
    if (nextSignature === lastGraphSignatureRef.current) {
      return;
    }

    metadataRef.current = nextGraph.metadata;
    historyRef.current = [nextGraph];
    historyIndexRef.current = 0;
    lastGraphSignatureRef.current = nextSignature;
    setSelectedNodeId("");
    setSelectedEdgeId("");
    setNodes(MGraphToCanvasNodes(nextGraph));
    setEdges(MGraphToCanvasEdges(nextGraph));
  }, [graph]);

  useEffect(() => {
    if (readOnly) {
      return;
    }

    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Delete") {
        return;
      }

      if (selectedNodeId) {
        MDeleteSelectedNode();
        return;
      }

      if (selectedEdgeId) {
        MDeleteSelectedEdge();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [readOnly, selectedNodeId, selectedEdgeId, nodes, edges]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) {
      return null;
    }

    return nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [nodes, selectedNodeId]);

  if (licenseStatus === "unlicensed") {
    return (
      <section style={MLicenseFallbackStyle}>
        <strong>Rule Flow Designer requires a Muonroi commercial license.</strong>
        <span>Load an activation proof before rendering this editor.</span>
      </section>
    );
  }

  function MCommitGraph(nextGraph: MRuleFlowGraph, options?: MCommitOptions): void {
    const normalized = MEnsureRuleFlowGraph(nextGraph);
    metadataRef.current = normalized.metadata;
    lastGraphSignatureRef.current = MSerializeRuleFlowGraph(normalized);
    setNodes(MGraphToCanvasNodes(normalized));
    setEdges(MGraphToCanvasEdges(normalized));

    if (options?.pushHistory !== false) {
      const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
      nextHistory.push(normalized);
      historyRef.current = nextHistory.slice(-50);
      historyIndexRef.current = historyRef.current.length - 1;
    }

    if (options?.notify !== false) {
      onGraphChange?.(normalized);
    }
  }

  function MBuildGraph(nextNodes: Node<MCanvasNodeData>[], nextEdges: Edge[]): MRuleFlowGraph {
    return {
      nodes: nextNodes.map(MCanvasNodeToGraphNode),
      edges: nextEdges.map(MCanvasEdgeToGraphEdge),
      metadata: {
        ...metadataRef.current,
        version: Math.max(1, metadataRef.current.version ?? 1),
        lastModifiedAt: new Date().toISOString()
      }
    };
  }

  function MApplyNodeChanges(changes: NodeChange[]): void {
    if (readOnly) {
      return;
    }

    const nextNodes = applyNodeChanges(changes, nodes) as Node<MCanvasNodeData>[];
    const nextGraph = MBuildGraph(nextNodes, edges);
    const selectedIds = nextNodes.filter((node) => node.selected).map((node) => node.id);
    setSelectedNodeId(selectedIds[0] ?? selectedNodeId);
    MCommitGraph(nextGraph);
  }

  function MApplyEdgeChanges(changes: EdgeChange[]): void {
    if (readOnly) {
      return;
    }

    const nextEdges = applyEdgeChanges(changes, edges) as Edge[];
    const selectedIds = nextEdges.filter((edge) => Boolean(edge.data?.selected)).map((edge) => edge.id);
    setSelectedEdgeId(selectedIds[0] ?? selectedEdgeId);
    MCommitGraph(MBuildGraph(nodes, nextEdges));
  }

  function MHandleConnect(connection: Connection): void {
    if (readOnly) {
      return;
    }

    const nextEdges = addEdge(connection, edges) as Edge[];
    const normalized = nextEdges.map((edge) =>
      edge.source === connection.source && edge.target === connection.target
        ? {
            ...edge,
            label: edge.label ?? "always",
            data: {
              ...(edge.data ?? {}),
              edgeType: "always"
            }
          }
        : edge
    );

    MCommitGraph(MBuildGraph(nodes, normalized));
  }

  function MAddNode(nodeType: MRuleFlowNodeType): void {
    if (readOnly) {
      return;
    }

    const nextNode: Node<MCanvasNodeData> = {
      id: `node-${nodeType}-${Math.random().toString(36).slice(2, 10)}`,
      type: nodeType,
      position: {
        x: 60 + nodes.length * 36,
        y: 80 + (nodes.length % 4) * 90
      },
      data: {
        label: M_NODE_DEFAULT_LABELS[nodeType],
        nodeType
      }
    };

    const nextNodes = [...nodes, nextNode];
    const nextEdges = [...edges];
    if (selectedNodeId) {
      nextEdges.push({
        id: `${selectedNodeId}-${nextNode.id}`,
        source: selectedNodeId,
        target: nextNode.id,
        label: "always",
        data: {
          edgeType: "always"
        }
      });
    }

    setSelectedNodeId(nextNode.id);
    setSelectedEdgeId("");
    MCommitGraph(MBuildGraph(nextNodes, nextEdges));
  }

  function MDeleteSelectedNode(): void {
    if (readOnly || !selectedNodeId) {
      return;
    }

    const nextNodes = nodes.filter((node) => node.id !== selectedNodeId);
    const nextEdges = edges.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId);
    setSelectedNodeId("");
    MCommitGraph(MBuildGraph(nextNodes, nextEdges));
  }

  function MDeleteSelectedEdge(): void {
    if (readOnly || !selectedEdgeId) {
      return;
    }

    const nextEdges = edges.filter((edge) => edge.id !== selectedEdgeId);
    setSelectedEdgeId("");
    MCommitGraph(MBuildGraph(nodes, nextEdges));
  }

  function MUndo(): void {
    if (historyIndexRef.current <= 0) {
      return;
    }

    historyIndexRef.current -= 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    MCommitGraph(snapshot, { pushHistory: false });
  }

  function MRedo(): void {
    if (historyIndexRef.current >= historyRef.current.length - 1) {
      return;
    }

    historyIndexRef.current += 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    MCommitGraph(snapshot, { pushHistory: false });
  }

  function MUpdateSelectedNode(updater: (node: Node<MCanvasNodeData>) => Node<MCanvasNodeData>): void {
    if (readOnly || !selectedNode) {
      return;
    }

    const nextNodes = nodes.map((node) => (node.id === selectedNode.id ? updater(node) : node));
    MCommitGraph(MBuildGraph(nextNodes, edges));
  }

  async function MPublish(): Promise<void> {
    if (!onPublish) {
      return;
    }

    await onPublish(MBuildGraph(nodes, edges));
  }

  function MExport(): void {
    const payload = MSerializeRuleFlowGraph(MBuildGraph(nodes, edges));
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${metadataRef.current.ruleSetCode ?? "rule-flow"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const computedHeight = typeof height === "number" ? `${height}px` : height;
  const themeStyles = theme === "dark" ? MDarkThemeStyle : MLightThemeStyle;

  return (
    <ReactFlowProvider>
      <section style={{ ...MEditorShellStyle, ...themeStyles }}>
        <aside style={MSidebarStyle}>
          <div style={MSectionTitleStyle}>
            <strong>Palette</strong>
            <span>Add nodes to compose a publishable rule flow.</span>
          </div>
          {(["trigger", "condition", "action", "decision-table", "sub-flow", "end"] as MRuleFlowNodeType[]).map((nodeType) => (
            <button
              key={nodeType}
              type="button"
              style={MPaletteButtonStyle(nodeType)}
              onClick={() => MAddNode(nodeType)}
              disabled={readOnly}
            >
              {M_NODE_TITLES[nodeType]}
            </button>
          ))}

          <div style={MSectionTitleStyle}>
            <strong>Actions</strong>
            <span>Undo, publish and export without leaving the flow canvas.</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
            <button type="button" style={MActionButtonStyle(false)} onClick={MUndo} disabled={historyIndexRef.current === 0}>
              Undo
            </button>
            <button
              type="button"
              style={MActionButtonStyle(false)}
              onClick={MRedo}
              disabled={historyIndexRef.current >= historyRef.current.length - 1}
            >
              Redo
            </button>
            <button type="button" style={MActionButtonStyle(true)} onClick={() => void MPublish()} disabled={readOnly || !onPublish}>
              Publish
            </button>
            <button type="button" style={MActionButtonStyle(false)} onClick={MExport}>
              Export
            </button>
          </div>

          <div style={MInspectorShellStyle}>
            <div style={MSectionTitleStyle}>
              <strong>Inspector</strong>
              <span>{selectedNode ? `Editing ${selectedNode.data.nodeType}` : "Select a node to edit it."}</span>
            </div>

            {selectedNode ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={MLabelStyle}>
                  Label
                  <input
                    style={MInputStyle}
                    value={selectedNode.data.label}
                    disabled={readOnly}
                    onChange={(event) =>
                      MUpdateSelectedNode((node) => ({
                        ...node,
                        data: {
                          ...node.data,
                          label: event.target.value
                        }
                      }))
                    }
                  />
                </label>
                <label style={MLabelStyle}>
                  Rule Code
                  <input
                    style={MInputStyle}
                    value={selectedNode.data.ruleCode ?? ""}
                    disabled={readOnly}
                    onChange={(event) =>
                      MUpdateSelectedNode((node) => ({
                        ...node,
                        data: {
                          ...node.data,
                          ruleCode: event.target.value
                        }
                      }))
                    }
                  />
                </label>
                <label style={MLabelStyle}>
                  FEEL Expression
                  <textarea
                    style={MTextareaStyle}
                    value={selectedNode.data.feelExpression ?? ""}
                    disabled={readOnly}
                    onChange={(event) =>
                      MUpdateSelectedNode((node) => ({
                        ...node,
                        data: {
                          ...node.data,
                          feelExpression: event.target.value
                        }
                      }))
                    }
                  />
                </label>
                {apiBaseUrl ? <span style={{ color: "#64748b", fontSize: 12 }}>API base: {apiBaseUrl}</span> : null}
                {!readOnly ? (
                  <button type="button" style={MDeleteButtonStyle} onClick={MDeleteSelectedNode}>
                    Delete Node
                  </button>
                ) : null}
              </div>
            ) : (
              <div style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
                Use the palette to add a trigger, condition or action. Click a node to change its label, rule code and FEEL expression.
              </div>
            )}
          </div>
        </aside>

        <div style={MCanvasPanelStyle}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={M_NODE_TYPES}
            onNodesChange={MApplyNodeChanges}
            onEdgesChange={MApplyEdgeChanges}
            onConnect={MHandleConnect}
            onNodeClick={(_event, node) => {
              setSelectedNodeId(node.id);
              setSelectedEdgeId("");
            }}
            onEdgeClick={(_event, edge) => {
              setSelectedEdgeId(edge.id);
              setSelectedNodeId("");
            }}
            onPaneClick={() => {
              setSelectedNodeId("");
              setSelectedEdgeId("");
            }}
            fitView
            nodesConnectable={!readOnly}
            nodesDraggable={!readOnly}
            elementsSelectable
          >
            <MiniMap />
            <Controls />
            <Background />
          </ReactFlow>
          <div style={{ height: computedHeight }} />
        </div>
      </section>
    </ReactFlowProvider>
  );
}

export function MEnsureRuleFlowGraph(graph: unknown): MRuleFlowGraph {
  if (!graph || typeof graph !== "object") {
    return MCreateEmptyRuleFlowGraph();
  }

  const candidate = graph as Partial<MRuleFlowGraph>;
  return {
    nodes: Array.isArray(candidate.nodes)
      ? candidate.nodes.map((node, index) => ({
          id: typeof node.id === "string" && node.id ? node.id : `node-${index + 1}`,
          type: MNormalizeNodeType(node.type),
          label: typeof node.label === "string" && node.label ? node.label : M_NODE_DEFAULT_LABELS[MNormalizeNodeType(node.type)],
          feelExpression: typeof node.feelExpression === "string" ? node.feelExpression : undefined,
          ruleCode: typeof node.ruleCode === "string" ? node.ruleCode : undefined,
          position: {
            x: Number.isFinite(node.position?.x) ? node.position.x : 40 + index * 48,
            y: Number.isFinite(node.position?.y) ? node.position.y : 60 + (index % 4) * 88
          },
          data: node.data && typeof node.data === "object" ? { ...node.data } : {}
        }))
      : [],
    edges: Array.isArray(candidate.edges)
      ? candidate.edges
          .filter((edge): edge is MRuleFlowEdge => Boolean(edge) && typeof edge.source === "string" && typeof edge.target === "string")
          .map((edge, index) => ({
            id: typeof edge.id === "string" && edge.id ? edge.id : `edge-${index + 1}`,
            source: edge.source,
            target: edge.target,
            label: typeof edge.label === "string" ? edge.label : undefined,
            edgeType: MNormalizeEdgeType(edge.edgeType)
          }))
      : [],
    metadata: {
      version: Math.max(1, candidate.metadata?.version ?? 1),
      tenantId: candidate.metadata?.tenantId,
      ruleSetCode: candidate.metadata?.ruleSetCode,
      lastModifiedAt: candidate.metadata?.lastModifiedAt,
      lastModifiedBy: candidate.metadata?.lastModifiedBy
    }
  };
}

export function MSerializeRuleFlowGraph(graph: MRuleFlowGraph): string {
  return JSON.stringify(MEnsureRuleFlowGraph(graph), null, 2);
}

function MGraphToCanvasNodes(graph: MRuleFlowGraph): Node<MCanvasNodeData>[] {
  return graph.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      label: node.label,
      ruleCode: node.ruleCode,
      feelExpression: node.feelExpression,
      nodeType: node.type
    }
  }));
}

function MGraphToCanvasEdges(graph: MRuleFlowGraph): Edge[] {
  return graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label ?? edge.edgeType,
    data: {
      edgeType: edge.edgeType
    }
  }));
}

function MCanvasNodeToGraphNode(node: Node<MCanvasNodeData>): MRuleFlowNode {
  return {
    id: node.id,
    type: MNormalizeNodeType(node.type),
    label: node.data.label,
    ruleCode: node.data.ruleCode,
    feelExpression: node.data.feelExpression,
    position: {
      x: node.position.x,
      y: node.position.y
    },
    data: {}
  };
}

function MCanvasEdgeToGraphEdge(edge: Edge): MRuleFlowEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: typeof edge.label === "string" ? edge.label : undefined,
    edgeType: MNormalizeEdgeType(edge.data?.edgeType)
  };
}

function MNormalizeNodeType(value: unknown): MRuleFlowNodeType {
  return value === "trigger" ||
    value === "condition" ||
    value === "action" ||
    value === "decision-table" ||
    value === "sub-flow" ||
    value === "end"
    ? value
    : "action";
}

function MNormalizeEdgeType(value: unknown): MRuleFlowEdge["edgeType"] {
  return value === "always" || value === "on-true" || value === "on-false" || value === "on-error" ? value : "always";
}

const MEditorShellStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "320px minmax(0, 1fr)",
  gap: 16,
  minHeight: 640
};

const MSidebarStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  padding: 18,
  borderRadius: 22,
  border: "1px solid rgba(148, 163, 184, 0.25)"
};

const MCanvasPanelStyle: React.CSSProperties = {
  position: "relative",
  minHeight: 640,
  borderRadius: 24,
  overflow: "hidden",
  border: "1px solid rgba(148, 163, 184, 0.25)",
  background:
    "radial-gradient(circle at top left, rgba(37,99,235,0.12), transparent 38%), linear-gradient(180deg, rgba(248,250,252,0.96), rgba(241,245,249,0.92))"
};

const MSectionTitleStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 13,
  color: "#64748b"
};

const MInspectorShellStyle: React.CSSProperties = {
  marginTop: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 16,
  borderRadius: 18,
  background: "rgba(248, 250, 252, 0.9)",
  border: "1px solid rgba(148, 163, 184, 0.18)"
};

const MLabelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 13,
  color: "#334155"
};

const MInputStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(148, 163, 184, 0.35)",
  padding: "10px 12px",
  fontSize: 13
};

const MTextareaStyle: React.CSSProperties = {
  ...MInputStyle,
  minHeight: 96,
  resize: "vertical"
};

const MDeleteButtonStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(220, 38, 38, 0.24)",
  background: "rgba(254, 242, 242, 0.95)",
  color: "#b91c1c",
  padding: "10px 12px",
  fontWeight: 600
};

const MLightThemeStyle: React.CSSProperties = {
  color: "#0f172a"
};

const MDarkThemeStyle: React.CSSProperties = {
  color: "#e2e8f0"
};

const MLicenseFallbackStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: 20,
  borderRadius: 18,
  border: "1px solid rgba(245, 158, 11, 0.35)",
  background: "rgba(255, 251, 235, 0.95)",
  color: "#92400e"
};

function MPaletteButtonStyle(nodeType: MRuleFlowNodeType): React.CSSProperties {
  return {
    borderRadius: 14,
    border: `1px solid ${M_NODE_ACCENTS[nodeType]}22`,
    background: `${M_NODE_ACCENTS[nodeType]}10`,
    color: "#0f172a",
    padding: "11px 12px",
    textAlign: "left",
    fontWeight: 600
  };
}

function MActionButtonStyle(primary: boolean): React.CSSProperties {
  return {
    borderRadius: 12,
    border: primary ? "1px solid rgba(37, 99, 235, 0.28)" : "1px solid rgba(148, 163, 184, 0.35)",
    background: primary ? "rgba(37, 99, 235, 0.14)" : "rgba(255, 255, 255, 0.9)",
    color: "#0f172a",
    padding: "10px 12px",
    fontWeight: 600
  };
}
