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
  MContractValidationIssue,
  MDecisionTableModel,
  MRuleCatalogGroup,
  MRuleCatalogItem,
  MRuleFlowGraph,
  MRuleFlowNode,
  MRuleFlowNodeType,
  MRuleFlowEdgeType
} from "../../models.js";
import { MRuleFlowContractService, type MRuleFlowSummary } from "../../services/rule-flow-contract-service.js";
import { MRuleCatalogService } from "../../services/rule-catalog-service.js";
import { MRuleEngineApi } from "../../services/rule-engine-api.js";
import { useRuleFlowHistory } from "../../hooks/useRuleFlowHistory.js";
import {
  MActionButtonStyle,
  MRuleFlowInspector,
  MWarningBannerStyle,
  type MContractLoadState
} from "./rule-flow-inspector.js";
import { CatalogPaletteSection } from "./CatalogPaletteSection.js";
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
import {
  MGetThemeTokens,
  M_NODE_ICONS,
  M_NODE_DESCRIPTIONS,
  M_EDGE_COLORS,
  M_EDGE_COLORS_DARK,
  type MFlowTheme,
  type MFlowThemeTokens
} from "./rule-flow-theme.js";
import { MApplyRuleFlowAuthoringLayers, MOrderRuleFlowGraph, MValidateGraphForPublish } from "./rule-flow-authoring.js";

export interface MuRuleFlowEditorProps {
  graph: MRuleFlowGraph;
  onGraphChange?: (graph: MRuleFlowGraph) => void;
  readOnly?: boolean;
  theme?: "light" | "dark";
  height?: number | string;
  apiBaseUrl?: string;
  catalogApiBase?: string;
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

type MSidebarSection = "palette" | "actions" | "inspector";
type MPublishConfirmState = {
  graph: MRuleFlowGraph;
  warnings: MContractValidationIssue[];
};
type MDecisionTableLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };
type MDependencyOverlayItem = {
  nodeId: string;
  label: string;
  ruleCode: string;
  order: number;
  dependsOn: string[];
  dependents: string[];
};

const M_DRAG_NODE_TYPE_KEY = "application/muonroi-rule-flow-node-type";
const M_DRAG_RULE_TEMPLATE_KEY = "application/muonroi-rule-flow-rule-template";
const M_FIT_VIEW_OPTIONS = { duration: 0, padding: 0.22, minZoom: 0.18, maxZoom: 1.1 };
const M_COMPACT_LAYOUT_BREAKPOINT = 860;
const M_EDGE_TYPE_LABELS: Record<MRuleFlowEdgeType, string> = {
  always: "Always",
  "on-true": "On Pass",
  "on-false": "On Fail",
  "on-error": "On Error"
};
const M_EDGE_TYPE_HINTS: Record<MRuleFlowEdgeType, string> = {
  always: "Always continue to the next node when the source node executed.",
  "on-true": "Continue only when the source node passed.",
  "on-false": "Continue only when the source node failed without throwing.",
  "on-error": "Continue only when the source node threw an exception."
};

function MRuleFlowNodeCard({ data, selected }: { data: MCanvasNodeData; selected?: boolean }): React.JSX.Element {
  const accent = M_NODE_ACCENTS[data.nodeType];
  const tokens = MGetThemeTokens(data._theme ?? "light");
  const expression = MEnsureExpression(data);
  const requestCount = data.requestContract?.fields.length ?? 0;
  const responseCount = data.responseContract?.fields.length ?? 0;
  const iconPath = M_NODE_ICONS[data.nodeType];

  return (
    <div
      style={{
        ...M_BASE_NODE_STYLE,
        background: tokens.nodeBg,
        boxShadow: tokens.nodeShadow,
        borderTop: selected ? `2px solid ${accent}` : tokens.nodeBorder,
        borderRight: selected ? `2px solid ${accent}` : tokens.nodeBorder,
        borderBottom: selected ? `2px solid ${accent}` : tokens.nodeBorder,
        borderLeft: `8px solid ${accent}`,
        borderRadius: data.nodeType === "end" ? 999 : data.nodeType === "condition" ? 24 : 18
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width={14} height={14} viewBox="0 0 16 16" fill={accent} style={{ flexShrink: 0 }}>
            <path d={iconPath} />
          </svg>
          <span style={{ color: accent, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{M_NODE_TITLES[data.nodeType]}</span>
        </div>
        <strong style={{ fontSize: 14, color: tokens.nodeText }}>{data.label}</strong>
        {data.ruleCode ? <span style={{ fontSize: 12, color: tokens.nodeSubtext }}>Rule: {data.ruleCode}</span> : null}
        {data.contractRef?.sourceCode ? <span style={{ fontSize: 11, color: tokens.nodeMutedText }}>Contract: {data.contractRef.sourceType}/{data.contractRef.sourceCode}</span> : null}
        {expression.body ? (
          <span style={{ display: "inline-block", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, color: tokens.nodeSubtext }}>
            {expression.language.toUpperCase()}: {expression.body}
          </span>
        ) : null}
        {(requestCount > 0 || responseCount > 0) ? <span style={{ fontSize: 11, color: tokens.nodeMutedText }}>Inline contracts {requestCount}/{responseCount}</span> : null}
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
  catalogApiBase,
  tenantId,
  workflowCode,
  onPublish,
  licenseStatus = "licensed"
}: MuRuleFlowEditorProps): React.JSX.Element {
  const initialGraph = useMemo(() => MEnsureRuleFlowGraph(graph), [graph]);
  const history = useRuleFlowHistory(initialGraph);

  function MInjectTheme(canvasNodes: Node<MCanvasNodeData>[]): Node<MCanvasNodeData>[] {
    return canvasNodes.map((node) => ({ ...node, data: { ...node.data, _theme: theme as MFlowTheme } }));
  }

  function MStyleEdges(rawEdges: Edge[]): Edge[] {
    const colors = theme === "dark" ? M_EDGE_COLORS_DARK : M_EDGE_COLORS;
    return rawEdges.map((edge) => {
      const edgeType = (edge.data as { edgeType?: string } | undefined)?.edgeType ?? "always";
      const color = colors[edgeType as keyof typeof colors] ?? colors.always;
      return {
        ...edge,
        style: { stroke: color, strokeWidth: 2 },
        labelStyle: { fill: color, fontWeight: 600, fontSize: 11 },
        labelBgStyle: { fill: MGetThemeTokens(theme as MFlowTheme).edgeLabelBg, fillOpacity: 0.92 },
        labelBgPadding: [6, 4] as [number, number],
        labelBgBorderRadius: 8
      };
    });
  }

  const [nodes, setNodes] = useState<Node<MCanvasNodeData>[]>(() => MInjectTheme(MGraphToCanvasNodes(history.present)));
  const [edges, setEdges] = useState<Edge[]>(() => MStyleEdges(MGraphToCanvasEdges(history.present)));
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [selectedEdgeId, setSelectedEdgeId] = useState("");
  const [inspectorTab, setInspectorTab] = useState<MInspectorTab>("general");
  const [contractLoadState, setContractLoadState] = useState<MContractLoadState>({ status: "idle" });
  const [flowOptions, setFlowOptions] = useState<Array<{ code: string; label: string }>>([]);
  const [decisionTableOptions, setDecisionTableOptions] = useState<Array<{ code: string; label: string }>>([]);
  const [selectedDecisionTable, setSelectedDecisionTable] = useState<MDecisionTableModel | null>(null);
  const [decisionTableLoadState, setDecisionTableLoadState] = useState<MDecisionTableLoadState>({ status: "idle" });
  const [catalogGroups, setCatalogGroups] = useState<MRuleCatalogGroup[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [publishConfirmState, setPublishConfirmState] = useState<MPublishConfirmState | null>(null);
  const metadataRef = useRef(history.present.metadata);
  const lastGraphSignatureRef = useRef(MCreateRuleFlowGraphSignature(history.present));
  const [viewportSyncToken, setViewportSyncToken] = useState(0);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const nodeContractCacheRef = useRef(new Map<string, Awaited<ReturnType<MRuleFlowContractService["MGetNodeAuthoringContract"]>>>());
  const flowContractCacheRef = useRef(new Map<string, Awaited<ReturnType<MRuleFlowContractService["MGetFlowContract"]>>>());
  const decisionTableCacheRef = useRef(new Map<string, MDecisionTableModel>());
  const contractService = useMemo(
    () => (apiBaseUrl ? new MRuleFlowContractService({ baseUrl: apiBaseUrl, tenantId }) : null),
    [apiBaseUrl, tenantId]
  );
  const catalogService = useMemo(
    () => (catalogApiBase ? new MRuleCatalogService({ baseUrl: catalogApiBase, tenantId }) : null),
    [catalogApiBase, tenantId]
  );
  const ruleEngineApi = useMemo(() => (apiBaseUrl ? new MRuleEngineApi({ baseUrl: apiBaseUrl, tenantId }) : null), [apiBaseUrl, tenantId]);
  const shellRef = useRef<HTMLElement | null>(null);
  const canvasPanelRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const allowAutoFitRef = useRef(true);
  const isRestoringRef = useRef(false);
  const restoreUnlockRef = useRef<number | null>(null);
  const [shellWidth, setShellWidth] = useState(0);
  const [openSection, setOpenSection] = useState<MSidebarSection | null>("inspector");
  const [depOverlayOpen, setDepOverlayOpen] = useState(true);
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
    setNodes((prev) => MInjectTheme(prev));
    setEdges((prev) => MStyleEdges(prev));
  }, [theme]);

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
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable;

      if ((event.ctrlKey || event.metaKey) && event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        flushPendingCommit();
        history.undo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && (event.key === "y" || (event.key === "z" && event.shiftKey))) {
        event.preventDefault();
        flushPendingCommit();
        history.redo();
        return;
      }
      if (event.key === "Escape") {
        setSelectedNodeId("");
        setSelectedEdgeId("");
        setInspectorTab("general");
        return;
      }

      if (readOnly || isInput) {
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedNodeId) {
          deleteSelectedNode();
          return;
        }
        if (selectedEdgeId) {
          deleteSelectedEdge();
        }
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
  const selectedNode = useMemo(() => (selectedNodeId ? MInjectTheme(MGraphToCanvasNodes(derivedGraph)).find((node) => node.id === selectedNodeId) ?? null : null), [derivedGraph, selectedNodeId, theme]);
  const selectedEdge = useMemo(
    () => (selectedEdgeId ? edges.find((edge) => edge.id === selectedEdgeId) ?? null : null),
    [edges, selectedEdgeId]
  );
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
  const dependencyOverlay = useMemo(() => MBuildDependencyOverlay(derivedGraph), [derivedGraph]);

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
          for (const table of tables) {
            decisionTableCacheRef.current.set(table.id, table);
          }
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
    if (selectedNode?.data.nodeType !== "decision-table") {
      setSelectedDecisionTable(null);
      setDecisionTableLoadState({ status: "idle" });
      return;
    }

    if (!ruleEngineApi) {
      setSelectedDecisionTable(null);
      setDecisionTableLoadState({ status: "error", message: "No decision table API configured for this editor." });
      return;
    }

    const code = selectedNode.data.contractRef?.sourceCode?.trim() ?? selectedNode.data.ruleCode?.trim() ?? "";
    if (!code) {
      setSelectedDecisionTable(null);
      setDecisionTableLoadState({ status: "idle" });
      return;
    }

    const cached = decisionTableCacheRef.current.get(code);
    if (cached) {
      setSelectedDecisionTable(cached);
      setDecisionTableLoadState({ status: "ready" });
      applyDecisionTableContracts(selectedNode.id, cached);
      return;
    }

    let cancelled = false;
    setDecisionTableLoadState({ status: "loading" });
    void (async () => {
      try {
        const table = await ruleEngineApi.MGetDecisionTable(code);
        if (cancelled) {
          return;
        }
        decisionTableCacheRef.current.set(code, table);
        setSelectedDecisionTable(table);
        setDecisionTableLoadState({ status: "ready" });
        applyDecisionTableContracts(selectedNode.id, table);
      } catch (error) {
        if (!cancelled) {
          setSelectedDecisionTable(null);
          setDecisionTableLoadState({
            status: "error",
            message: error instanceof Error ? error.message : "Failed to load decision table metadata."
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ruleEngineApi, selectedNode?.id, selectedNode?.data.nodeType, selectedNode?.data.contractRef?.sourceCode, selectedNode?.data.ruleCode]);

  useEffect(() => {
    if (!catalogService) {
      setCatalogGroups([]);
      setCatalogLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      setCatalogLoading(true);
      try {
        const groups = await catalogService.MListCatalog();
        if (!cancelled) {
          setCatalogGroups(groups);
          setCatalogLoading(false);
        }
      } catch {
        if (!cancelled) {
          setCatalogGroups([]);
          setCatalogLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [catalogService]);

  useEffect(() => {
    if (!contractService || !workflowCode) {
      return;
    }

    let cancelled = false;
    void (async () => {
      await MTryPrimeFlowContract(contractService, flowContractCacheRef.current, workflowCode);

      for (const node of currentGraph.nodes) {
        if (node.type === "trigger" || node.type === "end") {
          continue;
        }
        if (nodeContractCacheRef.current.has(node.id)) {
          continue;
        }
        const resolved = await MResolveNodeAuthoringContract(contractService, workflowCode, node);
        if (resolved) {
          nodeContractCacheRef.current.set(node.id, resolved);
        }
      }

      for (const node of currentGraph.nodes.filter((candidate) => candidate.type === "sub-flow")) {
        const targetFlowCode = MEnsureSubFlowConfig(node.data.subFlowConfig).targetFlowCode?.trim();
        if (!targetFlowCode) {
          continue;
        }
        const targetFlowContract = await MTryPrimeFlowContract(contractService, flowContractCacheRef.current, targetFlowCode);
        if (cancelled) {
          return;
        }
        const childTrigger = await MTryGetNodeAuthoringContract(contractService, targetFlowCode, "trigger");
        const fallbackTriggerSchema = childTrigger?.requestScope ?? targetFlowContract?.requestContract;
        const currentSchema = MEnsureSubFlowConfig(node.data.subFlowConfig).childTriggerSchema?.contractName;
        if (fallbackTriggerSchema?.contractName && currentSchema !== fallbackTriggerSchema.contractName) {
          updateNodeNow(node.id, (canvasNode) => ({
            ...canvasNode,
            data: {
              ...canvasNode.data,
              subFlowConfig: {
                ...MEnsureSubFlowConfig(canvasNode.data.subFlowConfig),
                childTriggerSchema: fallbackTriggerSchema
              }
            }
          }), false);
        }
      }

      if (!cancelled) {
        setAuthoringVersion((current) => current + 1);
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
    setOpenSection("inspector");
    const cachedNode = selectedNode && nodeContractCacheRef.current.get(selectedNode.id);
    if (cachedNode || selectedNode.data.contractLayer?.upstreamScope || selectedNode.type === "trigger" || selectedNode.type === "end") {
      setContractLoadState({ status: "ready", title: cachedNode?.ruleCode ?? selectedNode.data.contractRef?.label ?? selectedNode.data.label });
      return;
    }
    setContractLoadState(contractService ? { status: "loading" } : { status: "error", message: "No contract API configured for this editor." });
  }, [contractService, selectedNode, authoringVersion]);

  if (licenseStatus === "unlicensed") {
    const lt = MGetThemeTokens(theme as MFlowTheme);
    return (
      <section style={{ ...MLicenseFallbackStyle, background: lt.licenseBg, border: lt.licenseBorder, color: lt.licenseText }}>
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
    setNodes(MInjectTheme(MGraphToCanvasNodes(nextGraph)));
    setEdges(MStyleEdges(MGraphToCanvasEdges(nextGraph)));
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
    setNodes(MInjectTheme(MGraphToCanvasNodes(nextGraph)));
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
    setNodes(MInjectTheme(MGraphToCanvasNodes(nextGraph)));
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

  function updateSelectedEdge(updater: (edge: Edge) => Edge): void {
    if (readOnly || !selectedEdgeId) {
      return;
    }
    const nextEdges = edgesRef.current.map((edge) => (edge.id === selectedEdgeId ? updater(edge) : edge));
    commitGraph(buildGraph(nodesRef.current, nextEdges), { syncViewport: false });
  }

  function selectNodeById(nodeId: string): void {
    setSelectedNodeId(nodeId);
    setSelectedEdgeId("");
    const selected = nodesRef.current.find((node) => node.id === nodeId);
    if (selected) {
      setInspectorTab(MDefaultInspectorTabForNode(selected.data.nodeType));
    }
    setOpenSection("inspector");
  }

  function applyDecisionTableContracts(nodeId: string, table: MDecisionTableModel): void {
    const requestContract = MCreateDecisionTableContractSchema(table, "input");
    const responseContract = MCreateDecisionTableContractSchema(table, "output");
    updateNodeNow(nodeId, (node) => ({
      ...node,
      data: {
        ...node.data,
        description: node.data.description?.trim() ? node.data.description : table.description,
        requestContract,
        responseContract,
        contractRef: {
          sourceType: "decision-table",
          sourceCode: table.id,
          label: table.name
        }
      }
    }), false);
    setAuthoringVersion((current) => current + 1);
  }

  function applyAutoLayout(): void {
    const nextGraph = MCreateAutoLayoutGraph(buildGraph(nodesRef.current, edgesRef.current));
    allowAutoFitRef.current = true;
    commitGraph(nextGraph, { syncViewport: true });
  }

  function commitNewNode(nextNode: Node<MCanvasNodeData>): void {
    const nextEdges = [...edgesRef.current];
    if (selectedNodeId) {
      const nextEdgeId = `${selectedNodeId}-${nextNode.id}`;
      nextEdges.push({ id: nextEdgeId, source: selectedNodeId, target: nextNode.id, label: "always", data: { edgeType: "always" } });
      setSelectedEdgeId(nextEdgeId);
    }
    setSelectedNodeId(nextNode.id);
    setSelectedEdgeId("");
    setInspectorTab(MDefaultInspectorTabForNode(nextNode.data.nodeType));
    commitGraph(MCreateAutoLayoutGraph(buildGraph([...nodesRef.current, nextNode], nextEdges)), { syncViewport: true });
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
    commitNewNode(nextNode);
  }

  function addCatalogRule(item: MRuleCatalogItem, position?: { x: number; y: number }): void {
    if (readOnly) {
      return;
    }

    const nextNode: Node<MCanvasNodeData> = {
      id: `node-rule-${Math.random().toString(36).slice(2, 10)}`,
      type: "condition",
      position: position ?? { x: 60 + nodesRef.current.length * 36, y: 80 + (nodesRef.current.length % 4) * 90 },
      data: {
        label: item.displayName,
        nodeType: "condition",
        ruleCode: item.code,
        description: item.description,
        expression: MCreateDefaultExpression("condition"),
        contractRef: {
          sourceType: "rule",
          sourceCode: item.code,
          label: item.displayName
        },
        requestContract: item.inputSchema,
        responseContract: item.outputSchema
      }
    };
    commitNewNode(nextNode);
  }

  const computedHeight = typeof height === "number" ? `${height}px` : height;
  const isCompactLayout = shellWidth > 0 && shellWidth < M_COMPACT_LAYOUT_BREAKPOINT;
  const resolvedCanvasHeight = isCompactLayout ? "min(52vh, 520px)" : computedHeight;
  const tokens = MGetThemeTokens(theme as MFlowTheme);
  const themeStyles: React.CSSProperties = { color: tokens.textPrimary };
  const palettePanel = (
    <div data-testid="rule-flow-sidebar-palette" style={{ ...MSidebarSectionBodyStyle, ...MSidebarTopStyle, ...MSidebarTopLayoutStyle(isCompactLayout) }}>
      <div style={{ ...MSectionTitleStyle, color: tokens.sectionDescColor }}>
        <strong style={{ color: tokens.textPrimary }}>Palette</strong>
        <span>Add nodes to compose a publishable rule flow.</span>
      </div>
      {(["trigger", "condition", "action", "decision-table", "sub-flow", "liquid", "end"] as MRuleFlowNodeType[]).map((nodeType) => (
        <button key={nodeType} type="button" style={MPaletteButtonStyle(nodeType, tokens)} data-testid={`palette-${nodeType}`} draggable={!readOnly} onClick={() => addNode(nodeType)} onDragStart={(event) => handlePaletteDragStart(event, nodeType)} disabled={readOnly}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width={16} height={16} viewBox="0 0 16 16" fill={M_NODE_ACCENTS[nodeType]} style={{ flexShrink: 0 }}>
              <path d={M_NODE_ICONS[nodeType]} />
            </svg>
            <span style={{ fontWeight: 600 }}>{M_NODE_TITLES[nodeType]}</span>
          </div>
          <span style={{ fontSize: 11, color: tokens.textMuted, fontWeight: 400 }}>{M_NODE_DESCRIPTIONS[nodeType]}</span>
        </button>
      ))}
      {catalogApiBase ? (
        <CatalogPaletteSection
          groups={catalogGroups}
          loading={catalogLoading}
          readOnly={readOnly}
          onAddRule={addCatalogRule}
          onDragStart={(event, item) => handlePaletteDragStart(event, "condition", item)}
        />
      ) : null}
    </div>
  );
  const actionsPanel = (
    <div data-testid="rule-flow-sidebar-actions" style={{ ...MSidebarSectionBodyStyle, ...MSidebarActionsPanelStyle, ...MSidebarActionsPanelLayoutStyle(isCompactLayout) }}>
      <div style={{ ...MSectionTitleStyle, color: tokens.sectionDescColor }}>
        <strong style={{ color: tokens.textPrimary }}>Actions</strong>
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
        <button type="button" style={{ ...MActionButtonStyle(false), flex: "1 1 auto", minWidth: 96 }} onClick={applyAutoLayout} disabled={readOnly}>
          Auto Layout
        </button>
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
            setPublishConfirmState({
              graph: validation.graph,
              warnings: validation.issues.filter((issue) => issue.severity === "warning")
            });
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
    <div data-testid="rule-flow-sidebar-inspector" style={{ ...MSidebarSectionBodyStyle, ...MSidebarInspectorPanelStyle, ...MSidebarInspectorPanelLayoutStyle(isCompactLayout) }}>
      {selectedNode ? (
        <MRuleFlowInspector
          selectedNode={{ id: selectedNode.id, data: selectedNode.data }}
          selectedExpression={selectedExpression}
          contractLoadState={contractLoadState}
          selectedDecisionTable={selectedDecisionTable}
          decisionTableLoadState={decisionTableLoadState}
          readOnly={readOnly}
          apiBaseUrl={apiBaseUrl}
          inspectorTab={inspectorTab}
          flowOptions={flowOptions}
          decisionTableOptions={decisionTableOptions}
          setInspectorTab={setInspectorTab}
          onSelectNodeByRuleCode={(ruleCode) => {
            const match = nodesRef.current.find((node) => node.data.ruleCode === ruleCode);
            if (match) {
              selectNodeById(match.id);
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
                requestContract: undefined,
                responseContract: undefined,
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
          showSectionHeader={false}
        />
      ) : (
        <MRuleFlowEdgeInspector
          selectedEdge={selectedEdge}
          readOnly={readOnly}
          onUpdateEdgeType={(edgeType) =>
            updateSelectedEdge((edge) => ({
              ...edge,
              label: edgeType,
              data: {
                ...(edge.data ?? {}),
                edgeType
              }
            }))
          }
          onDeleteEdge={deleteSelectedEdge}
        />
      )}
    </div>
  );

  return (
    <ReactFlowProvider>
      <section ref={shellRef} style={{ ...MEditorShellStyle, ...MEditorShellLayoutStyle(isCompactLayout), ...themeStyles }}>
        <aside style={{ ...MSidebarStyle, ...MSidebarLayoutStyle(isCompactLayout), background: tokens.sidebarBg, border: tokens.sidebarBorder }}>
          {renderSidebarSection("palette", "Palette", "Compose and add nodes from the library of rule blocks.", palettePanel)}
          {renderSidebarSection("actions", "Actions", "Undo, import, export and publish the current flow.", actionsPanel)}
          {renderSidebarSection("inspector", "Inspector", selectedNode ? `Editing ${M_NODE_TITLES[selectedNode.data.nodeType]}` : "Open this section to define conditions, mappings and contracts.", inspectorPanel)}
        </aside>

        <div
          ref={canvasPanelRef}
          style={{ ...MCanvasPanelStyle, ...MCanvasPanelLayoutStyle(isCompactLayout), height: resolvedCanvasHeight, background: tokens.canvasGradient }}
          data-testid="rule-flow-canvas"
          data-node-count={nodes.length}
          data-edge-count={edges.length}
          onDragOver={handleCanvasDragOver}
          onDrop={handleCanvasDrop}
        >
          <ReactFlow
            style={{ width: "100%", height: "100%" }}
            colorMode={theme === "dark" ? "dark" : "light"}
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
              const nextEdgeId = `${connection.source}-${connection.target}-${edgesRef.current.length + 1}`;
              setSelectedEdgeId(nextEdgeId);
              setSelectedNodeId("");
              setOpenSection("inspector");
              commitGraph(MCreateAutoLayoutGraph(tentativeGraph.graph), { syncViewport: true });
            }}
            onNodeClick={(_event, node) => { selectNodeById(node.id); }}
            onEdgeClick={(_event, edge) => { setSelectedEdgeId(edge.id); setSelectedNodeId(""); setInspectorTab("general"); setOpenSection("inspector"); }}
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
          {dependencyOverlay.length > 0 ? (
            <aside data-testid="rule-flow-dependency-overlay" style={{ ...MDependencyOverlayStyle, background: tokens.overlayBg, border: tokens.overlayBorder, boxShadow: tokens.overlayShadow }}>
              <button
                type="button"
                style={{ ...MDependencyOverlayHeaderStyle, cursor: "pointer", background: "transparent", border: "none", width: "100%", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                onClick={() => setDepOverlayOpen((prev) => !prev)}
                aria-expanded={depOverlayOpen}
              >
                <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <strong>Dependency Overlay</strong>
                  <span style={{ fontSize: 12, color: tokens.textMuted }}>Execution order, prerequisites, and downstream dependents.</span>
                </span>
                <span style={{ ...MSidebarChevronStyle(depOverlayOpen), width: 22, height: 22, fontSize: 12 }}>▾</span>
              </button>
              {depOverlayOpen ? (
                <div style={MDependencyOverlayBodyStyle}>
                  {dependencyOverlay.map((item) => (
                    <button
                      key={item.nodeId}
                      type="button"
                      data-testid={`dependency-overlay-${item.ruleCode}`}
                      style={MDependencyOverlayItemStyle(item.nodeId === selectedNodeId, tokens)}
                      onClick={() => selectNodeById(item.nodeId)}
                    >
                      <span style={{ fontWeight: 700, color: tokens.textPrimary }}>#{item.order} {item.label}</span>
                      <span style={{ fontSize: 11, color: tokens.textSecondary }}>{item.ruleCode}</span>
                      <span style={{ fontSize: 11, color: tokens.textMuted }}>
                        Depends on: {item.dependsOn.length > 0 ? item.dependsOn.join(", ") : "none"}
                      </span>
                      <span style={{ fontSize: 11, color: tokens.textMuted }}>
                        Unlocks: {item.dependents.length > 0 ? item.dependents.join(", ") : "none"}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </aside>
          ) : null}
        </div>
      </section>
      {publishConfirmState ? (
        <MPublishConfirmDialog
          warnings={publishConfirmState.warnings}
          onCancel={() => setPublishConfirmState(null)}
          onConfirm={() => {
            void (async () => {
              try {
                setContractLoadState({ status: "loading" });
                await onPublish?.(publishConfirmState.graph);
                setPublishConfirmState(null);
                setContractLoadState({ status: "ready", title: "Published" });
              } catch (error) {
                setPublishConfirmState(null);
                setContractLoadState({
                  status: "error",
                  message: (error as Error).message || "Rule Studio publish failed."
                });
              }
            })();
          }}
        />
      ) : null}
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

  function handlePaletteDragStart(event: React.DragEvent<HTMLButtonElement>, nodeType: MRuleFlowNodeType, catalogItem?: MRuleCatalogItem): void {
    if (readOnly) {
      return;
    }
    event.dataTransfer.setData(M_DRAG_NODE_TYPE_KEY, nodeType);
    event.dataTransfer.setData("text/plain", nodeType);
    if (catalogItem) {
      event.dataTransfer.setData(M_DRAG_RULE_TEMPLATE_KEY, JSON.stringify(catalogItem));
    }
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
    const draggedTemplate = event.dataTransfer.getData(M_DRAG_RULE_TEMPLATE_KEY);
    if (!MIsNodeType(draggedType)) {
      return;
    }
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const position = { x: Math.max(32, event.clientX - rect.left - 84), y: Math.max(32, event.clientY - rect.top - 24) };
    if (draggedTemplate) {
      try {
        const parsed = JSON.parse(draggedTemplate) as MRuleCatalogItem;
        if (parsed.code) {
          addCatalogRule(parsed, position);
          return;
        }
      } catch {
      }
    }

    addNode(draggedType, position);
  }

  function renderSidebarSection(section: MSidebarSection, title: string, description: string, content: React.JSX.Element): React.JSX.Element {
    const isOpen = openSection === section;
    return (
      <section
        key={section}
        data-sidebar-section={section}
        data-sidebar-open={isOpen ? "true" : "false"}
        style={{
          ...MSidebarSectionStyle(isOpen),
          border: isOpen ? tokens.sidebarOpenBorder : tokens.sidebarBorder,
          background: isOpen ? tokens.sidebarOpenBg : tokens.sidebarBg,
          boxShadow: isOpen ? tokens.sidebarOpenShadow : "none"
        }}
      >
        <button
          type="button"
          style={{ ...MSidebarSectionHeaderStyle(isOpen), color: tokens.sidebarHeaderColor }}
          onClick={() => setOpenSection((current) => current === section ? null : section)}
          aria-expanded={isOpen}
        >
          <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, textAlign: "left" }}>
            <strong>{title}</strong>
            <span style={{ fontSize: 12, color: tokens.textMuted, fontWeight: 500 }}>{description}</span>
          </span>
          <span style={{ ...MSidebarChevronStyle(isOpen), background: tokens.chevronBg, color: tokens.chevronColor }}>▾</span>
        </button>
        {isOpen ? (
          <div style={MSidebarSectionContentStyle}>
            {content}
          </div>
        ) : null}
      </section>
    );
  }
}

async function MTryPrimeFlowContract(
  contractService: MRuleFlowContractService,
  cache: Map<string, Awaited<ReturnType<MRuleFlowContractService["MGetFlowContract"]>>>,
  flowCode: string
): Promise<Awaited<ReturnType<MRuleFlowContractService["MGetFlowContract"]>> | null> {
  if (cache.has(flowCode)) {
    return cache.get(flowCode) ?? null;
  }

  try {
    const contract = await contractService.MGetFlowContract(flowCode);
    cache.set(flowCode, contract);
    return contract;
  } catch {
    return null;
  }
}

async function MTryGetNodeAuthoringContract(
  contractService: MRuleFlowContractService,
  flowCode: string,
  nodeId: string
): Promise<Awaited<ReturnType<MRuleFlowContractService["MGetNodeAuthoringContract"]>> | null> {
  try {
    return await contractService.MGetNodeAuthoringContract(flowCode, nodeId);
  } catch {
    return null;
  }
}

async function MResolveNodeAuthoringContract(
  contractService: MRuleFlowContractService,
  workflowCode: string,
  node: MRuleFlowNode
): Promise<Awaited<ReturnType<MRuleFlowContractService["MGetNodeAuthoringContract"]>> | null> {
  const authored = await MTryGetNodeAuthoringContract(contractService, workflowCode, node.id);
  if (authored) {
    return authored;
  }

  const reference = node.ruleCode
    ? MInferContractReference(node.type, node.ruleCode, node.data.contractRef)
    : node.data.contractRef;
  if (!reference?.sourceCode?.trim()) {
    return null;
  }

  try {
    const contract = await contractService.MGetByReference(reference);
    return {
      flowCode: workflowCode,
      nodeId: node.id,
      nodeType: node.type,
      ruleCode: node.ruleCode,
      order: node.data.order,
      dependsOn: node.data.dependsOn ?? [],
      requestScope: contract.requestContract,
      responseDelta: contract.responseContract
    };
  } catch {
    return null;
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

function MCreateAutoLayoutGraph(graph: MRuleFlowGraph): MRuleFlowGraph {
  const normalized = MEnsureRuleFlowGraph(graph);
  if (normalized.nodes.length === 0) {
    return normalized;
  }

  const incoming = new Map<string, string[]>();
  for (const node of normalized.nodes) {
    incoming.set(node.id, []);
  }

  for (const edge of normalized.edges) {
    const bucket = incoming.get(edge.target) ?? [];
    bucket.push(edge.source);
    incoming.set(edge.target, bucket);
  }

  const levelCache = new Map<string, number>();
  const visiting = new Set<string>();
  const getLevel = (nodeId: string): number => {
    const cached = levelCache.get(nodeId);
    if (cached !== undefined) {
      return cached;
    }

    if (visiting.has(nodeId)) {
      return 0;
    }

    visiting.add(nodeId);
    const parents = incoming.get(nodeId) ?? [];
    const level = parents.length === 0 ? 0 : Math.max(...parents.map((parentId) => getLevel(parentId))) + 1;
    visiting.delete(nodeId);
    levelCache.set(nodeId, level);
    return level;
  };

  const layers = new Map<number, MRuleFlowNode[]>();
  for (const node of normalized.nodes) {
    const level = node.type === "trigger" ? 0 : getLevel(node.id);
    const bucket = layers.get(level) ?? [];
    bucket.push(node);
    layers.set(level, bucket);
  }

  const nextNodes = normalized.nodes.map((node) => ({ ...node }));
  for (const [level, bucket] of layers) {
    bucket
      .sort((left, right) => {
        const leftOrder = left.data.order ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = right.data.order ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }
        return left.label.localeCompare(right.label);
      })
      .forEach((node, index) => {
        const target = nextNodes.find((candidate) => candidate.id === node.id);
        if (!target) {
          return;
        }
        target.position = {
          x: 80 + level * 260,
          y: 120 + index * 150
        };
      });
  }

  return {
    ...normalized,
    nodes: nextNodes
  };
}

function MBuildDependencyOverlay(graph: MRuleFlowGraph): MDependencyOverlayItem[] {
  const executableNodes = graph.nodes.filter((node) => node.type !== "trigger" && node.type !== "end" && (node.ruleCode ?? "").trim().length > 0);
  const byRuleCode = new Map(executableNodes.map((node) => [node.ruleCode ?? node.id, node]));
  const dependents = new Map<string, string[]>();
  for (const node of executableNodes) {
    for (const dependency of node.data.dependsOn ?? []) {
      const bucket = dependents.get(dependency) ?? [];
      bucket.push(node.ruleCode ?? node.id);
      dependents.set(dependency, bucket);
    }
  }

  return executableNodes
    .map((node) => {
      const ruleCode = node.ruleCode ?? node.id;
      const nodeDependents = (dependents.get(ruleCode) ?? []).filter((item) => byRuleCode.has(item)).sort((left, right) => left.localeCompare(right));
      return {
        nodeId: node.id,
        label: node.label,
        ruleCode,
        order: node.data.order ?? 0,
        dependsOn: [...(node.data.dependsOn ?? [])].sort((left, right) => left.localeCompare(right)),
        dependents: nodeDependents
      };
    })
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }
      return left.label.localeCompare(right.label);
    });
}

function MCreateDecisionTableContractSchema(table: MDecisionTableModel, kind: "input" | "output") {
  const columns = kind === "input" ? table.inputColumns : table.outputColumns;
  return {
    contractName: `${table.id}_${kind}`,
    title: kind === "input" ? "Decision Table Inputs" : "Decision Table Outputs",
    description: table.description,
    rootType: "object",
    fields: columns.map((column) => ({
      path: column.name,
      label: column.label,
      dataType: column.dataType,
      required: kind === "input",
      runtimeWritten: kind === "output",
      description: `${kind === "input" ? "Input" : "Output"} column from decision table '${table.name}'.`
    }))
  };
}

function MPublishConfirmDialog({
  warnings,
  onCancel,
  onConfirm
}: {
  warnings: MContractValidationIssue[];
  onCancel: () => void;
  onConfirm: () => void;
}): React.JSX.Element {
  return (
    <div style={MPublishDialogBackdropStyle}>
      <div role="dialog" aria-modal="true" aria-labelledby="rule-flow-publish-confirm-title" style={MPublishDialogStyle}>
        <div style={MSectionTitleStyle}>
          <strong id="rule-flow-publish-confirm-title">Confirm Publish</strong>
          <span>
            {warnings.length > 0
              ? "This flow can publish, but warnings still exist. Review them before continuing."
              : "This will hand the current validated graph to the host publish handler."}
          </span>
        </div>
        {warnings.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {warnings.map((warning, index) => (
              <div key={`${warning.code}-${warning.message}-${index}`} style={MWarningBannerStyle}>
                <strong>{warning.code}</strong> {warning.message}
              </div>
            ))}
          </div>
        ) : null}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" style={MActionButtonStyle(false)} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" style={MActionButtonStyle(true)} onClick={onConfirm}>
            {warnings.length > 0 ? "Publish With Warnings" : "Confirm Publish"}
          </button>
        </div>
      </div>
    </div>
  );
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

function MRuleFlowEdgeInspector({
  selectedEdge,
  readOnly,
  onUpdateEdgeType,
  onDeleteEdge
}: {
  selectedEdge: Edge | null;
  readOnly: boolean;
  onUpdateEdgeType: (edgeType: MRuleFlowEdgeType) => void;
  onDeleteEdge: () => void;
}): React.JSX.Element {
  if (!selectedEdge) {
    return (
      <div style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
        Select a node or edge to edit it. Use edge routing to decide whether downstream nodes run `always`, `on pass`, `on fail`, or `on error`.
      </div>
    );
  }

  const edgeType = MNormalizeEdgeType(selectedEdge.data?.edgeType);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
      <div style={MSectionTitleStyle}>
        <strong>Edge Routing</strong>
        <span>{selectedEdge.source} → {selectedEdge.target}</span>
      </div>
      <label style={MInspectorLabelStyle}>
        Edge Type
        <select
          style={MInspectorInputStyle}
          value={edgeType}
          disabled={readOnly}
          onChange={(event) => onUpdateEdgeType(MNormalizeEdgeType(event.target.value))}
        >
          {(["always", "on-true", "on-false", "on-error"] as MRuleFlowEdgeType[]).map((item) => (
            <option key={item} value={item}>{M_EDGE_TYPE_LABELS[item]}</option>
          ))}
        </select>
      </label>
      <div style={MEdgeHintCardStyle}>
        <strong>{M_EDGE_TYPE_LABELS[edgeType]}</strong>
        <span>{M_EDGE_TYPE_HINTS[edgeType]}</span>
      </div>
      {!readOnly ? (
        <button type="button" style={MDeleteButtonStyle} onClick={onDeleteEdge}>
          Delete Edge
        </button>
      ) : null}
    </div>
  );
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
  gap: 12,
  padding: 16,
  borderRadius: 22,
  border: "1px solid rgba(148, 163, 184, 0.25)",
  minHeight: 0,
  overflow: "hidden"
};
const MSidebarTopStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12
};
const MSidebarActionsPanelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  minHeight: 0
};
const MSidebarInspectorPanelStyle: React.CSSProperties = {
  display: "flex",
  flex: "1 1 auto",
  minHeight: 0
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
/* Theme styles are now computed via MGetThemeTokens — see tokens variable. */
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

const MSidebarSectionBodyStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minHeight: 0,
  height: "100%",
  overflow: "auto",
  paddingRight: 4
};

function MSidebarSectionStyle(isOpen: boolean): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minHeight: 0,
    flex: isOpen ? "1 1 auto" : "0 0 auto",
    borderRadius: 20,
    border: isOpen ? "1px solid rgba(148, 163, 184, 0.28)" : "1px solid rgba(148, 163, 184, 0.18)",
    background: isOpen ? "rgba(255, 255, 255, 0.94)" : "rgba(248, 250, 252, 0.92)",
    boxShadow: isOpen ? "0 12px 30px rgba(15, 23, 42, 0.06)" : "none",
    overflow: "hidden"
  };
}

function MSidebarSectionHeaderStyle(isOpen: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    width: "100%",
    border: "none",
    background: "transparent",
    padding: isOpen ? "14px 16px 0" : "14px 16px",
    color: "#0f172a",
    cursor: "pointer"
  };
}

const MSidebarSectionContentStyle: React.CSSProperties = {
  display: "flex",
  flex: "1 1 auto",
  minHeight: 0,
  padding: "0 16px 16px"
};

function MSidebarChevronStyle(isOpen: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 999,
    background: "rgba(148, 163, 184, 0.12)",
    color: "#475569",
    fontSize: 14,
    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
    transition: "transform 160ms ease"
  };
}

function MPaletteButtonStyle(nodeType: MRuleFlowNodeType, t?: MFlowThemeTokens): React.CSSProperties {
  const alphaB = t?.paletteBtnBorderAlpha ?? "22";
  const alphaG = t?.paletteBtnBgAlpha ?? "10";
  return {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    borderRadius: 14,
    border: `1px solid ${M_NODE_ACCENTS[nodeType]}${alphaB}`,
    background: `${M_NODE_ACCENTS[nodeType]}${alphaG}`,
    color: t?.textPrimary ?? "#0f172a",
    padding: "11px 12px",
    textAlign: "left",
    fontWeight: 600,
    cursor: "grab"
  };
}

function MEditorShellLayoutStyle(isCompactLayout: boolean): React.CSSProperties {
  return {
    gridTemplateColumns: isCompactLayout ? "minmax(0, 1fr)" : "minmax(420px, 540px) minmax(0, 1fr)",
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
  return {
    overflow: "auto"
  };
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

const MInspectorLabelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 12,
  color: "#475569",
  fontWeight: 600
};

const MInspectorInputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid rgba(148, 163, 184, 0.32)",
  background: "#ffffff",
  color: "#0f172a",
  minHeight: 42,
  padding: "10px 12px",
  fontSize: 14
};

const MEdgeHintCardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(148, 163, 184, 0.24)",
  background: "rgba(248, 250, 252, 0.96)",
  color: "#334155",
  fontSize: 12,
  lineHeight: 1.5
};

const MDeleteButtonStyle: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid rgba(220, 38, 38, 0.2)",
  background: "rgba(254, 242, 242, 0.96)",
  color: "#b91c1c",
  padding: "11px 14px",
  fontWeight: 700
};

const MDependencyOverlayStyle: React.CSSProperties = {
  position: "absolute",
  top: 16,
  right: 16,
  zIndex: 2,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  width: "min(320px, calc(100% - 32px))",
  maxHeight: "calc(100% - 32px)",
  padding: 14,
  borderRadius: 18,
  border: "1px solid rgba(148, 163, 184, 0.28)",
  background: "rgba(255, 255, 255, 0.95)",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
  overflow: "auto"
};

const MDependencyOverlayHeaderStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 12,
  color: "#64748b"
};

const MDependencyOverlayBodyStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8
};

function MDependencyOverlayItemStyle(selected: boolean, t?: MFlowThemeTokens): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    width: "100%",
    textAlign: "left",
    padding: "10px 12px",
    borderRadius: 14,
    border: selected ? (t?.overlayItemSelectedBorder ?? "1px solid rgba(37, 99, 235, 0.26)") : (t?.overlayItemBorder ?? "1px solid rgba(148, 163, 184, 0.2)"),
    background: selected ? (t?.overlayItemSelectedBg ?? "rgba(219, 234, 254, 0.92)") : (t?.overlayItemBg ?? "rgba(248, 250, 252, 0.94)"),
    color: t?.textPrimary ?? "#0f172a",
    cursor: "pointer"
  };
}

const MPublishDialogBackdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  background: "rgba(15, 23, 42, 0.38)"
};

const MPublishDialogStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  width: "min(560px, 100%)",
  padding: 20,
  borderRadius: 22,
  border: "1px solid rgba(148, 163, 184, 0.28)",
  background: "#ffffff",
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.22)"
};

export { MCreateRuleFlowGraphSignature, MEnsureRuleFlowGraph, MImportRuleFlowGraph, MSerializeRuleFlowGraph } from "./rule-flow-runtime.js";
