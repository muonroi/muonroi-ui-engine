/**
 * Theme tokens, SVG node icons, and edge color maps for the Rule Flow Designer.
 * Provides full light/dark theme support with a single token lookup.
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
  tabActiveAlphaBorder: string;
  tabActiveAlphaBg: string;
  tabInactiveBorder: string;
  tabInactiveBg: string;
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

export const M_LIGHT_TOKENS: MFlowThemeTokens = {
  canvasGradient: "radial-gradient(circle at top left, rgba(37,99,235,0.12), transparent 38%), linear-gradient(180deg, rgba(248,250,252,0.96), rgba(241,245,249,0.92))",
  sidebarBg: "rgba(248,250,252,0.92)",
  sidebarBorder: "1px solid rgba(148,163,184,0.18)",
  sidebarOpenBg: "rgba(255,255,255,0.94)",
  sidebarOpenBorder: "1px solid rgba(148,163,184,0.28)",
  sidebarOpenShadow: "0 12px 30px rgba(15,23,42,0.06)",
  sidebarHeaderColor: "#0f172a",
  nodeBg: "#ffffff",
  nodeBorder: "1px solid rgba(15,23,42,0.12)",
  nodeShadow: "0 14px 30px rgba(15,23,42,0.10)",
  nodeText: "#0f172a",
  nodeSubtext: "#475569",
  nodeMutedText: "#64748b",
  inspectorBg: "rgba(248,250,252,0.9)",
  inspectorBorder: "1px solid rgba(148,163,184,0.18)",
  inputBg: "#ffffff",
  inputBorder: "1px solid rgba(148,163,184,0.35)",
  inputText: "#0f172a",
  labelColor: "#334155",
  overlayBg: "rgba(255,255,255,0.95)",
  overlayBorder: "1px solid rgba(148,163,184,0.28)",
  overlayShadow: "0 18px 40px rgba(15,23,42,0.12)",
  overlayItemBg: "rgba(248,250,252,0.94)",
  overlayItemBorder: "1px solid rgba(148,163,184,0.2)",
  overlayItemSelectedBg: "rgba(219,234,254,0.92)",
  overlayItemSelectedBorder: "1px solid rgba(37,99,235,0.26)",
  backdropBg: "rgba(15,23,42,0.38)",
  dialogBg: "#ffffff",
  dialogBorder: "1px solid rgba(148,163,184,0.28)",
  dialogShadow: "0 24px 60px rgba(15,23,42,0.22)",
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#64748b",
  paletteBtnBorderAlpha: "22",
  paletteBtnBgAlpha: "10",
  chevronBg: "rgba(148,163,184,0.12)",
  chevronColor: "#475569",
  sectionDescColor: "#64748b",
  tabActiveAlphaBorder: "40",
  tabActiveAlphaBg: "14",
  tabInactiveBorder: "1px solid rgba(148,163,184,0.24)",
  tabInactiveBg: "#ffffff",
  hintBg: "rgba(248,250,252,0.96)",
  hintBorder: "1px solid rgba(148,163,184,0.24)",
  hintText: "#334155",
  errorBg: "rgba(254,242,242,0.9)",
  errorBorder: "1px solid rgba(220,38,38,0.18)",
  errorText: "#b91c1c",
  warningBg: "rgba(255,251,235,0.9)",
  warningBorder: "1px solid rgba(245,158,11,0.18)",
  warningText: "#92400e",
  deleteBg: "rgba(254,242,242,0.96)",
  deleteBorder: "1px solid rgba(220,38,38,0.2)",
  deleteText: "#b91c1c",
  actionPrimaryBorder: "1px solid rgba(37,99,235,0.28)",
  actionPrimaryBg: "rgba(37,99,235,0.14)",
  actionSecondaryBorder: "1px solid rgba(148,163,184,0.35)",
  actionSecondaryBg: "rgba(255,255,255,0.9)",
  validationErrorBg: "rgba(254,242,242,0.95)",
  validationErrorBorder: "1px solid rgba(220,38,38,0.24)",
  validationErrorText: "#b91c1c",
  validationWarnBg: "rgba(255,251,235,0.95)",
  validationWarnBorder: "1px solid rgba(245,158,11,0.24)",
  validationWarnText: "#92400e",
  licenseBg: "rgba(255,251,235,0.95)",
  licenseBorder: "1px solid rgba(245,158,11,0.35)",
  licenseText: "#92400e",
  edgeLabelBg: "#ffffff"
};

export const M_DARK_TOKENS: MFlowThemeTokens = {
  canvasGradient: "radial-gradient(circle at top left, rgba(37,99,235,0.16), transparent 38%), linear-gradient(180deg, #1e293b, #0f172a)",
  sidebarBg: "rgba(30,41,59,0.92)",
  sidebarBorder: "1px solid rgba(71,85,105,0.32)",
  sidebarOpenBg: "rgba(30,41,59,0.96)",
  sidebarOpenBorder: "1px solid rgba(71,85,105,0.45)",
  sidebarOpenShadow: "0 12px 30px rgba(0,0,0,0.25)",
  sidebarHeaderColor: "#e2e8f0",
  nodeBg: "#1e293b",
  nodeBorder: "1px solid rgba(71,85,105,0.38)",
  nodeShadow: "0 14px 30px rgba(0,0,0,0.25)",
  nodeText: "#e2e8f0",
  nodeSubtext: "#94a3b8",
  nodeMutedText: "#64748b",
  inspectorBg: "rgba(15,23,42,0.9)",
  inspectorBorder: "1px solid rgba(71,85,105,0.32)",
  inputBg: "#0f172a",
  inputBorder: "1px solid rgba(71,85,105,0.45)",
  inputText: "#e2e8f0",
  labelColor: "#cbd5e1",
  overlayBg: "rgba(30,41,59,0.95)",
  overlayBorder: "1px solid rgba(71,85,105,0.38)",
  overlayShadow: "0 18px 40px rgba(0,0,0,0.30)",
  overlayItemBg: "rgba(15,23,42,0.7)",
  overlayItemBorder: "1px solid rgba(71,85,105,0.3)",
  overlayItemSelectedBg: "rgba(37,99,235,0.2)",
  overlayItemSelectedBorder: "1px solid rgba(37,99,235,0.45)",
  backdropBg: "rgba(0,0,0,0.55)",
  dialogBg: "#1e293b",
  dialogBorder: "1px solid rgba(71,85,105,0.45)",
  dialogShadow: "0 24px 60px rgba(0,0,0,0.40)",
  textPrimary: "#e2e8f0",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  paletteBtnBorderAlpha: "30",
  paletteBtnBgAlpha: "18",
  chevronBg: "rgba(71,85,105,0.24)",
  chevronColor: "#94a3b8",
  sectionDescColor: "#94a3b8",
  tabActiveAlphaBorder: "55",
  tabActiveAlphaBg: "22",
  tabInactiveBorder: "1px solid rgba(71,85,105,0.32)",
  tabInactiveBg: "#1e293b",
  hintBg: "rgba(15,23,42,0.85)",
  hintBorder: "1px solid rgba(71,85,105,0.32)",
  hintText: "#94a3b8",
  errorBg: "rgba(127,29,29,0.25)",
  errorBorder: "1px solid rgba(220,38,38,0.35)",
  errorText: "#fca5a5",
  warningBg: "rgba(120,53,15,0.25)",
  warningBorder: "1px solid rgba(245,158,11,0.35)",
  warningText: "#fcd34d",
  deleteBg: "rgba(127,29,29,0.3)",
  deleteBorder: "1px solid rgba(220,38,38,0.35)",
  deleteText: "#fca5a5",
  actionPrimaryBorder: "1px solid rgba(59,130,246,0.45)",
  actionPrimaryBg: "rgba(59,130,246,0.2)",
  actionSecondaryBorder: "1px solid rgba(71,85,105,0.45)",
  actionSecondaryBg: "rgba(30,41,59,0.8)",
  validationErrorBg: "rgba(127,29,29,0.25)",
  validationErrorBorder: "1px solid rgba(220,38,38,0.35)",
  validationErrorText: "#fca5a5",
  validationWarnBg: "rgba(120,53,15,0.25)",
  validationWarnBorder: "1px solid rgba(245,158,11,0.35)",
  validationWarnText: "#fcd34d",
  licenseBg: "rgba(120,53,15,0.25)",
  licenseBorder: "1px solid rgba(245,158,11,0.35)",
  licenseText: "#fcd34d",
  edgeLabelBg: "#1e293b"
};

export function MGetThemeTokens(theme: MFlowTheme): MFlowThemeTokens {
  return theme === "dark" ? M_DARK_TOKENS : M_LIGHT_TOKENS;
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

/** Edge routing colors — light mode. */
export const M_EDGE_COLORS: Record<MRuleFlowEdgeType, string> = {
  always: "#64748b",
  "on-true": "#16a34a",
  "on-false": "#dc2626",
  "on-error": "#d97706"
};

/** Edge routing colors — dark mode. */
export const M_EDGE_COLORS_DARK: Record<MRuleFlowEdgeType, string> = {
  always: "#94a3b8",
  "on-true": "#4ade80",
  "on-false": "#f87171",
  "on-error": "#fbbf24"
};
