/**
 * MVersionDropdown — Rich version picker with metadata badges, pagination, and click-outside-close.
 * Replaces the native <select> in the Rule Flow Editor header bar.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { MVersionItem } from "../MuRuleFlowEditor.js";
import type { MFlowThemeTokens } from "../rule-flow-theme.js";

export interface MVersionDropdownProps {
  versions: MVersionItem[];
  activeVersion: MVersionItem | null;
  selectedVersion: number | null;
  onSelect: (version: number | null) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  tokens: MFlowThemeTokens;
}

/** Format ISO date string as "MMM DD, YYYY". */
function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

/** Status badge color mapping using CSS custom properties. */
function statusBadgeStyle(status: string, isActive: boolean): React.CSSProperties {
  if (isActive) return {
    background: "color-mix(in oklch, var(--mu-color-success-text) 15%, transparent)",
    border: "1px solid color-mix(in oklch, var(--mu-color-success-text) 30%, transparent)",
    color: "var(--mu-color-success-text)"
  };
  const s = status.toLowerCase();
  if (s === "approved") return {
    background: "color-mix(in oklch, var(--mu-color-interactive) 12%, transparent)",
    border: "1px solid color-mix(in oklch, var(--mu-color-interactive) 25%, transparent)",
    color: "var(--mu-color-interactive)"
  };
  if (s === "pendingapproval") return {
    background: "color-mix(in oklch, var(--mu-color-warning) 15%, transparent)",
    border: "1px solid color-mix(in oklch, var(--mu-color-warning) 30%, transparent)",
    color: "var(--mu-color-warning-text)"
  };
  if (s === "rejected") return {
    background: "color-mix(in oklch, var(--mu-color-error) 12%, transparent)",
    border: "1px solid color-mix(in oklch, var(--mu-color-error) 25%, transparent)",
    color: "var(--mu-color-error-text)"
  };
  if (s === "superseded") return {
    background: "color-mix(in oklch, var(--mu-text-muted) 12%, transparent)",
    border: "1px solid color-mix(in oklch, var(--mu-text-muted) 20%, transparent)",
    color: "var(--mu-text-muted)"
  };
  if (s === "rolledback") return {
    background: "color-mix(in oklch, var(--mu-color-error) 8%, transparent)",
    border: "1px solid color-mix(in oklch, var(--mu-color-error) 15%, transparent)",
    color: "var(--mu-text-muted)"
  };
  // Draft and others
  return {
    background: "color-mix(in oklch, var(--mu-border-subtle) 50%, transparent)",
    border: "1px solid color-mix(in oklch, var(--mu-border-default) 50%, transparent)",
    color: "var(--mu-text-muted)"
  };
}

/** Format status string for human-readable display in badges. */
function formatStatus(status: string): string {
  const s = status.toLowerCase();
  if (s === "pendingapproval") return "Pending";
  if (s === "rolledback") return "Rolled Back";
  // Draft, Approved, Superseded, Rejected, Active are already readable
  return status;
}

export function MVersionDropdown({
  versions,
  activeVersion,
  selectedVersion,
  onSelect,
  onLoadMore,
  hasMore,
  loadingMore,
  tokens
}: MVersionDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click-outside to close — use composedPath() to handle shadow DOM correctly
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      // composedPath() crosses shadow DOM boundaries, unlike e.target
      const path = e.composedPath();
      if (!path.includes(containerRef.current)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = useCallback((version: number | null) => {
    onSelect(version);
    setOpen(false);
  }, [onSelect]);

  // Determine button label
  const current = selectedVersion != null ? versions.find((v) => v.version === selectedVersion) : null;
  const buttonLabel = current
    ? `v${current.version} (${current.isActive ? "Active" : current.status})`
    : activeVersion
      ? `Active (v${activeVersion.version})`
      : "Active";

  const badgeBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "1px 6px",
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.01em"
  };

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "2px 10px",
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.02em",
          cursor: "pointer",
          background: current?.isActive === false
            ? "color-mix(in oklch, var(--mu-color-warning) 12%, transparent)"
            : tokens.actionPrimaryBg,
          border: current?.isActive === false
            ? "1px solid color-mix(in oklch, var(--mu-color-warning) 30%, transparent)"
            : tokens.actionPrimaryBorder,
          color: current?.isActive === false
            ? tokens.warningText
            : tokens.textPrimary,
          outline: "none"
        }}
      >
        {buttonLabel}
        <span style={{ fontSize: 8, marginLeft: 2 }}>{open ? "\u25B4" : "\u25BE"}</span>
      </button>

      {/* Dropdown list */}
      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 50,
            minWidth: 260,
            maxHeight: 340,
            overflowY: "auto",
            background: tokens.overlayBg,
            border: tokens.overlayBorder,
            borderRadius: 10,
            boxShadow: tokens.overlayShadow,
            padding: "4px 0"
          }}
        >
          {/* "Active" option — return to active version */}
          <button
            type="button"
            onClick={() => handleSelect(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "8px 12px",
              minHeight: 44,  // RESP-04: minimum 44px touch target (WCAG 2.5.5)
              background: selectedVersion == null ? tokens.overlayItemSelectedBg : "transparent",
              border: "none",
              borderBottom: "1px solid rgba(148,163,184,0.12)",
              cursor: "pointer",
              textAlign: "left",
              color: tokens.textPrimary,
              fontSize: 12
            }}
          >
            <span style={{ color: "var(--mu-color-success-text)", fontSize: 13 }}>{"\u2605"}</span>
            <span style={{ fontWeight: 600 }}>
              Active{activeVersion ? ` (v${activeVersion.version})` : ""}
            </span>
            {activeVersion ? (
              <span style={{ ...badgeBase, ...statusBadgeStyle("Active", true) }}>Active</span>
            ) : null}
          </button>

          {/* Version list */}
          {versions.map((v) => {
            const isSelected = selectedVersion === v.version;
            const isActiveVersion = v.isActive;
            return (
              <button
                key={v.version}
                type="button"
                onClick={() => handleSelect(v.version)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "7px 12px",
                  minHeight: 44,  // RESP-04: minimum 44px touch target (WCAG 2.5.5)
                  background: isActiveVersion
                    ? "var(--mu-color-interactive-subtle)"
                    : isSelected
                      ? tokens.overlayItemSelectedBg
                      : "transparent",
                  borderTop: "none",
                  borderRight: "none",
                  borderBottom: "1px solid rgba(148,163,184,0.06)",
                  borderLeft: isActiveVersion
                    ? "3px solid var(--mu-color-interactive)"
                    : "3px solid transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  color: tokens.textPrimary,
                  fontSize: 12,
                }}
              >
                {isActiveVersion ? (
                  <span style={{ color: "var(--mu-color-interactive)", fontSize: 13, flexShrink: 0 }}>{"\u2605"}</span>
                ) : (
                  <span style={{ width: 13, display: "inline-block", flexShrink: 0 }} />
                )}
                <span style={{ fontWeight: isActiveVersion ? 700 : 600, minWidth: 36, color: isActiveVersion ? "var(--mu-color-interactive)" : tokens.textPrimary }}>
                  v{v.version}
                </span>
                <span style={{ ...badgeBase, ...statusBadgeStyle(v.status, isActiveVersion) }}>
                  {isActiveVersion ? "Active" : formatStatus(v.status)}
                </span>
                <span style={{ fontSize: 10, color: tokens.textMuted, marginLeft: "auto" }}>
                  {formatDate(v.createdAt)}
                </span>
              </button>
            );
          })}

          {/* Load more */}
          {hasMore ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onLoadMore?.(); }}
              disabled={loadingMore}
              style={{
                display: "block",
                width: "100%",
                padding: "8px 12px",
                background: "transparent",
                border: "none",
                borderTop: "1px solid rgba(148,163,184,0.12)",
                cursor: loadingMore ? "default" : "pointer",
                textAlign: "center",
                color: tokens.textSecondary,
                fontSize: 11,
                fontWeight: 600,
                opacity: loadingMore ? 0.6 : 1
              }}
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
