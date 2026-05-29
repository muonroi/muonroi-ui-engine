import React, { useCallback, useEffect, useRef, useState } from "react";
import type { PdfTemplate } from "../../models/PdfTemplate.js";
import type { PdfTemplateVersion } from "../../models/PdfTemplateVersion.js";
import { usePdfTemplateHistory } from "../../hooks/usePdfTemplateHistory.js";
import { RequireCapability } from "../../license/RequireCapability.js";

// ---------------------------------------------------------------------------
// PROFILE-V1 Lint types
// ---------------------------------------------------------------------------

export type LintSeverity = "error" | "warning";

export interface LintViolation {
  /** Identifier matching PROFILE-V1 §4 reject-list. */
  id: string;
  severity: LintSeverity;
  message: string;
}

// ---------------------------------------------------------------------------
// PROFILE-V1 client-side lint (regex/string scan subset)
// RESEARCH §7.3 reject-list + Wave C hard constraint
// ---------------------------------------------------------------------------

const FORBIDDEN_TAGS = [
  "script",
  "form",
  "iframe",
  "svg",
  "canvas",
  "video",
  "audio",
  "input",
  "button",
  "select",
  "textarea",
  "link"
] as const;

const LINT_RULES: Array<{
  id: string;
  severity: LintSeverity;
  pattern: RegExp;
  message: string;
}> = [
  // Forbidden HTML tag set (Wave C hard constraint + PROFILE-V1 §4)
  ...FORBIDDEN_TAGS.map((tag) => ({
    id: `forbidden.tag.${tag}`,
    severity: "error" as LintSeverity,
    pattern: new RegExp(`<${tag}[\\s>/]`, "i"),
    message: `Forbidden HTML element: <${tag}>. PROFILE-V1 §4 rejects this element.`
  })),
  // Forbidden href schemes (RESEARCH §7.3)
  {
    id: "forbidden.link.scheme.javascript",
    severity: "error",
    pattern: /href\s*=\s*["']javascript:/i,
    message: "Forbidden href scheme: javascript: URLs are not permitted."
  },
  {
    id: "forbidden.link.scheme.file",
    severity: "error",
    pattern: /href\s*=\s*["']file:/i,
    message: "Forbidden href scheme: file: URLs are not permitted."
  },
  // Forbidden @import external (RESEARCH §7.3)
  {
    id: "forbidden.import.external",
    severity: "error",
    pattern: /@import\s+["']?https?:\/\//i,
    message: "Forbidden external @import. External stylesheet imports are not permitted."
  },
  // CSS warnings (RESEARCH §7.3)
  {
    id: "forbidden.display.flex",
    severity: "warning",
    pattern: /display\s*:\s*(?:inline-)?flex/i,
    message: "display:flex is not supported by PROFILE-V1 (print engine uses block layout)."
  },
  {
    id: "forbidden.display.grid",
    severity: "warning",
    pattern: /display\s*:\s*(?:inline-)?grid/i,
    message: "display:grid is not supported by PROFILE-V1 (print engine uses block layout)."
  },
  {
    id: "forbidden.position.fixed",
    severity: "warning",
    pattern: /position\s*:\s*fixed/i,
    message: "position:fixed is not supported by PROFILE-V1."
  },
  {
    id: "forbidden.css-animation",
    severity: "warning",
    pattern: /@keyframes\s/i,
    message: "@keyframes animations are not supported by PROFILE-V1."
  },
  {
    id: "forbidden.background.gradient",
    severity: "warning",
    pattern: /(?:linear|radial)-gradient\(/i,
    message: "CSS gradients are not supported by PROFILE-V1."
  }
];

const MAX_HTML_BYTES = 524288; // 512 KB

function runLint(html: string): LintViolation[] {
  const violations: LintViolation[] = [];

  for (const rule of LINT_RULES) {
    if (rule.pattern.test(html)) {
      violations.push({ id: rule.id, severity: rule.severity, message: rule.message });
    }
  }

  if (new TextEncoder().encode(html).length > MAX_HTML_BYTES) {
    violations.push({
      id: "size.html.exceeds-512kb",
      severity: "warning",
      message: "Template exceeds 512 KB. Server will reject content that is too large."
    });
  }

  return violations;
}

// ---------------------------------------------------------------------------
// MonacoEditor wrapper
// ---------------------------------------------------------------------------

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

function MonacoEditorPane({ value, onChange, readOnly }: MonacoEditorProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  // Suppress re-entrant updates
  const suppressRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Dynamically import monaco to keep it external at build time.
    // Type-cast avoids a tsc module-resolution error when monaco-editor is
    // declared as an external peer; the consumer is responsible for shipping Monaco.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (import("monaco-editor") as Promise<any>).then((monaco) => {
      if (!containerRef.current) return;

      const editor = monaco.editor.create(containerRef.current, {
        value,
        language: "html",
        theme: "vs",
        readOnly: readOnly ?? false,
        minimap: { enabled: false },
        wordWrap: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        fontSize: 13
      });

      editorRef.current = editor;

      editor.onDidChangeModelContent(() => {
        if (suppressRef.current) return;
        onChange(editor.getValue());
      });

      return () => {
        editor.dispose();
        editorRef.current = null;
      };
    });
    // Only mount once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (undo/redo from hook) without triggering onChange
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;
    if (model.getValue() === value) return;

    suppressRef.current = true;
    model.setValue(value);
    suppressRef.current = false;
  }, [value]);

  // Sync readOnly
  useEffect(() => {
    editorRef.current?.updateOptions({ readOnly: readOnly ?? false });
  }, [readOnly]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", border: "1px solid #e2e8f0", borderRadius: "4px" }}
    />
  );
}

// ---------------------------------------------------------------------------
// Designer props
// ---------------------------------------------------------------------------

export interface MuPdfTemplateDesignerProps {
  template: PdfTemplate;
  version: PdfTemplateVersion;
  readOnly?: boolean;
  onSave: (content: string) => Promise<void>;
  onSubmitForApproval?: () => Promise<void>;
  onCancel?: () => void;
  /**
   * Optional callback invoked whenever the lint result changes.
   * Receives the current violations array (empty = clean).
   */
  onLintChange?: (violations: LintViolation[]) => void;
}

// ---------------------------------------------------------------------------
// Inner designer (rendered when capability gate allows)
// ---------------------------------------------------------------------------

function MuPdfTemplateDesignerInner({
  version,
  readOnly,
  onSave,
  onSubmitForApproval,
  onCancel,
  onLintChange
}: MuPdfTemplateDesignerProps): React.JSX.Element {
  const { state: htmlContent, set, undo, redo, canUndo, canRedo } = usePdfTemplateHistory<string>(
    version.contentJson,
    { capacity: 50 }
  );

  const [violations, setViolations] = useState<LintViolation[]>(() =>
    runLint(version.contentJson)
  );
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const handleContentChange = useCallback(
    (next: string) => {
      set(next);
      setIsDirty(true);
      const newViolations = runLint(next);
      setViolations(newViolations);
      onLintChange?.(newViolations);
    },
    [set, onLintChange]
  );

  const handleUndo = useCallback(() => {
    undo();
    setIsDirty(true);
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
    setIsDirty(true);
  }, [redo]);

  const errorCount = violations.filter((v) => v.severity === "error").length;
  const warningCount = violations.filter((v) => v.severity === "warning").length;
  const hasErrors = errorCount > 0;

  const handleSave = useCallback(async () => {
    if (hasErrors || saving) return;
    setSaving(true);
    try {
      await onSave(htmlContent);
      setIsDirty(false);
    } finally {
      setSaving(false);
    }
  }, [hasErrors, saving, onSave, htmlContent]);

  const handleSubmit = useCallback(async () => {
    if (!onSubmitForApproval || !isDirty || submitting) return;
    setSubmitting(true);
    try {
      await onSubmitForApproval();
    } finally {
      setSubmitting(false);
    }
  }, [onSubmitForApproval, isDirty, submitting]);

  const lintTooltip =
    violations.length === 0
      ? "No issues"
      : violations.map((v) => `[${v.severity.toUpperCase()}] ${v.message}`).join("\n");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        fontSize: "13px",
        color: "#1e293b"
      }}
    >
      {/* Toolbar */}
      <div
        role="toolbar"
        aria-label="PDF template designer toolbar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px",
          borderBottom: "1px solid #e2e8f0",
          backgroundColor: "#f8fafc",
          flexShrink: 0
        }}
      >
        <button
          type="button"
          disabled={hasErrors || saving || readOnly}
          onClick={handleSave}
          title={hasErrors ? "Fix lint errors before saving" : "Save template"}
          style={toolbarButtonStyle(hasErrors || saving || readOnly)}
        >
          {saving ? "Saving…" : "Save"}
        </button>

        <button
          type="button"
          disabled={!canUndo || readOnly}
          onClick={handleUndo}
          title="Undo (Ctrl+Z)"
          style={toolbarButtonStyle(!canUndo || readOnly)}
        >
          Undo
        </button>

        <button
          type="button"
          disabled={!canRedo || readOnly}
          onClick={handleRedo}
          title="Redo (Ctrl+Y)"
          style={toolbarButtonStyle(!canRedo || readOnly)}
        >
          Redo
        </button>

        {onSubmitForApproval && (
          <button
            type="button"
            disabled={!isDirty || submitting || hasErrors || readOnly}
            onClick={handleSubmit}
            title={!isDirty ? "No unsaved changes" : "Submit for approval"}
            style={toolbarButtonStyle(!isDirty || submitting || hasErrors || readOnly)}
          >
            {submitting ? "Submitting…" : "Submit for Approval"}
          </button>
        )}

        {/* Lint badge */}
        <div
          title={lintTooltip}
          role="status"
          aria-label={`Lint: ${violations.length} issue(s)`}
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "2px 8px",
            borderRadius: "12px",
            backgroundColor: violations.length === 0 ? "#dcfce7" : hasErrors ? "#fee2e2" : "#fef9c3",
            color: violations.length === 0 ? "#166534" : hasErrors ? "#991b1b" : "#854d0e",
            fontSize: "11px",
            fontWeight: 600,
            cursor: violations.length > 0 ? "help" : "default",
            whiteSpace: "nowrap"
          }}
        >
          {violations.length === 0 ? (
            <span>Clean</span>
          ) : (
            <>
              {errorCount > 0 && <span>{errorCount} error{errorCount !== 1 ? "s" : ""}</span>}
              {errorCount > 0 && warningCount > 0 && <span>,</span>}
              {warningCount > 0 && (
                <span>{warningCount} warning{warningCount !== 1 ? "s" : ""}</span>
              )}
            </>
          )}
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{ ...toolbarButtonStyle(false), marginLeft: "8px" }}
          >
            Cancel
          </button>
        )}
      </div>

      {/* Lint violation banner (errors only — warnings shown in badge tooltip) */}
      {hasErrors && (
        <div
          role="alert"
          style={{
            padding: "8px 12px",
            backgroundColor: "#fee2e2",
            borderBottom: "1px solid #fca5a5",
            color: "#991b1b",
            fontSize: "12px",
            flexShrink: 0
          }}
        >
          <strong>PROFILE-V1 violations (save disabled):</strong>{" "}
          {violations
            .filter((v) => v.severity === "error")
            .map((v) => v.message)
            .join(" | ")}
        </div>
      )}

      {/* Two-pane editor + preview */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", gap: "1px", minHeight: 0 }}>
        {/* Left pane: Monaco HTML editor */}
        <div style={{ flex: 1, overflow: "hidden", padding: "8px" }}>
          <MonacoEditorPane
            value={htmlContent}
            onChange={handleContentChange}
            readOnly={readOnly}
          />
        </div>

        {/* Right pane: live preview iframe */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            padding: "8px",
            borderLeft: "1px solid #e2e8f0"
          }}
        >
          <iframe
            title="PDF template live preview"
            srcDoc={htmlContent}
            sandbox="allow-same-origin"
            style={{
              width: "100%",
              height: "100%",
              border: "1px solid #e2e8f0",
              borderRadius: "4px",
              backgroundColor: "#fff"
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar button style helper
// ---------------------------------------------------------------------------

function toolbarButtonStyle(disabled: boolean | undefined): React.CSSProperties {
  return {
    padding: "4px 12px",
    borderRadius: "4px",
    border: "1px solid #cbd5e1",
    backgroundColor: disabled ? "#f1f5f9" : "#ffffff",
    color: disabled ? "#94a3b8" : "#1e293b",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "12px",
    fontWeight: 500,
    lineHeight: "20px"
  };
}

// ---------------------------------------------------------------------------
// Public export — wrapped in RequireCapability
// ---------------------------------------------------------------------------

/**
 * PDF Template Designer component.
 *
 * Features:
 * - Monaco HTML editor (left pane) — marked external in bundle; consumer ships Monaco.
 * - Live preview iframe (right pane) — browser renders the raw HTML.
 * - PROFILE-V1 client-side lint: blocks save on errors, shows badge + banner.
 * - Undo/redo powered by `usePdfTemplateHistory<string>` (capacity: 50).
 * - Capability-gated by `pdf.designer` — renders locked stub when denied.
 *
 * @example
 * ```tsx
 * <MuPdfTemplateDesigner
 *   template={template}
 *   version={activeVersion}
 *   onSave={async (html) => await apiClient.updateDraft(id, v, { contentJson: html, contentType: "text/html", updatedBy: userId })}
 *   onSubmitForApproval={async () => await apiClient.submitForApproval(id, v, { submittedBy: userId })}
 * />
 * ```
 */
export function MuPdfTemplateDesigner(props: MuPdfTemplateDesignerProps): React.JSX.Element {
  return (
    <RequireCapability capability="pdf.designer">
      <MuPdfTemplateDesignerInner {...props} />
    </RequireCapability>
  );
}
