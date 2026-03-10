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
  MRuleFlowContractReference,
  MRuleFlowContractSchema,
  MRuleFlowExpressionLanguage,
  MRuleFlowGraph,
  MRuleFlowNode,
  MRuleFlowNodeType
} from "../../models.js";
import { MCreateEmptyRuleFlowGraph } from "../../models.js";
import { MRuleFlowContractService } from "../../services/rule-flow-contract-service.js";
import {
  MActionButtonStyle,
  MRuleFlowInspector,
  type MContractLoadState
} from "./rule-flow-inspector.js";
import {
  M_BASE_NODE_STYLE,
  MCreateContractCacheKey,
  MCreateDefaultExpression,
  MCreateRuleFlowGraphSignature,
  MDefaultInspectorTabForNode,
  MEnsureExpression,
  MEnsureLiquidConfig,
  MEnsureRuleFlowGraph,
  MEnsureSubFlowConfig,
  MGraphToCanvasEdges,
  MGraphToCanvasNodes,
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
const M_COMPACT_LAYOUT_BREAKPOINT = 1480;

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
  const [nodes, setNodes] = useState<Node<MCanvasNodeData>[]>(() => MGraphToCanvasNodes(initialGraph));
  const [edges, setEdges] = useState<Edge[]>(() => MGraphToCanvasEdges(initialGraph));
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [selectedEdgeId, setSelectedEdgeId] = useState("");
  const [inspectorTab, setInspectorTab] = useState<MInspectorTab>("general");
  const [contractLoadState, setContractLoadState] = useState<MContractLoadState>({ status: "idle" });
  const metadataRef = useRef(initialGraph.metadata);
  const historyRef = useRef<MRuleFlowGraph[]>([initialGraph]);
  const historyIndexRef = useRef(0);
  const lastGraphSignatureRef = useRef(MCreateRuleFlowGraphSignature(initialGraph));
  const [viewportSyncToken, setViewportSyncToken] = useState(0);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const contractCacheRef = useRef(new Map<string, { title?: string; requestContract?: MRuleFlowContractSchema; responseContract?: MRuleFlowContractSchema }>());
  const contractService = useMemo(
    () => (apiBaseUrl ? new MRuleFlowContractService({ baseUrl: apiBaseUrl, tenantId }) : null),
    [apiBaseUrl, tenantId]
  );
  const shellRef = useRef<HTMLElement | null>(null);
  const canvasPanelRef = useRef<HTMLDivElement | null>(null);
  const allowAutoFitRef = useRef(true);
  const [shellWidth, setShellWidth] = useState(0);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    const nextGraph = MEnsureRuleFlowGraph(graph);
    const nextSignature = MCreateRuleFlowGraphSignature(nextGraph);
    if (nextSignature === lastGraphSignatureRef.current) {
      return;
    }
    metadataRef.current = nextGraph.metadata;
    historyRef.current = [nextGraph];
    historyIndexRef.current = 0;
    lastGraphSignatureRef.current = nextSignature;
    allowAutoFitRef.current = true;
    setViewportSyncToken((current) => current + 1);
    setSelectedNodeId("");
    setSelectedEdgeId("");
    setInspectorTab("general");
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

  const selectedNode = useMemo(() => (selectedNodeId ? nodes.find((node) => node.id === selectedNodeId) ?? null : null), [nodes, selectedNodeId]);
  const selectedExpression = selectedNode ? MEnsureExpression(selectedNode.data) : { language: "feel" as const, body: "" };
  const selectedNodeCacheKey = selectedNode && workflowCode ? `node:${workflowCode}:${selectedNode.id}` : "";
  const selectedContractCacheKey = selectedNode?.data.contractRef ? MCreateContractCacheKey(selectedNode.data.contractRef) : "";
  const selectedRequestContract =
    selectedNode?.data.requestContract ??
    (selectedNodeCacheKey ? contractCacheRef.current.get(selectedNodeCacheKey)?.requestContract : undefined) ??
    (selectedContractCacheKey ? contractCacheRef.current.get(selectedContractCacheKey)?.requestContract : undefined);
  const selectedResponseContract =
    selectedNode?.data.responseContract ??
    (selectedNodeCacheKey ? contractCacheRef.current.get(selectedNodeCacheKey)?.responseContract : undefined) ??
    (selectedContractCacheKey ? contractCacheRef.current.get(selectedContractCacheKey)?.responseContract : undefined);

  useEffect(() => {
    if (!selectedNode) {
      setContractLoadState({ status: "idle" });
      return;
    }
    if (selectedNode.data.requestContract || selectedNode.data.responseContract) {
      setContractLoadState({ status: "ready", title: selectedNode.data.contractRef?.label });
      return;
    }
    if (!selectedNode.data.contractRef?.sourceCode) {
      setContractLoadState({ status: "idle" });
      return;
    }
    const nodeCacheKey = workflowCode ? `node:${workflowCode}:${selectedNode.id}` : "";
    if (nodeCacheKey) {
      const cachedNodeContract = contractCacheRef.current.get(nodeCacheKey);
      if (cachedNodeContract) {
        setContractLoadState({ status: "ready", title: cachedNodeContract.title });
        return;
      }
    }

    const cacheKey = MCreateContractCacheKey(selectedNode.data.contractRef);
    const cached = contractCacheRef.current.get(cacheKey);
    if (cached) {
      setContractLoadState({ status: "ready", title: cached.title });
      return;
    }
    if (!contractService) {
      setContractLoadState({ status: "error", message: "No contract API configured for this editor." });
      return;
    }

    let cancelled = false;
    setContractLoadState({ status: "loading" });
    void (async () => {
      try {
        if (nodeCacheKey) {
          const nodeResponse = await contractService.MGetNodeAuthoringContract(workflowCode!, selectedNode.id);
          if (cancelled) {
            return;
          }
          contractCacheRef.current.set(nodeCacheKey, {
            title: nodeResponse.ruleCode,
            requestContract: nodeResponse.requestScope,
            responseContract: nodeResponse.responseDelta
          });
          setContractLoadState({ status: "ready", title: nodeResponse.ruleCode });
          return;
        }

        const response =
          selectedNode.data.contractRef?.sourceType === "flow"
            ? await contractService.MGetFlowContract(selectedNode.data.contractRef.sourceCode)
            : await contractService.MGetByReference(selectedNode.data.contractRef!);
        if (cancelled) {
          return;
        }
        contractCacheRef.current.set(cacheKey, { title: response.title, requestContract: response.requestContract, responseContract: response.responseContract });
        setContractLoadState({ status: "ready", title: response.title });
      } catch (error) {
        if (!cancelled) {
          setContractLoadState({ status: "error", message: error instanceof Error ? error.message : "Unable to load contract metadata." });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contractService, selectedNode, workflowCode]);

  if (licenseStatus === "unlicensed") {
    return (
      <section style={MLicenseFallbackStyle}>
        <strong>Rule Flow Designer requires a Muonroi commercial license.</strong>
        <span>Load an activation proof before rendering this editor.</span>
      </section>
    );
  }

  function commitGraph(nextGraph: MRuleFlowGraph, options?: MCommitOptions): void {
    const normalized = MEnsureRuleFlowGraph(nextGraph);
    const nextSignature = MCreateRuleFlowGraphSignature(normalized);
    metadataRef.current = normalized.metadata;
    lastGraphSignatureRef.current = nextSignature;
    setNodes(MGraphToCanvasNodes(normalized));
    setEdges(MGraphToCanvasEdges(normalized));
    if (options?.syncViewport) {
      allowAutoFitRef.current = true;
      setViewportSyncToken((current) => current + 1);
    }
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

  function buildGraph(nextNodes: Node<MCanvasNodeData>[], nextEdges: Edge[]): MRuleFlowGraph {
    return {
      nodes: nextNodes.map(canvasNodeToGraphNode),
      edges: nextEdges.map(canvasEdgeToGraphEdge),
      metadata: { ...metadataRef.current, version: Math.max(1, metadataRef.current.version ?? 1), lastModifiedAt: new Date().toISOString() }
    };
  }

  function updateSelectedNode(updater: (node: Node<MCanvasNodeData>) => Node<MCanvasNodeData>): void {
    if (readOnly || !selectedNode) {
      return;
    }
    commitGraph(buildGraph(nodesRef.current.map((node) => (node.id === selectedNode.id ? updater(node) : node)), edgesRef.current));
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

  function addMapping(kind: "input" | "output"): void {
    updateSelectedNode((node) => {
      const config = MEnsureSubFlowConfig(node.data.subFlowConfig);
      const row = { id: `map-${Math.random().toString(36).slice(2, 9)}`, sourcePath: "", targetPath: "", language: selectedExpression.language };
      return {
        ...node,
        data: {
          ...node.data,
          subFlowConfig: kind === "input" ? { ...config, inputMappings: [...config.inputMappings, row] } : { ...config, outputMappings: [...config.outputMappings, row] }
        }
      };
    });
  }

  const computedHeight = typeof height === "number" ? `${height}px` : height;
  const isCompactLayout = shellWidth > 0 && shellWidth < M_COMPACT_LAYOUT_BREAKPOINT;
  const resolvedCanvasHeight = isCompactLayout ? "min(52vh, 520px)" : computedHeight;
  const themeStyles = theme === "dark" ? MDarkThemeStyle : MLightThemeStyle;

  return (
    <ReactFlowProvider>
      <section ref={shellRef} style={{ ...MEditorShellStyle, ...MEditorShellLayoutStyle(isCompactLayout), ...themeStyles }}>
        <aside style={MSidebarStyle}>
          <div style={MSectionTitleStyle}>
            <strong>Palette</strong>
            <span>Add nodes to compose a publishable rule flow.</span>
          </div>
          {(["trigger", "condition", "action", "decision-table", "sub-flow", "liquid", "end"] as MRuleFlowNodeType[]).map((nodeType) => (
            <button key={nodeType} type="button" style={MPaletteButtonStyle(nodeType)} data-testid={`palette-${nodeType}`} draggable={!readOnly} onClick={() => addNode(nodeType)} onDragStart={(event) => handlePaletteDragStart(event, nodeType)} disabled={readOnly}>
              {M_NODE_TITLES[nodeType]}
            </button>
          ))}
          <div style={MSectionTitleStyle}>
            <strong>Actions</strong>
            <span>Undo, publish and export without leaving the flow canvas.</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
            <button type="button" style={MActionButtonStyle(false)} onClick={() => historyIndexRef.current > 0 && (historyIndexRef.current -= 1, commitGraph(historyRef.current[historyIndexRef.current], { pushHistory: false }))} disabled={historyIndexRef.current === 0}>Undo</button>
            <button type="button" style={MActionButtonStyle(false)} onClick={() => historyIndexRef.current < historyRef.current.length - 1 && (historyIndexRef.current += 1, commitGraph(historyRef.current[historyIndexRef.current], { pushHistory: false }))} disabled={historyIndexRef.current >= historyRef.current.length - 1}>Redo</button>
            <button type="button" style={MActionButtonStyle(true)} onClick={() => onPublish?.(buildGraph(nodesRef.current, edgesRef.current))} disabled={readOnly || !onPublish}>Publish</button>
            <button type="button" style={MActionButtonStyle(false)} onClick={() => exportGraph(buildGraph(nodesRef.current, edgesRef.current), metadataRef.current.ruleSetCode)}>Export</button>
          </div>

          <MRuleFlowInspector
            selectedNode={selectedNode ? { id: selectedNode.id, data: selectedNode.data } : null}
            selectedExpression={selectedExpression}
            selectedRequestContract={selectedRequestContract}
            selectedResponseContract={selectedResponseContract}
            contractLoadState={contractLoadState}
            readOnly={readOnly}
            apiBaseUrl={apiBaseUrl}
            inspectorTab={inspectorTab}
            setInspectorTab={setInspectorTab}
            onUpdateLabel={(value) => updateSelectedNode((node) => ({ ...node, data: { ...node.data, label: value } }))}
            onUpdateRuleCode={(value) =>
              updateSelectedNode((node) => ({ ...node, data: { ...node.data, ruleCode: value, contractRef: MInferContractReference(node.data.nodeType, value, node.data.contractRef) } }))
            }
            onUpdateDescription={(value) => updateSelectedNode((node) => ({ ...node, data: { ...node.data, description: value } }))}
            onUpdateContractRef={(value) => updateSelectedNode((node) => ({ ...node, data: { ...node.data, contractRef: value, requestContract: undefined, responseContract: undefined } }))}
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
            onChangeMappings={(kind, rows) => updateSelectedNode((node) => ({ ...node, data: { ...node.data, subFlowConfig: kind === "input" ? { ...MEnsureSubFlowConfig(node.data.subFlowConfig), inputMappings: rows } : { ...MEnsureSubFlowConfig(node.data.subFlowConfig), outputMappings: rows } } }))}
            onAddMapping={addMapping}
            onDeleteNode={deleteSelectedNode}
          />
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
            onConnect={(connection) => !readOnly && commitGraph(buildGraph(nodesRef.current, addEdge({ ...connection, label: "always", data: { edgeType: "always" } }, edgesRef.current) as Edge[]))}
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
    gridTemplateColumns: isCompactLayout ? "minmax(0, 1fr)" : "minmax(420px, 520px) minmax(0, 1fr)",
    alignContent: isCompactLayout ? "start" : "stretch"
  };
}

function MCanvasPanelLayoutStyle(isCompactLayout: boolean): React.CSSProperties {
  return {
    minHeight: isCompactLayout ? 420 : 640,
    order: isCompactLayout ? -1 : 0
  };
}

export { MCreateRuleFlowGraphSignature, MEnsureRuleFlowGraph, MSerializeRuleFlowGraph } from "./rule-flow-runtime.js";
