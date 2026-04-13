import React from "react";
import type { MFlowThemeTokens } from "../rule-flow-theme.js";

export interface MDryRunNodeTooltipProps {
  nodeName: string;
  isSuccess: boolean;
  evaluationResult?: boolean | string;
  outputs?: Record<string, unknown>;
  errors?: string[];
  position: { x: number; y: number };
  tokens: MFlowThemeTokens;
}

export function MDryRunNodeTooltip({
  nodeName,
  isSuccess,
  evaluationResult,
  outputs,
  errors,
  position,
  tokens
}: MDryRunNodeTooltipProps): React.JSX.Element {
  const statusColor = isSuccess ? "var(--mu-color-success)" : "var(--mu-color-error)";
  const statusBg = isSuccess ? "var(--mu-color-success-bg)" : "var(--mu-color-error-bg)";
  const statusLabel = isSuccess ? "Pass" : "Fail";

  const hasOutputs = outputs != null && Object.keys(outputs).length > 0;
  const hasErrors = errors != null && errors.length > 0;

  return (
    <div
      style={{
        position: "fixed",
        left: position.x + 12,
        top: position.y - 8,
        background: tokens.inspectorBg,
        border: `1px solid ${tokens.sidebarBorder.replace("1px solid ", "")}`,
        borderRadius: 8,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        padding: "10px 14px",
        maxWidth: 320,
        zIndex: 1000,
        pointerEvents: "none",
        fontSize: 12
      }}
    >
      {/* Header: node name + status badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontWeight: 600, color: tokens.textPrimary }}>{nodeName}</span>
        <span
          style={{
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: 12,
            background: statusBg,
            color: statusColor,
            fontWeight: 600,
            fontSize: 11
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Evaluation result */}
      {evaluationResult !== undefined ? (
        <div style={{ color: tokens.textSecondary, marginBottom: 4 }}>
          Evaluation: {String(evaluationResult)}
        </div>
      ) : null}

      {/* Outputs */}
      {hasOutputs ? (
        <div style={{ marginBottom: 4 }}>
          <div style={{ color: tokens.textSecondary, marginBottom: 2 }}>Outputs:</div>
          <pre
            style={{
              maxHeight: 120,
              overflowY: "auto",
              fontFamily: "monospace",
              fontSize: 11,
              margin: 0,
              padding: "4px 6px",
              background: "rgba(0,0,0,0.04)",
              borderRadius: 4,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              color: tokens.textPrimary
            }}
          >
            {JSON.stringify(outputs, null, 2)}
          </pre>
        </div>
      ) : null}

      {/* Errors */}
      {hasErrors ? (
        <div>
          <div style={{ color: "var(--mu-color-error)", marginBottom: 2 }}>Errors:</div>
          {errors!.map((err, i) => (
            <div key={i} style={{ color: "var(--mu-color-error)", fontSize: 11 }}>
              {err}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
