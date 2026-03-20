import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import tailwindStyles from "../../styles/tailwind.css?inline";

@customElement("mu-quota-indicator")
export class MuQuotaIndicator extends LitElement {
  static styles = [unsafeCSS(tailwindStyles)];

  @property({ type: Number, attribute: "used" })
  used = 0;

  @property({ type: Number, attribute: "limit" })
  limit = 100;

  render() {
    const ratio = this.limit <= 0 ? 0 : Math.min(100, Math.round((this.used / this.limit) * 100));
    return html`
      <section class="space-y-1 rounded border border-[var(--color-mu-border)] bg-white p-3 text-xs">
        <div class="flex items-center justify-between">
          <span>Quota usage</span>
          <strong>${this.used}/${this.limit}</strong>
        </div>
        <div class="h-2 overflow-hidden rounded bg-zinc-100">
          <div class="h-full bg-[var(--color-mu-primary)]" style=${`width:${ratio}%`}></div>
        </div>
      </section>
    `;
  }
}

