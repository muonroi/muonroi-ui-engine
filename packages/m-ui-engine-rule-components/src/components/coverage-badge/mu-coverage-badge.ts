import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

/**
 * mu-coverage-badge — binary coverage pill + honest tooltip for BA workspace documents.
 *
 * Renders a host-supplied label with tone keyed to the `covered` boolean attribute.
 * Zero Vietnamese/Cát Lái strings are baked into this component (D-17/D-18).
 *
 * covered=true  → success family (--mu-color-success-bg / --mu-color-success-text)
 * covered=false → muted neutral (--mu-surface-raised + --mu-text-muted + --mu-border-default)
 *                 NEVER green for the untested state (D-08 honesty constraint).
 *
 * The `tooltip` attribute is bound to the native `title` attribute so the honest
 * distinction between dry-run examples and real unit-test coverage is always accessible.
 *
 * Threat T-19-01: label/tooltip text bound via Lit html`` interpolation (auto-escaped); no unsafeHTML.
 */
@customElement("mu-coverage-badge")
export class MuCoverageBadge extends LitElement {
  @property({ type: Boolean, attribute: "covered" }) covered = false;
  @property({ attribute: "label" }) label = "";
  @property({ attribute: "tooltip" }) tooltip = "";

  render() {
    const cls = this.covered ? "badge--covered" : "badge--uncovered";
    return html`<span class="badge ${cls}" title=${this.tooltip}>${this.label}</span>`;
  }

  static styles = css`
    :host {
      display: inline-block;
    }

    .badge {
      display: inline-block;
      padding: var(--mu-space-xs, 4px) var(--mu-space-sm, 8px);
      border-radius: var(--mu-radius-sm, 4px);
      font-size: 13px; /* --mu-text-sm */
      font-weight: 600; /* --mu-font-semibold */
      line-height: 20px;
    }

    .badge--covered {
      background: var(--mu-color-success-bg, #d1fae5);
      color: var(--mu-color-success-text, #065f46);
    }

    /* D-08: NEVER green for the untested state */
    .badge--uncovered {
      background: var(--mu-surface-raised, #f8fafc);
      color: var(--mu-text-muted, #64748b);
      border: 1px solid var(--mu-border-default, #e2e8f0);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "mu-coverage-badge": MuCoverageBadge;
  }
}
