/**
 * Bottom split panel for dry-run execution results.
 * Shows per-node pass/fail table (left) and structured node inspector (right).
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
    evaluationResult?: boolean | string;
    outputs?: Record<string, unknown>;
    errors?: string[];
    // New structured fields from Phase 29 BE
    status?: {
      executed: boolean;
      passed: boolean;
      errored: boolean;
      message?: string;
      elapsedMs?: number;
    };
    businessFacts?: Record<string, unknown>;
    inputSnapshot?: Record<string, unknown>;
    outputSnapshot?: Record<string, unknown>;
    changedKeys?: string[];
    elapsedMs?: number;
  }>;
  factBag: Record<string, unknown>;
  factBagClean?: Record<string, unknown>;
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

// Local copy of MCollapsibleSection (from rule-flow-inspector.tsx) — not exported from that module
function MCollapsibleSection({
  title,
  count,
  defaultExpanded,
  headerRight,
  children
}: {
  title: string;
  count?: number;
  defaultExpanded: boolean;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--mu-space-xs)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExpanded(!expanded)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(!expanded); } }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            padding: "6px 8px",
            borderRadius: 6,
            userSelect: "none",
            transition: "background-color 0.1s",
            flex: 1,
          }}
        >
          <span style={{ fontSize: 10, color: "var(--mu-text-muted)", width: 16, textAlign: "center" }}>
            {expanded ? "\u25BC" : "\u25B6"}
          </span>
          <strong style={{ fontSize: 13, color: "var(--mu-text-label)" }}>{title}</strong>
          {count !== undefined ? (
            <span style={{
              background: "var(--mu-border-subtle)",
              padding: "2px 8px",
              borderRadius: 10,
              fontSize: 11,
              color: "var(--mu-text-secondary)",
              fontWeight: 600,
            }}>
              {count} field{count !== 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
        {headerRight}
      </div>
      {expanded ? children : null}
    </div>
  );
}

function MNodeInspectorView({
  entry,
  tokens,
  onShowFullFactBag
}: {
  entry: MDryRunResult["results"][0];
  tokens: MFlowThemeTokens;
  onShowFullFactBag: () => void;
}): React.JSX.Element {
  // Compute output data: prefer businessFacts if available, else filter outputs
  const outputData: Record<string, unknown> = entry.businessFacts
    ? entry.businessFacts
    : entry.outputs
      ? Object.fromEntries(
          Object.entries(entry.outputs).filter(
            ([k]) =>
              !k.startsWith("__graph.") &&
              !k.startsWith("__node.") &&
              !["executed", "passed", "errored", "result"].includes(k)
          )
        )
      : {};

  const outputKeys = Object.keys(outputData);
  const elapsedMs = entry.status?.elapsedMs ?? entry.elapsedMs;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Back button */}
      <button
        type="button"
        onClick={onShowFullFactBag}
        style={{
          fontSize: 11,
          color: tokens.textSecondary,
          cursor: "pointer",
          padding: "4px 8px",
          background: "none",
          border: "none",
          textAlign: "left",
          textDecoration: "none",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.textDecoration = "underline"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.textDecoration = "none"; }}
      >
        &lt; Back to Full FactBag
      </button>

      {/* Status section — always visible, not collapsible */}
      <div style={{ padding: "6px 8px", borderRadius: 6, background: "color-mix(in oklch, var(--mu-border-subtle) 40%, transparent)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: entry.status?.message || (entry.errors && entry.errors.length > 0) ? 6 : 0 }}>
          {/* Pass/Fail badge */}
          <span style={{
            display: "inline-block", width: 18, height: 18, borderRadius: "50%",
            lineHeight: "18px", textAlign: "center", fontSize: 11, fontWeight: 700,
            background: entry.isSuccess
              ? "color-mix(in oklch, var(--mu-color-success-text) 15%, transparent)"
              : "color-mix(in oklch, var(--mu-color-error) 15%, transparent)",
            color: entry.isSuccess ? "var(--mu-color-success-text)" : "var(--mu-color-error)"
          }}>
            {entry.isSuccess ? "\u2713" : "\u2717"}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: entry.isSuccess ? "var(--mu-color-success-text)" : "var(--mu-color-error)" }}>
            {entry.isSuccess ? "Passed" : "Failed"}
          </span>
          {/* Execution time badge */}
          {elapsedMs !== undefined ? (
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 12, marginLeft: "auto",
              background: "color-mix(in oklch, var(--mu-color-success-text) 15%, transparent)",
              color: "var(--mu-color-success-text)",
              fontWeight: 600
            }}>
              {elapsedMs}ms
            </span>
          ) : null}
        </div>

        {/* Status message */}
        {entry.status?.message ? (
          <div style={{
            fontSize: 12,
            color: entry.isSuccess ? tokens.textSecondary : "var(--mu-color-error)",
            ...(entry.isSuccess ? {} : { borderLeft: "3px solid var(--mu-color-error)", paddingLeft: 8 })
          }}>
            {entry.status.message}
          </div>
        ) : null}

        {/* Error list */}
        {entry.errors && entry.errors.length > 0 ? (
          <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
            {entry.errors.map((err, i) => (
              <div key={i} style={{ fontSize: 11, color: "var(--mu-color-error)", borderLeft: "3px solid var(--mu-color-error)", paddingLeft: 8 }}>
                {err}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Output section */}
      <MCollapsibleSection
        title="Output"
        count={entry.changedKeys ? entry.changedKeys.length : undefined}
        defaultExpanded={true}
      >
        {outputKeys.length > 0 ? (
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: "4px 8px",
            fontFamily: "var(--mu-font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)"
          }}>
            {outputKeys.map((key) => (
              <div key={key} style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11 }}>
                <span style={{ fontWeight: 600, color: tokens.textSecondary }}>{key}:</span>
                <span style={{ color: tokens.textPrimary }}>
                  {typeof outputData[key] === "object" && outputData[key] !== null
                    ? JSON.stringify(outputData[key])
                    : String(outputData[key] ?? "")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: "4px 8px", fontSize: 11, color: tokens.textMuted, fontStyle: "italic" }}>
            No output facts
          </div>
        )}
      </MCollapsibleSection>

      {/* Input section */}
      <MCollapsibleSection
        title="Input"
        defaultExpanded={false}
      >
        {entry.inputSnapshot ? (
          <pre style={{
            margin: 0,
            fontSize: 11,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: "var(--mu-font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)",
            color: tokens.textPrimary,
            maxHeight: 200,
            overflowY: "auto",
            padding: "4px 8px",
          }}>
            {JSON.stringify(entry.inputSnapshot, null, 2)}
          </pre>
        ) : (
          <div style={{ padding: "4px 8px", fontSize: 11, color: tokens.textMuted, fontStyle: "italic" }}>
            Input data not available (run via consumer runtime for full input capture)
          </div>
        )}
      </MCollapsibleSection>
    </div>
  );
}

export function MDryRunPanel({ result, loading, error, onSelectNode, onClose, tokens }: MDryRunPanelProps): React.JSX.Element {
  const [selectedRule, setSelectedRule] = useState<string | null>(null);

  const selectedEntry = result?.results.find((r) => r.ruleName === selectedRule);

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
              background: result.isSuccess
                ? "color-mix(in oklch, var(--mu-color-success-text) 15%, transparent)"
                : "color-mix(in oklch, var(--mu-color-error) 15%, transparent)",
              color: result.isSuccess ? "var(--mu-color-success-text)" : "var(--mu-color-error)",
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
                        const newRule = entry.ruleName === selectedRule ? null : entry.ruleName;
                        setSelectedRule(newRule);
                        if (newRule) onSelectNode?.(newRule);
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
                          background: entry.isSuccess
                            ? "color-mix(in oklch, var(--mu-color-success-text) 15%, transparent)"
                            : "color-mix(in oklch, var(--mu-color-error) 15%, transparent)",
                          color: entry.isSuccess ? "var(--mu-color-success-text)" : "var(--mu-color-error)"
                        }}>
                          {entry.isSuccess ? "\u2713" : "\u2717"}
                        </span>
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "center", fontSize: 11, color: tokens.textSecondary }}>
                        {entry.evaluationResult === true ? "true" : entry.evaluationResult === false ? "false" : entry.evaluationResult ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right — Node Inspector (40%) */}
            <div style={{ width: "40%", overflow: "auto", padding: 8 }}>
              {selectedEntry ? (
                <MNodeInspectorView
                  entry={selectedEntry}
                  tokens={tokens}
                  onShowFullFactBag={() => setSelectedRule(null)}
                />
              ) : (
                <>
                  <div style={{ fontSize: 11, color: tokens.textSecondary, marginBottom: 4, fontWeight: 600 }}>
                    Full FactBag
                  </div>
                  <pre style={{
                    margin: 0, fontSize: 11, lineHeight: 1.5,
                    color: tokens.textPrimary, whiteSpace: "pre-wrap", wordBreak: "break-word",
                    fontFamily: "var(--mu-font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)"
                  }}>
                    {JSON.stringify(result?.factBagClean ?? result?.factBag ?? {}, null, 2)}
                  </pre>
                </>
              )}
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
          <span style={{ color: "var(--mu-color-success-text)", fontWeight: 600 }}>{passCount} passed</span>
          <span style={{ color: "var(--mu-color-error)", fontWeight: 600 }}>{failCount} failed</span>
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
