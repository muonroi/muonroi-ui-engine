/**
 * MVersionDiffModal — Full-width overlay modal with side-by-side JSON diff between two versions.
 * Color-coded: green (added), red (removed), yellow (modified).
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { MVersionItem } from "../MuRuleFlowEditor.js";
import type { MFlowThemeTokens } from "../rule-flow-theme.js";
import { MBuildRuleComponentHeaders } from "../../../runtime/request-context.js";

export interface MVersionDiffModalProps {
  open: boolean;
  onClose: () => void;
  versions: MVersionItem[];
  activeVersion: MVersionItem | null;
  initialLeftVersion: number | null;
  initialRightVersion: number | null;
  apiBaseUrl: string;
  workflowCode: string;
  tenantId?: string;
  tokens: MFlowThemeTokens;
}

type DiffLineType = "added" | "removed" | "modified" | "unchanged";

interface DiffLine {
  text: string;
  type: DiffLineType;
}

const DIFF_BG: Record<DiffLineType, string> = {
  added: "rgba(22,163,74,0.12)",
  removed: "rgba(239,68,68,0.12)",
  modified: "rgba(245,158,11,0.12)",
  unchanged: "transparent"
};

/**
 * Simple line-by-line diff on pretty-printed JSON.
 * Returns paired arrays for left and right panels.
 */
function computeLineDiff(
  leftText: string,
  rightText: string
): { left: DiffLine[]; right: DiffLine[] } {
  const leftLines = leftText.split("\n");
  const rightLines = rightText.split("\n");
  const maxLen = Math.max(leftLines.length, rightLines.length);
  const left: DiffLine[] = [];
  const right: DiffLine[] = [];

  for (let i = 0; i < maxLen; i++) {
    const l = i < leftLines.length ? leftLines[i] : undefined;
    const r = i < rightLines.length ? rightLines[i] : undefined;

    if (l === undefined) {
      // Line only exists on right — added
      left.push({ text: "", type: "unchanged" });
      right.push({ text: r!, type: "added" });
    } else if (r === undefined) {
      // Line only exists on left — removed
      left.push({ text: l, type: "removed" });
      right.push({ text: "", type: "unchanged" });
    } else if (l === r) {
      left.push({ text: l, type: "unchanged" });
      right.push({ text: r, type: "unchanged" });
    } else {
      // Both exist but differ — modified
      left.push({ text: l, type: "modified" });
      right.push({ text: r, type: "modified" });
    }
  }

  return { left, right };
}

export function MVersionDiffModal({
  open,
  onClose,
  versions,
  activeVersion,
  initialLeftVersion,
  initialRightVersion,
  apiBaseUrl,
  workflowCode,
  tenantId,
  tokens
}: MVersionDiffModalProps) {
  const [leftVersion, setLeftVersion] = useState<number | null>(initialLeftVersion);
  const [rightVersion, setRightVersion] = useState<number | null>(initialRightVersion);
  const [leftContent, setLeftContent] = useState<string | null>(null);
  const [rightContent, setRightContent] = useState<string | null>(null);
  const [leftError, setLeftError] = useState<string | null>(null);
  const [rightError, setRightError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset versions when modal opens with new initial values
  useEffect(() => {
    if (open) {
      setLeftVersion(initialLeftVersion);
      setRightVersion(initialRightVersion);
    }
  }, [open, initialLeftVersion, initialRightVersion]);

  const fetchVersionContent = useCallback(
    async (versionNumber: number): Promise<string> => {
      const baseUrl = apiBaseUrl.replace(/\/$/, "");
      const headers = MBuildRuleComponentHeaders(undefined, { tenantId });
      const res = await fetch(
        `${baseUrl}/rulesets/${encodeURIComponent(workflowCode)}/versions/${versionNumber}`,
        { headers }
      );
      if (!res.ok) {
        throw new Error(`Version ${versionNumber} not available (HTTP ${res.status})`);
      }
      const data = await res.json();
      return JSON.stringify(data, null, 2);
    },
    [apiBaseUrl, workflowCode, tenantId]
  );

  // Fetch both versions when selections change
  useEffect(() => {
    if (!open || leftVersion == null || rightVersion == null) return;

    let cancelled = false;
    setLoading(true);
    setLeftError(null);
    setRightError(null);
    setLeftContent(null);
    setRightContent(null);

    Promise.allSettled([
      fetchVersionContent(leftVersion),
      fetchVersionContent(rightVersion)
    ]).then(([leftResult, rightResult]) => {
      if (cancelled) return;
      if (leftResult.status === "fulfilled") {
        setLeftContent(leftResult.value);
      } else {
        setLeftError(leftResult.reason?.message ?? "Failed to load");
      }
      if (rightResult.status === "fulfilled") {
        setRightContent(rightResult.value);
      } else {
        setRightError(rightResult.reason?.message ?? "Failed to load");
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [open, leftVersion, rightVersion, fetchVersionContent]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const diff = useMemo(() => {
    if (!leftContent || !rightContent) return null;
    return computeLineDiff(leftContent, rightContent);
  }, [leftContent, rightContent]);

  if (!open) return null;

  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);

  const renderPanel = (
    lines: DiffLine[] | null,
    content: string | null,
    error: string | null,
    side: "left" | "right"
  ) => {
    if (loading) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: tokens.textMuted, fontSize: 13 }}>
          Loading...
        </div>
      );
    }
    if (error) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: tokens.errorText, fontSize: 13 }}>
          {error}
        </div>
      );
    }
    if (!lines) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: tokens.textMuted, fontSize: 13 }}>
          Select versions to compare
        </div>
      );
    }

    return (
      <div style={{ overflow: "auto", height: "100%", fontFamily: "monospace", fontSize: 12, lineHeight: "20px" }}>
        {lines.map((line, i) => (
          <div
            key={`${side}-${i}`}
            style={{
              display: "flex",
              background: DIFF_BG[line.type],
              minHeight: 20
            }}
          >
            <span
              style={{
                width: 44,
                minWidth: 44,
                textAlign: "right",
                paddingRight: 8,
                color: tokens.textMuted,
                userSelect: "none",
                borderRight: `1px solid ${tokens.inspectorBorder.replace("1px solid ", "")}`,
                fontSize: 11
              }}
            >
              {line.text !== "" ? i + 1 : ""}
            </span>
            <pre
              style={{
                margin: 0,
                padding: "0 8px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                color: tokens.textPrimary
              }}
            >
              {line.text}
            </pre>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "90vw",
          height: "85vh",
          background: tokens.dialogBg,
          border: tokens.dialogBorder,
          borderRadius: 12,
          boxShadow: tokens.dialogShadow,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* Header */}
        <div
          style={{
            height: 48,
            minHeight: 48,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 16px",
            borderBottom: tokens.inspectorBorder,
            background: tokens.sidebarBg
          }}
        >
          <strong style={{ fontSize: 14, color: tokens.textPrimary }}>Compare Versions</strong>

          <select
            value={leftVersion ?? ""}
            onChange={(e) => setLeftVersion(e.target.value ? Number(e.target.value) : null)}
            style={{
              padding: "4px 8px",
              fontSize: 12,
              borderRadius: 6,
              border: tokens.inputBorder,
              background: tokens.inputBg,
              color: tokens.inputText,
              cursor: "pointer"
            }}
          >
            {sortedVersions.map((v) => (
              <option key={v.version} value={v.version}>
                v{v.version}{v.isActive ? " (active)" : ""} — {v.status}
              </option>
            ))}
          </select>

          <span style={{ fontSize: 12, color: tokens.textMuted, fontWeight: 600 }}>vs</span>

          <select
            value={rightVersion ?? ""}
            onChange={(e) => setRightVersion(e.target.value ? Number(e.target.value) : null)}
            style={{
              padding: "4px 8px",
              fontSize: 12,
              borderRadius: 6,
              border: tokens.inputBorder,
              background: tokens.inputBg,
              color: tokens.inputText,
              cursor: "pointer"
            }}
          >
            {sortedVersions.map((v) => (
              <option key={v.version} value={v.version}>
                v{v.version}{v.isActive ? " (active)" : ""} — {v.status}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onClose}
            style={{
              marginLeft: "auto",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: tokens.textMuted,
              fontSize: 18,
              lineHeight: 1
            }}
            title="Close"
          >
            <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
            </svg>
          </button>
        </div>

        {/* Content — side-by-side panels */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div style={{ flex: 1, overflow: "hidden", borderRight: `1px solid ${tokens.inspectorBorder.replace("1px solid ", "")}` }}>
            {renderPanel(diff?.left ?? null, leftContent, leftError, "left")}
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            {renderPanel(diff?.right ?? null, rightContent, rightError, "right")}
          </div>
        </div>
      </div>
    </div>
  );
}
