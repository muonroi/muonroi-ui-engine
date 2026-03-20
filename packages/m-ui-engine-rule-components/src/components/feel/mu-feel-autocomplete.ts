import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import tailwindStyles from "../../styles/tailwind.css?inline";

@customElement("mu-feel-autocomplete")
export class MuFeelAutocomplete extends LitElement {
  static styles = [unsafeCSS(tailwindStyles)];

  @property({ attribute: false })
  suggestions: string[] = [];

  render() {
    if (this.suggestions.length === 0) {
      return html``;
    }

    return html`
      <ul class="max-h-48 overflow-auto rounded border border-[var(--color-mu-border)] bg-white p-1 text-xs">
        ${this.suggestions.map((item) => html`<li class="rounded px-2 py-1">${item}</li>`)}
      </ul>
    `;
  }
}

