import React, { useRef, useState } from "react";
import type { Extension } from "@codemirror/state";
import type {
  MContractValidationIssue,
  MDecisionTableModel,
  MEffectiveInputMapping,
  MRuleFlowConditionConfig,
  MRuleFlowConnectorConfig,
  MRuleFlowContractField,
  MRuleFlowContractReference,
  MRuleFlowContractSchema,
  MRuleFlowExpressionLanguage,
  MRuleFlowLiquidConfig,
  MRuleFlowNodeType,
  MRuleFlowSubFlowConfig
} from "../../models.js";
import type { MConnectorMetadata } from "../../services/connector-service.js";
import {
  MAvailableInspectorTabs,
  MDefaultContractSourceType,
  MEnsureLiquidConfig,
  MEnsureSubFlowConfig,
  MFlattenContractFields,
  MInspectorTabTitle,
  M_NODE_ACCENTS,
  M_NODE_TITLES,
  type MInspectorTab
} from "./rule-flow-helpers.js";
import { MExpressionEditor, mCreateFeelAutocomplete, mCreateFeelLinter, MFeelFunctionBrowser } from "./expression-editor/index.js";
import { MTypeBadge, MTreeNode, MEmptyStateBox } from "./inspector-ui-utils.js";

export type MContractLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; title?: string }
  | { status: "error"; message: string };

export interface MRuleFlowInspectorProps {
  selectedNode: {
    id: string;
    data: {
      label: string;
      ruleCode?: string;
      nodeType: MRuleFlowNodeType;
      description?: string;
      contractRef?: MRuleFlowContractReference;
      conditionConfig?: MRuleFlowConditionConfig;
      subFlowConfig?: MRuleFlowSubFlowConfig;
      liquidConfig?: MRuleFlowLiquidConfig;
      connectorConfig?: MRuleFlowConnectorConfig;
      dependsOn?: string[];
      order?: number;
      contractLayer?: {
        upstreamScope?: MRuleFlowContractSchema;
        effectiveInput?: {
          fields: MRuleFlowContractField[];
          mappings: MEffectiveInputMapping[];
        };
        outputContract?: MRuleFlowContractSchema;
        validationIssues?: MContractValidationIssue[];
      };
    };
  } | null;
  selectedExpression: { language: MRuleFlowExpressionLanguage; body: string };
  contractLoadState: MContractLoadState;
  selectedDecisionTable?: MDecisionTableModel | null;
  decisionTableLoadState?: { status: "idle" | "loading" | "ready" | "error"; message?: string };
  readOnly: boolean;
  apiBaseUrl?: string;
  inspectorTab: MInspectorTab;
  flowOptions: Array<{ code: string; label: string }>;
  decisionTableOptions: Array<{ code: string; label: string }>;
  setInspectorTab: (tab: MInspectorTab) => void;
  onSelectNodeByRuleCode: (ruleCode: string) => void;
  onUpdateLabel: (value: string) => void;
  onUpdateRuleCode: (value: string) => void;
  onUpdateDescription: (value: string) => void;
  onUpdateContractRef: (value: MRuleFlowContractReference) => void;
  onUpdateDecisionTableCode: (value: string) => void;
  onUpdateConditionConfig: (value: MRuleFlowConditionConfig) => void;
  onUpdateTargetFlowCode: (value: string) => void;
  onUpdateLiquidOutput: (value: NonNullable<MRuleFlowLiquidConfig["outputFormat"]>) => void;
  onUpdateExpressionLanguage: (value: MRuleFlowExpressionLanguage) => void;
  onUpdateExpressionBody: (value: string) => void;
  onInsertExpressionToken: (value: string) => void;
  onChangeInputContract: (fields: MRuleFlowContractField[]) => void;
  onChangeEffectiveMappings: (rows: MEffectiveInputMapping[]) => void;
  onChangeOutputContract: (fields: MRuleFlowContractField[]) => void;
  onDeleteNode: () => void;
  showSectionHeader?: boolean;
  connectorCatalog?: MConnectorMetadata[];
  onUpdateConnectorConfig?: (config: MRuleFlowConnectorConfig) => void;
  onSetInsertRef?: (ref: { insert: (text: string) => void }) => void;
  shadowRoot?: ShadowRoot;
}

/* ── Contextual help constants ─────────────────────────────────────── */

const M_CONTRACT_SOURCE_DESCRIPTIONS: Record<string, string> = {
  "rule": "Schema loaded from the registered rule code",
  "flow": "Uses the flow's input schema",
  "decision-table": "Schema from the linked decision table",
  "api": "Schema fetched from external API endpoint",
  "inline": "Schema defined manually in this node"
};

function MInfoIcon({ tooltip }: { tooltip: string }): React.JSX.Element {
  return (
    <span title={tooltip} style={{ display: "inline-flex", alignItems: "center", marginLeft: 4, cursor: "help", color: "var(--mu-text-secondary)" }}>
      <svg width={14} height={14} viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 2.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM6.5 7h2v5h-2V7h1z" />
      </svg>
    </span>
  );
}

const MInfoCardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: "10px 14px",
  background: "var(--mu-surface-raised)",
  border: "1px solid var(--mu-border-subtle)",
  borderRadius: 12
};

export function MRuleFlowInspector(props: MRuleFlowInspectorProps): React.JSX.Element {
  const { selectedNode, contractLoadState, readOnly, inspectorTab, setInspectorTab, showSectionHeader = true } = props;
  const layer = selectedNode?.data.contractLayer;

  return (
    <div style={MInspectorShellStyle}>
      {showSectionHeader ? (
        <div style={MSectionTitleStyle}>
          <strong>Inspector</strong>
          <span>{selectedNode ? `Editing ${M_NODE_TITLES[selectedNode.data.nodeType]}` : "Select a node to edit it."}</span>
        </div>
      ) : null}

      {selectedNode ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--mu-space-sm)", minHeight: 0 }}>
          <div style={MInspectorTabsStyle}>
            {MAvailableInspectorTabs(selectedNode.data.nodeType).map((tab) => (
              <button key={tab} type="button" style={MInspectorTabButtonStyle(tab === inspectorTab)} onClick={() => setInspectorTab(tab)}>
                {MInspectorTabTitle(tab)}
              </button>
            ))}
          </div>

          {inspectorTab === "basic-info" ? <MGeneralTab {...props} /> : null}
          {inspectorTab === "input-data" ? (
            <MScopeTable
              title="Input Scope"
              subtitle={layer?.upstreamScope?.title ?? "Everything available before this node executes."}
              contract={layer?.upstreamScope}
              loadState={contractLoadState}
              readOnly={readOnly}
              onInsert={props.onInsertExpressionToken}
              groupBySource
            />
          ) : null}
          {inspectorTab === "data-mapping" ? (
            <MEffectiveInputTab
              nodeType={selectedNode.data.nodeType}
              readOnly={readOnly}
              upstreamFields={MFlattenContractFields(layer?.upstreamScope?.fields ?? [])}
              targetFields={layer?.effectiveInput?.fields ?? []}
              rows={layer?.effectiveInput?.mappings ?? []}
              onInsert={props.onInsertExpressionToken}
              onChangeTargetFields={props.onChangeInputContract}
              onChange={props.onChangeEffectiveMappings}
              setInspectorTab={setInspectorTab}
              hasExpression={!!props.selectedExpression?.body?.trim()}
            />
          ) : null}
          {inspectorTab === "output-data" ? (
            <MOutputContractTab
              nodeType={selectedNode.data.nodeType}
              contract={layer?.outputContract}
              upstreamScope={layer?.upstreamScope}
              issues={layer?.validationIssues ?? []}
              readOnly={readOnly}
              onInsert={props.onInsertExpressionToken}
              onChange={props.onChangeOutputContract}
            />
          ) : null}
          {inspectorTab === "logic" ? (
            <MExpressionTab
              nodeType={selectedNode.data.nodeType}
              expression={props.selectedExpression}
              upstreamScope={layer?.upstreamScope}
              outputContract={layer?.outputContract}
              liquidOutput={selectedNode.data.liquidConfig?.outputFormat}
              readOnly={readOnly}
              apiBaseUrl={props.apiBaseUrl}
              onChangeLanguage={props.onUpdateExpressionLanguage}
              onChangeBody={props.onUpdateExpressionBody}
              onInsertRef={props.onSetInsertRef}
              shadowRoot={props.shadowRoot}
            />
          ) : null}

          {layer?.validationIssues?.length ? <MIssueList issues={layer.validationIssues} /> : null}
          {contractLoadState.status === "error" ? <div style={MErrorBannerStyle}>{contractLoadState.message}</div> : null}

          {!readOnly ? (
            <button type="button" style={MDeleteButtonStyle} onClick={props.onDeleteNode}>
              Delete Node
            </button>
          ) : null}
        </div>
      ) : (
        <div style={{ color: "var(--mu-text-muted)", fontSize: 13, lineHeight: 1.5 }}>
          Use the palette to add a node, then inspect available input scope, effective mappings, and output contract before publishing.
        </div>
      )}
    </div>
  );
}

function MGeneralTab(props: MRuleFlowInspectorProps): React.JSX.Element {
  const { selectedNode, readOnly, flowOptions, decisionTableOptions, selectedDecisionTable, decisionTableLoadState } = props;
  if (!selectedNode) {
    return <></>;
  }

  const dependsOn = selectedNode.data.dependsOn ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--mu-space-sm)" }}>
      <label style={MLabelStyle}>
        Label
        <input style={MInputStyle} value={selectedNode.data.label} disabled={readOnly} onChange={(event) => props.onUpdateLabel(event.target.value)} />
      </label>
      <label style={MLabelStyle}>
        Rule Code
        <input style={MInputStyle} value={selectedNode.data.ruleCode ?? ""} disabled={readOnly} onChange={(event) => props.onUpdateRuleCode(event.target.value)} />
      </label>
      <label style={MLabelStyle}>
        Description
        <textarea style={MTextareaStyle} value={String(selectedNode.data.description ?? "")} disabled={readOnly} placeholder="Describe what this node does for documentation purposes" onChange={(event) => props.onUpdateDescription(event.target.value)} />
      </label>
      <div style={MContractGridStyle}>
        <label style={MLabelStyle}>
          <span>Contract Source<MInfoIcon tooltip="Determines where this node's input/output schema comes from" /></span>
          <select
            style={MInputStyle}
            value={selectedNode.data.contractRef?.sourceType ?? MDefaultContractSourceType(selectedNode.data.nodeType)}
            disabled={readOnly}
            onChange={(event) =>
              props.onUpdateContractRef({
                sourceType: event.target.value as MRuleFlowContractReference["sourceType"],
                sourceCode: selectedNode.data.contractRef?.sourceCode ?? selectedNode.data.ruleCode ?? "",
                label: selectedNode.data.contractRef?.label
              })
            }
          >
            <option value="rule">rule</option>
            <option value="flow">flow</option>
            <option value="decision-table">decision-table</option>
            <option value="api">api</option>
            <option value="inline">inline</option>
          </select>
          <span style={{ fontSize: 11, color: "var(--mu-text-muted)", fontStyle: "italic", marginTop: 2, lineHeight: 1.4 }}>
            {M_CONTRACT_SOURCE_DESCRIPTIONS[selectedNode.data.contractRef?.sourceType ?? MDefaultContractSourceType(selectedNode.data.nodeType)] ?? ""}
          </span>
        </label>
        <label style={MLabelStyle}>
          <span>Contract Code<MInfoIcon tooltip="The unique identifier used to look up the contract" /></span>
          <input
            style={MInputStyle}
            value={selectedNode.data.contractRef?.sourceCode ?? ""}
            disabled={readOnly}
            onChange={(event) =>
              props.onUpdateContractRef({
                sourceType: selectedNode.data.contractRef?.sourceType ?? MDefaultContractSourceType(selectedNode.data.nodeType),
                sourceCode: event.target.value,
                label: selectedNode.data.contractRef?.label
              })
            }
          />
        </label>
      </div>
      <div style={MInfoCardStyle}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ marginRight: 4 }}>&#x1F4CB;</span>
          <strong>Order:</strong>&nbsp;{selectedNode.data.order ?? "n/a"}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ marginRight: 4 }}>&#x1F517;</span>
          <strong>Depends On:</strong>
          {dependsOn.length === 0 ? <span>none</span> : dependsOn.map((item) => (
            <button key={item} type="button" data-testid={`depends-chip-${item}`} style={MDependencyChipButtonStyle} onClick={() => props.onSelectNodeByRuleCode(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
      {selectedNode.data.nodeType === "condition" ? (
        <MConditionConfigEditor readOnly={readOnly} value={selectedNode.data.conditionConfig} onChange={props.onUpdateConditionConfig} />
      ) : null}
      {selectedNode.data.nodeType === "decision-table" ? (
        <>
          <label style={MLabelStyle}>
            Decision Table
            <select
              style={MInputStyle}
              value={selectedNode.data.contractRef?.sourceCode ?? ""}
              disabled={readOnly}
              onChange={(event) => props.onUpdateDecisionTableCode(event.target.value)}
            >
              <option value="">Select decision table</option>
              {decisionTableOptions.map((table) => (
                <option key={table.code} value={table.code}>{table.label}</option>
              ))}
            </select>
          </label>
          <MDecisionTableOverviewCard table={selectedDecisionTable} loadState={decisionTableLoadState} />
        </>
      ) : null}
      {selectedNode.data.nodeType === "sub-flow" ? (
        <label style={MLabelStyle}>
          Target Flow Code
          <select style={MInputStyle} value={MEnsureSubFlowConfig(selectedNode.data.subFlowConfig).targetFlowCode ?? ""} disabled={readOnly} onChange={(event) => props.onUpdateTargetFlowCode(event.target.value)}>
            <option value="">Select target flow</option>
            {flowOptions.map((flow) => (
              <option key={flow.code} value={flow.code}>{flow.label}</option>
            ))}
          </select>
        </label>
      ) : null}
      {selectedNode.data.nodeType === "liquid" ? (
        <label style={MLabelStyle}>
          Liquid Output
          <select style={MInputStyle} value={MEnsureLiquidConfig(selectedNode.data.liquidConfig).outputFormat ?? "json"} disabled={readOnly} onChange={(event) => props.onUpdateLiquidOutput(event.target.value as NonNullable<MRuleFlowLiquidConfig["outputFormat"]>)}>
            <option value="json">json</option>
            <option value="object">object</option>
            <option value="text">text</option>
          </select>
        </label>
      ) : null}
      {selectedNode.data.nodeType === "connector" ? (
        <MConnectorConfigEditor
          config={{
            connectorType: selectedNode.data.connectorConfig?.connectorType ?? "",
            connectorConfig: selectedNode.data.connectorConfig?.connectorConfig ?? (
              // If connectorConfig is a flat object with url/method/body (runtime format),
              // use it directly as the nested config
              selectedNode.data.connectorConfig && ("url" in selectedNode.data.connectorConfig || "method" in selectedNode.data.connectorConfig)
                ? selectedNode.data.connectorConfig as Record<string, unknown>
                : {}
            ),
            credentialId: selectedNode.data.connectorConfig?.credentialId
          }}
          catalog={props.connectorCatalog ?? []}
          readOnly={readOnly}
          onChange={props.onUpdateConnectorConfig}
        />
      ) : null}
    </div>
  );
}

function MExpressionTab({
  nodeType,
  expression,
  upstreamScope,
  outputContract,
  liquidOutput,
  readOnly,
  apiBaseUrl,
  onChangeLanguage,
  onChangeBody,
  onInsertRef,
  shadowRoot
}: {
  nodeType: MRuleFlowNodeType;
  expression: { language: MRuleFlowExpressionLanguage; body: string };
  upstreamScope?: MRuleFlowContractSchema;
  outputContract?: MRuleFlowContractSchema;
  liquidOutput?: NonNullable<MRuleFlowLiquidConfig["outputFormat"]>;
  readOnly: boolean;
  apiBaseUrl?: string;
  onChangeLanguage: (value: MRuleFlowExpressionLanguage) => void;
  onChangeBody: (value: string) => void;
  onInsertRef?: (ref: { insert: (text: string) => void }) => void;
  shadowRoot?: ShadowRoot;
}): React.JSX.Element {
  const insertRef = useRef<{ insert: (text: string) => void } | null>(null);
  const preview = (nodeType === "liquid" || expression.language === "liquid")
    ? MRenderLiquidPreview(expression.body, upstreamScope?.fields ?? [], liquidOutput ?? "json")
    : "";

  // Action and connector nodes use per-field value expressions (outputFields[].valueExpression)
  // instead of a single expression body. Show a read-only summary and direct users to Output Data tab.
  const outputFields = MFlattenContractFields(outputContract?.fields ?? []);
  const fieldsWithExpressions = outputFields.filter((field) => field.valueExpression?.trim());
  const hasPerFieldExpressions = fieldsWithExpressions.length > 0;
  const isPerFieldLogicNode = nodeType === "action" || nodeType === "connector";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--mu-space-sm)" }}>
      {isPerFieldLogicNode && (hasPerFieldExpressions || !expression.body.trim()) ? (
        <>
          <div style={MSectionTitleStyle}>
            <strong>Per-Field Value Expressions</strong>
            <span>
              {hasPerFieldExpressions
                ? "This node computes output fields using individual FEEL expressions. Edit them in the Output Data tab."
                : "No value expressions configured yet. Add output fields with expressions in the Output Data tab."}
            </span>
          </div>
          {hasPerFieldExpressions ? (
            <div style={MTableShellStyle}>
              <table style={MTableStyle}>
                <thead>
                  <tr>
                    <th style={MTableHeaderStyle}>Output Field</th>
                    <th style={MTableHeaderStyle}>Type</th>
                    <th style={MTableHeaderStyle}>Expression</th>
                  </tr>
                </thead>
                <tbody>
                  {fieldsWithExpressions.map((field) => (
                    <tr key={field.path}>
                      <td style={MTableCellStyle}>{field.path}</td>
                      <td style={MTableCellStyle}>{field.dataType}</td>
                      <td style={{ ...MTableCellStyle, fontFamily: "var(--mu-font-mono)", fontSize: 12 }}>{field.valueExpression}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <div style={MExpressionHintStyle}>
            <strong>Tip</strong>
            <span>Switch to the <strong>Output Data</strong> tab to add or edit value expressions for each output field.</span>
          </div>
        </>
      ) : (
        <>
          <label style={MLabelStyle}>
            Expression Language
            <select style={MInputStyle} value={expression.language} disabled={readOnly} onChange={(event) => onChangeLanguage(event.target.value as MRuleFlowExpressionLanguage)}>
              <option value="feel">FEEL</option>
              <option value="javascript">JavaScript</option>
              <option value="scriban">Scriban</option>
              <option value="liquid">Liquid</option>
              <option value="plain-text">Plain Text</option>
            </select>
          </label>
          {(() => {
            const flatFields = MFlattenContractFields(upstreamScope?.fields ?? []);
            const extraExtensions: Extension[] = [];
            if (expression.language === "feel") {
              extraExtensions.push(mCreateFeelAutocomplete(flatFields));
              extraExtensions.push(mCreateFeelLinter(flatFields));
            }
            return (
              <>
                <div style={MLabelStyle}>
                  {expression.language === "liquid" ? "Liquid Template" : "Expression"}
                  <MExpressionEditor
                    value={expression.body}
                    language={expression.language}
                    readOnly={readOnly}
                    onChange={onChangeBody}
                    onInsertToken={(ref) => { insertRef.current = ref; onInsertRef?.(ref); }}
                    extensions={extraExtensions}
                    minHeight={180}
                    root={shadowRoot}
                  />
                </div>
                <MFeelFunctionBrowser
                  visible={expression.language === "feel"}
                  onInsert={(template) => insertRef.current?.insert(template)}
                />
              </>
            );
          })()}
          <div style={MExpressionHintStyle}>
            <strong>Authoring hints</strong>
            <span>Type '.' after a field name or press Ctrl+Space for autocomplete. Click any field in Input Scope to insert at cursor.</span>
            {apiBaseUrl ? <span>Contract API: {apiBaseUrl}</span> : null}
          </div>
          {(nodeType === "liquid" || expression.language === "liquid") ? (
            <div style={MExpressionHintStyle}>
              <strong>Liquid Preview</strong>
              <pre style={MPreviewStyle}>{preview || "Preview is empty."}</pre>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function MConditionConfigEditor({
  readOnly,
  value,
  onChange
}: {
  readOnly: boolean;
  value?: MRuleFlowConditionConfig;
  onChange: (value: MRuleFlowConditionConfig) => void;
}): React.JSX.Element {
  const normalized = {
    successLabel: value?.successLabel ?? "Valid",
    failureLabel: value?.failureLabel ?? "Rejected",
    failureMessage: value?.failureMessage ?? ""
  };

  return (
    <div style={{ display: "grid", gap: "var(--mu-space-sm)" }}>
      <label style={MLabelStyle}>
        <span>Success Label<MInfoIcon tooltip="Shown on output edges when this condition evaluates to true" /></span>
        <input style={MInputStyle} value={normalized.successLabel} disabled={readOnly} onChange={(event) => onChange({ ...normalized, successLabel: event.target.value })} />
      </label>
      <label style={MLabelStyle}>
        <span>Failure Label<MInfoIcon tooltip="Shown on output edges when this condition evaluates to false" /></span>
        <input style={MInputStyle} value={normalized.failureLabel} disabled={readOnly} onChange={(event) => onChange({ ...normalized, failureLabel: event.target.value })} />
      </label>
      <label style={MLabelStyle}>
        Failure Message
        <textarea style={MTextareaStyle} value={normalized.failureMessage} disabled={readOnly} onChange={(event) => onChange({ ...normalized, failureMessage: event.target.value })} />
      </label>
    </div>
  );
}

function MConnectorConfigEditor({
  config,
  catalog,
  readOnly,
  onChange
}: {
  config: MRuleFlowConnectorConfig;
  catalog: MConnectorMetadata[];
  readOnly: boolean;
  onChange?: (config: MRuleFlowConnectorConfig) => void;
}): React.JSX.Element {
  const selectedMeta = catalog.find((item) => item.connectorType === config.connectorType);
  const requiresCredentials = selectedMeta?.requiresCredentials || (selectedMeta?.credentialFields && selectedMeta.credentialFields.length > 0);

  function update(partial: Partial<MRuleFlowConnectorConfig>): void {
    onChange?.({ ...config, ...partial });
  }

  return (
    <div style={{ display: "grid", gap: "var(--mu-space-sm)" }}>
      <label style={MLabelStyle}>
        Connector Type
        <select
          style={MInputStyle}
          value={config.connectorType ?? ""}
          disabled={readOnly}
          onChange={(event) => update({ connectorType: event.target.value, connectorConfig: {}, credentialId: undefined })}
        >
          <option value="">Select connector type</option>
          {catalog.map((item) => (
            <option key={item.connectorType} value={item.connectorType}>
              {item.displayName} {item.category ? `(${item.category})` : ""}
            </option>
          ))}
        </select>
      </label>
      {config.connectorType ? (
        <>
          {selectedMeta?.description ? (
            <div style={MExpressionHintStyle}>
              <span>{selectedMeta.description}</span>
            </div>
          ) : null}
          <label style={MLabelStyle}>
            Config JSON
            <textarea
              style={{ ...MTextareaStyle, fontFamily: "var(--mu-font-mono)", fontSize: 13 }}
              value={JSON.stringify(config.connectorConfig ?? {}, null, 2)}
              disabled={readOnly}
              onChange={(event) => {
                try {
                  const parsed = JSON.parse(event.target.value) as Record<string, unknown>;
                  update({ connectorConfig: parsed });
                } catch {
                  // Allow intermediate invalid JSON while typing
                }
              }}
            />
          </label>
          {selectedMeta?.configSchema ? (
            <div style={MExpressionHintStyle}>
              <strong>Config Schema</strong>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "var(--mu-font-mono)", fontSize: 11 }}>
                {JSON.stringify(selectedMeta.configSchema, null, 2)}
              </pre>
            </div>
          ) : null}
        </>
      ) : null}
      {requiresCredentials ? (
        <label style={MLabelStyle}>
          Credential ID
          <input
            style={MInputStyle}
            value={config.credentialId ?? ""}
            disabled={readOnly}
            placeholder="Enter credential identifier"
            onChange={(event) => update({ credentialId: event.target.value })}
          />
        </label>
      ) : null}
    </div>
  );
}

function MDecisionTableOverviewCard({
  table,
  loadState
}: {
  table?: MDecisionTableModel | null;
  loadState?: { status: "idle" | "loading" | "ready" | "error"; message?: string };
}): React.JSX.Element {
  return (
    <div style={MMetadataCardStyle} data-testid="decision-table-overview">
      <div style={MSectionTitleStyle}>
        <strong>Decision Table Schema</strong>
        <span>
          {loadState?.status === "loading"
            ? "Loading decision table columns..."
            : loadState?.status === "error"
              ? loadState.message
              : "Input and output columns drive node contracts and FEEL cell authoring."}
        </span>
      </div>
      {table ? (
        <>
          <div><strong>{table.name}</strong> · v{table.version} · hit policy {table.hitPolicy}</div>
          {table.description ? <div>{table.description}</div> : null}
          <div style={{ display: "grid", gap: 8 }}>
            <div>
              <strong>Input Columns</strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {table.inputColumns.map((column) => (
                  <span key={column.id} style={MDependencyChipStyle}>
                    {column.label} ({column.dataType})
                  </span>
                ))}
              </div>
            </div>
            <div>
              <strong>Output Columns</strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {table.outputColumns.map((column) => (
                  <span key={column.id} style={MDependencyChipStyle}>
                    {column.label} ({column.dataType})
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div style={MExpressionHintStyle}>
            <strong>FEEL cell hints</strong>
            <span>Input columns become the effective input contract for this node. Output columns are emitted downstream after the table evaluates.</span>
            <span>Use FEEL row expressions against the input column names exactly as defined here.</span>
          </div>
        </>
      ) : loadState?.status === "idle" ? (
        <span>Select a decision table to preview its column schema.</span>
      ) : null}
    </div>
  );
}

function MScopeTable({
  title,
  subtitle,
  contract,
  loadState,
  readOnly,
  onInsert,
  groupBySource
}: {
  title: string;
  subtitle: string;
  contract?: MRuleFlowContractSchema;
  loadState: MContractLoadState;
  readOnly: boolean;
  onInsert: (path: string) => void;
  groupBySource?: boolean;
}): React.JSX.Element {
  const [viewMode, setViewMode] = useState<"tree" | "table">("tree");
  const [allExpanded, setAllExpanded] = useState(true);

  const rootFields = contract?.fields ?? [];
  const flatFields = MFlattenContractFields(rootFields);
  const hasFields = rootFields.length > 0;

  // Group root-level fields by source (for tree mode)
  const treeGroups = new Map<string, MRuleFlowContractField[]>();
  for (const field of rootFields) {
    const key = groupBySource
      ? field.sourceNodeLabel ?? (field.sourceKind === "flow-input" ? "Flow Input" : "Current Scope")
      : "All Fields";
    const bucket = treeGroups.get(key) ?? [];
    bucket.push(field);
    treeGroups.set(key, bucket);
  }

  // Group flat fields by source (for table mode)
  const flatGroups = new Map<string, MRuleFlowContractField[]>();
  for (const field of flatFields) {
    const key = groupBySource
      ? field.sourceNodeLabel ?? (field.sourceKind === "flow-input" ? "Flow Input" : "Current Scope")
      : "All Fields";
    const bucket = flatGroups.get(key) ?? [];
    bucket.push(field);
    flatGroups.set(key, bucket);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--mu-space-sm)" }}>
      {/* Header row with title + view toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={MSectionTitleStyle}>
          <strong>{title}</strong>
          <span>{loadState.status === "loading" ? "Loading contract..." : subtitle}</span>
        </div>
        {hasFields ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {/* Expand/Collapse All — only in tree mode */}
            {viewMode === "tree" ? (
              <button
                type="button"
                onClick={() => setAllExpanded(!allExpanded)}
                style={{
                  border: "1px solid var(--mu-border-subtle)",
                  background: "transparent",
                  borderRadius: 6,
                  padding: "3px 8px",
                  fontSize: 11,
                  color: "var(--mu-text-muted)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {allExpanded ? "Collapse All" : "Expand All"}
              </button>
            ) : null}
            {/* View mode pill tabs */}
            <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: "1px solid var(--mu-border-subtle)" }}>
              <button
                type="button"
                onClick={() => setViewMode("tree")}
                style={{
                  border: "none",
                  padding: "3px 10px",
                  fontSize: 11,
                  cursor: "pointer",
                  fontWeight: 600,
                  backgroundColor: viewMode === "tree" ? "var(--mu-color-interactive)" : "transparent",
                  color: viewMode === "tree" ? "var(--mu-text-on-accent)" : "var(--mu-text-muted)",
                }}
              >
                Schema Tree
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                style={{
                  border: "none",
                  borderLeft: "1px solid var(--mu-border-subtle)",
                  padding: "3px 10px",
                  fontSize: 11,
                  cursor: "pointer",
                  fontWeight: 600,
                  backgroundColor: viewMode === "table" ? "var(--mu-color-interactive)" : "transparent",
                  color: viewMode === "table" ? "var(--mu-text-on-accent)" : "var(--mu-text-muted)",
                }}
              >
                Flat Table
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Content */}
      {!hasFields ? (
        loadState.status === "loading"
          ? <MEmptyStateBox icon="\u231B" message="Fetching contract metadata..." />
          : <MEmptyStateBox message="No scope metadata available for this node." />
      ) : viewMode === "tree" ? (
        /* Tree view */
        <div
          key={allExpanded ? "expanded" : "collapsed"}
          style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 420, overflow: "auto" }}
        >
          {[...treeGroups.entries()].map(([groupName, groupFields]) => (
            <div key={groupName} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {groupBySource ? <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mu-text-secondary)", padding: "4px 8px" }}>{groupName}</div> : null}
              {groupFields.map((field) => (
                <MTreeNode
                  key={field.path}
                  field={field}
                  depth={0}
                  readOnly={readOnly}
                  onInsert={onInsert}
                  defaultExpanded={allExpanded}
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        /* Flat table view */
        [...flatGroups.entries()].map(([groupName, groupFields]) => (
          <div key={groupName} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {groupBySource ? <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mu-text-secondary)" }}>{groupName}</div> : null}
            <MFieldTable fields={groupFields} readOnly={readOnly} onInsert={onInsert} />
          </div>
        ))
      )}
    </div>
  );
}

function MStatusBadge({ status }: { status?: string }): React.JSX.Element {
  const config: Record<string, { icon: string; label: string; bg: string; text: string }> = {
    "mapped":        { icon: "\u2705", label: "Mapped",        bg: "var(--mu-color-success-bg)", text: "var(--mu-color-success-text)" },
    "suggested":     { icon: "\u26a0\ufe0f", label: "Suggested",    bg: "var(--mu-color-warning-bg)", text: "var(--mu-color-warning-text)" },
    "missing":       { icon: "\u274c", label: "Missing",       bg: "var(--mu-color-error-bg)", text: "var(--mu-color-error-text)" },
    "type-mismatch": { icon: "\ud83d\udd04", label: "Type Mismatch", bg: "var(--mu-color-warning-bg)", text: "var(--mu-color-warning-text)" },
  };
  const c = config[status ?? "mapped"] ?? config["mapped"];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, padding: "2px 8px", borderRadius: 10, background: c.bg, color: c.text, fontWeight: 500 }}>
      {c.icon} {c.label}
    </span>
  );
}

function MEffectiveInputTab({
  nodeType,
  readOnly,
  upstreamFields,
  targetFields,
  rows,
  onInsert,
  onChangeTargetFields,
  onChange,
  setInspectorTab,
  hasExpression
}: {
  nodeType: MRuleFlowNodeType;
  readOnly: boolean;
  upstreamFields: MRuleFlowContractField[];
  targetFields: MRuleFlowContractField[];
  rows: MEffectiveInputMapping[];
  onInsert: (path: string) => void;
  onChangeTargetFields: (fields: MRuleFlowContractField[]) => void;
  onChange: (rows: MEffectiveInputMapping[]) => void;
  setInspectorTab: (tab: MInspectorTab) => void;
  hasExpression?: boolean;
}): React.JSX.Element {
  const manualEdit = nodeType === "action" || nodeType === "sub-flow";
  const contractEditable = nodeType === "action";

  function updateRow(id: string, updater: (row: MEffectiveInputMapping) => MEffectiveInputMapping): void {
    onChange(rows.map((row) => (row.id === id ? updater(row) : row)));
  }

  function addTargetField(): void {
    const nextPath = `input.${targetFields.length + 1}`;
    onChangeTargetFields([
      ...targetFields,
      {
        path: nextPath,
        label: nextPath,
        dataType: "string",
        required: false
      }
    ]);
  }

  function updateTargetField(path: string, updater: (field: MRuleFlowContractField) => MRuleFlowContractField): void {
    const currentField = targetFields.find((field) => field.path === path);
    if (!currentField) {
      return;
    }
    const nextField = updater(currentField);
    onChangeTargetFields(targetFields.map((field) => (field.path === path ? nextField : field)));
    onChange(rows.map((row) => (
      (row.targetField ?? row.targetPath) === path
        ? {
            ...row,
            targetField: nextField.path,
            targetPath: nextField.path,
            targetDataType: nextField.dataType,
            required: nextField.required
          }
        : row
    )));
  }

  function removeTargetField(path: string): void {
    onChangeTargetFields(targetFields.filter((field) => field.path !== path));
    onChange(rows.filter((row) => (row.targetField ?? row.targetPath) !== path));
  }

  // Context-aware empty states
  if (rows.length === 0) {
    // Code-first nodes (action with no expression)
    if (nodeType === "action" && !hasExpression) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--mu-space-sm)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--mu-space-sm)", alignItems: "center" }}>
            <div style={MSectionTitleStyle}>
              <strong>Data Flow</strong>
              <span>Where this node gets its data from upstream nodes</span>
            </div>
            {!readOnly && contractEditable ? (
              <button type="button" style={MActionButtonStyle(false)} onClick={addTargetField}>Add Input Slot</button>
            ) : null}
          </div>
          <MEmptyStateBox
            icon="info"
            message="This node uses code-first logic — no expression-based mapping needed. Input/output contracts come from the registered rule code."
          />
        </div>
      );
    }
    // FEEL/expression nodes with no expression body
    if ((nodeType === "condition" || nodeType === "liquid") && !hasExpression) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--mu-space-sm)" }}>
          <div style={MSectionTitleStyle}>
            <strong>Data Flow</strong>
            <span>Where this node gets its data from upstream nodes</span>
          </div>
          <MEmptyStateBox
            icon="edit"
            message="Write a FEEL expression in the Logic tab to see data flow here."
            actionHint="Go to Logic tab"
            onAction={() => setInspectorTab("logic")}
          />
        </div>
      );
    }
    // Has expression but no mappings resolved
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--mu-space-sm)" }}>
        <div style={MSectionTitleStyle}>
          <strong>Data Flow</strong>
          <span>Where this node gets its data from upstream nodes</span>
        </div>
        <MEmptyStateBox
          icon="warning"
          message="Expression references fields not found in upstream scope. Check field names in the Logic tab."
          actionHint="Go to Logic tab"
          onAction={() => setInspectorTab("logic")}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--mu-space-sm)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--mu-space-sm)", alignItems: "center" }}>
        <div style={MSectionTitleStyle}>
          <strong>Data Flow</strong>
          <span>Where this node gets its data from upstream nodes</span>
        </div>
        {!readOnly && contractEditable ? (
          <button type="button" style={MActionButtonStyle(false)} onClick={addTargetField}>Add Input Slot</button>
        ) : null}
      </div>
      <div style={MTableShellStyle}>
        <table style={MTableStyle}>
          <thead>
            <tr>
              <th style={MTableHeaderStyle}>Source</th>
              <th style={MTableHeaderStyle}>Target</th>
              <th style={MTableHeaderStyle}>Type</th>
              <th style={MTableHeaderStyle}>Status</th>
              <th style={MTableHeaderStyle}>Transform</th>
              {contractEditable ? <th style={MTableHeaderStyle}>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td style={MTableCellStyle}>
                  {manualEdit ? (
                    <input list="upstream-scope-fields" style={MInputStyle} value={row.sourcePath} disabled={readOnly} onChange={(event) => updateRow(row.id, (current) => ({ ...current, sourcePath: event.target.value }))} />
                  ) : (
                    <button type="button" style={MInlinePathButtonStyle} onClick={() => onInsert(row.sourcePath)} disabled={readOnly || !row.sourcePath}>{row.sourcePath || "unmapped"}</button>
                  )}
                </td>
                <td style={MTableCellStyle}>
                  {contractEditable ? (
                    <input
                      style={MInputStyle}
                      value={row.targetField ?? row.targetPath}
                      disabled={readOnly}
                      onChange={(event) =>
                        updateTargetField(row.targetField ?? row.targetPath, (current) => ({
                          ...current,
                          path: event.target.value,
                          label: event.target.value
                        }))
                      }
                    />
                  ) : row.targetField ?? row.targetPath}
                </td>
                <td style={MTableCellStyle}>
                  {contractEditable ? (
                    <input
                      style={MInputStyle}
                      value={row.targetDataType ?? "string"}
                      disabled={readOnly}
                      onChange={(event) =>
                        updateTargetField(row.targetField ?? row.targetPath, (current) => ({
                          ...current,
                          dataType: event.target.value
                        }))
                      }
                    />
                  ) : <MTypeBadge dataType={`${row.sourceDataType ?? "unknown"} \u2192 ${row.targetDataType ?? "unknown"}`} />}
                </td>
                <td style={MTableCellStyle}>
                  <MStatusBadge status={row.status} />
                  {row.required ? <span style={{ fontSize: 10, color: "var(--mu-color-error)", marginLeft: 4, fontWeight: 600 }}>required</span> : null}
                </td>
                <td style={MTableCellStyle}>
                  {manualEdit ? (
                    <input style={MInputStyle} value={row.transform ?? row.transformSuggestion ?? ""} disabled={readOnly} onChange={(event) => updateRow(row.id, (current) => ({ ...current, transform: event.target.value }))} />
                  ) : (
                    row.transformSuggestion ?? row.transform ?? "\u2014"
                  )}
                </td>
                {contractEditable ? (
                  <td style={MTableCellStyle}>
                    <button type="button" style={MInlinePathButtonStyle} disabled={readOnly} onClick={() => removeTargetField(row.targetField ?? row.targetPath)}>
                      Remove
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <datalist id="upstream-scope-fields">
        {upstreamFields.map((field) => <option key={field.path} value={field.path} />)}
      </datalist>
      {targetFields.length ? (
        <div style={MExpressionHintStyle}>
          <strong title="Fields this node declares it needs — must be provided by upstream nodes or flow input">Required input slots</strong>
          <span>{targetFields.filter((field) => field.required).map((field) => field.path).join(", ") || "No required fields declared."}</span>
        </div>
      ) : null}
    </div>
  );
}

function MOutputContractTab({
  nodeType,
  contract,
  upstreamScope,
  issues,
  readOnly,
  onInsert,
  onChange
}: {
  nodeType: MRuleFlowNodeType;
  contract?: MRuleFlowContractSchema;
  upstreamScope?: MRuleFlowContractSchema;
  issues: MContractValidationIssue[];
  readOnly: boolean;
  onInsert: (path: string) => void;
  onChange: (fields: MRuleFlowContractField[]) => void;
}): React.JSX.Element {
  const [autoExpanded, setAutoExpanded] = useState(false);

  // End node special case — Final Scope (unchanged)
  if (nodeType === "end") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--mu-space-sm)" }}>
        <div style={MSectionTitleStyle}>
          <strong>Final Scope</strong>
          <span>Everything guaranteed to be available when the flow reaches this end node.</span>
        </div>
        <MFieldTable fields={MFlattenContractFields(upstreamScope?.fields ?? [])} readOnly={readOnly} onInsert={onInsert} />
      </div>
    );
  }

  const editable = nodeType === "condition" || nodeType === "action";
  const allFields = MFlattenContractFields(contract?.fields ?? []);
  const customFields = allFields.filter(f => !f.isResultPayload);
  const autoFields = allFields.filter(f => f.isResultPayload);
  const isCondition = nodeType === "condition";
  const isAction = nodeType === "action";
  const showValueExpression = isCondition || isAction;

  function updateFieldAt(index: number, updater: (field: MRuleFlowContractField) => MRuleFlowContractField): void {
    // Map index back to allFields: custom fields come first in the onChange array
    const updatedAll = allFields.map((field) => {
      if (!field.isResultPayload) {
        const customIdx = customFields.indexOf(field);
        if (customIdx === index) return updater(field);
      }
      return field;
    });
    onChange(updatedAll);
  }

  function removeFieldAt(index: number): void {
    const fieldToRemove = customFields[index];
    onChange(allFields.filter((f) => f !== fieldToRemove));
  }

  function addField(): void {
    const nextPath = `custom.${customFields.length + 1}`;
    onChange([
      ...allFields,
      {
        path: nextPath,
        label: nextPath,
        dataType: "string",
        required: false
      }
    ]);
  }

  // Build upstream autocomplete extensions for inline FEEL editors
  const upstreamAutocompleteExts: Extension[] = (() => {
    const exts: Extension[] = [];
    if (upstreamScope) exts.push(mCreateFeelAutocomplete(MFlattenContractFields(upstreamScope.fields)));
    return exts;
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Section 1: Custom Output Fields ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--mu-space-sm)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--mu-space-sm)", alignItems: "center" }}>
          <div style={MSectionTitleStyle}>
            <strong>Custom Output Fields</strong>
            <span>User-defined fields with expressions</span>
          </div>
          {!readOnly && editable ? (
            <button type="button" style={MActionButtonStyle(false)} onClick={addField}>Add Field</button>
          ) : null}
        </div>
        {customFields.length === 0 ? (
          <MEmptyStateBox
            message="No custom output fields defined."
            actionHint={editable && !readOnly ? "Add a field to compute values for downstream nodes." : undefined}
            onAction={editable && !readOnly ? addField : undefined}
          />
        ) : (
          <div style={MTableShellStyle}>
            <table style={MTableStyle}>
              <thead>
                <tr>
                  <th style={{ ...MTableHeaderStyle, width: showValueExpression ? 90 : 120 }} title="Dotted path where this value is stored in the FactBag">Path</th>
                  <th style={{ ...MTableHeaderStyle, width: 56 }} title="Data type of the output value">Type</th>
                  {showValueExpression ? <th style={MTableHeaderStyle} title="FEEL/Liquid expression that computes this value at runtime">Expression</th> : null}
                  {editable && !readOnly ? <th style={{ ...MTableHeaderStyle, width: 44 }}>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {customFields.map((field, index) => (
                  <tr key={`output-custom-${index}`}>
                    <td style={MTableCellStyle}>
                      {editable ? (
                        <input
                          style={MInputStyle}
                          value={field.path}
                          disabled={readOnly}
                          onChange={(event) => updateFieldAt(index, (current) => ({ ...current, path: event.target.value, label: event.target.value }))}
                        />
                      ) : (
                        <button type="button" style={MInlinePathButtonStyle} onClick={() => onInsert(field.path)} disabled={readOnly}>{field.path}</button>
                      )}
                    </td>
                    <td style={MTableCellStyle}>
                      {editable && !readOnly ? (
                        <select
                          style={{ fontSize: 11, padding: "2px 4px", borderRadius: 6, border: "1px solid var(--mu-border-input)", background: "var(--mu-surface-raised)", width: "100%", cursor: "pointer" }}
                          value={field.dataType}
                          onChange={(event) => updateFieldAt(index, (current) => ({ ...current, dataType: event.target.value }))}
                        >
                          {["string", "number", "boolean", "object", "array"].map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      ) : <MTypeBadge dataType={field.dataType} />}
                    </td>
                    {showValueExpression ? (
                      <td style={{ ...MTableCellStyle, overflow: "visible", whiteSpace: "normal" }}>
                        {editable ? (
                          <MExpressionEditor
                            value={field.valueExpression ?? ""}
                            language="feel"
                            readOnly={readOnly}
                            singleLine={true}
                            placeholderText="e.g. command.details.length"
                            onChange={(val) => updateFieldAt(index, (current) => ({
                              ...current,
                              valueExpression: val,
                              runtimeWritten: val.trim().length > 0
                            }))}
                            extensions={upstreamAutocompleteExts}
                            root={undefined}
                          />
                        ) : (
                          <span style={{ fontFamily: "var(--mu-font-mono)", fontSize: "var(--mu-text-xs)" }}>{field.valueExpression ?? "\u2014"}</span>
                        )}
                      </td>
                    ) : null}
                    {editable && !readOnly ? (
                      <td style={MTableCellStyle}>
                        <button type="button" style={MInlinePathButtonStyle} onClick={() => removeFieldAt(index)}>
                          delete
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 2: Auto-Generated Results (collapsed by default) ── */}
      {autoFields.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setAutoExpanded(!autoExpanded)}
            onKeyDown={(e) => { if (e.key === "Enter") setAutoExpanded(!autoExpanded); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              padding: "6px 8px",
              borderRadius: 6,
              userSelect: "none",
              transition: "background-color 0.1s",
            }}
          >
            <span style={{ fontSize: 10, color: "var(--mu-text-muted)", width: 16, textAlign: "center" }}>
              {autoExpanded ? "\u25BC" : "\u25B6"}
            </span>
            <strong style={{ fontSize: 13, color: "var(--mu-text-label)" }}>Auto-Generated Results</strong>
            <span style={{
              background: "var(--mu-border-subtle)",
              padding: "2px 8px",
              borderRadius: 10,
              fontSize: 11,
              color: "var(--mu-text-secondary)",
              fontWeight: 600,
            }}>
              {autoFields.length} field{autoFields.length !== 1 ? "s" : ""}
            </span>
          </div>
          {autoExpanded ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "4px 0" }}>
              {autoFields.map((field, index) => (
                <div key={`output-auto-${index}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 8px", fontSize: 12 }}>
                  <button type="button" style={{ ...MInlinePathButtonStyle, flex: 1, textAlign: "left" }} onClick={() => onInsert(field.path)} disabled={readOnly}>{field.path}</button>
                  <MTypeBadge dataType={field.dataType} />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {issues.length ? <MIssueList issues={issues.filter((issue) => issue.severity !== "info")} /> : null}
    </div>
  );
}

function MFieldTable({
  fields,
  readOnly,
  onInsert
}: {
  fields: MRuleFlowContractField[];
  readOnly: boolean;
  onInsert: (path: string) => void;
}): React.JSX.Element {
  return (
    <div style={MTableShellStyle}>
      <table style={MTableStyle}>
        <thead>
          <tr>
            <th style={MTableHeaderStyle}>Path</th>
            <th style={{ ...MTableHeaderStyle, width: 56 }}>Type</th>
            <th style={MTableHeaderStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={`${field.sourceNodeId ?? "scope"}:${field.path}`}>
              <td style={MTableCellStyle}>
                <button type="button" style={MInlinePathButtonStyle} onClick={() => onInsert(field.path)} disabled={readOnly}>{field.path}</button>
              </td>
              <td style={MTableCellStyle}><MTypeBadge dataType={field.dataType} /></td>
              <td style={MTableCellStyle} title={field.description ?? field.label}>{field.description ?? field.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MIssueList({ issues }: { issues: MContractValidationIssue[] }): React.JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {issues.map((issue) => (
        <div key={`${issue.code}:${issue.message}:${issue.fieldPath ?? ""}`} style={issue.severity === "error" ? MErrorBannerStyle : MWarningBannerStyle}>
          <strong>{issue.code}</strong> {issue.message}
        </div>
      ))}
    </div>
  );
}

export const MSectionTitleStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--mu-space-xs)",
  fontSize: "var(--mu-text-sm)",
  color: "var(--mu-text-muted)"
};

export const MInspectorShellStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--mu-space-sm)",
  padding: "var(--mu-space-md)",
  width: "100%",
  minWidth: 0,
  borderRadius: 18,
  background: "var(--mu-surface-sidebar)",
  border: "1px solid var(--mu-border-subtle)"
};

export const MInspectorTabsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  paddingBottom: 8,
  borderBottom: "1px solid var(--mu-border-subtle)"
};

export const MLabelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--mu-space-xs)",
  fontSize: "var(--mu-text-sm)",
  fontWeight: "var(--mu-font-medium)",
  color: "var(--mu-text-label)"
};

export const MInputStyle: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid var(--mu-border-input)",
  padding: "var(--mu-space-xs) var(--mu-space-sm)",
  fontSize: "var(--mu-text-xs)",
  width: "100%"
};

export const MTextareaStyle: React.CSSProperties = {
  ...MInputStyle,
  minHeight: 116,
  resize: "vertical"
};

export const MTableShellStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid var(--mu-border-subtle)",
  overflow: "hidden",
  maxHeight: 420,
  minWidth: 0,
  background: "var(--mu-surface-base)"
};

export const MTableStyle: React.CSSProperties = {
  width: "100%",
  tableLayout: "fixed",
  borderCollapse: "collapse",
  fontSize: 12
};

export const MTableHeaderStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  background: "var(--mu-surface-raised)",
  textAlign: "left",
  padding: "var(--mu-space-xs) var(--mu-space-xs)",
  fontSize: "var(--mu-text-xs)",
  color: "var(--mu-text-secondary)",
  borderBottom: "1px solid var(--mu-border-subtle)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};

export const MTableCellStyle: React.CSSProperties = {
  padding: "6px 4px",
  fontSize: 12,
  color: "var(--mu-text-primary)",
  borderBottom: "1px solid var(--mu-border-subtle)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  verticalAlign: "middle"
};

export const MInlinePathButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "var(--mu-color-interactive)",
  padding: 0,
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 12,
  textAlign: "left"
};

export const MContractGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "var(--mu-space-sm)"
};

export const MDeleteButtonStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid var(--mu-color-error-border)",
  background: "var(--mu-color-error-bg)",
  color: "var(--mu-color-error-text)",
  padding: "12px 14px",
  fontWeight: 600
};

export const MExpressionHintStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: 12,
  borderRadius: 14,
  background: "var(--mu-surface-raised)",
  color: "var(--mu-text-secondary)",
  fontSize: 12,
  lineHeight: 1.5
};

export const MErrorBannerStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid var(--mu-color-error-border)",
  background: "var(--mu-color-error-bg)",
  color: "var(--mu-color-error-text)",
  padding: "10px 12px",
  fontSize: 12
};

export const MWarningBannerStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid var(--mu-color-warning-border)",
  background: "var(--mu-color-warning-bg)",
  color: "var(--mu-color-warning-text)",
  padding: "10px 12px",
  fontSize: 12
};

export const MMetadataCardStyle: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid var(--mu-border-subtle)",
  background: "var(--mu-surface-base)",
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  fontSize: 12,
  color: "var(--mu-text-label)"
};

export const MDependencyChipStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "4px 8px",
  background: "var(--mu-color-interactive-subtle)",
  color: "var(--mu-text-primary)",
  fontSize: 11,
  fontWeight: 600
};

export const MDependencyChipButtonStyle: React.CSSProperties = {
  ...MDependencyChipStyle,
  border: "none",
  cursor: "pointer"
};

const MPreviewStyle: React.CSSProperties = {
  margin: 0,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontFamily: "var(--mu-font-mono)",
  fontSize: 12
};

function MRenderLiquidPreview(template: string, fields: MRuleFlowContractField[], outputFormat: NonNullable<MRuleFlowLiquidConfig["outputFormat"]>): string {
  const flattened = MFlattenContractFields(fields);
  const sampleMap = new Map(flattened.map((field) => [field.path, field.example ?? `<${field.path}>`]));
  const rendered = template.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}/g, (_match, path: string) => String(sampleMap.get(path) ?? `<${path}>`));
  if (outputFormat === "object" || outputFormat === "json") {
    return rendered;
  }

  return rendered;
}

export function MActionButtonStyle(primary: boolean): React.CSSProperties {
  return {
    borderRadius: 12,
    border: primary ? "1px solid var(--mu-color-interactive-border)" : "1px solid var(--mu-border-input)",
    background: primary ? "var(--mu-color-interactive-subtle)" : "var(--mu-surface-raised)",
    color: "var(--mu-text-primary)",
    padding: "10px 12px",
    fontWeight: 600
  };
}

export function MInspectorTabButtonStyle(active: boolean): React.CSSProperties {
  return {
    borderRadius: 999,
    border: active ? "1px solid var(--mu-color-interactive-border)" : "1px solid var(--mu-border-subtle)",
    background: active ? "var(--mu-color-interactive-subtle)" : "var(--mu-surface-base)",
    color: "var(--mu-text-primary)",
    fontSize: 13,
    padding: "10px 14px",
    fontWeight: 600
  };
}
