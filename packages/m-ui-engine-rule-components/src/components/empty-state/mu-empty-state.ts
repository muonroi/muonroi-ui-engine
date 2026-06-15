import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

/**
 * mu-empty-state — short empty-state block for BA workspace documents.
 *
 * Renders one host-supplied line + a single CTA button + an optional tooltip.
 * Zero Vietnamese/Cát Lái strings are baked into this component (D-17/D-18).
 * All copy arrives as attributes from the host (D-12/D-13).
 *
 * Attributes:
 *   message   — the primary empty-state line (string)
 *   cta-label — label for the single action button (string)
 *   tooltip   — optional tooltip bound to title on the container (string)
 *
 * Events:
 *   empty-cta — dispatched (bubbles:true, composed:true) when the CTA is clicked.
 *               Pitfall 5: composed MANDATORY to cross the shadow boundary.
 *
 * Threat T-19-01: message/cta-label bound via Lit html`` (auto-escaped); no unsafeHTML.
 */
@customElement("mu-empty-state")
export class MuEmptyState extends LitElement {
  @property({ attribute: "message" }) message = "";
  @property({ attribute: "cta-label" }) ctaLabel = "";
  @property({ attribute: "tooltip" }) tooltip = "";

  private _handleCta(): void {
    this.dispatchEvent(
      new CustomEvent("empty-cta", {
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      <div class="empty-state" title=${this.tooltip}>
        <p class="empty-message">${this.message}</p>
        <button class="cta" @click=${() => this._handleCta()}>
          ${this.ctaLabel}
        </button>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      font-family: system-ui, sans-serif;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--mu-space-xl, 32px);
      padding: var(--mu-space-2xl, 48px) var(--mu-space-lg, 24px);
      text-align: center;
    }

    .empty-message {
      margin: 0;
      font-size: 16px; /* --mu-text-md */
      font-weight: 600; /* --mu-font-semibold */
      line-height: 24px;
      color: var(--mu-text-primary);
    }

    .cta {
      padding: var(--mu-space-sm, 8px) var(--mu-space-md, 16px);
      background: var(--mu-color-interactive);
      color: var(--mu-text-on-accent, #ffffff);
      border: none;
      border-radius: var(--mu-radius-sm, 4px);
      font-size: 14px; /* --mu-text-base */
      font-weight: 600; /* --mu-font-semibold */
      cursor: pointer;
      line-height: 20px;
    }

    .cta:hover {
      opacity: 0.88;
    }

    .cta:focus-visible {
      outline: 2px solid var(--mu-color-interactive);
      outline-offset: 2px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "mu-empty-state": MuEmptyState;
  }
}
