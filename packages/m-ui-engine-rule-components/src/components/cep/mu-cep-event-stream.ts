import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import tailwindStyles from "../../styles/tailwind.css?inline";

@customElement("mu-cep-event-stream")
export class MuCepEventStream extends LitElement {
  static styles = [unsafeCSS(tailwindStyles)];

  @property({ attribute: false })
  events: Array<{ key: string; timestampUtc: string }> = [];

  render() {
    return html`
      <ul class="space-y-1 rounded border border-[var(--color-mu-border)] bg-zinc-50 p-2 text-xs">
        ${this.events.map((event) => html`<li><strong>${event.key}</strong> - ${event.timestampUtc}</li>`)}
      </ul>
    `;
  }
}

