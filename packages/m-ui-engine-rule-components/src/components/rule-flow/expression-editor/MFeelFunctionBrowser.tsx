/**
 * Collapsible function browser panel for FEEL built-in functions.
 * Renders grouped functions below the expression editor with click-to-insert.
 */
import React, { useState, useCallback } from "react";
import { FEEL_FUNCTION_GROUPS } from "./feel-functions.js";

export interface MFeelFunctionBrowserProps {
  /** Insert function template at cursor position in the editor */
  onInsert: (template: string) => void;
  /** Only shown when language === "feel" */
  visible: boolean;
}

const ChevronRight = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" style={{ flexShrink: 0 }}>
    <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronDown = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" style={{ flexShrink: 0 }}>
    <path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const totalFunctions = FEEL_FUNCTION_GROUPS.reduce((acc, g) => acc + g.functions.length, 0);

// ── Styles ──────────────────────────────────────────────
const containerStyle: React.CSSProperties = {
  borderRadius: 14,
  background: "rgba(241, 245, 249, 0.9)",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  overflow: "hidden",
  marginTop: 8
};

const headerStyle: React.CSSProperties = {
  padding: "10px 12px",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
  color: "#475569",
  display: "flex",
  alignItems: "center",
  gap: 6,
  userSelect: "none"
};

const badgeStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: "#64748b",
  background: "rgba(148, 163, 184, 0.18)",
  borderRadius: 8,
  padding: "1px 6px",
  marginLeft: "auto"
};

const groupHeaderStyle: React.CSSProperties = {
  padding: "8px 12px 4px",
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em"
};

const functionRowStyle: React.CSSProperties = {
  padding: "6px 12px",
  cursor: "pointer",
  fontSize: 12,
  borderRadius: 8,
  display: "flex",
  alignItems: "baseline",
  gap: 6
};

const functionNameStyle: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  color: "#2563eb",
  fontWeight: 600
};

const signatureStyle: React.CSSProperties = {
  color: "#94a3b8",
  marginLeft: 6,
  fontSize: 11
};

const bodyStyle: React.CSSProperties = {
  maxHeight: 280,
  overflowY: "auto",
  paddingBottom: 6
};

export function MFeelFunctionBrowser({ onInsert, visible }: MFeelFunctionBrowserProps) {
  const [expanded, setExpanded] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<string | null>(null);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  if (!visible) return null;

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle} onClick={handleToggle} role="button" tabIndex={0} aria-expanded={expanded}>
        {expanded ? <ChevronDown /> : <ChevronRight />}
        <span>FEEL Functions</span>
        <span style={badgeStyle}>{totalFunctions}</span>
      </div>

      {/* Grouped function list */}
      {expanded && (
        <div style={bodyStyle}>
          {FEEL_FUNCTION_GROUPS.map((group) => (
            <div key={group.group}>
              <div style={groupHeaderStyle}>{group.group}</div>
              {group.functions.map((func) => {
                const key = `${group.group}:${func.name}`;
                const isHovered = hoveredIdx === key;
                return (
                  <div
                    key={key}
                    style={{
                      ...functionRowStyle,
                      background: isHovered ? "rgba(37, 99, 235, 0.06)" : "transparent"
                    }}
                    onClick={() => onInsert(func.template)}
                    onMouseEnter={() => setHoveredIdx(key)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    title={func.description}
                    role="button"
                    tabIndex={0}
                  >
                    <span style={functionNameStyle}>{func.name}</span>
                    <span style={signatureStyle}>{func.signature}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
