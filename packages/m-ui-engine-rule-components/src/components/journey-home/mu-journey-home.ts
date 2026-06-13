import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { JourneyStage } from "./journey-manifest.js";
import { JOURNEY_STAGES } from "./journey-manifest.js";

/**
 * mu-journey-home — BA Transformation Journey landing component.
 *
 * Renders 6 ordered stage cards (Elicit → Specify → Validate → Govern → LivingDocs → Trace)
 * with before→after framing copy (WAY-02) and a CTA per stage.
 *
 * Clicking a stage CTA dispatches `journey-stage-navigate` (composed + bubbling, WAY-03)
 * with detail.path = the resolved linkPath for that stage.
 *
 * Stage copy/links live in the static manifest in journey-manifest.ts (WAY-05).
 * Live-state counts (active version, traced requirements, untested rules, pending approvals)
 * arrive as numeric attributes from the React dashboard page (WAY-04).
 *
 * Property contract:
 *   workflow        — current workflow identifier (string); empty = no CTA rendered
 *   tenant-id       — active tenant ID (passed through for host use)
 *   active-version  — active ruleset version number (Number | null; null → "N/A" badge)
 *   traced-count    — number of requirements with at least one rule link (Number | null)
 *   untested-count  — number of rules with no test coverage (Number | null)
 *   pending-count   — number of pending approvals for this workflow (Number | null)
 *
 * Threat T-12-01: manifest copy is generic text — no secrets/PII.
 * Threat T-12-02: detail.path uses encodeURIComponent(workflow); navigation is SPA-internal.
 */
@customElement("mu-journey-home")
export class MuJourneyHome extends LitElement {
  @property({ attribute: "workflow" }) workflow = "";
  @property({ attribute: "tenant-id" }) tenantId = "";
  @property({ type: Number, attribute: "active-version" }) activeVersion: number | null = null;
  @property({ type: Number, attribute: "traced-count" }) tracedCount: number | null = null;
  @property({ type: Number, attribute: "untested-count" }) untestedCount: number | null = null;
  @property({ type: Number, attribute: "pending-count" }) pendingCount: number | null = null;

  /**
   * Resolves :workflow placeholder in linkPath and dispatches journey-stage-navigate.
   * composed:true is MANDATORY — the event must cross the shadow-DOM boundary so the
   * React host page's event listener receives it (Pitfall 4 in RESEARCH.md).
   */
  private _navigate(path: string): void {
    const resolved = path.replace(":workflow", encodeURIComponent(this.workflow));
    this.dispatchEvent(
      new CustomEvent("journey-stage-navigate", {
        detail: { path: resolved },
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * Returns the live-state value for a stage, or null if the stage has no liveStateKey
   * or the corresponding attribute has not been set.
   */
  private _liveValue(stage: JourneyStage): number | null {
    if (!stage.liveStateKey) return null;
    const val = this[stage.liveStateKey as keyof this];
    return val as number | null;
  }

  private _renderStageCard(stage: JourneyStage) {
    const liveVal = this._liveValue(stage);
    // Badge: render "N/A" when liveStateKey is defined but value is null (e.g. 403 for approvals);
    // render the number when a value is present; render nothing when stage has no liveStateKey.
    const badge =
      stage.liveStateKey !== undefined
        ? html`<span class="stage-badge">${liveVal === null ? "N/A" : liveVal}</span>`
        : nothing;

    return html`
      <div class="stage-card">
        <div class="stage-header">
          <span class="stage-icon" aria-hidden="true">${stage.icon}</span>
          <span class="stage-label">${stage.label}</span>
          ${badge}
        </div>
        <div class="before-after">
          <div class="before-panel">
            <strong class="panel-heading">${stage.beforeLabel}</strong>
            <p class="panel-text">${stage.beforeText}</p>
          </div>
          <div class="after-panel">
            <strong class="panel-heading">${stage.afterLabel}</strong>
            <p class="panel-text">${stage.afterText}</p>
          </div>
        </div>
        ${this.workflow
          ? html`<button
              class="stage-cta"
              @click=${() => this._navigate(stage.linkPath)}
            >${stage.linkLabel}</button>`
          : nothing}
      </div>
    `;
  }

  render() {
    return html`
      <div class="journey-grid">
        ${JOURNEY_STAGES.map((stage) => this._renderStageCard(stage))}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      font-family: system-ui, sans-serif;
      font-size: 14px; /* --mu-text-base */
      color: var(--mu-text-primary);
      background: var(--mu-surface-canvas);
    }

    /* ── Stage grid ─────────────────────────────────── */
    .journey-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--mu-space-lg, 24px);
      padding: var(--mu-space-lg, 24px);
    }

    /* ── Stage card ─────────────────────────────────── */
    .stage-card {
      display: flex;
      flex-direction: column;
      gap: var(--mu-space-md, 16px);
      padding: var(--mu-space-lg, 24px);
      background: var(--mu-surface-raised);
      border: 1px solid var(--mu-border-default);
      border-radius: var(--mu-radius-md, 8px);
    }

    /* ── Stage header row ───────────────────────────── */
    .stage-header {
      display: flex;
      align-items: center;
      gap: var(--mu-space-sm, 8px);
    }

    .stage-icon {
      font-size: 20px;
      line-height: 1;
      flex-shrink: 0;
    }

    .stage-label {
      font-size: 16px; /* --mu-text-md */
      font-weight: 600; /* --mu-font-semibold */
      line-height: 24px;
      color: var(--mu-text-primary);
      flex: 1;
    }

    .stage-badge {
      display: inline-block;
      padding: var(--mu-space-xs, 4px) var(--mu-space-sm, 8px);
      background: var(--mu-color-interactive);
      color: #ffffff;
      border-radius: var(--mu-radius-sm, 4px);
      font-size: 12px; /* --mu-text-sm */
      font-weight: 600;
      line-height: 16px;
      flex-shrink: 0;
    }

    /* ── Before / After panels ──────────────────────── */
    .before-after {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--mu-space-sm, 8px);
    }

    .before-panel,
    .after-panel {
      padding: var(--mu-space-sm, 8px);
      border-radius: var(--mu-radius-sm, 4px);
    }

    .before-panel {
      background: var(--mu-color-error-bg, #fff0f0);
      border-left: 3px solid var(--mu-color-error);
    }

    .after-panel {
      background: var(--mu-surface-canvas);
      border-left: 3px solid var(--mu-color-interactive);
    }

    .panel-heading {
      display: block;
      font-size: 12px; /* --mu-text-sm */
      font-weight: 600;
      color: var(--mu-text-muted);
      margin-bottom: var(--mu-space-xs, 4px);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .panel-text {
      margin: 0;
      font-size: 13px;
      line-height: 20px;
      color: var(--mu-text-primary);
    }

    /* ── CTA button ─────────────────────────────────── */
    .stage-cta {
      align-self: flex-start;
      margin-top: auto;
      padding: var(--mu-space-sm, 8px) var(--mu-space-md, 16px);
      background: var(--mu-color-interactive);
      color: #ffffff;
      border: none;
      border-radius: var(--mu-radius-sm, 4px);
      font-size: 14px; /* --mu-text-base */
      font-weight: 600;
      cursor: pointer;
      line-height: 20px;
    }

    .stage-cta:hover {
      opacity: 0.88;
    }

    .stage-cta:focus-visible {
      outline: 2px solid var(--mu-color-interactive);
      outline-offset: 2px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "mu-journey-home": MuJourneyHome;
  }
}
