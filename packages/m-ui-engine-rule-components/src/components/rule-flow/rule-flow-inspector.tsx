import React from "react";
import type {
  MRuleFlowConditionConfig,
  MRuleFlowContractField,
  MRuleFlowContractReference,
  MRuleFlowContractSchema,
  MRuleFlowExpressionLanguage,
  MRuleFlowLiquidConfig,
  MRuleFlowMappingRow,
  MRuleFlowNodeType,
  MRuleFlowSubFlowConfig
} from "../../models.js";
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
    };
  } | null;
  selectedExpression: { language: MRuleFlowExpressionLanguage; body: string };
  selectedRequestContract?: MRuleFlowContractSchema;
  selectedResponseContract?: MRuleFlowContractSchema;
  contractLoadState: MContractLoadState;
  readOnly: boolean;
  apiBaseUrl?: string;
  inspectorTab: MInspectorTab;
  setInspectorTab: (tab: MInspectorTab) => void;
  onUpdateLabel: (value: string) => void;
  onUpdateRuleCode: (value: string) => void;
  onUpdateDescription: (value: string) => void;
  onUpdateContractRef: (value: MRuleFlowContractReference) => void;
  onUpdateConditionConfig: (value: MRuleFlowConditionConfig) => void;
  onUpdateTargetFlowCode: (value: string) => void;
  onUpdateLiquidOutput: (value: NonNullable<MRuleFlowLiquidConfig["outputFormat"]>) => void;
  onUpdateExpressionLanguage: (value: MRuleFlowExpressionLanguage) => void;
  onUpdateExpressionBody: (value: string) => void;
  onInsertExpressionToken: (value: string) => void;
  onChangeMappings: (kind: "input" | "output", rows: MRuleFlowMappingRow[]) => void;
  onAddMapping: (kind: "input" | "output") => void;
  onDeleteNode: () => void;
}

export function MRuleFlowInspector(props: MRuleFlowInspectorProps): React.JSX.Element {
  const {
    selectedNode,
    selectedExpression,
    selectedRequestContract,
    selectedResponseContract,
    contractLoadState,
    readOnly,
    apiBaseUrl,
    inspectorTab,
    setInspectorTab
  } = props;

  return (
    <div style={MInspectorShellStyle}>
      <div style={MSectionTitleStyle}>
        <strong>Inspector</strong>
        <span>{selectedNode ? `Editing ${M_NODE_TITLES[selectedNode.data.nodeType]}` : "Select a node to edit it."}</span>
      </div>

      {selectedNode ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={MInspectorTabsStyle}>
            {MAvailableInspectorTabs(selectedNode.data.nodeType).map((tab) => (
              <button key={tab} type="button" style={MInspectorTabButtonStyle(tab === inspectorTab)} onClick={() => setInspectorTab(tab)}>
                {MInspectorTabTitle(tab)}
              </button>
            ))}
          </div>

          {inspectorTab === "general" ? <MGeneralTab {...props} /> : null}
          {inspectorTab === "expression" ? (
            <MExpressionTab
              expression={selectedExpression}
              readOnly={readOnly}
              apiBaseUrl={apiBaseUrl}
              onChangeLanguage={props.onUpdateExpressionLanguage}
              onChangeBody={props.onUpdateExpressionBody}
            />
          ) : null}
          {inspectorTab === "request" ? (
            <MContractTable title="Request Scope" contract={selectedRequestContract} loadState={contractLoadState} readOnly={readOnly} onInsert={props.onInsertExpressionToken} />
          ) : null}
          {inspectorTab === "response" ? (
            <MContractTable title="Response Delta" contract={selectedResponseContract} loadState={contractLoadState} readOnly={readOnly} onInsert={props.onInsertExpressionToken} />
          ) : null}
          {inspectorTab === "mappings" && selectedNode.data.nodeType === "sub-flow" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <MMappingTable
                title="Sub-flow Input Mapping"
                rows={MEnsureSubFlowConfig(selectedNode.data.subFlowConfig).inputMappings}
                readOnly={readOnly}
                sourceFields={MFlattenContractFields(selectedRequestContract?.fields ?? [])}
                targetFields={MFlattenContractFields(selectedRequestContract?.fields ?? [])}
                onAdd={() => props.onAddMapping("input")}
                onChange={(rows) => props.onChangeMappings("input", rows)}
              />
              <MMappingTable
                title="Sub-flow Output Mapping"
                rows={MEnsureSubFlowConfig(selectedNode.data.subFlowConfig).outputMappings}
                readOnly={readOnly}
                sourceFields={MFlattenContractFields(selectedResponseContract?.fields ?? [])}
                targetFields={MFlattenContractFields(selectedResponseContract?.fields ?? [])}
                onAdd={() => props.onAddMapping("output")}
                onChange={(rows) => props.onChangeMappings("output", rows)}
              />
            </div>
          ) : null}

          {contractLoadState.status === "error" ? <div style={MErrorBannerStyle}>{contractLoadState.message}</div> : null}

          {!readOnly ? (
            <button type="button" style={MDeleteButtonStyle} onClick={props.onDeleteNode}>
              Delete Node
            </button>
          ) : null}
        </div>
      ) : (
        <div style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
          Use the palette to add a node, then inspect request/response contracts before writing FEEL or Liquid logic.
        </div>
      )}
    </div>
  );
}

function MGeneralTab(props: MRuleFlowInspectorProps): React.JSX.Element {
  const { selectedNode, readOnly } = props;
  if (!selectedNode) {
    return <></>;
  }

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
      {selectedNode.data.nodeType === "condition" ? (
        <MConditionConfigEditor readOnly={readOnly} value={selectedNode.data.conditionConfig} onChange={props.onUpdateConditionConfig} />
      ) : null}
      {selectedNode.data.nodeType === "sub-flow" ? (
        <label style={MLabelStyle}>
          Target Flow Code
          <input
            style={MInputStyle}
            value={MEnsureSubFlowConfig(selectedNode.data.subFlowConfig).targetFlowCode ?? ""}
            disabled={readOnly}
            onChange={(event) => props.onUpdateTargetFlowCode(event.target.value)}
          />
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
    </div>
  );
}

function MExpressionTab({
  expression,
  readOnly,
  apiBaseUrl,
  onChangeLanguage,
  onChangeBody
}: {
  expression: { language: MRuleFlowExpressionLanguage; body: string };
  readOnly: boolean;
  apiBaseUrl?: string;
  onChangeLanguage: (value: MRuleFlowExpressionLanguage) => void;
  onChangeBody: (value: string) => void;
}): React.JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label style={MLabelStyle}>
        Expression Language
        <select style={MInputStyle} value={expression.language} disabled={readOnly} onChange={(event) => onChangeLanguage(event.target.value as MRuleFlowExpressionLanguage)}>
          <option value="feel">FEEL</option>
          <option value="liquid">Liquid</option>
          <option value="plain-text">Plain Text</option>
        </select>
      </label>
      <label style={MLabelStyle}>
        {expression.language === "liquid" ? "Liquid Template" : "Expression"}
        <textarea style={{ ...MTextareaStyle, minHeight: 180 }} value={expression.body} disabled={readOnly} onChange={(event) => onChangeBody(event.target.value)} />
      </label>
      <div style={MExpressionHintStyle}>
        <strong>Authoring hints</strong>
        <span>Click any request/response field row to insert its path into the current expression.</span>
        {apiBaseUrl ? <span>Contract API: {apiBaseUrl}</span> : null}
      </div>
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

function MContractTable({
  title,
  contract,
  loadState,
  readOnly,
  onInsert
}: {
  title: string;
  contract?: MRuleFlowContractSchema;
  loadState: MContractLoadState;
  readOnly: boolean;
  onInsert: (path: string) => void;
}): React.JSX.Element {
  const fields = MFlattenContractFields(contract?.fields ?? []);
  const subtitle = loadState.status === "loading" ? "Loading contract..." : contract?.title ?? contract?.contractName ?? "No contract metadata";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={MSectionTitleStyle}>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      {contract?.description ? <div style={MExpressionHintStyle}>{contract.description}</div> : null}
      {fields.length === 0 ? (
        <div style={{ color: "#64748b", fontSize: 13 }}>{loadState.status === "loading" ? "Fetching contract metadata..." : "No request/response schema available for this node."}</div>
      ) : (
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
                <tr key={field.path}>
                  <td style={MTableCellStyle}>
                    <button type="button" style={MInlinePathButtonStyle} onClick={() => onInsert(field.path)} disabled={readOnly}>
                      {field.path}
                    </button>
                  </td>
                  <td style={MTableCellStyle}>{field.dataType}</td>
                  <td style={MTableCellStyle}>{field.description ?? field.label}</td>
                  <td style={MTableCellStyle}>{field.required ? "required" : "optional"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MMappingTable({
  title,
  rows,
  readOnly,
  sourceFields,
  targetFields,
  onAdd,
  onChange
}: {
  title: string;
  rows: MRuleFlowMappingRow[];
  readOnly: boolean;
  sourceFields: MRuleFlowContractField[];
  targetFields: MRuleFlowContractField[];
  onAdd: () => void;
  onChange: (rows: MRuleFlowMappingRow[]) => void;
}): React.JSX.Element {
  function updateRow(id: string, updater: (row: MRuleFlowMappingRow) => MRuleFlowMappingRow): void {
    onChange(rows.map((row) => (row.id === id ? updater(row) : row)));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={MSectionTitleStyle}>
          <strong>{title}</strong>
          <span>Map fields instead of guessing target paths.</span>
        </div>
        {!readOnly ? (
          <button type="button" style={MActionButtonStyle(false)} onClick={onAdd}>
            Add Mapping
          </button>
        ) : null}
      </div>
      <div style={MTableShellStyle}>
        <table style={MTableStyle}>
          <thead>
            <tr>
              <th style={MTableHeaderStyle}>Source</th>
              <th style={MTableHeaderStyle}>Target</th>
              <th style={MTableHeaderStyle}>Transform</th>
              <th style={MTableHeaderStyle}>Language</th>
              <th style={MTableHeaderStyle}>Delete</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td style={MTableCellStyle} colSpan={5}>
                  No mappings defined yet.
                </td>
              </tr>
            ) : null}
            {rows.map((row) => (
              <tr key={row.id}>
                <td style={MTableCellStyle}>
                  <input list={`${title}-source`} style={MInputStyle} value={row.sourcePath} disabled={readOnly} onChange={(event) => updateRow(row.id, (current) => ({ ...current, sourcePath: event.target.value }))} />
                </td>
                <td style={MTableCellStyle}>
                  <input list={`${title}-target`} style={MInputStyle} value={row.targetPath} disabled={readOnly} onChange={(event) => updateRow(row.id, (current) => ({ ...current, targetPath: event.target.value }))} />
                </td>
                <td style={MTableCellStyle}>
                  <input style={MInputStyle} value={row.transform ?? ""} disabled={readOnly} onChange={(event) => updateRow(row.id, (current) => ({ ...current, transform: event.target.value }))} />
                </td>
                <td style={MTableCellStyle}>
                  <select style={MInputStyle} value={row.language ?? "feel"} disabled={readOnly} onChange={(event) => updateRow(row.id, (current) => ({ ...current, language: event.target.value as MRuleFlowExpressionLanguage }))}>
                    <option value="feel">feel</option>
                    <option value="liquid">liquid</option>
                    <option value="plain-text">plain-text</option>
                  </select>
                </td>
                <td style={MTableCellStyle}>
                  {!readOnly ? (
                    <button type="button" style={MDeleteInlineButtonStyle} onClick={() => onChange(rows.filter((candidate) => candidate.id !== row.id))}>
                      Remove
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <datalist id={`${title}-source`}>
        {sourceFields.map((field) => (
          <option key={field.path} value={field.path} />
        ))}
      </datalist>
      <datalist id={`${title}-target`}>
        {targetFields.map((field) => (
          <option key={field.path} value={field.path} />
        ))}
      </datalist>
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
  marginTop: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 16,
  minWidth: 0,
  borderRadius: 18,
  background: "rgba(248, 250, 252, 0.9)",
  border: "1px solid rgba(148, 163, 184, 0.18)"
};

export const MInspectorTabsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8
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
  padding: "10px 12px",
  fontSize: 13,
  width: "100%"
};

export const MTextareaStyle: React.CSSProperties = {
  ...MInputStyle,
  minHeight: 96,
  resize: "vertical"
};

export const MTableShellStyle: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid rgba(148, 163, 184, 0.18)",
  overflow: "auto",
  maxHeight: 320,
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
  padding: "10px 12px",
  fontWeight: 600
};

export const MDeleteInlineButtonStyle: React.CSSProperties = {
  borderRadius: 10,
  border: "1px solid rgba(220, 38, 38, 0.24)",
  background: "rgba(254, 242, 242, 0.95)",
  color: "#b91c1c",
  padding: "8px 10px",
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
    fontSize: 12,
    padding: "8px 12px",
    fontWeight: 600
  };
}
