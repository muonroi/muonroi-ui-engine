/**
 * CodeMirror 6 theme and syntax highlighting aligned with rule-flow-theme.ts tokens.
 * Provides light theme styling consistent with the Rule Flow Designer visual language.
 */
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

/** Light editor theme matching rule-flow-theme.ts inspector tokens. */
export const mExpressionEditorTheme = EditorView.theme({
  "&": {
    fontSize: "12px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
  },
  ".cm-content": {
    padding: "10px 12px",
    minHeight: "160px"
  },
  ".cm-editor": {
    background: "#ffffff"
  },
  ".cm-editor.cm-focused": {
    outline: "2px solid rgba(37, 99, 235, 0.4)"
  },
  ".cm-gutters": {
    background: "#f8fafc",
    color: "#94a3b8",
    borderRight: "1px solid rgba(148, 163, 184, 0.18)"
  },
  ".cm-activeLine": {
    background: "rgba(241, 245, 249, 0.5)"
  },
  ".cm-selectionBackground": {
    background: "rgba(37, 99, 235, 0.15) !important"
  },
  ".cm-cursor": {
    borderLeftColor: "#0f172a"
  },
  ".cm-tooltip": {
    borderRadius: "12px",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    fontSize: "12px"
  },
  ".cm-tooltip-autocomplete": {
    borderRadius: "12px"
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    background: "rgba(37, 99, 235, 0.12)",
    color: "#0f172a"
  },
  ".cm-lintRange-error": {
    backgroundImage: "none",
    textDecoration: "underline wavy #dc2626"
  },
  ".cm-lintRange-warning": {
    backgroundImage: "none",
    textDecoration: "underline wavy #f59e0b"
  },
  ".cm-diagnostic-error": {
    borderLeft: "3px solid #dc2626"
  },
  ".cm-diagnostic-warning": {
    borderLeft: "3px solid #f59e0b"
  },
  ".cm-completionIcon-variable::after": {
    content: "'x'",
    display: "inline-block",
    width: "16px",
    height: "16px",
    lineHeight: "16px",
    textAlign: "center",
    borderRadius: "50%",
    background: "rgba(37, 99, 235, 0.12)",
    color: "#2563eb",
    fontSize: "10px",
    fontWeight: "700"
  },
  ".cm-completionIcon-function::after": {
    content: "'f'",
    display: "inline-block",
    width: "16px",
    height: "16px",
    lineHeight: "16px",
    textAlign: "center",
    borderRadius: "50%",
    background: "rgba(124, 58, 237, 0.12)",
    color: "#7c3aed",
    fontSize: "10px",
    fontWeight: "700",
    fontStyle: "italic"
  }
});

/** Dark editor theme matching M_DARK_TOKENS from rule-flow-theme.ts. */
export const mExpressionEditorDarkTheme = EditorView.theme({
  "&": {
    fontSize: "12px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
  },
  ".cm-content": {
    padding: "10px 12px",
    minHeight: "160px"
  },
  ".cm-editor": {
    background: "#0f172a"
  },
  ".cm-editor.cm-focused": {
    outline: "2px solid rgba(59, 130, 246, 0.5)"
  },
  ".cm-gutters": {
    background: "#1e293b",
    color: "#64748b",
    borderRight: "1px solid rgba(71, 85, 105, 0.32)"
  },
  ".cm-activeLine": {
    background: "rgba(30, 41, 59, 0.6)"
  },
  ".cm-selectionBackground": {
    background: "rgba(59, 130, 246, 0.25) !important"
  },
  ".cm-cursor": {
    borderLeftColor: "#e2e8f0"
  },
  ".cm-tooltip": {
    borderRadius: "12px",
    border: "1px solid rgba(71, 85, 105, 0.38)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
    fontSize: "12px",
    background: "#1e293b",
    color: "#e2e8f0"
  },
  ".cm-tooltip-autocomplete": {
    borderRadius: "12px"
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    background: "rgba(59, 130, 246, 0.2)",
    color: "#e2e8f0"
  },
  ".cm-lintRange-error": {
    backgroundImage: "none",
    textDecoration: "underline wavy #f87171"
  },
  ".cm-lintRange-warning": {
    backgroundImage: "none",
    textDecoration: "underline wavy #fbbf24"
  },
  ".cm-diagnostic-error": {
    borderLeft: "3px solid #f87171"
  },
  ".cm-diagnostic-warning": {
    borderLeft: "3px solid #fbbf24"
  },
  ".cm-completionIcon-variable::after": {
    content: "'x'",
    display: "inline-block",
    width: "16px",
    height: "16px",
    lineHeight: "16px",
    textAlign: "center",
    borderRadius: "50%",
    background: "rgba(96, 165, 250, 0.18)",
    color: "#60a5fa",
    fontSize: "10px",
    fontWeight: "700"
  },
  ".cm-completionIcon-function::after": {
    content: "'f'",
    display: "inline-block",
    width: "16px",
    height: "16px",
    lineHeight: "16px",
    textAlign: "center",
    borderRadius: "50%",
    background: "rgba(167, 139, 250, 0.18)",
    color: "#a78bfa",
    fontSize: "10px",
    fontWeight: "700",
    fontStyle: "italic"
  }
}, { dark: true });

/** Syntax highlight style for expression languages. */
export const mExpressionHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#7c3aed" },
  { tag: tags.string, color: "#059669" },
  { tag: tags.number, color: "#d97706" },
  { tag: tags.bool, color: "#7c3aed" },
  { tag: tags.null_, color: "#94a3b8" },
  { tag: tags.operator, color: "#2563eb" },
  { tag: tags.comment, color: "#94a3b8", fontStyle: "italic" },
  { tag: tags.function(tags.variableName), color: "#2563eb" },
  { tag: tags.variableName, color: "#0f172a" },
  { tag: tags.propertyName, color: "#0891b2" },
  { tag: tags.bracket, color: "#64748b" },
  { tag: tags.special(tags.variableName), color: "#2563eb", fontWeight: "600" }
]);

/** Dark-mode syntax highlight style. */
export const mExpressionHighlightStyleDark = HighlightStyle.define([
  { tag: tags.keyword, color: "#a78bfa" },
  { tag: tags.string, color: "#34d399" },
  { tag: tags.number, color: "#fbbf24" },
  { tag: tags.bool, color: "#a78bfa" },
  { tag: tags.null_, color: "#64748b" },
  { tag: tags.operator, color: "#60a5fa" },
  { tag: tags.comment, color: "#64748b", fontStyle: "italic" },
  { tag: tags.function(tags.variableName), color: "#60a5fa" },
  { tag: tags.variableName, color: "#e2e8f0" },
  { tag: tags.propertyName, color: "#22d3ee" },
  { tag: tags.bracket, color: "#94a3b8" },
  { tag: tags.special(tags.variableName), color: "#60a5fa", fontWeight: "600" }
]);

/** Combined light theme + highlight extensions. */
export const mExpressionEditorExtensions = [
  mExpressionEditorTheme,
  syntaxHighlighting(mExpressionHighlightStyle)
];

/** Combined dark theme + highlight extensions. */
export const mExpressionEditorDarkExtensions = [
  mExpressionEditorDarkTheme,
  syntaxHighlighting(mExpressionHighlightStyleDark)
];
