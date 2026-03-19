/**
 * Shared UI utility components for Rule Flow Inspector tabs.
 * Used across Input Data, Output Data, and Data Flow tabs.
 */
import React, { useState } from "react";
import type { MRuleFlowContractField } from "../../models.js";

/* ------------------------------------------------------------------ */
/*  Type Badge Colors                                                  */
/* ------------------------------------------------------------------ */

export const M_TYPE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  string:  { bg: "#dbeafe", text: "#1d4ed8" },
  number:  { bg: "#f3e8ff", text: "#7c3aed" },
  boolean: { bg: "#ffedd5", text: "#c2410c" },
  array:   { bg: "#dcfce7", text: "#15803d" },
  object:  { bg: "#f1f5f9", text: "#475569" },
};

const M_TYPE_BADGE_FALLBACK = { bg: "#f1f5f9", text: "#475569" };

/* ------------------------------------------------------------------ */
/*  MTypeBadge                                                         */
/* ------------------------------------------------------------------ */

export function MTypeBadge({ dataType }: { dataType: string }): React.JSX.Element {
  const colors = M_TYPE_BADGE_COLORS[dataType.toLowerCase()] ?? M_TYPE_BADGE_FALLBACK;
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        padding: "1px 6px",
        borderRadius: 4,
        fontWeight: 600,
        backgroundColor: colors.bg,
        color: colors.text,
        lineHeight: "16px",
        whiteSpace: "nowrap",
      }}
    >
      {dataType.toLowerCase()}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  MEmptyStateBox                                                     */
/* ------------------------------------------------------------------ */

export function MEmptyStateBox({
  icon,
  message,
  actionHint,
  onAction
}: {
  icon?: string;
  message: string;
  actionHint?: string;
  onAction?: () => void;
}): React.JSX.Element {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        textAlign: "center",
      }}
    >
      <span style={{ fontSize: 16 }}>{icon ?? "\u24D8"}</span>
      <span style={{ color: "#64748b", fontSize: 13 }}>{message}</span>
      {actionHint && onAction ? (
        <span
          role="button"
          tabIndex={0}
          onClick={onAction}
          onKeyDown={(e) => { if (e.key === "Enter") onAction(); }}
          style={{
            color: "#3b82f6",
            cursor: "pointer",
            textDecoration: "underline",
            fontSize: 13,
          }}
        >
          {actionHint}
        </span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MTreeNode                                                          */
/* ------------------------------------------------------------------ */

const MTreeRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 8px",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 12,
  color: "#0f172a",
  transition: "background-color 0.1s",
};

export function MTreeNode({
  field,
  depth,
  readOnly,
  onInsert,
  defaultExpanded = true,
}: {
  field: MRuleFlowContractField;
  depth: number;
  readOnly: boolean;
  onInsert: (path: string) => void;
  defaultExpanded?: boolean;
}): React.JSX.Element {
  const hasChildren = (field.children?.length ?? 0) > 0;
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [hovered, setHovered] = useState(false);

  // Extract last segment of the path for bold display
  const segments = field.path.split(".");
  const lastSegment = segments[segments.length - 1];
  const prefix = segments.length > 1 ? segments.slice(0, -1).join(".") + "." : "";

  return (
    <div>
      <div
        style={{
          ...MTreeRowStyle,
          paddingLeft: depth * 20 + 8,
          backgroundColor: hovered ? "#f1f5f9" : "transparent",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Chevron or spacer */}
        {hasChildren ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            onKeyDown={(e) => { if (e.key === "Enter") setExpanded(!expanded); }}
            style={{
              width: 16,
              height: 16,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 10,
              color: "#64748b",
              flexShrink: 0,
              userSelect: "none",
            }}
          >
            {expanded ? "\u25BC" : "\u25B6"}
          </span>
        ) : (
          <span style={{ width: 16, flexShrink: 0 }} />
        )}

        {/* Field path — click to insert */}
        <button
          type="button"
          disabled={readOnly}
          onClick={() => onInsert(field.path)}
          style={{
            border: "none",
            background: "transparent",
            padding: 0,
            cursor: readOnly ? "default" : "pointer",
            fontSize: 12,
            color: "#0f172a",
            textAlign: "left",
            fontFamily: "inherit",
          }}
        >
          {prefix ? <span style={{ color: "#94a3b8" }}>{prefix}</span> : null}
          <strong>{lastSegment}</strong>
        </button>

        {/* Type badge */}
        <MTypeBadge dataType={field.dataType} />

        {/* Source label */}
        {field.sourceNodeLabel ? (
          <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>
            {field.sourceNodeLabel}
          </span>
        ) : null}
      </div>

      {/* Children */}
      {hasChildren && expanded ? (
        <div>
          {field.children!.map((child) => (
            <MTreeNode
              key={child.path}
              field={child}
              depth={depth + 1}
              readOnly={readOnly}
              onInsert={onInsert}
              defaultExpanded={defaultExpanded}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
