/**
 * CodeMirror 6 theme and syntax highlighting using design token CSS vars.
 * A single unified theme reads var(--mu-*) tokens so light/dark switching
 * is handled automatically by the CSS layer (data-theme attribute).
 */
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

/** Unified editor theme — colors resolved from CSS custom properties at runtime. */
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
    background: "var(--mu-surface-base)"
  },
  ".cm-editor.cm-focused": {
    outline: "2px solid color-mix(in oklch, var(--mu-color-interactive) 40%, transparent)"
  },
  ".cm-gutters": {
    background: "var(--mu-surface-raised)",
    color: "var(--mu-text-muted)",
    borderRight: "1px solid color-mix(in oklch, var(--mu-border-subtle) 60%, transparent)"
  },
  ".cm-activeLine": {
    background: "color-mix(in oklch, var(--mu-surface-raised) 50%, transparent)"
  },
  ".cm-selectionBackground": {
    background: "color-mix(in oklch, var(--mu-color-interactive) 15%, transparent) !important"
  },
  ".cm-cursor": {
    borderLeftColor: "var(--mu-text-primary)"
  },
  ".cm-tooltip": {
    borderRadius: "12px",
    border: "1px solid color-mix(in oklch, var(--mu-border-subtle) 80%, transparent)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    fontSize: "12px",
    background: "var(--mu-surface-raised)",
    color: "var(--mu-text-primary)"
  },
  ".cm-tooltip-autocomplete": {
    borderRadius: "12px"
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    background: "color-mix(in oklch, var(--mu-color-interactive) 12%, transparent)",
    color: "var(--mu-text-primary)"
  },
  ".cm-lintRange-error": {
    backgroundImage: "none",
    textDecoration: "underline wavy var(--mu-color-error)"
  },
  ".cm-lintRange-warning": {
    backgroundImage: "none",
    textDecoration: "underline wavy var(--mu-color-warning)"
  },
  ".cm-diagnostic-error": {
    borderLeft: "3px solid var(--mu-color-error)"
  },
  ".cm-diagnostic-warning": {
    borderLeft: "3px solid var(--mu-color-warning)"
  },
  ".cm-completionIcon-variable::after": {
    content: "'x'",
    display: "inline-block",
    width: "16px",
    height: "16px",
    lineHeight: "16px",
    textAlign: "center",
    borderRadius: "50%",
    background: "color-mix(in oklch, var(--mu-color-interactive) 12%, transparent)",
    color: "var(--mu-color-interactive)",
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
    background: "color-mix(in oklch, var(--mu-node-condition) 12%, transparent)",
    color: "var(--mu-node-condition)",
    fontSize: "10px",
    fontWeight: "700",
    fontStyle: "italic"
  }
});

/**
 * Dark theme alias — same as unified theme (CSS vars handle light/dark automatically).
 * Kept for backward compatibility with callers that import mExpressionEditorDarkTheme.
 */
export const mExpressionEditorDarkTheme = mExpressionEditorTheme;

/** Syntax highlight style using design token CSS vars. */
export const mExpressionHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--mu-node-condition)" },
  { tag: tags.string, color: "var(--mu-color-success-text)" },
  { tag: tags.number, color: "var(--mu-color-warning-text)" },
  { tag: tags.bool, color: "var(--mu-node-condition)" },
  { tag: tags.null, color: "var(--mu-text-muted)" },
  { tag: tags.operator, color: "var(--mu-color-interactive)" },
  { tag: tags.comment, color: "var(--mu-text-muted)", fontStyle: "italic" },
  { tag: tags.function(tags.variableName), color: "var(--mu-color-interactive)" },
  { tag: tags.variableName, color: "var(--mu-text-primary)" },
  { tag: tags.propertyName, color: "var(--mu-color-interactive-subtle)" },
  { tag: tags.bracket, color: "var(--mu-text-secondary)" },
  { tag: tags.special(tags.variableName), color: "var(--mu-color-interactive)", fontWeight: "600" }
]);

/**
 * Dark highlight style alias — same as unified style (CSS vars handle light/dark automatically).
 * Kept for backward compatibility with callers that import mExpressionHighlightStyleDark.
 */
export const mExpressionHighlightStyleDark = mExpressionHighlightStyle;

/** Combined theme + highlight extensions (light mode / default). */
export const mExpressionEditorExtensions = [
  mExpressionEditorTheme,
  syntaxHighlighting(mExpressionHighlightStyle)
];

/** Combined dark theme + highlight extensions alias — backward compat. */
export const mExpressionEditorDarkExtensions = mExpressionEditorExtensions;
