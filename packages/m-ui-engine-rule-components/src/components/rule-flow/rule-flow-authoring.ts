import type {
  MContractValidationIssue,
  MEffectiveInputMapping,
  MNodeContractLayer,
  MNodeEffectiveInput,
  MRuleFlowContractField,
  MRuleFlowContractSchema,
  MRuleFlowEdge,
  MRuleFlowGraph,
  MRuleFlowMappingRow,
  MRuleFlowNode,
  MRuleFlowNodeType
} from "../../models.js";
import type {
  MRuleFlowContractLookupResponse,
  MRuleFlowNodeContractLookupResponse
} from "../../services/rule-flow-contract-service.js";
import { MEnsureExpression, MEnsureRuleFlowGraph, MEnsureSubFlowConfig, MFlattenContractFields } from "./rule-flow-runtime.js";

export interface MRuleFlowAuthoringContext {
  flowCode?: string;
  currentFlowContract?: MRuleFlowContractLookupResponse;
  flowContractsByCode?: Map<string, MRuleFlowContractLookupResponse>;
  nodeContractsById?: Map<string, MRuleFlowNodeContractLookupResponse>;
}

export interface MRuleFlowPublishValidationResult {
  graph: MRuleFlowGraph;
  issues: MContractValidationIssue[];
  isValid: boolean;
}

export interface MRuleFlowOrderingResult {
  graph: MRuleFlowGraph;
  issues: MContractValidationIssue[];
  isValid: boolean;
}

export function MApplyRuleFlowAuthoringLayers(
  graph: MRuleFlowGraph,
  context: MRuleFlowAuthoringContext
): MRuleFlowGraph {
  const normalized = MEnsureRuleFlowGraph(graph);
  const layers = MBuildNodeContractLayers(normalized, context);

  return {
    ...normalized,
    nodes: normalized.nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        contractLayer: layers.get(node.id),
        dependsOn: node.data.dependsOn ?? context.nodeContractsById?.get(node.id)?.dependsOn ?? [],
        order: node.data.order ?? context.nodeContractsById?.get(node.id)?.order
      }
    }))
  };
}

export function MValidateGraphForPublish(
  graph: MRuleFlowGraph,
  context: MRuleFlowAuthoringContext
): MRuleFlowPublishValidationResult {
  const ordered = MOrderRuleFlowGraph(graph, context);
  const withLayers = MApplyRuleFlowAuthoringLayers(ordered.graph, context);
  const issues = withLayers.nodes.flatMap((node) => node.data.contractLayer?.validationIssues ?? []);
  return {
    graph: withLayers,
    issues: [...ordered.issues, ...issues],
    isValid: ordered.isValid && issues.every((issue) => issue.severity !== "error")
  };
}

export function MOrderRuleFlowGraph(
  graph: MRuleFlowGraph,
  context: MRuleFlowAuthoringContext
): MRuleFlowOrderingResult {
  const normalized = MEnsureRuleFlowGraph(graph);
  const executableNodes = normalized.nodes.filter((node) => node.type !== "trigger" && node.type !== "end");
  const executableIds = new Set(executableNodes.map((node) => node.id));
  const ruleCodeToNodeId = new Map(
    executableNodes
      .filter((node) => node.ruleCode)
      .map((node) => [node.ruleCode!, node.id])
  );
  const adjacency = new Map<string, Set<string>>();
  const indegree = new Map<string, number>();
  const ensureVertex = (id: string) => {
    if (!adjacency.has(id)) {
      adjacency.set(id, new Set<string>());
    }
    if (!indegree.has(id)) {
      indegree.set(id, 0);
    }
  };
  const addEdge = (sourceId: string, targetId: string) => {
    if (sourceId === targetId || !executableIds.has(sourceId) || !executableIds.has(targetId)) {
      return;
    }
    ensureVertex(sourceId);
    ensureVertex(targetId);
    const targets = adjacency.get(sourceId)!;
    if (targets.has(targetId)) {
      return;
    }
    targets.add(targetId);
    indegree.set(targetId, (indegree.get(targetId) ?? 0) + 1);
  };

  for (const node of executableNodes) {
    ensureVertex(node.id);
    const dependsOn = node.data.dependsOn ?? context.nodeContractsById?.get(node.id)?.dependsOn ?? [];
    for (const dependency of dependsOn) {
      const dependencyNodeId = ruleCodeToNodeId.get(dependency);
      if (dependencyNodeId) {
        addEdge(dependencyNodeId, node.id);
      }
    }
  }

  for (const edge of normalized.edges) {
    addEdge(edge.source, edge.target);
  }

  const queue = [...executableNodes]
    .sort((left, right) => {
      const leftOrder = left.data.order ?? context.nodeContractsById?.get(left.id)?.order ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.data.order ?? context.nodeContractsById?.get(right.id)?.order ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return left.label.localeCompare(right.label);
    })
    .filter((node) => (indegree.get(node.id) ?? 0) === 0)
    .map((node) => node.id);

  const orderedIds: string[] = [];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    orderedIds.push(currentId);
    const targets = [...(adjacency.get(currentId) ?? [])].sort((left, right) => left.localeCompare(right));
    for (const targetId of targets) {
      const nextDegree = (indegree.get(targetId) ?? 0) - 1;
      indegree.set(targetId, nextDegree);
      if (nextDegree === 0) {
        queue.push(targetId);
      }
    }
  }

  if (orderedIds.length !== executableNodes.length) {
    return {
      graph: normalized,
      issues: [
        {
          code: "MRF008",
          severity: "error",
          message: "Rule flow contains a dependency cycle or invalid ordering edge."
        }
      ],
      isValid: false
    };
  }

  const orderMap = new Map(orderedIds.map((id, index) => [id, index + 1]));
  return {
    graph: {
      ...normalized,
      nodes: normalized.nodes.map((node) => (
        executableIds.has(node.id)
          ? {
              ...node,
              data: {
                ...node.data,
                order: orderMap.get(node.id) ?? node.data.order,
                dependsOn: node.data.dependsOn ?? context.nodeContractsById?.get(node.id)?.dependsOn ?? []
              }
            }
          : node
      ))
    },
    issues: [],
    isValid: true
  };
}

function MBuildNodeContractLayers(
  graph: MRuleFlowGraph,
  context: MRuleFlowAuthoringContext
): Map<string, MNodeContractLayer> {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const incomingEdges = new Map<string, MRuleFlowEdge[]>();
  for (const edge of graph.edges) {
    const bucket = incomingEdges.get(edge.target) ?? [];
    bucket.push(edge);
    incomingEdges.set(edge.target, bucket);
  }

  const layerCache = new Map<string, MNodeContractLayer>();
  const visiting = new Set<string>();

  const resolveNodeType = (node: MRuleFlowNode): MRuleFlowNodeType => node.type;
  const currentFlowInput = MResolveCurrentFlowInput(graph, context);

  const buildVisibleScopeFromSource = (sourceId: string, edgeType: string): MRuleFlowContractField[] => {
    const sourceNode = nodesById.get(sourceId);
    if (!sourceNode) {
      return [];
    }

    const sourceLayer = buildNodeLayer(sourceNode);
    const upstream = MCloneFields(sourceLayer.upstreamScope?.fields ?? []);
    const output = MCloneFields(sourceLayer.outputContract?.fields ?? []);
    if (resolveNodeType(sourceNode) !== "condition") {
      return MDeduplicateFields([...upstream, ...MFilterExposedFields(output)]);
    }

    const filteredOutput = edgeType === "on-false"
      ? output.filter((field) => field.isResultPayload)
      : output;
    return MDeduplicateFields([...upstream, ...MFilterExposedFields(filteredOutput)]);
  };

  const buildFallbackScope = (node: MRuleFlowNode): MRuleFlowContractField[] => {
    const dependsOn = node.data.dependsOn ?? context.nodeContractsById?.get(node.id)?.dependsOn ?? [];
    if (dependsOn.length > 0) {
      const matchedNodes = graph.nodes.filter((candidate) => candidate.ruleCode && dependsOn.includes(candidate.ruleCode));
      return MDeduplicateFields(matchedNodes.flatMap((candidate) => buildVisibleScopeFromSource(candidate.id, "always")));
    }

    const order = node.data.order ?? context.nodeContractsById?.get(node.id)?.order ?? Number.MAX_SAFE_INTEGER;
    const predecessors = graph.nodes.filter((candidate) => {
      const candidateOrder = candidate.data.order ?? context.nodeContractsById?.get(candidate.id)?.order ?? Number.MAX_SAFE_INTEGER;
      return candidate.id !== node.id && candidateOrder < order;
    });
    return MDeduplicateFields(predecessors.flatMap((candidate) => buildVisibleScopeFromSource(candidate.id, "always")));
  };

  const buildUpstreamScope = (node: MRuleFlowNode): MRuleFlowContractSchema => {
    if (node.type === "trigger") {
      return {
        contractName: `${context.flowCode ?? "flow"}_trigger_input`,
        title: "Input Scope",
        fields: currentFlowInput.map((field) => MAnnotateField(field, {
          sourceKind: "flow-input"
        }))
      };
    }

    const incoming = incomingEdges.get(node.id) ?? [];
    const upstreamFields = incoming.length > 0
      ? incoming.flatMap((edge) => buildVisibleScopeFromSource(edge.source, edge.edgeType))
      : buildFallbackScope(node);
    if (upstreamFields.length === 0) {
      upstreamFields.push(...currentFlowInput.map((field) => MAnnotateField(field, { sourceKind: "flow-input" })));
    }

    return {
      contractName: `${node.ruleCode ?? node.id}_input_scope`,
      title: "Input Scope",
      fields: MDeduplicateFields(upstreamFields)
    };
  };

  const buildOutputContract = (
    node: MRuleFlowNode,
    upstreamScope: MRuleFlowContractSchema
  ): MRuleFlowContractSchema => {
    const nodeContract = context.nodeContractsById?.get(node.id);
    const flowContract = node.type === "sub-flow"
      ? context.flowContractsByCode?.get(MEnsureSubFlowConfig(node.data.subFlowConfig).targetFlowCode ?? "")
      : undefined;

    const overrideFields = node.data.contractOverride?.responseFields ?? [];
    const baseFields =
      overrideFields.length > 0
        ? MMergeFields(
            flowContract?.responseContract?.fields ?? node.data.responseContract?.fields ?? nodeContract?.responseDelta?.fields ?? [],
            overrideFields
          )
        : MCloneFields(flowContract?.responseContract?.fields ?? node.data.responseContract?.fields ?? nodeContract?.responseDelta?.fields ?? []);

    const annotatedBase = baseFields.map((field) =>
      MAnnotateField(field, {
        sourceNodeId: node.id,
        sourceNodeLabel: node.label,
        sourceNodeType: node.type,
        sourceKind: node.type === "sub-flow" ? "sub-flow-output" : "node-output",
        runtimeWritten:
          node.type === "condition"
            ? Boolean(field.runtimeWritten ?? field.valueExpression?.trim())
            : (field.runtimeWritten ?? true)
      })
    );

    if (node.type !== "condition") {
      return {
        contractName: `${node.ruleCode ?? node.id}_output_contract`,
        title: "Output Contract",
        fields: MDeduplicateFields(MApplySubFlowOutputMappings(node, annotatedBase))
      };
    }

    const resultPayload = [
      MAnnotateField({
        path: "result.isPass",
        label: "isPass",
        dataType: "boolean",
        required: true
      }, {
        sourceNodeId: node.id,
        sourceNodeLabel: node.label,
        sourceNodeType: node.type,
        sourceKind: "result-payload",
        isResultPayload: true,
        runtimeWritten: true
      }),
      MAnnotateField({
        path: "result.message",
        label: "message",
        dataType: "string"
      }, {
        sourceNodeId: node.id,
        sourceNodeLabel: node.label,
        sourceNodeType: node.type,
        sourceKind: "result-payload",
        isResultPayload: true,
        runtimeWritten: true
      }),
      MAnnotateField({
        path: "result.errorCode",
        label: "errorCode",
        dataType: "string"
      }, {
        sourceNodeId: node.id,
        sourceNodeLabel: node.label,
        sourceNodeType: node.type,
        sourceKind: "result-payload",
        isResultPayload: true,
        runtimeWritten: true
      })
    ];

    return {
      contractName: `${node.ruleCode ?? node.id}_output_contract`,
      title: "Output Contract",
      fields: MDeduplicateFields([...resultPayload, ...annotatedBase])
    };
  };

  const buildEffectiveInput = (
    node: MRuleFlowNode,
    upstreamScope: MRuleFlowContractSchema
  ): MNodeEffectiveInput => {
    const upstreamFields = MFlattenContractFields(upstreamScope.fields);
    const persistedMappings = node.type === "sub-flow"
      ? MEnsureSubFlowConfig(node.data.subFlowConfig).inputMappings
      : node.data.inputMappings ?? [];

    if (node.type === "sub-flow") {
      const childTriggerSchema = MEnsureSubFlowConfig(node.data.subFlowConfig).childTriggerSchema;
      const targetFields = MFlattenContractFields(childTriggerSchema?.fields ?? []);
      return {
        contractName: `${node.ruleCode ?? node.id}_effective_input`,
        title: "Effective Input",
        mode: "sub-flow",
        fields: targetFields,
        mappings: MBuildMappingRows(upstreamFields, targetFields, persistedMappings)
      };
    }

    if (node.type === "condition" || node.type === "liquid") {
      const refs = MExtractExpressionPaths(MEnsureExpression(node.data).body, upstreamFields);
      return {
        contractName: `${node.ruleCode ?? node.id}_effective_input`,
        title: "Effective Input",
        mode: node.type === "liquid" ? "expression" : "auto",
        fields: refs,
        mappings: refs.map((field) => ({
          id: `auto-${field.path}`,
          sourcePath: field.path,
          targetPath: field.path,
          targetField: field.path,
          sourceDataType: field.dataType,
          targetDataType: field.dataType,
          sourceNodeId: field.sourceNodeId,
          sourceNodeLabel: field.sourceNodeLabel,
          status: "mapped",
          required: field.required
        }))
      };
    }

    const requestFields = MFlattenContractFields(
      node.data.contractOverride?.requestFields ??
      node.data.requestContract?.fields ??
      context.nodeContractsById?.get(node.id)?.requestScope?.fields ??
      []
    );
    const targetFields = node.type === "end" ? [] : requestFields;
    return {
      contractName: `${node.ruleCode ?? node.id}_effective_input`,
      title: "Effective Input",
      mode: node.type === "decision-table" ? "decision-table" : node.type === "action" ? "manual" : "auto",
      fields: targetFields,
      mappings: MBuildMappingRows(upstreamFields, targetFields, persistedMappings)
    };
  };

  const buildValidationIssues = (
    node: MRuleFlowNode,
    upstreamScope: MRuleFlowContractSchema,
    effectiveInput: MNodeEffectiveInput,
    outputContract: MRuleFlowContractSchema
  ): MContractValidationIssue[] => {
    const upstreamFields = MFlattenContractFields(upstreamScope.fields);
    const issues: MContractValidationIssue[] = [];

    for (const mapping of effectiveInput.mappings) {
      if (mapping.required && !mapping.sourcePath.trim()) {
        issues.push({
          code: "MRF001",
          severity: "error",
          message: `Required input '${mapping.targetField ?? mapping.targetPath}' is not mapped.`,
          nodeId: node.id,
          targetPath: mapping.targetField ?? mapping.targetPath
        });
        continue;
      }

      if (!mapping.sourcePath.trim()) {
        continue;
      }

      const sourceField = upstreamFields.find((field) => field.path === mapping.sourcePath);
      if (!sourceField) {
        issues.push({
          code: "MRF002",
          severity: "error",
          message: `Source field '${mapping.sourcePath}' is not available in upstream scope.`,
          nodeId: node.id,
          sourcePath: mapping.sourcePath,
          targetPath: mapping.targetField ?? mapping.targetPath
        });
        continue;
      }

      if (mapping.targetDataType && mapping.sourceDataType && mapping.targetDataType !== mapping.sourceDataType && !(mapping.transform ?? "").trim()) {
        issues.push({
          code: "MRF003",
          severity: "warning",
          message: `Mapping '${mapping.sourcePath}' -> '${mapping.targetField ?? mapping.targetPath}' has type mismatch (${mapping.sourceDataType} -> ${mapping.targetDataType}).`,
          nodeId: node.id,
          sourcePath: mapping.sourcePath,
          targetPath: mapping.targetField ?? mapping.targetPath
        });
      }
    }

    if (node.type === "sub-flow") {
      const childTriggerSchema = MEnsureSubFlowConfig(node.data.subFlowConfig).childTriggerSchema;
      for (const field of MFlattenContractFields(childTriggerSchema?.fields ?? []).filter((candidate) => candidate.required)) {
        const mapped = effectiveInput.mappings.some((mapping) => (mapping.targetField ?? mapping.targetPath) === field.path && mapping.sourcePath.trim().length > 0);
        if (!mapped) {
          issues.push({
            code: "MRF004",
            severity: "error",
            message: `Sub-flow input '${field.path}' is required but not mapped.`,
            nodeId: node.id,
            fieldPath: field.path
          });
        }
      }
    }

    if (node.type === "condition" || node.type === "liquid") {
      const expression = MEnsureExpression(node.data).body;
      const refs = MExtractExpressionTokenStrings(expression);
      for (const ref of refs) {
        if (!upstreamFields.some((field) => field.path === ref)) {
          issues.push({
            code: "MRF005",
            severity: "error",
            message: `Expression references '${ref}' but that field is not available in input scope.`,
            nodeId: node.id,
            fieldPath: ref
          });
        }
      }
    }

    if (node.type === "condition") {
      for (const field of MFlattenContractFields(outputContract.fields).filter((candidate) => !candidate.isResultPayload)) {
        if (!field.valueExpression?.trim()) {
          issues.push({
            code: "MRF009",
            severity: "warning",
            message: `Condition output '${field.path}' is metadata-only until a Value Expression is configured.`,
            nodeId: node.id,
            fieldPath: field.path
          });
        }
      }
    }

    if (node.type === "end" && outputContract.fields.length > 0) {
      issues.push({
        code: "MRF006",
        severity: "warning",
        message: "End nodes should not define additional output fields.",
        nodeId: node.id
      });
    }

    return issues;
  };

  const buildNodeLayer = (node: MRuleFlowNode): MNodeContractLayer => {
    const cached = layerCache.get(node.id);
    if (cached) {
      return cached;
    }

    if (visiting.has(node.id)) {
      return {
        upstreamScope: {
          contractName: `${node.id}_input_scope`,
          title: "Input Scope",
          fields: []
        },
        effectiveInput: {
          contractName: `${node.id}_effective_input`,
          title: "Effective Input",
          fields: [],
          mappings: []
        },
        outputContract: {
          contractName: `${node.id}_output_contract`,
          title: "Output Contract",
          fields: []
        },
        validationIssues: [
          {
            code: "MRF007",
            severity: "error",
            message: "Cycle detected in rule flow graph.",
            nodeId: node.id
          }
        ]
      };
    }

    visiting.add(node.id);
    const upstreamScope = buildUpstreamScope(node);
    const effectiveInput = buildEffectiveInput(node, upstreamScope);
    const outputContract = buildOutputContract(node, upstreamScope);
    const validationIssues = buildValidationIssues(node, upstreamScope, effectiveInput, outputContract);
    const layer: MNodeContractLayer = {
      upstreamScope,
      effectiveInput,
      outputContract,
      validationIssues
    };
    layerCache.set(node.id, layer);
    visiting.delete(node.id);
    return layer;
  };

  for (const node of graph.nodes) {
    buildNodeLayer(node);
  }

  return layerCache;
}

function MResolveCurrentFlowInput(
  graph: MRuleFlowGraph,
  context: MRuleFlowAuthoringContext
): MRuleFlowContractField[] {
  const flowFields = MCloneFields(context.currentFlowContract?.requestContract?.fields ?? []);
  if (flowFields.length > 0) {
    return flowFields;
  }

  const firstExecutableNode = [...graph.nodes]
    .filter((node) => node.type !== "trigger" && node.type !== "end")
    .sort((left, right) => {
      const leftOrder = left.data.order ?? context.nodeContractsById?.get(left.id)?.order ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.data.order ?? context.nodeContractsById?.get(right.id)?.order ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return left.label.localeCompare(right.label);
    })[0];

  if (!firstExecutableNode) {
    return [];
  }

  const nodeContract = context.nodeContractsById?.get(firstExecutableNode.id);
  const requestFields =
    nodeContract?.requestScope?.fields ??
    firstExecutableNode.data.requestContract?.fields ??
    [];
  return MCloneFields(requestFields);
}

function MBuildMappingRows(
  upstreamFields: MRuleFlowContractField[],
  targetFields: MRuleFlowContractField[],
  persistedMappings: readonly MRuleFlowMappingRow[]
): MEffectiveInputMapping[] {
  const rows = new Map<string, MEffectiveInputMapping>();

  for (const mapping of persistedMappings) {
    const sourceField = upstreamFields.find((field) => field.path === mapping.sourcePath);
    const targetField = targetFields.find((field) => field.path === mapping.targetPath);
    rows.set(mapping.id, {
      ...mapping,
      targetField: targetField?.path ?? mapping.targetPath,
      sourceDataType: sourceField?.dataType,
      targetDataType: targetField?.dataType,
      sourceNodeId: sourceField?.sourceNodeId,
      sourceNodeLabel: sourceField?.sourceNodeLabel,
      required: targetField?.required,
      status: sourceField ? (targetField?.dataType && sourceField.dataType !== targetField.dataType && !(mapping.transform ?? "").trim() ? "type-mismatch" : "mapped") : "missing"
    });
  }

  for (const target of targetFields) {
    const existing = [...rows.values()].find((row) => (row.targetField ?? row.targetPath) === target.path);
    if (existing) {
      continue;
    }

    const suggestion = upstreamFields.find((field) => field.path === target.path)
      ?? upstreamFields.find((field) => MLeafName(field.path) === MLeafName(target.path) && field.dataType === target.dataType);

    rows.set(`suggested-${target.path}`, {
      id: `suggested-${target.path}`,
      sourcePath: suggestion?.path ?? "",
      targetPath: target.path,
      targetField: target.path,
      sourceDataType: suggestion?.dataType,
      targetDataType: target.dataType,
      sourceNodeId: suggestion?.sourceNodeId,
      sourceNodeLabel: suggestion?.sourceNodeLabel,
      required: target.required,
      status: suggestion ? "suggested" : target.required ? "missing" : "suggested",
      transformSuggestion: suggestion && suggestion.dataType !== target.dataType ? `to_${target.dataType}(${suggestion.path})` : undefined
    });
  }

  return [...rows.values()];
}

function MApplySubFlowOutputMappings(node: MRuleFlowNode, fields: MRuleFlowContractField[]): MRuleFlowContractField[] {
  if (node.type !== "sub-flow") {
    return fields;
  }

  const mappings = MEnsureSubFlowConfig(node.data.subFlowConfig).outputMappings;
  if (mappings.length === 0) {
    return fields;
  }

  return fields.map((field) => {
    const mapped = mappings.find((row) => row.sourcePath === field.path && row.targetPath.trim().length > 0);
    return mapped
      ? {
          ...field,
          path: mapped.targetPath,
          label: mapped.targetPath,
          exposeToParent: field.exposeToParent
        }
      : field;
  });
}

function MAnnotateField(
  field: MRuleFlowContractField,
  overrides: Partial<MRuleFlowContractField>
): MRuleFlowContractField {
  return {
    ...field,
    ...overrides,
    children: field.children?.map((child) => MAnnotateField(child, overrides))
  };
}

function MDeduplicateFields(fields: MRuleFlowContractField[]): MRuleFlowContractField[] {
  const seen = new Map<string, MRuleFlowContractField>();
  for (const field of fields) {
    if (!seen.has(field.path)) {
      seen.set(field.path, field);
    }
  }

  return [...seen.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function MCloneFields(fields: readonly MRuleFlowContractField[]): MRuleFlowContractField[] {
  return fields.map((field) => ({
    ...field,
    children: field.children ? MCloneFields(field.children) : undefined
  }));
}

function MMergeFields(baseFields: readonly MRuleFlowContractField[], overrideFields: readonly MRuleFlowContractField[]): MRuleFlowContractField[] {
  const map = new Map<string, MRuleFlowContractField>();
  for (const field of baseFields) {
    map.set(field.path, { ...field, children: field.children ? MCloneFields(field.children) : undefined });
  }

  for (const override of overrideFields) {
    map.set(override.path, { ...override, children: override.children ? MCloneFields(override.children) : undefined });
  }

  return [...map.values()];
}

function MFilterExposedFields(fields: MRuleFlowContractField[]): MRuleFlowContractField[] {
  return fields.filter((field) => field.exposeToParent !== false);
}

function MExtractExpressionPaths(body: string, upstreamFields: MRuleFlowContractField[]): MRuleFlowContractField[] {
  const tokens = new Set(MExtractExpressionTokenStrings(body));
  return upstreamFields.filter((field) => tokens.has(field.path));
}

function MExtractExpressionTokenStrings(body: string): string[] {
  if (!body.trim()) {
    return [];
  }

  const matches = new Set<string>();
  const tokenPattern = /\b[a-zA-Z_][a-zA-Z0-9_.]*\b/g;
  let match: RegExpExecArray | null = tokenPattern.exec(body);
  while (match) {
    const token = match[0];
    if (token.includes(".")) {
      matches.add(token);
    }
    match = tokenPattern.exec(body);
  }

  const liquidPattern = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)/g;
  match = liquidPattern.exec(body);
  while (match) {
    matches.add(match[1]);
    match = liquidPattern.exec(body);
  }

  return [...matches];
}

function MLeafName(path: string): string {
  const parts = path.split(".");
  return parts[parts.length - 1] ?? path;
}
