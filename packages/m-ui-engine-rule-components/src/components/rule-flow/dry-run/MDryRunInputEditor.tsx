/**
 * JSON input editor for dry-run execution.
 * Wraps MExpressionEditor with language="json" and provides
 * a header with "Reset to Schema" action.
 */
import React from "react";
import { MExpressionEditor } from "../expression-editor/MExpressionEditor.js";
import type { MFlowThemeTokens } from "../rule-flow-theme.js";

export interface MDryRunInputEditorProps {
  value: string;
  onChange: (value: string) => void;
  onReset?: () => void;
  tokens: MFlowThemeTokens;
  editorRoot?: Document | ShadowRoot;
}

export function MDryRunInputEditor({ value, onChange, onReset, tokens, editorRoot }: MDryRunInputEditorProps): React.JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, borderBottom: `1px solid ${tokens.sidebarBorder.replace("1px solid ", "")}` }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "6px 12px",
        background: tokens.sidebarBg,
        borderBottom: `1px solid ${tokens.sidebarBorder.replace("1px solid ", "")}`
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: tokens.textPrimary }}>Input Data (JSON)</span>
        {onReset ? (
          <button
            type="button"
            onClick={onReset}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              fontSize: 11, color: tokens.textSecondary, textDecoration: "underline",
              padding: "2px 4px"
            }}
          >
            Reset to Schema
          </button>
        ) : null}
      </div>
      <MExpressionEditor
        value={value}
        language="json"
        readOnly={false}
        onChange={onChange}
        minHeight={160}
        singleLine={false}
        root={editorRoot}
        placeholderText='{ "key": "value" }'
      />
    </div>
  );
}
