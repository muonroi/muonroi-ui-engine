import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

/**
 * mu-source-badge — source/provenance chip for BA workspace documents.
 *
 * Renders a host-supplied label as a neutral info chip.
 * Zero Vietnamese/Cát Lái strings are baked into this component (D-17/D-18).
 * The host passes the display label as the `label` attribute.
 *
 * Style: neutral info family (--mu-color-info-bg / --mu-color-info-text) per UI-SPEC §Color.
 * Future provenance values (Phase 20) reuse the same neutral chip styling.
 *
 * Threat T-19-01: label text bound via Lit html`` interpolation (auto-escaped); no unsafeHTML.
 */
@customElement("mu-source-badge")
export class MuSourceBadge extends LitElement {
  @property({ attribute: "label" }) label = "";
  @property({ attribute: "variant" }) variant = "default";

  render() {
    return html`<span class="badge badge--source">${this.label}</span>`;
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

    .badge--source {
      background: var(--mu-color-info-bg, #dbeafe);
      color: var(--mu-color-info-text, #1e40af);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "mu-source-badge": MuSourceBadge;
  }
}
