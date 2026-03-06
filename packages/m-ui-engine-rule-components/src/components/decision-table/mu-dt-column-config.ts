import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { MDecisionTableColumn } from "../../models.js";
import tailwindStyles from "../../styles/tailwind.css?inline";

@customElement("mu-dt-column-config")
export class MuDtColumnConfig extends LitElement {
  static styles = [unsafeCSS(tailwindStyles)];

  @property({ attribute: false })
  columns: MDecisionTableColumn[] = [];

  private MDeleteColumn(columnId: string): void {
    this.dispatchEvent(
      new CustomEvent<string>("delete-column", {
        detail: columnId,
        bubbles: true,
        composed: true
      })
    );
  }

  render() {
    return html`
      <section class="rounded-lg border border-[var(--color-mu-border)] bg-white p-3">
        <h4 class="mb-2 text-sm font-semibold">Column Settings</h4>
        <ul class="space-y-2">
          ${this.columns.map(
            (column) => html`
              <li class="flex items-center justify-between rounded border border-[var(--color-mu-border)] px-2 py-1 text-sm">
                <span>${column.label} <small class="text-zinc-500">(${column.dataType})</small></span>
                <button class="rounded bg-[var(--color-mu-danger)] px-2 py-1 text-xs text-white" @click=${() => this.MDeleteColumn(column.id)}>
                  Delete
                </button>
              </li>
            `
          )}
        </ul>
      </section>
    `;
  }
}

