/**
 * Bottom split panel for dry-run execution results.
 * Shows per-node pass/fail table (left) and FactBag/output JSON viewer (right).
 * Canvas nodes are highlighted via onSelectNode callback.
 */
import React, { useState } from "react";
import type { MFlowThemeTokens } from "../rule-flow-theme.js";

export interface MDryRunResult {
  isSuccess: boolean;
  errors: string[];
  results: Array<{
    ruleName: string;
    isSuccess: boolean;
    evaluationResult?: boolean;
    outputs?: Record<string, unknown>;
    errors?: string[];
  }>;
  factBag: Record<string, unknown>;
  executionTimeMs: number;
}

export interface MDryRunPanelProps {
  result: MDryRunResult | null;
  loading: boolean;
  error: string | null;
  onSelectNode?: (ruleName: string) => void;
  onClose: () => void;
  tokens: MFlowThemeTokens;
}

export function MDryRunPanel({ result, loading, error, onSelectNode, onClose, tokens }: MDryRunPanelProps): React.JSX.Element {
  const [selectedRule, setSelectedRule] = useState<string | null>(null);

  const selectedEntry = result?.results.find((r) => r.ruleName === selectedRule);
  const jsonDisplay = selectedEntry?.outputs
    ? JSON.stringify(selectedEntry.outputs, null, 2)
    : result?.factBag
      ? JSON.stringify(result.factBag, null, 2)
      : "{}";

  const passCount = result?.results.filter((r) => r.isSuccess).length ?? 0;
  const failCount = result?.results.filter((r) => !r.isSuccess).length ?? 0;

  return (
    <div style={{
      borderTop: `2px solid ${tokens.sidebarBorder.replace("1px solid ", "")}`,
      height: 280, overflow: "hidden", display: "flex", flexDirection: "column",
      background: tokens.inspectorBg
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 12px", borderBottom: `1px solid ${tokens.sidebarBorder.replace("1px solid ", "")}`,
        flexShrink: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: tokens.textPrimary }}>Dry Run Results</span>
          {result ? (
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 12,
              background: result.isSuccess ? "rgba(22,163,74,0.15)" : "rgba(239,68,68,0.15)",
              color: result.isSuccess ? "#16a34a" : "#ef4444",
              fontWeight: 600
            }}>
              {result.executionTimeMs}ms
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: tokens.textMuted, fontSize: 14, padding: 2
          }}
          title="Close results"
        >
          X
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: tokens.textSecondary, fontSize: 13 }}>
            Executing dry run...
          </div>
        ) : error ? (
          <div style={{ padding: 16, color: tokens.errorText, fontSize: 13 }}>
            <strong>Error:</strong> {error}
          </div>
        ) : result ? (
          <div style={{ display: "flex", height: "100%" }}>
            {/* Left — Results table (60%) */}
            <div style={{ width: "60%", overflow: "auto", borderRight: `1px solid ${tokens.sidebarBorder.replace("1px solid ", "")}` }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${tokens.sidebarBorder.replace("1px solid ", "")}`, position: "sticky", top: 0, background: tokens.inspectorBg, zIndex: 1 }}>
                    <th style={{ ...MThStyle, color: tokens.textSecondary }}>Node</th>
                    <th style={{ ...MThStyle, color: tokens.textSecondary, width: 60 }}>Status</th>
                    <th style={{ ...MThStyle, color: tokens.textSecondary, width: 80 }}>Evaluation</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((entry) => (
                    <tr
                      key={entry.ruleName}
                      onClick={() => {
                        setSelectedRule(entry.ruleName);
                        onSelectNode?.(entry.ruleName);
                      }}
                      style={{
                        cursor: "pointer",
                        borderBottom: `1px solid ${tokens.sidebarBorder.replace("1px solid ", "")}`,
                        background: selectedRule === entry.ruleName ? tokens.overlayItemSelectedBg : "transparent"
                      }}
                    >
                      <td style={{ padding: "6px 12px", color: tokens.textPrimary, fontWeight: 500 }}>
                        {entry.ruleName}
                        {entry.errors && entry.errors.length > 0 ? (
                          <div style={{ fontSize: 11, color: tokens.errorText, marginTop: 2 }}>
                            {entry.errors[0]}
                          </div>
                        ) : null}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "center" }}>
                        <span style={{
                          display: "inline-block", width: 18, height: 18, borderRadius: "50%",
                          lineHeight: "18px", textAlign: "center", fontSize: 11, fontWeight: 700,
                          background: entry.isSuccess ? "rgba(22,163,74,0.15)" : "rgba(239,68,68,0.15)",
                          color: entry.isSuccess ? "#16a34a" : "#ef4444"
                        }}>
                          {entry.isSuccess ? "\u2713" : "\u2717"}
                        </span>
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "center", fontSize: 11, color: tokens.textSecondary }}>
                        {entry.evaluationResult === true ? "true" : entry.evaluationResult === false ? "false" : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right — JSON viewer (40%) */}
            <div style={{ width: "40%", overflow: "auto", padding: 8 }}>
              <div style={{ fontSize: 11, color: tokens.textSecondary, marginBottom: 4, fontWeight: 600 }}>
                {selectedEntry ? `Output: ${selectedRule}` : "Full FactBag"}
              </div>
              <pre style={{
                margin: 0, fontSize: 11, lineHeight: 1.5,
                color: tokens.textPrimary, whiteSpace: "pre-wrap", wordBreak: "break-word",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
              }}>
                {jsonDisplay}
              </pre>
            </div>
          </div>
        ) : null}
      </div>

      {/* Summary row */}
      {result ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "6px 12px", borderTop: `1px solid ${tokens.sidebarBorder.replace("1px solid ", "")}`,
          fontSize: 12, flexShrink: 0
        }}>
          <span style={{ color: "#16a34a", fontWeight: 600 }}>{passCount} passed</span>
          <span style={{ color: "#ef4444", fontWeight: 600 }}>{failCount} failed</span>
          <span style={{ color: tokens.textMuted, marginLeft: "auto" }}>
            Total: {result.executionTimeMs}ms
          </span>
        </div>
      ) : null}
    </div>
  );
}

const MThStyle: React.CSSProperties = {
  padding: "6px 12px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.5px"
};
