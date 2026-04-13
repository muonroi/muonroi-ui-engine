/**
 * Theme tokens, SVG node icons, and edge color maps for the Rule Flow Designer.
 * All color values now reference CSS custom properties (var(--mu-*)) so the CSS
 * layer handles actual values — both light and dark themes use the same token set.
 */
import type { MRuleFlowNodeType, MRuleFlowEdgeType } from "../../models.js";

export type MFlowTheme = "light" | "dark";

export interface MFlowThemeTokens {
  // Surfaces
  canvasGradient: string;
  sidebarBg: string;
  sidebarBorder: string;
  sidebarOpenBg: string;
  sidebarOpenBorder: string;
  sidebarOpenShadow: string;
  sidebarHeaderColor: string;
  // Nodes
  nodeBg: string;
  nodeBorder: string;
  nodeShadow: string;
  nodeText: string;
  nodeSubtext: string;
  nodeMutedText: string;
  // Inspector
  inspectorBg: string;
  inspectorBorder: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  labelColor: string;
  // Overlay
  overlayBg: string;
  overlayBorder: string;
  overlayShadow: string;
  overlayItemBg: string;
  overlayItemBorder: string;
  overlayItemSelectedBg: string;
  overlayItemSelectedBorder: string;
  // Dialogs
  backdropBg: string;
  dialogBg: string;
  dialogBorder: string;
  dialogShadow: string;
  // Common text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // Palette — alpha hex suffix appended to accent color
  paletteBtnBorderAlpha: string;
  paletteBtnBgAlpha: string;
  // Edge hint
  hintBg: string;
  hintBorder: string;
  hintText: string;
  // Validation
  errorBg: string;
  errorBorder: string;
  errorText: string;
  warningBg: string;
  warningBorder: string;
  warningText: string;
  // Delete
  deleteBg: string;
  deleteBorder: string;
  deleteText: string;
  // Misc
  chevronBg: string;
  chevronColor: string;
  sectionDescColor: string;
  // Action buttons
  actionPrimaryBorder: string;
  actionPrimaryBg: string;
  actionSecondaryBorder: string;
  actionSecondaryBg: string;
  // Validation summary
  validationErrorBg: string;
  validationErrorBorder: string;
  validationErrorText: string;
  validationWarnBg: string;
  validationWarnBorder: string;
  validationWarnText: string;
  // License fallback
  licenseBg: string;
  licenseBorder: string;
  licenseText: string;
  // Edge label background
  edgeLabelBg: string;
}

/**
 * Shared token set — CSS custom properties resolve at runtime based on [data-theme] attribute.
 * Both light and dark themes use the same var() references; the CSS layer supplies the values.
 */
export const SHARED_TOKENS: MFlowThemeTokens = {
  canvasGradient: `radial-gradient(circle at top left, color-mix(in oklch, var(--mu-color-interactive) 12%, transparent), transparent 38%), linear-gradient(180deg, var(--mu-surface-canvas), var(--mu-surface-base))`,
  sidebarBg: "var(--mu-surface-sidebar)",
  sidebarBorder: "1px solid var(--mu-border-subtle)",
  sidebarOpenBg: "var(--mu-surface-raised)",
  sidebarOpenBorder: "1px solid var(--mu-border-default)",
  sidebarOpenShadow: "var(--mu-shadow-sidebar)",
  sidebarHeaderColor: "var(--mu-text-primary)",
  nodeBg: "var(--mu-surface-base)",
  nodeBorder: "1px solid var(--mu-border-subtle)",
  nodeShadow: "var(--mu-shadow-node)",
  nodeText: "var(--mu-text-primary)",
  nodeSubtext: "var(--mu-text-secondary)",
  nodeMutedText: "var(--mu-text-muted)",
  inspectorBg: "var(--mu-surface-sidebar)",
  inspectorBorder: "1px solid var(--mu-border-subtle)",
  inputBg: "var(--mu-surface-input)",
  inputBorder: "1px solid var(--mu-border-input)",
  inputText: "var(--mu-text-primary)",
  labelColor: "var(--mu-text-label)",
  overlayBg: "var(--mu-surface-overlay)",
  overlayBorder: "1px solid var(--mu-border-default)",
  overlayShadow: "var(--mu-shadow-overlay)",
  overlayItemBg: "var(--mu-surface-raised)",
  overlayItemBorder: "1px solid var(--mu-border-subtle)",
  overlayItemSelectedBg: "var(--mu-color-selected-bg)",
  overlayItemSelectedBorder: "1px solid var(--mu-color-selected-border)",
  backdropBg: "var(--mu-surface-backdrop)",
  dialogBg: "var(--mu-surface-dialog)",
  dialogBorder: "1px solid var(--mu-border-default)",
  dialogShadow: "var(--mu-shadow-dialog)",
  textPrimary: "var(--mu-text-primary)",
  textSecondary: "var(--mu-text-secondary)",
  textMuted: "var(--mu-text-muted)",
  paletteBtnBorderAlpha: "22",
  paletteBtnBgAlpha: "10",
  chevronBg: "var(--mu-border-subtle)",
  chevronColor: "var(--mu-text-secondary)",
  sectionDescColor: "var(--mu-text-muted)",
  hintBg: "var(--mu-surface-raised)",
  hintBorder: "1px solid var(--mu-border-subtle)",
  hintText: "var(--mu-text-label)",
  errorBg: "var(--mu-color-error-bg)",
  errorBorder: "1px solid var(--mu-color-error-border)",
  errorText: "var(--mu-color-error-text)",
  warningBg: "var(--mu-color-warning-bg)",
  warningBorder: "1px solid var(--mu-color-warning-border)",
  warningText: "var(--mu-color-warning-text)",
  deleteBg: "var(--mu-color-error-bg)",
  deleteBorder: "1px solid var(--mu-color-error-border)",
  deleteText: "var(--mu-color-error-text)",
  actionPrimaryBorder: "1px solid var(--mu-color-interactive-border)",
  actionPrimaryBg: "var(--mu-color-interactive-subtle)",
  actionSecondaryBorder: "1px solid var(--mu-border-input)",
  actionSecondaryBg: "var(--mu-surface-raised)",
  validationErrorBg: "var(--mu-color-error-bg)",
  validationErrorBorder: "1px solid var(--mu-color-error-border)",
  validationErrorText: "var(--mu-color-error-text)",
  validationWarnBg: "var(--mu-color-warning-bg)",
  validationWarnBorder: "1px solid var(--mu-color-warning-border)",
  validationWarnText: "var(--mu-color-warning-text)",
  licenseBg: "var(--mu-color-warning-bg)",
  licenseBorder: "1px solid var(--mu-color-warning-border)",
  licenseText: "var(--mu-color-warning-text)",
  edgeLabelBg: "var(--mu-edge-label-bg)"
};

// Keep M_LIGHT_TOKENS and M_DARK_TOKENS as aliases for backward compat —
// both point to SHARED_TOKENS since the CSS layer handles actual values.
export const M_LIGHT_TOKENS: MFlowThemeTokens = SHARED_TOKENS;
export const M_DARK_TOKENS: MFlowThemeTokens = SHARED_TOKENS;

export function MGetThemeTokens(_theme: MFlowTheme): MFlowThemeTokens {
  return SHARED_TOKENS;
}

/** SVG path data for node type icons (16x16 viewBox). */
export const M_NODE_ICONS: Record<MRuleFlowNodeType, string> = {
  trigger: "M6 2.5v11l5.5-5.5z",
  condition: "M8 1L15 8 8 15 1 8zm0 2.83L3.83 8 8 12.17 12.17 8z",
  action: "M7 2v5H2v2h5v5h2V9h5V7H9V2z",
  "decision-table": "M2 3h12v1.5H2zm0 3.5h12V8H2zm0 3.5h12V11.5H2zm0 3.5h12V15H2z",
  "sub-flow": "M3 3h4v4H3zm6 0h4v4H9zM5 7v2h6V7M8 9v3M5 12h6",
  liquid: "M8 1C5.8 5.3 3 7.4 3 10.5 3 13 5.2 15 8 15s5-2 5-4.5C13 7.4 10.2 5.3 8 1z",
  connector: "M2 4h4v3H2zm8 0h4v3h-4zM4 7v2h1v1H4v2h2v-2h1V9h2v2h1v2h2v-2h-1V9H9.5V7m-5 0",
  end: "M8 2a6 6 0 100 12A6 6 0 008 2zm0 3a3 3 0 110 6 3 3 0 010-6z"
};

/** Short descriptions for palette node buttons. */
export const M_NODE_DESCRIPTIONS: Record<MRuleFlowNodeType, string> = {
  trigger: "Entry point for the rule flow",
  condition: "Evaluate a rule with pass/fail routing",
  action: "Execute side effects or transformations",
  "decision-table": "Evaluate a FEEL decision table",
  "sub-flow": "Delegate to another rule flow",
  liquid: "Transform data with Liquid templates",
  connector: "Integrate with external services via connectors",
  end: "Terminal node — flow completes here"
};

/** Edge routing colors — CSS vars resolve via [data-theme] at runtime. */
export const M_EDGE_COLORS: Record<MRuleFlowEdgeType, string> = {
  always: "var(--mu-edge-always)",
  "on-true": "var(--mu-edge-on-true)",
  "on-false": "var(--mu-edge-on-false)",
  "on-error": "var(--mu-edge-on-error)"
};

// Dark alias — same vars, CSS layer handles the actual color values.
export const M_EDGE_COLORS_DARK: Record<MRuleFlowEdgeType, string> = M_EDGE_COLORS;
