import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import tailwindStyles from "../../styles/tailwind.css?inline";

@customElement("mu-nrules-action")
export class MuNrulesAction extends LitElement {
  static styles = [unsafeCSS(tailwindStyles)];

  @property({ type: String })
  value = "";

  private MHandleInput(event: Event): void {
    const input = event.target as HTMLTextAreaElement;
    this.value = input.value;
    this.dispatchEvent(new CustomEvent<string>("action-change", { detail: this.value, bubbles: true, composed: true }));
  }

  render() {
    return html`<textarea class="min-h-24 w-full rounded border border-[var(--color-mu-border)] p-2 text-sm" .value=${this.value} @change=${this.MHandleInput}></textarea>`;
  }
}

