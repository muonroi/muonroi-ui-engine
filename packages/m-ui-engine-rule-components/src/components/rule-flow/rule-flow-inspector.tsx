import React, { useRef } from "react";
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
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
        <div style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
        <textarea style={MTextareaStyle} value={String(selectedNode.data.description ?? "")} disabled={readOnly} onChange={(event) => props.onUpdateDescription(event.target.value)} />
      </label>
      <div style={MContractGridStyle}>
        <label style={MLabelStyle}>
          Contract Source
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
        </label>
        <label style={MLabelStyle}>
          Contract Code
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
      <div style={MMetadataCardStyle}>
        <div><strong>Order:</strong> {selectedNode.data.order ?? "n/a"}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                      <td style={{ ...MTableCellStyle, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: 12 }}>{field.valueExpression}</td>
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
    <div style={{ display: "grid", gap: 10 }}>
      <label style={MLabelStyle}>
        Success Label
        <input style={MInputStyle} value={normalized.successLabel} disabled={readOnly} onChange={(event) => onChange({ ...normalized, successLabel: event.target.value })} />
      </label>
      <label style={MLabelStyle}>
        Failure Label
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
    <div style={{ display: "grid", gap: 10 }}>
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
              style={{ ...MTextareaStyle, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: 13 }}
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
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: 11 }}>
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
  const fields = MFlattenContractFields(contract?.fields ?? []);
  const groups = new Map<string, MRuleFlowContractField[]>();
  for (const field of fields) {
    const key = groupBySource ? field.sourceNodeLabel ?? (field.sourceKind === "flow-input" ? "Flow Input" : "Current Scope") : "All Fields";
    const bucket = groups.get(key) ?? [];
    bucket.push(field);
    groups.set(key, bucket);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={MSectionTitleStyle}>
        <strong>{title}</strong>
        <span>{loadState.status === "loading" ? "Loading contract..." : subtitle}</span>
      </div>
      {fields.length === 0 ? (
        <div style={{ color: "#64748b", fontSize: 13 }}>{loadState.status === "loading" ? "Fetching contract metadata..." : "No scope metadata available for this node."}</div>
      ) : (
        [...groups.entries()].map(([groupName, groupFields]) => (
          <div key={groupName} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {groupBySource ? <div style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>{groupName}</div> : null}
            <MFieldTable fields={groupFields} readOnly={readOnly} onInsert={onInsert} />
          </div>
        ))
      )}
    </div>
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
  onChange
}: {
  nodeType: MRuleFlowNodeType;
  readOnly: boolean;
  upstreamFields: MRuleFlowContractField[];
  targetFields: MRuleFlowContractField[];
  rows: MEffectiveInputMapping[];
  onInsert: (path: string) => void;
  onChangeTargetFields: (fields: MRuleFlowContractField[]) => void;
  onChange: (rows: MEffectiveInputMapping[]) => void;
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div style={MSectionTitleStyle}>
          <strong>Effective Input</strong>
          <span>{manualEdit ? "Map upstream fields into this node's input slots." : "References inferred from current FEEL/Liquid and available inputs."}</span>
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
            {rows.length === 0 ? (
              <tr>
                <td style={MTableCellStyle} colSpan={contractEditable ? 6 : 5}>No effective input mapping available yet.</td>
              </tr>
            ) : rows.map((row) => (
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
                  ) : <>{row.sourceDataType ?? "unknown"} → {row.targetDataType ?? "unknown"}</>}
                </td>
                <td style={MTableCellStyle}>{row.status ?? "mapped"}{row.required ? " / required" : ""}</td>
                <td style={MTableCellStyle}>
                  {manualEdit ? (
                    <input style={MInputStyle} value={row.transform ?? row.transformSuggestion ?? ""} disabled={readOnly} onChange={(event) => updateRow(row.id, (current) => ({ ...current, transform: event.target.value }))} />
                  ) : (
                    row.transformSuggestion ?? row.transform ?? "—"
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
          <strong>Required input slots</strong>
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
  if (nodeType === "end") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={MSectionTitleStyle}>
          <strong>Final Scope</strong>
          <span>Everything guaranteed to be available when the flow reaches this end node.</span>
        </div>
        <MFieldTable fields={MFlattenContractFields(upstreamScope?.fields ?? [])} readOnly={readOnly} onInsert={onInsert} />
      </div>
    );
  }

  const editable = nodeType === "condition" || nodeType === "action";
  const fields = MFlattenContractFields(contract?.fields ?? []);
  const isCondition = nodeType === "condition";
  const isAction = nodeType === "action";
  const showValueExpression = isCondition || isAction;
  const sectionTitle = isCondition ? "Output Facts (on pass)" : "Output Contract";
  const sectionSubtitle = isCondition
    ? "These facts are written only when the condition passes."
    : editable
      ? "Edit the fields this node guarantees for downstream nodes."
      : "Auto-composed contract for downstream validation.";

  function updateFieldAt(index: number, updater: (field: MRuleFlowContractField) => MRuleFlowContractField): void {
    onChange(fields.map((field, fieldIndex) => fieldIndex === index ? updater(field) : field));
  }

  function removeFieldAt(index: number): void {
    onChange(fields.filter((_, fieldIndex) => fieldIndex !== index));
  }

  function addField(): void {
    const nextPath = `custom.${fields.length + 1}`;
    onChange([
      ...fields,
      {
        path: nextPath,
        label: nextPath,
        dataType: "string",
        required: false
      }
    ]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div style={MSectionTitleStyle}>
          <strong>{sectionTitle}</strong>
          <span>{sectionSubtitle}</span>
        </div>
        {!readOnly && editable ? (
          <button type="button" style={MActionButtonStyle(false)} onClick={addField}>Add Field</button>
        ) : null}
      </div>
      {fields.length === 0 ? (
        <div style={{ color: "#64748b", fontSize: 13 }}>This node currently produces no downstream fields.</div>
      ) : (
        <div style={MTableShellStyle}>
          <table style={MTableStyle}>
            <thead>
              <tr>
                <th style={MTableHeaderStyle}>Path</th>
                <th style={MTableHeaderStyle}>Type</th>
                {showValueExpression ? <th style={MTableHeaderStyle}>Value Expression</th> : null}
                <th style={MTableHeaderStyle}>Use</th>
                <th style={MTableHeaderStyle}>Expose</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => (
                <tr key={`output-contract-${index}`}>
                  <td style={MTableCellStyle}>
                    {editable && !field.isResultPayload ? (
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
                    {editable && !field.isResultPayload ? (
                      <input
                        style={MInputStyle}
                        value={field.dataType}
                        disabled={readOnly}
                        onChange={(event) => updateFieldAt(index, (current) => ({ ...current, dataType: event.target.value }))}
                      />
                    ) : field.dataType}
                  </td>
                  {showValueExpression ? (
                    <td style={MTableCellStyle}>
                      {field.isResultPayload ? (
                        <span style={{ color: "#64748b" }}>Auto</span>
                      ) : editable ? (
                        <input
                          style={MInputStyle}
                          value={field.valueExpression ?? ""}
                          disabled={readOnly}
                          placeholder={isAction ? "FEEL expression" : ""}
                          onChange={(event) =>
                            updateFieldAt(index, (current) => ({
                              ...current,
                              valueExpression: event.target.value,
                              runtimeWritten: event.target.value.trim().length > 0 ? true : false
                            }))
                          }
                        />
                      ) : (
                        field.valueExpression ?? "\u2014"
                      )}
                    </td>
                  ) : null}
                  <td style={MTableCellStyle}>
                    {field.isResultPayload
                      ? "result payload"
                      : isCondition
                        ? field.runtimeWritten
                          ? "runtime fact"
                          : "metadata only"
                        : isAction
                          ? field.valueExpression?.trim()
                            ? "computed"
                            : field.required ? "required" : "optional"
                          : field.required ? "required" : "optional"}
                  </td>
                  <td style={MTableCellStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={field.exposeToParent !== false}
                          disabled={readOnly || field.isResultPayload}
                          onChange={(event) => updateFieldAt(index, (current) => ({ ...current, exposeToParent: event.target.checked }))}
                        />
                        parent
                      </label>
                      {!readOnly && editable && !field.isResultPayload ? (
                        <button type="button" style={MInlinePathButtonStyle} onClick={() => removeFieldAt(index)}>
                          delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
            <th style={MTableHeaderStyle}>Type</th>
            <th style={MTableHeaderStyle}>Description</th>
            <th style={MTableHeaderStyle}>Use</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={`${field.sourceNodeId ?? "scope"}:${field.path}`}>
              <td style={MTableCellStyle}>
                <button type="button" style={MInlinePathButtonStyle} onClick={() => onInsert(field.path)} disabled={readOnly}>{field.path}</button>
              </td>
              <td style={MTableCellStyle}>{field.dataType}</td>
              <td style={MTableCellStyle}>{field.description ?? field.label}</td>
              <td style={MTableCellStyle}>{field.required ? "required" : "optional"}</td>
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
  gap: 4,
  fontSize: 13,
  color: "#64748b"
};

export const MInspectorShellStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 18,
  width: "100%",
  minWidth: 0,
  borderRadius: 18,
  background: "rgba(248, 250, 252, 0.9)",
  border: "1px solid rgba(148, 163, 184, 0.18)"
};

export const MInspectorTabsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  paddingBottom: 8,
  borderBottom: "1px solid rgba(148, 163, 184, 0.2)"
};

export const MLabelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 13,
  color: "#334155"
};

export const MInputStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(148, 163, 184, 0.35)",
  padding: "11px 13px",
  fontSize: 14,
  width: "100%"
};

export const MTextareaStyle: React.CSSProperties = {
  ...MInputStyle,
  minHeight: 116,
  resize: "vertical"
};

export const MTableShellStyle: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid rgba(148, 163, 184, 0.18)",
  overflow: "auto",
  maxHeight: 420,
  minWidth: 0,
  background: "#ffffff"
};

export const MTableStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 520,
  borderCollapse: "collapse"
};

export const MTableHeaderStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  background: "#f8fafc",
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 12,
  color: "#475569",
  borderBottom: "1px solid rgba(148, 163, 184, 0.18)"
};

export const MTableCellStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 12,
  color: "#0f172a",
  borderBottom: "1px solid rgba(226, 232, 240, 0.85)",
  verticalAlign: "top"
};

export const MInlinePathButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#2563eb",
  padding: 0,
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 12,
  textAlign: "left"
};

export const MContractGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10
};

export const MDeleteButtonStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(220, 38, 38, 0.24)",
  background: "rgba(254, 242, 242, 0.95)",
  color: "#b91c1c",
  padding: "12px 14px",
  fontWeight: 600
};

export const MExpressionHintStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: 12,
  borderRadius: 14,
  background: "rgba(241, 245, 249, 0.9)",
  color: "#475569",
  fontSize: 12,
  lineHeight: 1.5
};

export const MErrorBannerStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(220, 38, 38, 0.18)",
  background: "rgba(254, 242, 242, 0.9)",
  color: "#b91c1c",
  padding: "10px 12px",
  fontSize: 12
};

export const MWarningBannerStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(245, 158, 11, 0.18)",
  background: "rgba(255, 251, 235, 0.9)",
  color: "#92400e",
  padding: "10px 12px",
  fontSize: 12
};

export const MMetadataCardStyle: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid rgba(148, 163, 184, 0.18)",
  background: "rgba(255,255,255,0.9)",
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  fontSize: 12,
  color: "#334155"
};

export const MDependencyChipStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "4px 8px",
  background: "rgba(15, 23, 42, 0.08)",
  color: "#0f172a",
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
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
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
    border: primary ? "1px solid rgba(37, 99, 235, 0.28)" : "1px solid rgba(148, 163, 184, 0.35)",
    background: primary ? "rgba(37, 99, 235, 0.14)" : "rgba(255, 255, 255, 0.9)",
    color: "#0f172a",
    padding: "10px 12px",
    fontWeight: 600
  };
}

export function MInspectorTabButtonStyle(active: boolean): React.CSSProperties {
  return {
    borderRadius: 999,
    border: active ? `1px solid ${M_NODE_ACCENTS.condition}40` : "1px solid rgba(148, 163, 184, 0.24)",
    background: active ? `${M_NODE_ACCENTS.condition}14` : "#ffffff",
    color: "#0f172a",
    fontSize: 13,
    padding: "10px 14px",
    fontWeight: 600
  };
}
