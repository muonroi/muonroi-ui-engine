import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { MDecisionTableModel } from "../../models.js";
import tailwindStyles from "../../styles/tailwind.css?inline";

@customElement("mu-decision-table-list")
export class MuDecisionTableList extends LitElement {
  static styles = [unsafeCSS(tailwindStyles)];

  @property({ type: String, attribute: "api-base" })
  apiBase = "/api/v1/decision-tables";

  @property({ type: String, attribute: "editor-route" })
  editorRoute = "/decision-tables/editor";

  @state()
  private mTables: MDecisionTableModel[] = [];

  connectedCallback(): void {
    super.connectedCallback();
    void this.MLoad();
  }

  private async MLoad(): Promise<void> {
    const response = await fetch(`${this.apiBase.replace(/\/$/, "")}?page=1&pageSize=100`);
    if (!response.ok) {
      this.mTables = [];
      return;
    }

    const payload = (await response.json()) as { items?: MDecisionTableModel[] };
    this.mTables = payload.items ?? [];
  }

  private MOpenEditor(id?: string): void {
    const route = id ? `${this.editorRoute}?id=${encodeURIComponent(id)}` : this.editorRoute;
    window.location.href = route;
  }

  render() {
    return html`
      <section class="space-y-3 rounded-lg border border-[var(--color-mu-border)] bg-white p-4">
        <header class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">Decision Tables</h3>
          <button class="rounded bg-[var(--color-mu-primary)] px-3 py-1 text-sm text-white" @click=${() => this.MOpenEditor()}>
            New Table
          </button>
        </header>
        <ul class="space-y-2">
          ${this.mTables.map(
            (table) => html`
              <li class="flex items-center justify-between rounded border border-[var(--color-mu-border)] px-3 py-2">
                <div>
                  <div class="font-medium">${table.name}</div>
                  <div class="text-xs text-zinc-500">Version ${table.version}</div>
                </div>
                <button class="rounded border border-[var(--color-mu-border)] px-2 py-1 text-xs" @click=${() => this.MOpenEditor(table.id)}>
                  Open
                </button>
              </li>
            `
          )}
        </ul>
      </section>
    `;
  }
}

