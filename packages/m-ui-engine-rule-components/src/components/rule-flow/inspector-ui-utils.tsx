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
  string:  { bg: "var(--mu-color-info-bg)", text: "var(--mu-color-interactive)" },
  number:  { bg: "var(--mu-color-info-bg)", text: "var(--mu-node-condition)" },
  boolean: { bg: "var(--mu-color-warning-bg)", text: "var(--mu-color-warning-text)" },
  array:   { bg: "var(--mu-color-success-bg)", text: "var(--mu-color-success-text)" },
  object:  { bg: "var(--mu-surface-raised)", text: "var(--mu-text-secondary)" },
};

const M_TYPE_BADGE_FALLBACK = { bg: "var(--mu-surface-raised)", text: "var(--mu-text-secondary)" };

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
        background: "var(--mu-surface-raised)",
        border: "1px solid var(--mu-border-subtle)",
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
      <span style={{ color: "var(--mu-text-muted)", fontSize: 13 }}>{message}</span>
      {actionHint && onAction ? (
        <span
          role="button"
          tabIndex={0}
          onClick={onAction}
          onKeyDown={(e) => { if (e.key === "Enter") onAction(); }}
          style={{
            color: "var(--mu-color-interactive)",
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
  color: "var(--mu-text-primary)",
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
          backgroundColor: hovered ? "var(--mu-surface-raised)" : "transparent",
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
              color: "var(--mu-text-muted)",
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
            color: "var(--mu-text-primary)",
            textAlign: "left",
            fontFamily: "inherit",
          }}
        >
          {prefix ? <span style={{ color: "var(--mu-text-secondary)" }}>{prefix}</span> : null}
          <strong>{lastSegment}</strong>
        </button>

        {/* Type badge */}
        <MTypeBadge dataType={field.dataType} />

        {/* Source label */}
        {field.sourceNodeLabel ? (
          <span style={{ fontSize: 11, color: "var(--mu-text-secondary)", marginLeft: "auto" }}>
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
