import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

/**
 * mu-ba-status-badge — plain-language status pill for BA workspace documents.
 *
 * Renders a host-supplied label with a semantic tone keyed to the variant.
 * Zero Vietnamese/Cát Lái strings are baked into this component (D-17/D-18).
 * The host passes the display label as the `label` attribute.
 *
 * Variant → tone mapping (per UI-SPEC §Color):
 *   active      → success  (--mu-color-success-bg / --mu-color-success-text)
 *   pending     → warning  (--mu-color-warning-bg / --mu-color-warning-text)
 *   draft       → info     (--mu-color-info-bg / --mu-color-info-text)
 *   approved    → info     (quiet blue)
 *   rejected    → error    (--mu-color-error-bg / --mu-color-error-text)
 *   superseded  → neutral  (--mu-surface-raised + --mu-text-muted)
 *   rolledback  → error
 *   unknown     → neutral
 *
 * An unmapped variant still renders the supplied label (never blank — D-07).
 *
 * Threat T-19-01: label text bound via Lit html`` interpolation (auto-escaped); no unsafeHTML.
 */
@customElement("mu-ba-status-badge")
export class MuBaStatusBadge extends LitElement {
  @property({ attribute: "variant" }) variant = "unknown";
  @property({ attribute: "label" }) label = "";

  render() {
    const cls = this._variantClass();
    return html`<span class="badge ${cls}">${this.label}</span>`;
  }

  private _variantClass(): string {
    switch (this.variant) {
      case "active":     return "badge--success";
      case "pending":    return "badge--warning";
      case "draft":      return "badge--info";
      case "approved":   return "badge--info";
      case "rejected":   return "badge--error";
      case "rolledback": return "badge--error";
      case "superseded": return "badge--neutral";
      case "unknown":
      default:           return "badge--neutral";
    }
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

    .badge--success {
      background: var(--mu-color-success-bg, #d1fae5);
      color: var(--mu-color-success-text, #065f46);
    }

    .badge--warning {
      background: var(--mu-color-warning-bg, #fef3c7);
      color: var(--mu-color-warning-text, #92400e);
    }

    .badge--info {
      background: var(--mu-color-info-bg, #dbeafe);
      color: var(--mu-color-info-text, #1e40af);
    }

    .badge--error {
      background: var(--mu-color-error-bg, #fee2e2);
      color: var(--mu-color-error-text, #991b1b);
    }

    .badge--neutral {
      background: var(--mu-surface-raised, #f8fafc);
      color: var(--mu-text-muted, #64748b);
      border: 1px solid var(--mu-border-default, #e2e8f0);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "mu-ba-status-badge": MuBaStatusBadge;
  }
}
