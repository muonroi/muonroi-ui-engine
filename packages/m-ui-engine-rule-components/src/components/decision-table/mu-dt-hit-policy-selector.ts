import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import tailwindStyles from "../../styles/tailwind.css?inline";

@customElement("mu-dt-hit-policy-selector")
export class MuDtHitPolicySelector extends LitElement {
  static styles = [unsafeCSS(tailwindStyles)];

  @property({ type: String, attribute: "value" })
  value = "First";

  private readonly mPolicies = ["First", "Collect", "Unique", "Any", "Priority"];

  private MHandleChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.value = select.value;
    this.dispatchEvent(
      new CustomEvent<string>("policy-change", {
        detail: this.value,
        bubbles: true,
        composed: true
      })
    );
  }

  render() {
    return html`
      <label class="inline-flex items-center gap-2 text-sm">
        <span class="font-semibold">Hit policy</span>
        <select
          class="rounded-md border border-[var(--color-mu-border)] bg-white px-2 py-1"
          .value=${this.value}
          @change=${this.MHandleChange}
        >
          ${this.mPolicies.map((policy) => html`<option value=${policy}>${policy}</option>`)}
        </select>
      </label>
    `;
  }
}

