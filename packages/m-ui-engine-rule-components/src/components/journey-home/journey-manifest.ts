/**
 * journey-manifest.ts — Static BA Transformation Journey stage definitions.
 *
 * WAY-05: The journey definition lives in the ui-engine library, not in any consumer dashboard.
 * All stage copy, before/after framing, link targets, and live-state keys are declared here.
 * Updates to stage content ship as a ui-engine version publish; consumers only bump the pin.
 *
 * No secrets, no PII, no tenant-specific data in this manifest.
 */

export interface JourneyStage {
  /** Unique identifier for the stage (kebab-case). */
  id: string;
  /** Display label for the stage card heading. */
  label: string;
  /** Unicode icon shown next to the stage label. */
  icon: string;
  /** Heading for the "before" framing panel. */
  beforeLabel: string;
  /** Description of the old, painful manual way. */
  beforeText: string;
  /** Heading for the "after" framing panel (with platform). */
  afterLabel: string;
  /** Description of how the platform replaces or improves the step. */
  afterText: string;
  /**
   * React-router path to navigate to when the CTA is clicked.
   * The token `:workflow` is replaced at runtime with encodeURIComponent(workflow).
   */
  linkPath: string;
  /** CTA button label shown on the stage card. */
  linkLabel: string;
  /**
   * Which live-state attribute to show as a badge on this card.
   * Absent on stages that have no per-stage live metric.
   * The component reads the corresponding numeric attribute (default null = "N/A").
   */
  liveStateKey?: "activeVersion" | "tracedCount" | "untestedCount" | "pendingCount";
}

/**
 * Ordered list of the 6 BA Transformation Journey stages.
 * Rendered in declaration order by mu-journey-home.
 */
export const JOURNEY_STAGES: JourneyStage[] = [
  {
    id: "elicit",
    label: "Elicit",
    icon: "\u{1F4AC}", // 💬
    beforeLabel: "Before",
    beforeText:
      "Interview customers, write Word docs, lose context in email threads.",
    afterLabel: "With the platform",
    afterText:
      "Capture requirements as structured entities linked directly to rules — no manual re-entry.",
    linkPath: "/living-docs/:workflow",
    linkLabel: "View Living Docs",
    liveStateKey: "tracedCount",
  },
  {
    id: "specify",
    label: "Specify",
    icon: "✏️", // ✏️
    beforeLabel: "Before",
    beforeText: "Hand-edit JSON or ask a developer to write rules.",
    afterLabel: "With the platform",
    afterText:
      "Author rules in natural language via AI Copilot — returns a validated draft, never auto-active.",
    linkPath: "/rules",
    linkLabel: "Go to Rules",
  },
  {
    id: "validate",
    label: "Validate",
    icon: "✅", // ✅
    beforeLabel: "Before",
    beforeText: "Manual desk-check; bugs found in production.",
    afterLabel: "With the platform",
    afterText:
      "Dry-run any fact bag against the rule graph; see traces + output facts instantly.",
    linkPath: "/dry-run",
    linkLabel: "Open Dry Run",
  },
  {
    id: "govern",
    label: "Govern",
    icon: "\u{1F6E1}️", // 🛡️
    beforeLabel: "Before",
    beforeText: "No approval trail; anyone could activate a rule change.",
    afterLabel: "With the platform",
    afterText:
      "Every draft requires a human approver (maker ≠ checker). Full audit trail.",
    linkPath: "/approvals",
    linkLabel: "Go to Approvals",
    liveStateKey: "pendingCount",
  },
  {
    id: "living-docs",
    label: "LivingDocs",
    icon: "\u{1F4C4}", // 📄
    beforeLabel: "Before",
    beforeText:
      "Docs written once, drift immediately. Shared drives with stale Word files.",
    afterLabel: "With the platform",
    afterText:
      "Documentation regenerates automatically from the rule graph on every change — never drifts.",
    linkPath: "/living-docs/:workflow",
    linkLabel: "View Living Docs",
    liveStateKey: "activeVersion",
  },
  {
    id: "trace",
    label: "Trace",
    icon: "\u{1F517}", // 🔗
    beforeLabel: "Before",
    beforeText:
      "No traceability: can’t answer ‘which rule covers requirement R?’",
    afterLabel: "With the platform",
    afterText:
      "Requirement ↔ rule ↔ code ↔ test matrix. Three-state coverage badge (unit test / dry-run example / none).",
    linkPath: "/living-docs/:workflow?tab=matrix",
    linkLabel: "View Traceability",
    liveStateKey: "untestedCount",
  },
];
