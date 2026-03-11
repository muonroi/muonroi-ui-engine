import "../../styles/xyflow.css";
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
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  useUpdateNodeInternals
} from "@xyflow/react";
import type {
  MDecisionTableModel,
  MRuleFlowGraph,
  MRuleFlowNode,
  MRuleFlowNodeType
} from "../../models.js";
import { MRuleFlowContractService, type MRuleFlowSummary } from "../../services/rule-flow-contract-service.js";
import { MRuleEngineApi } from "../../services/rule-engine-api.js";
import { useRuleFlowHistory } from "../../hooks/useRuleFlowHistory.js";
import {
  MActionButtonStyle,
  MRuleFlowInspector,
  type MContractLoadState
} from "./rule-flow-inspector.js";
import {
  M_BASE_NODE_STYLE,
  MCreateDefaultExpression,
  MCreateRuleFlowGraphSignature,
  MDefaultInspectorTabForNode,
  MEnsureExpression,
  MEnsureLiquidConfig,
  MEnsureRuleFlowGraph,
  MEnsureSubFlowConfig,
  MGraphToCanvasEdges,
  MGraphToCanvasNodes,
  MImportRuleFlowGraph,
  MInferContractReference,
  MIsNodeType,
  M_NODE_ACCENTS,
  M_NODE_DEFAULT_LABELS,
  M_NODE_TITLES,
  MNormalizeEdgeType,
  MNormalizeNodeData,
  MNormalizeNodeType,
  MSerializeRuleFlowGraph,
  type MCanvasNodeData,
  type MInspectorTab
} from "./rule-flow-runtime.js";
import { MApplyRuleFlowAuthoringLayers, MOrderRuleFlowGraph, MValidateGraphForPublish } from "./rule-flow-authoring.js";

export interface MuRuleFlowEditorProps {
  graph: MRuleFlowGraph;
  onGraphChange?: (graph: MRuleFlowGraph) => void;
  readOnly?: boolean;
  theme?: "light" | "dark";
  height?: number | string;
  apiBaseUrl?: string;
  tenantId?: string;
  workflowCode?: string;
  onPublish?: (graph: MRuleFlowGraph) => Promise<void> | void;
  licenseStatus?: "licensed" | "trial" | "unlicensed";
}

type MCommitOptions = {
  pushHistory?: boolean;
  notify?: boolean;
  syncViewport?: boolean;
};

const M_DRAG_NODE_TYPE_KEY = "application/muonroi-rule-flow-node-type";
const M_FIT_VIEW_OPTIONS = { duration: 0, padding: 0.22, minZoom: 0.18, maxZoom: 1.1 };
const M_COMPACT_LAYOUT_BREAKPOINT = 860;

function MRuleFlowNodeCard({ data, selected }: { data: MCanvasNodeData; selected?: boolean }): React.JSX.Element {
  const accent = M_NODE_ACCENTS[data.nodeType];
  const expression = MEnsureExpression(data);
  const requestCount = data.requestContract?.fields.length ?? 0;
  const responseCount = data.responseContract?.fields.length ?? 0;

  return (
    <div
      style={{
        ...M_BASE_NODE_STYLE,
        borderTop: selected ? `2px solid ${accent}` : "1px solid rgba(15, 23, 42, 0.12)",
        borderRight: selected ? `2px solid ${accent}` : "1px solid rgba(15, 23, 42, 0.12)",
        borderBottom: selected ? `2px solid ${accent}` : "1px solid rgba(15, 23, 42, 0.12)",
        borderLeft: `8px solid ${accent}`,
        borderRadius: data.nodeType === "end" ? 999 : data.nodeType === "condition" ? 24 : 18
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ color: accent, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{M_NODE_TITLES[data.nodeType]}</span>
        <strong style={{ fontSize: 14 }}>{data.label}</strong>
        {data.ruleCode ? <span style={{ fontSize: 12, color: "#475569" }}>Rule: {data.ruleCode}</span> : null}
        {data.contractRef?.sourceCode ? <span style={{ fontSize: 11, color: "#64748b" }}>Contract: {data.contractRef.sourceType}/{data.contractRef.sourceCode}</span> : null}
        {expression.body ? (
          <span style={{ display: "inline-block", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, color: "#334155" }}>
            {expression.language.toUpperCase()}: {expression.body}
          </span>
        ) : null}
        {(requestCount > 0 || responseCount > 0) ? <span style={{ fontSize: 11, color: "#64748b" }}>Inline contracts {requestCount}/{responseCount}</span> : null}
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
  liquid: MRuleFlowNodeCard,
  end: MRuleFlowNodeCard
};

function MFlowRuntimeSync({
  nodeIds,
  syncToken,
  hostElement
}: {
  nodeIds: string[];
  syncToken: number;
  hostElement: HTMLElement | null;
}): null {
  const updateNodeInternals = useUpdateNodeInternals();
  const reactFlow = useReactFlow();
  const nodesInitialized = useNodesInitialized({ includeHiddenNodes: true });
  const syncedSignatureRef = useRef("");
  const resizeFrameRef = useRef<number | null>(null);

  function syncViewport(): void {
    if (!nodesInitialized || nodeIds.length === 0) {
      return;
    }

    nodeIds.forEach((nodeId) => updateNodeInternals(nodeId));
    void reactFlow.fitView(M_FIT_VIEW_OPTIONS);
  }

  function scheduleSync(delay = 0): number {
    return window.setTimeout(() => {
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
      }
      resizeFrameRef.current = requestAnimationFrame(() => {
        resizeFrameRef.current = null;
        syncViewport();
      });
    }, delay);
  }

  useEffect(() => {
    const nextSignature = String(syncToken);
    if (!nodesInitialized || nodeIds.length === 0 || syncedSignatureRef.current === nextSignature) {
      return;
    }

    syncedSignatureRef.current = nextSignature;
    const immediate = scheduleSync();
    const delayed = scheduleSync(150);
    const settled = scheduleSync(350);
    return () => {
      window.clearTimeout(immediate);
      window.clearTimeout(delayed);
      window.clearTimeout(settled);
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
    };
  }, [nodeIds, nodesInitialized, reactFlow, syncToken, updateNodeInternals]);

  useEffect(() => {
    if (!hostElement) {
      return;
    }

    const observer = new ResizeObserver(() => {
      syncViewport();
    });
    observer.observe(hostElement);
    const onWindowResize = () => syncViewport();
    window.addEventListener("resize", onWindowResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onWindowResize);
    };
  }, [hostElement, nodesInitialized, reactFlow, updateNodeInternals, nodeIds]);

  return null;
}

export function MuRuleFlowEditor({
  graph,
  onGraphChange,
  readOnly = false,
  theme = "light",
  height = 640,
  apiBaseUrl,
  tenantId,
  workflowCode,
  onPublish,
  licenseStatus = "licensed"
}: MuRuleFlowEditorProps): React.JSX.Element {
  const initialGraph = useMemo(() => MEnsureRuleFlowGraph(graph), [graph]);
  const history = useRuleFlowHistory(initialGraph);
  const [nodes, setNodes] = useState<Node<MCanvasNodeData>[]>(() => MGraphToCanvasNodes(history.present));
  const [edges, setEdges] = useState<Edge[]>(() => MGraphToCanvasEdges(history.present));
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [selectedEdgeId, setSelectedEdgeId] = useState("");
  const [inspectorTab, setInspectorTab] = useState<MInspectorTab>("general");
  const [contractLoadState, setContractLoadState] = useState<MContractLoadState>({ status: "idle" });
  const [flowOptions, setFlowOptions] = useState<Array<{ code: string; label: string }>>([]);
  const [decisionTableOptions, setDecisionTableOptions] = useState<Array<{ code: string; label: string }>>([]);
  const metadataRef = useRef(history.present.metadata);
  const lastGraphSignatureRef = useRef(MCreateRuleFlowGraphSignature(history.present));
  const [viewportSyncToken, setViewportSyncToken] = useState(0);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const nodeContractCacheRef = useRef(new Map<string, Awaited<ReturnType<MRuleFlowContractService["MGetNodeAuthoringContract"]>>>());
  const flowContractCacheRef = useRef(new Map<string, Awaited<ReturnType<MRuleFlowContractService["MGetFlowContract"]>>>());
  const contractService = useMemo(
    () => (apiBaseUrl ? new MRuleFlowContractService({ baseUrl: apiBaseUrl, tenantId }) : null),
    [apiBaseUrl, tenantId]
  );
  const ruleEngineApi = useMemo(() => (apiBaseUrl ? new MRuleEngineApi({ baseUrl: apiBaseUrl }) : null), [apiBaseUrl]);
  const shellRef = useRef<HTMLElement | null>(null);
  const canvasPanelRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const allowAutoFitRef = useRef(true);
  const isRestoringRef = useRef(false);
  const restoreUnlockRef = useRef<number | null>(null);
  const [shellWidth, setShellWidth] = useState(0);
  const pendingCommitRef = useRef<number | null>(null);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => () => {
    flushPendingCommit();
    flushRestoreUnlock();
  }, []);

  useEffect(() => {
    const nextGraph = MEnsureRuleFlowGraph(graph);
    const nextSignature = MCreateRuleFlowGraphSignature(nextGraph);
    if (nextSignature === lastGraphSignatureRef.current) {
      return;
    }
    metadataRef.current = nextGraph.metadata;
    history.reset(nextGraph);
    lastGraphSignatureRef.current = nextSignature;
    allowAutoFitRef.current = true;
    setViewportSyncToken((current) => current + 1);
    setSelectedNodeId("");
    setSelectedEdgeId("");
    setInspectorTab("general");
    restoreCanvasState(nextGraph);
  }, [graph, history.reset]);

  useEffect(() => {
    const historyGraph = history.present;
    const historySignature = MCreateRuleFlowGraphSignature(historyGraph);
    const currentSignature = MCreateRuleFlowGraphSignature(buildGraph(nodesRef.current, edgesRef.current, false));
    if (historySignature === currentSignature) {
      return;
    }

    metadataRef.current = historyGraph.metadata;
    lastGraphSignatureRef.current = historySignature;
    restoreCanvasState(historyGraph);
  }, [history.present]);

  useEffect(() => {
    if (readOnly) {
      return;
    }
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Delete") {
        return;
      }
      if (selectedNodeId) {
        deleteSelectedNode();
        return;
      }
      if (selectedEdgeId) {
        deleteSelectedEdge();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [readOnly, selectedNodeId, selectedEdgeId]);

  useEffect(() => {
    const shellElement = shellRef.current;
    if (!shellElement) {
      return;
    }

    const syncWidth = () => {
      const availableWidth = shellElement.parentElement?.getBoundingClientRect().width ?? shellElement.getBoundingClientRect().width;
      setShellWidth(availableWidth);
    };

    syncWidth();
    const observer = new ResizeObserver(() => syncWidth());
    observer.observe(shellElement);
    return () => observer.disconnect();
  }, []);

  const [authoringVersion, setAuthoringVersion] = useState(0);
  const currentGraph = useMemo(() => buildGraph(nodes, edges, false), [nodes, edges]);
  const derivedGraph = useMemo(
    () =>
      MApplyRuleFlowAuthoringLayers(currentGraph, {
        flowCode: workflowCode,
        currentFlowContract: workflowCode ? flowContractCacheRef.current.get(workflowCode) : undefined,
        flowContractsByCode: flowContractCacheRef.current,
        nodeContractsById: nodeContractCacheRef.current
      }),
    [authoringVersion, currentGraph, workflowCode]
  );
  const selectedNode = useMemo(() => (selectedNodeId ? MGraphToCanvasNodes(derivedGraph).find((node) => node.id === selectedNodeId) ?? null : null), [derivedGraph, selectedNodeId]);
  const selectedExpression = selectedNode ? MEnsureExpression(selectedNode.data) : { language: "feel" as const, body: "" };
  const currentValidation = useMemo(
    () =>
      MValidateGraphForPublish(currentGraph, {
        flowCode: workflowCode,
        currentFlowContract: workflowCode ? flowContractCacheRef.current.get(workflowCode) : undefined,
        flowContractsByCode: flowContractCacheRef.current,
        nodeContractsById: nodeContractCacheRef.current
      }),
    [authoringVersion, currentGraph, workflowCode]
  );
  const validationErrors = useMemo(
    () => currentValidation.issues.filter((issue) => issue.severity === "error"),
    [currentValidation.issues]
  );
  const validationWarnings = useMemo(
    () => currentValidation.issues.filter((issue) => issue.severity === "warning"),
    [currentValidation.issues]
  );
  const canPublish = !readOnly && Boolean(onPublish) && validationErrors.length === 0;

  useEffect(() => {
    if (!contractService) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const summaries: MRuleFlowSummary[] = await contractService.MListFlows();
        if (!cancelled) {
          setFlowOptions(summaries.map((item) => ({ code: item.workflowName, label: item.workflowName })));
        }
      } catch {
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [contractService]);

  useEffect(() => {
    if (!ruleEngineApi) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const tables: MDecisionTableModel[] = await ruleEngineApi.MListDecisionTables();
        if (!cancelled) {
          setDecisionTableOptions(tables.map((table) => ({ code: table.id, label: table.name })));
        }
      } catch {
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ruleEngineApi]);

  useEffect(() => {
    if (!contractService || !workflowCode) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        if (!flowContractCacheRef.current.has(workflowCode)) {
          flowContractCacheRef.current.set(workflowCode, await contractService.MGetFlowContract(workflowCode));
        }

        for (const node of currentGraph.nodes) {
          if (node.type === "trigger" || node.type === "end") {
            continue;
          }
          if (!nodeContractCacheRef.current.has(node.id)) {
            nodeContractCacheRef.current.set(node.id, await contractService.MGetNodeAuthoringContract(workflowCode, node.id));
          }
        }

        for (const node of currentGraph.nodes.filter((candidate) => candidate.type === "sub-flow")) {
          const targetFlowCode = MEnsureSubFlowConfig(node.data.subFlowConfig).targetFlowCode?.trim();
          if (!targetFlowCode) {
            continue;
          }
          if (!flowContractCacheRef.current.has(targetFlowCode)) {
            flowContractCacheRef.current.set(targetFlowCode, await contractService.MGetFlowContract(targetFlowCode));
          }
          if (!cancelled) {
            const childTrigger = await contractService.MGetNodeAuthoringContract(targetFlowCode, "trigger");
            const currentSchema = MEnsureSubFlowConfig(node.data.subFlowConfig).childTriggerSchema?.contractName;
            if (childTrigger.requestScope?.contractName && currentSchema !== childTrigger.requestScope.contractName) {
              updateNodeNow(node.id, (canvasNode) => ({
                ...canvasNode,
                data: {
                  ...canvasNode.data,
                  subFlowConfig: {
                    ...MEnsureSubFlowConfig(canvasNode.data.subFlowConfig),
                    childTriggerSchema: childTrigger.requestScope
                  }
                }
              }), false);
            }
          }
        }

        if (!cancelled) {
          setAuthoringVersion((current) => current + 1);
        }
      } catch {
        if (!cancelled) {
          setAuthoringVersion((current) => current + 1);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [contractService, currentGraph.nodes, workflowCode]);

  useEffect(() => {
    if (!selectedNode) {
      setContractLoadState({ status: "idle" });
      return;
    }
    const cachedNode = selectedNode && nodeContractCacheRef.current.get(selectedNode.id);
    if (cachedNode || selectedNode.data.contractLayer?.upstreamScope || selectedNode.type === "trigger" || selectedNode.type === "end") {
      setContractLoadState({ status: "ready", title: cachedNode?.ruleCode ?? selectedNode.data.contractRef?.label ?? selectedNode.data.label });
      return;
    }
    setContractLoadState(contractService ? { status: "loading" } : { status: "error", message: "No contract API configured for this editor." });
  }, [contractService, selectedNode, authoringVersion]);

  if (licenseStatus === "unlicensed") {
    return (
      <section style={MLicenseFallbackStyle}>
        <strong>Rule Flow Designer requires a Muonroi commercial license.</strong>
        <span>Load an activation proof before rendering this editor.</span>
      </section>
    );
  }

  function flushPendingCommit(): void {
    if (pendingCommitRef.current !== null) {
      window.clearTimeout(pendingCommitRef.current);
      pendingCommitRef.current = null;
    }
  }

  function flushRestoreUnlock(): void {
    if (restoreUnlockRef.current !== null) {
      window.clearTimeout(restoreUnlockRef.current);
      restoreUnlockRef.current = null;
    }
  }

  function restoreCanvasState(nextGraph: MRuleFlowGraph): void {
    flushRestoreUnlock();
    isRestoringRef.current = true;
    setNodes(MGraphToCanvasNodes(nextGraph));
    setEdges(MGraphToCanvasEdges(nextGraph));
    restoreUnlockRef.current = window.setTimeout(() => {
      isRestoringRef.current = false;
      restoreUnlockRef.current = null;
    }, 0);
  }

  function commitGraph(nextGraph: MRuleFlowGraph, options?: MCommitOptions): void {
    flushPendingCommit();
    const ordering = MOrderRuleFlowGraph(nextGraph, {
      flowCode: workflowCode,
      currentFlowContract: workflowCode ? flowContractCacheRef.current.get(workflowCode) : undefined,
      flowContractsByCode: flowContractCacheRef.current,
      nodeContractsById: nodeContractCacheRef.current
    });
    const normalized = MEnsureRuleFlowGraph(ordering.graph);
    const nextSignature = MCreateRuleFlowGraphSignature(normalized);
    metadataRef.current = normalized.metadata;
    lastGraphSignatureRef.current = nextSignature;
    restoreCanvasState(normalized);
    if (options?.syncViewport) {
      allowAutoFitRef.current = true;
      setViewportSyncToken((current) => current + 1);
    }
    if (ordering.issues.length > 0) {
      const message = ordering.issues[0]?.message ?? "Rule flow ordering is invalid.";
      setContractLoadState({ status: "error", message });
    }
    if (options?.pushHistory !== false) {
      history.commit(normalized);
    }
    if (options?.notify !== false) {
      onGraphChange?.(normalized);
    }
  }

  function buildGraph(nextNodes: Node<MCanvasNodeData>[], nextEdges: Edge[], touchMetadata = true): MRuleFlowGraph {
    return {
      nodes: nextNodes.map(canvasNodeToGraphNode),
      edges: nextEdges.map(canvasEdgeToGraphEdge),
      metadata: {
        ...metadataRef.current,
        version: Math.max(1, metadataRef.current.version ?? 1),
        lastModifiedAt: touchMetadata ? new Date().toISOString() : metadataRef.current.lastModifiedAt
      }
    };
  }

  function updateNodeNow(nodeId: string, updater: (node: Node<MCanvasNodeData>) => Node<MCanvasNodeData>, notify = true): void {
    const nextNodes = nodesRef.current.map((node) => (node.id === nodeId ? updater(node) : node));
    const nextGraph = MOrderRuleFlowGraph(buildGraph(nextNodes, edgesRef.current), {
      flowCode: workflowCode,
      currentFlowContract: workflowCode ? flowContractCacheRef.current.get(workflowCode) : undefined,
      flowContractsByCode: flowContractCacheRef.current,
      nodeContractsById: nodeContractCacheRef.current
    }).graph;
    metadataRef.current = nextGraph.metadata;
    lastGraphSignatureRef.current = MCreateRuleFlowGraphSignature(nextGraph);
    setNodes(MGraphToCanvasNodes(nextGraph));
    if (notify) {
      onGraphChange?.(nextGraph);
    }
  }

  function updateSelectedNode(updater: (node: Node<MCanvasNodeData>) => Node<MCanvasNodeData>, commitMode: "immediate" | "debounced" = "debounced"): void {
    if (readOnly || !selectedNodeId) {
      return;
    }
    const nextNodes = nodesRef.current.map((node) => (node.id === selectedNodeId ? updater(node) : node));
    const nextGraph = MOrderRuleFlowGraph(buildGraph(nextNodes, edgesRef.current), {
      flowCode: workflowCode,
      currentFlowContract: workflowCode ? flowContractCacheRef.current.get(workflowCode) : undefined,
      flowContractsByCode: flowContractCacheRef.current,
      nodeContractsById: nodeContractCacheRef.current
    }).graph;
    metadataRef.current = nextGraph.metadata;
    lastGraphSignatureRef.current = MCreateRuleFlowGraphSignature(nextGraph);
    setNodes(MGraphToCanvasNodes(nextGraph));
    onGraphChange?.(nextGraph);
    if (commitMode === "immediate") {
      history.commit(nextGraph);
      return;
    }

    flushPendingCommit();
    pendingCommitRef.current = window.setTimeout(() => {
      pendingCommitRef.current = null;
      history.commit(nextGraph);
    }, 300);
  }

  function deleteSelectedNode(): void {
    if (readOnly || !selectedNodeId) {
      return;
    }
    setSelectedNodeId("");
    setInspectorTab("general");
    commitGraph(buildGraph(nodesRef.current.filter((node) => node.id !== selectedNodeId), edgesRef.current.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId)));
  }

  function deleteSelectedEdge(): void {
    if (readOnly || !selectedEdgeId) {
      return;
    }
    setSelectedEdgeId("");
    commitGraph(buildGraph(nodesRef.current, edgesRef.current.filter((edge) => edge.id !== selectedEdgeId)));
  }

  function addNode(nodeType: MRuleFlowNodeType, position?: { x: number; y: number }): void {
    if (readOnly) {
      return;
    }
    const nextNode: Node<MCanvasNodeData> = {
      id: `node-${nodeType}-${Math.random().toString(36).slice(2, 10)}`,
      type: nodeType,
      position: position ?? { x: 60 + nodesRef.current.length * 36, y: 80 + (nodesRef.current.length % 4) * 90 },
      data: {
        label: M_NODE_DEFAULT_LABELS[nodeType],
        nodeType,
        expression: MCreateDefaultExpression(nodeType),
        conditionConfig: nodeType === "condition" ? { successLabel: "Valid", failureLabel: "Rejected" } : undefined,
        subFlowConfig: nodeType === "sub-flow" ? { targetFlowCode: "", inputMappings: [], outputMappings: [] } : undefined,
        liquidConfig: nodeType === "liquid" ? { outputFormat: "json" } : undefined
      }
    };
    const nextEdges = [...edgesRef.current];
    if (selectedNodeId) {
      nextEdges.push({ id: `${selectedNodeId}-${nextNode.id}`, source: selectedNodeId, target: nextNode.id, label: "always", data: { edgeType: "always" } });
    }
    setSelectedNodeId(nextNode.id);
    setSelectedEdgeId("");
    setInspectorTab(MDefaultInspectorTabForNode(nodeType));
    commitGraph(buildGraph([...nodesRef.current, nextNode], nextEdges));
  }

  const computedHeight = typeof height === "number" ? `${height}px` : height;
  const isCompactLayout = shellWidth > 0 && shellWidth < M_COMPACT_LAYOUT_BREAKPOINT;
  const resolvedCanvasHeight = isCompactLayout ? "min(52vh, 520px)" : computedHeight;
  const themeStyles = theme === "dark" ? MDarkThemeStyle : MLightThemeStyle;
  const palettePanel = (
    <div data-testid="rule-flow-sidebar-palette" style={{ ...MSidebarTopStyle, ...MSidebarTopLayoutStyle(isCompactLayout) }}>
      <div style={MSectionTitleStyle}>
        <strong>Palette</strong>
        <span>Add nodes to compose a publishable rule flow.</span>
      </div>
      {(["trigger", "condition", "action", "decision-table", "sub-flow", "liquid", "end"] as MRuleFlowNodeType[]).map((nodeType) => (
        <button key={nodeType} type="button" style={MPaletteButtonStyle(nodeType)} data-testid={`palette-${nodeType}`} draggable={!readOnly} onClick={() => addNode(nodeType)} onDragStart={(event) => handlePaletteDragStart(event, nodeType)} disabled={readOnly}>
          {M_NODE_TITLES[nodeType]}
        </button>
      ))}
    </div>
  );
  const actionsPanel = (
    <div data-testid="rule-flow-sidebar-actions" style={{ ...MSidebarActionsPanelStyle, ...MSidebarActionsPanelLayoutStyle(isCompactLayout) }}>
      <div style={MSectionTitleStyle}>
        <strong>Actions</strong>
        <span>Undo, publish and export without leaving the flow canvas.</span>
      </div>
      {currentValidation.issues.length > 0 ? (
        <div style={MValidationSummaryStyle(validationErrors.length > 0)}>
          <strong>{validationErrors.length > 0 ? "Publish blocked" : "Publish warnings"}</strong>
          <span>{validationErrors.length} error(s) / {validationWarnings.length} warning(s)</span>
        </div>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" style={{ ...MActionButtonStyle(false), flex: "1 1 auto", minWidth: 64 }} onClick={() => { flushPendingCommit(); history.undo(); }} disabled={!history.canUndo}>Undo</button>
        <button type="button" style={{ ...MActionButtonStyle(false), flex: "1 1 auto", minWidth: 64 }} onClick={() => { flushPendingCommit(); history.redo(); }} disabled={!history.canRedo}>Redo</button>
        <button
          type="button"
          style={{ ...MActionButtonStyle(true), flex: "1 1 auto", minWidth: 80 }}
          onClick={() => {
            const validation = MValidateGraphForPublish(buildGraph(nodesRef.current, edgesRef.current), {
              flowCode: workflowCode,
              currentFlowContract: workflowCode ? flowContractCacheRef.current.get(workflowCode) : undefined,
              flowContractsByCode: flowContractCacheRef.current,
              nodeContractsById: nodeContractCacheRef.current
            });
            setAuthoringVersion((current) => current + 1);
            if (!validation.isValid) {
              setContractLoadState({ status: "error", message: "Publish blocked because one or more nodes still have contract validation errors." });
              return;
            }
            if (validation.issues.some((issue) => issue.severity === "warning")) {
              const confirmed = window.confirm("This flow still has warnings. Publish anyway?");
              if (!confirmed) {
                return;
              }
            }
            void onPublish?.(validation.graph);
          }}
          disabled={!canPublish}
          title={!onPublish ? "No publish handler configured." : validationErrors.length > 0 ? "Fix validation errors before publishing." : undefined}
          aria-disabled={!canPublish}
        >
          Publish
        </button>
        <button type="button" style={{ ...MActionButtonStyle(false), flex: "1 1 auto", minWidth: 64 }} onClick={() => importInputRef.current?.click()} disabled={readOnly}>Import</button>
        <button type="button" style={{ ...MActionButtonStyle(false), flex: "1 1 auto", minWidth: 64 }} onClick={() => exportGraph(buildGraph(nodesRef.current, edgesRef.current), metadataRef.current.ruleSetCode)}>Export</button>
      </div>
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: "none" }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.currentTarget.value = "";
          if (!file) {
            return;
          }
          void (async () => {
            try {
              const payload = await file.text();
              const importedGraph = MOrderRuleFlowGraph(MImportRuleFlowGraph(payload), {
                flowCode: workflowCode,
                currentFlowContract: workflowCode ? flowContractCacheRef.current.get(workflowCode) : undefined,
                flowContractsByCode: flowContractCacheRef.current,
                nodeContractsById: nodeContractCacheRef.current
              }).graph;
              metadataRef.current = importedGraph.metadata;
              lastGraphSignatureRef.current = MCreateRuleFlowGraphSignature(importedGraph);
              history.reset(importedGraph);
              restoreCanvasState(importedGraph);
              setSelectedNodeId("");
              setSelectedEdgeId("");
              setInspectorTab("general");
              allowAutoFitRef.current = true;
              setViewportSyncToken((current) => current + 1);
              onGraphChange?.(importedGraph);
              setContractLoadState({ status: "ready", title: importedGraph.metadata.ruleSetCode ?? "Imported flow" });
            } catch (error) {
              setContractLoadState({ status: "error", message: (error as Error).message });
            }
          })();
        }}
      />
    </div>
  );
  const inspectorPanel = (
    <div data-testid="rule-flow-sidebar-inspector" style={{ ...MSidebarInspectorPanelStyle, ...MSidebarInspectorPanelLayoutStyle(isCompactLayout) }}>
      <MRuleFlowInspector
        selectedNode={selectedNode ? { id: selectedNode.id, data: selectedNode.data } : null}
        selectedExpression={selectedExpression}
        contractLoadState={contractLoadState}
        readOnly={readOnly}
        apiBaseUrl={apiBaseUrl}
        inspectorTab={inspectorTab}
        flowOptions={flowOptions}
        decisionTableOptions={decisionTableOptions}
        setInspectorTab={setInspectorTab}
        onSelectNodeByRuleCode={(ruleCode) => {
          const match = nodesRef.current.find((node) => node.data.ruleCode === ruleCode);
          if (match) {
            setSelectedNodeId(match.id);
            setSelectedEdgeId("");
            setInspectorTab(MDefaultInspectorTabForNode(match.data.nodeType));
          }
        }}
        onUpdateLabel={(value) => updateSelectedNode((node) => ({ ...node, data: { ...node.data, label: value } }))}
        onUpdateRuleCode={(value) =>
          updateSelectedNode((node) => ({ ...node, data: { ...node.data, ruleCode: value, contractRef: MInferContractReference(node.data.nodeType, value, node.data.contractRef) } }))
        }
        onUpdateDescription={(value) => updateSelectedNode((node) => ({ ...node, data: { ...node.data, description: value } }))}
        onUpdateContractRef={(value) => updateSelectedNode((node) => ({ ...node, data: { ...node.data, contractRef: value, requestContract: undefined, responseContract: undefined } }))}
        onUpdateDecisionTableCode={(value) =>
          updateSelectedNode((node) => ({
            ...node,
            data: {
              ...node.data,
              ruleCode: value,
              contractRef: value.trim()
                ? {
                    sourceType: "decision-table",
                    sourceCode: value.trim(),
                    label: decisionTableOptions.find((item) => item.code === value.trim())?.label ?? value.trim()
                  }
                : node.data.contractRef
            }
          }))
        }
        onUpdateConditionConfig={(value) => updateSelectedNode((node) => ({ ...node, data: { ...node.data, conditionConfig: value } }))}
        onUpdateTargetFlowCode={(value) =>
          updateSelectedNode((node) => ({
            ...node,
            data: {
              ...node.data,
              contractRef: value.trim()
                ? {
                    sourceType: "flow",
                    sourceCode: value.trim(),
                    label: value.trim()
                  }
                : node.data.contractRef,
              subFlowConfig: { ...MEnsureSubFlowConfig(node.data.subFlowConfig), targetFlowCode: value }
            }
          }))
        }
        onUpdateLiquidOutput={(value) => updateSelectedNode((node) => ({ ...node, data: { ...node.data, liquidConfig: { ...MEnsureLiquidConfig(node.data.liquidConfig), outputFormat: value } } }))}
        onUpdateExpressionLanguage={(value) => updateSelectedNode((node) => ({ ...node, data: { ...node.data, expression: { ...MEnsureExpression(node.data), language: value } } }))}
        onUpdateExpressionBody={(value) => updateSelectedNode((node) => ({ ...node, data: { ...node.data, expression: { ...MEnsureExpression(node.data), body: value } } }))}
        onInsertExpressionToken={(value) => updateSelectedNode((node) => ({ ...node, data: { ...node.data, expression: { ...MEnsureExpression(node.data), body: `${MEnsureExpression(node.data).body}${MEnsureExpression(node.data).body.trim() ? " " : ""}${value}` } } }))}
        onChangeInputContract={(fields) =>
          updateSelectedNode((node) => ({
            ...node,
            data: {
              ...node.data,
              contractOverride: {
                ...node.data.contractOverride,
                requestFields: fields
              }
            }
          }))
        }
        onChangeEffectiveMappings={(rows) =>
          updateSelectedNode((node) => ({
            ...node,
            data: {
              ...node.data,
              inputMappings: node.data.nodeType === "action"
                ? rows.map((row) => ({
                    id: row.id,
                    sourcePath: row.sourcePath,
                    targetPath: row.targetField ?? row.targetPath,
                    transform: row.transform,
                    language: row.language
                  }))
                : node.data.inputMappings,
              subFlowConfig: node.data.nodeType === "sub-flow"
                ? {
                    ...MEnsureSubFlowConfig(node.data.subFlowConfig),
                    inputMappings: rows.map((row) => ({
                      id: row.id,
                      sourcePath: row.sourcePath,
                      targetPath: row.targetField ?? row.targetPath,
                      transform: row.transform,
                      language: row.language
                    }))
                  }
                : node.data.subFlowConfig,
              contractLayer: node.data.contractLayer
            }
          }))
        }
        onChangeOutputContract={(fields) =>
          updateSelectedNode((node) => ({
            ...node,
            data: {
              ...node.data,
              contractOverride: {
                ...node.data.contractOverride,
                responseFields: fields.filter((field) => !field.isResultPayload)
              }
            }
          }), "immediate")
        }
        onDeleteNode={deleteSelectedNode}
      />
    </div>
  );

  return (
    <ReactFlowProvider>
      <section ref={shellRef} style={{ ...MEditorShellStyle, ...MEditorShellLayoutStyle(isCompactLayout), ...themeStyles }}>
        <aside style={{ ...MSidebarStyle, ...MSidebarLayoutStyle(isCompactLayout) }}>
          {palettePanel}
          {actionsPanel}
          {inspectorPanel}
        </aside>

        <div
          ref={canvasPanelRef}
          style={{ ...MCanvasPanelStyle, ...MCanvasPanelLayoutStyle(isCompactLayout), height: resolvedCanvasHeight }}
          data-testid="rule-flow-canvas"
          data-node-count={nodes.length}
          data-edge-count={edges.length}
          onDragOver={handleCanvasDragOver}
          onDrop={handleCanvasDrop}
        >
          <ReactFlow
            style={{ width: "100%", height: "100%" }}
            nodes={nodes}
            edges={edges}
            nodeTypes={M_NODE_TYPES}
            onMoveStart={() => {
              allowAutoFitRef.current = false;
            }}
            onNodeDragStart={() => {
              allowAutoFitRef.current = false;
            }}
            onNodesChange={(changes) => handleNodesChange(changes)}
            onEdgesChange={(changes) => handleEdgesChange(changes)}
            onConnect={(connection) => {
              if (readOnly) {
                return;
              }
              const tentativeGraph = MOrderRuleFlowGraph(
                buildGraph(nodesRef.current, addEdge({ ...connection, label: "always", data: { edgeType: "always" } }, edgesRef.current) as Edge[]),
                {
                  flowCode: workflowCode,
                  currentFlowContract: workflowCode ? flowContractCacheRef.current.get(workflowCode) : undefined,
                  flowContractsByCode: flowContractCacheRef.current,
                  nodeContractsById: nodeContractCacheRef.current
                }
              );
              if (!tentativeGraph.isValid) {
                setContractLoadState({ status: "error", message: tentativeGraph.issues[0]?.message ?? "Cannot connect nodes because the new order violates dependencies." });
                return;
              }
              commitGraph(tentativeGraph.graph);
            }}
            onNodeClick={(_event, node) => { setSelectedNodeId(node.id); setSelectedEdgeId(""); setInspectorTab(MDefaultInspectorTabForNode(node.data.nodeType)); }}
            onEdgeClick={(_event, edge) => { setSelectedEdgeId(edge.id); setSelectedNodeId(""); setInspectorTab("general"); }}
            onPaneClick={() => { setSelectedNodeId(""); setSelectedEdgeId(""); setInspectorTab("general"); }}
            nodesConnectable={!readOnly}
            nodesDraggable={!readOnly}
            elementsSelectable
          >
            <MFlowRuntimeSync nodeIds={nodes.map((node) => node.id)} syncToken={viewportSyncToken} hostElement={allowAutoFitRef.current ? canvasPanelRef.current : null} />
            <MiniMap />
            <Controls />
            <Background />
          </ReactFlow>
        </div>
      </section>
    </ReactFlowProvider>
  );

  function handleNodesChange(changes: NodeChange[]): void {
    if (readOnly) {
      return;
    }
    const nextNodes = applyNodeChanges(changes, nodesRef.current) as Node<MCanvasNodeData>[];
    if (isRestoringRef.current) {
      setNodes(nextNodes);
      return;
    }
    const selectedIds = nextNodes.filter((node) => node.selected).map((node) => node.id);
    setSelectedNodeId(selectedIds[0] ?? selectedNodeId);

    const hasStructuralChange = changes.some((change) => change.type === "add" || change.type === "remove" || change.type === "replace");
    const positionChanges = changes.filter((change) => change.type === "position");
    const hasPositionDragInProgress = positionChanges.some((change) => (change as NodeChange & { dragging?: boolean }).dragging);
    const hasPositionCommit = positionChanges.length > 0 && !hasPositionDragInProgress;

    if (!hasStructuralChange && !hasPositionCommit) {
      setNodes(nextNodes);
      return;
    }
    if (hasPositionCommit) {
      allowAutoFitRef.current = false;
    }
    commitGraph(buildGraph(nextNodes, edgesRef.current));
  }

  function handleEdgesChange(changes: EdgeChange[]): void {
    if (readOnly) {
      return;
    }
    const nextEdges = applyEdgeChanges(changes, edgesRef.current) as Edge[];
    if (isRestoringRef.current) {
      setEdges(nextEdges);
      return;
    }
    const selectedIds = nextEdges.filter((edge) => edge.selected).map((edge) => edge.id);
    setSelectedEdgeId(selectedIds[0] ?? selectedEdgeId);
    const hasSemanticChange = changes.some((change) => change.type === "add" || change.type === "remove" || change.type === "replace");
    if (!hasSemanticChange) {
      setEdges(nextEdges);
      return;
    }
    commitGraph(buildGraph(nodesRef.current, nextEdges));
  }

  function handlePaletteDragStart(event: React.DragEvent<HTMLButtonElement>, nodeType: MRuleFlowNodeType): void {
    if (readOnly) {
      return;
    }
    event.dataTransfer.setData(M_DRAG_NODE_TYPE_KEY, nodeType);
    event.dataTransfer.setData("text/plain", nodeType);
    event.dataTransfer.effectAllowed = "move";
  }

  function handleCanvasDragOver(event: React.DragEvent<HTMLDivElement>): void {
    if (readOnly || !event.dataTransfer.types.includes(M_DRAG_NODE_TYPE_KEY)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleCanvasDrop(event: React.DragEvent<HTMLDivElement>): void {
    if (readOnly) {
      return;
    }
    const draggedType = event.dataTransfer.getData(M_DRAG_NODE_TYPE_KEY);
    if (!MIsNodeType(draggedType)) {
      return;
    }
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    addNode(draggedType, { x: Math.max(32, event.clientX - rect.left - 84), y: Math.max(32, event.clientY - rect.top - 24) });
  }
}

function canvasNodeToGraphNode(node: Node<MCanvasNodeData>): MRuleFlowNode {
  const expression = MEnsureExpression(node.data);
  return {
    id: node.id,
    type: MNormalizeNodeType(node.type),
    label: node.data.label,
    ruleCode: node.data.ruleCode,
    feelExpression: expression.language === "feel" ? expression.body : undefined,
    position: { x: node.position.x, y: node.position.y },
    data: MNormalizeNodeData(node.data)
  };
}

function canvasEdgeToGraphEdge(edge: Edge) {
  return { id: edge.id, source: edge.source, target: edge.target, label: typeof edge.label === "string" ? edge.label : undefined, edgeType: MNormalizeEdgeType(edge.data?.edgeType) };
}

function exportGraph(graph: MRuleFlowGraph, ruleSetCode?: string): void {
  const payload = MSerializeRuleFlowGraph(graph);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${ruleSetCode ?? "rule-flow"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

const MEditorShellStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  minHeight: 0,
  height: "100%",
  width: "100%",
  minWidth: 0,
  overflow: "auto"
};
const MSidebarStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  padding: 18,
  borderRadius: 22,
  border: "1px solid rgba(148, 163, 184, 0.25)",
  minHeight: 0,
  overflow: "auto"
};
const MSidebarTopStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  flex: "0 0 auto"
};
const MSidebarActionsPanelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  minHeight: 0,
  borderRadius: 18,
  border: "1px solid rgba(148, 163, 184, 0.22)",
  background: "rgba(255, 255, 255, 0.94)",
  padding: "12px 14px",
  boxShadow: "0 1px 4px rgba(15,23,42,0.06)"
};
const MSidebarInspectorPanelStyle: React.CSSProperties = {
  display: "flex",
  flex: "0 0 auto"
};
const MCanvasPanelStyle: React.CSSProperties = {
  position: "relative",
  minWidth: 0,
  borderRadius: 24,
  overflow: "hidden",
  border: "1px solid rgba(148, 163, 184, 0.25)",
  background: "radial-gradient(circle at top left, rgba(37,99,235,0.12), transparent 38%), linear-gradient(180deg, rgba(248,250,252,0.96), rgba(241,245,249,0.92))"
};
const MSectionTitleStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 13,
  color: "#64748b"
};
const MLightThemeStyle: React.CSSProperties = { color: "#0f172a" };
const MDarkThemeStyle: React.CSSProperties = { color: "#e2e8f0" };
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
const MValidationSummaryStyle = (hasErrors: boolean): React.CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: "10px 12px",
  borderRadius: 14,
  border: hasErrors ? "1px solid rgba(220, 38, 38, 0.24)" : "1px solid rgba(245, 158, 11, 0.24)",
  background: hasErrors ? "rgba(254, 242, 242, 0.95)" : "rgba(255, 251, 235, 0.95)",
  color: hasErrors ? "#b91c1c" : "#92400e",
  fontSize: 12
});

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

function MEditorShellLayoutStyle(isCompactLayout: boolean): React.CSSProperties {
  return {
    gridTemplateColumns: isCompactLayout ? "minmax(0, 1fr)" : "minmax(360px, 460px) minmax(0, 1fr)",
    alignContent: isCompactLayout ? "start" : "stretch"
  };
}

function MCanvasPanelLayoutStyle(isCompactLayout: boolean): React.CSSProperties {
  return {
    minHeight: isCompactLayout ? 420 : 640,
    order: isCompactLayout ? -1 : 0
  };
}

function MSidebarLayoutStyle(_isCompactLayout: boolean): React.CSSProperties {
  return {};
}

function MSidebarTopLayoutStyle(_isCompactLayout: boolean): React.CSSProperties {
  return {};
}

function MSidebarInspectorPanelLayoutStyle(_isCompactLayout: boolean): React.CSSProperties {
  return {};
}

function MSidebarActionsPanelLayoutStyle(_isCompactLayout: boolean): React.CSSProperties {
  return {};
}

export { MCreateRuleFlowGraphSignature, MEnsureRuleFlowGraph, MImportRuleFlowGraph, MSerializeRuleFlowGraph } from "./rule-flow-runtime.js";
