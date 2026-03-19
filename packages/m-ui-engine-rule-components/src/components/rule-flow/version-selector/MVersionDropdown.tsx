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

/** Status badge color mapping. */
function statusBadgeStyle(status: string, isActive: boolean): React.CSSProperties {
  if (isActive) return { background: "rgba(22,163,74,0.15)", border: "1px solid rgba(22,163,74,0.3)", color: "#16a34a" };
  const s = status.toLowerCase();
  if (s === "approved") return { background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.25)", color: "#2563eb" };
  // Draft and others
  return { background: "rgba(148,163,184,0.15)", border: "1px solid rgba(148,163,184,0.3)", color: "#64748b" };
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

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as HTMLElement)) {
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
            ? "rgba(245,158,11,0.12)"
            : tokens.actionPrimaryBg,
          border: current?.isActive === false
            ? "1px solid rgba(245,158,11,0.3)"
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
              background: selectedVersion == null ? tokens.overlayItemSelectedBg : "transparent",
              border: "none",
              borderBottom: "1px solid rgba(148,163,184,0.12)",
              cursor: "pointer",
              textAlign: "left",
              color: tokens.textPrimary,
              fontSize: 12
            }}
          >
            <span style={{ color: "#16a34a", fontSize: 13 }}>{"\u2605"}</span>
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
                  background: isSelected ? tokens.overlayItemSelectedBg : "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(148,163,184,0.06)",
                  cursor: "pointer",
                  textAlign: "left",
                  color: tokens.textPrimary,
                  fontSize: 12
                }}
              >
                {v.isActive ? (
                  <span style={{ color: "#16a34a", fontSize: 11 }}>{"\u2605"}</span>
                ) : (
                  <span style={{ width: 11, display: "inline-block" }} />
                )}
                <span style={{ fontWeight: 600, minWidth: 36 }}>v{v.version}</span>
                <span style={{ ...badgeBase, ...statusBadgeStyle(v.status, v.isActive) }}>
                  {v.isActive ? "Active" : v.status}
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
