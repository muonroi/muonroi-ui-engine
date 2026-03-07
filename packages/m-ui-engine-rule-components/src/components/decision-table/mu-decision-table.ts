import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { MDecisionTableModel, MDecisionTableVersionInfo } from "../../models.js";
import { MCreateDecisionTableStore, type MDecisionTableStore } from "../../store/decision-table-store.js";
import tailwindStyles from "../../styles/tailwind.css?inline";

const M_DEFAULT_API_BASE = "/api/v1/decision-tables";
const M_DEFAULT_HISTORY_ENDPOINT = `${M_DEFAULT_API_BASE}/{id}/versions`;
const M_DEFAULT_HISTORY_VERSION_ENDPOINT = `${M_DEFAULT_API_BASE}/{id}/versions/{v}`;

@customElement("mu-decision-table")
export class MuDecisionTable extends LitElement {
  static styles = [unsafeCSS(tailwindStyles)];

  @property({ type: String, attribute: "api-base" })
  apiBase = M_DEFAULT_API_BASE;

  @property({ type: String, attribute: "validate-endpoint" })
  validateEndpoint = "/api/v1/decision-tables/{id}/validate";

  @property({ type: String, attribute: "export-endpoint" })
  exportEndpoint = "/api/v1/decision-tables/{id}/export/{format}";

  @property({ type: String, attribute: "feel-endpoint" })
  feelEndpoint = "/api/v1/feel/autocomplete";

  @property({ type: String, attribute: "history-endpoint" })
  historyEndpoint = M_DEFAULT_HISTORY_ENDPOINT;

  @property({ type: String, attribute: "history-version-endpoint" })
  historyVersionEndpoint = M_DEFAULT_HISTORY_VERSION_ENDPOINT;

  @property({ type: String, attribute: "reorder-endpoint" })
  reorderEndpoint = "/api/v1/decision-tables/{id}/rows/reorder";

  @property({ type: Number, attribute: "max-rows" })
  maxRows = 1000;

  @property({ type: Boolean, attribute: "enable-version-diff" })
  enableVersionDiff = true;

  @property({ type: String, attribute: "table-id" })
  tableId = "";

  @state()
  private mTable: MDecisionTableModel | null = null;

  @state()
  private mValidationErrors: string[] = [];

  @state()
  private mValidationWarnings: string[] = [];

  @state()
  private mVersionHistory: MDecisionTableVersionInfo[] = [];

  @state()
  private mLeftVersion = 0;

  @state()
  private mRightVersion = 0;

  @state()
  private mLeftTable: MDecisionTableModel | null = null;

  @state()
  private mRightTable: MDecisionTableModel | null = null;

  @state()
  private mDiffLoading = false;

  @state()
  private mDiffError = "";

  @state()
  private mDragStartRowIndex = -1;

  @state()
  private mScrollTop = 0;

  private readonly mStore: MDecisionTableStore = MCreateDecisionTableStore();
  private mUnsubscribe?: () => void;
  private mVersionRequestId = 0;

  connectedCallback(): void {
    super.connectedCallback();
    this.mUnsubscribe = this.mStore.subscribe((state) => {
      this.mTable = state.table;
      this.mValidationErrors = state.validationErrors.map((x) => x.message);
      this.mValidationWarnings = state.validationWarnings;
      this.mVersionHistory = state.versionHistory;
    });

    void this.MInitializeAsync();
  }

  disconnectedCallback(): void {
    this.mUnsubscribe?.();
    this.mUnsubscribe = undefined;
    super.disconnectedCallback();
  }

  private async MInitializeAsync(): Promise<void> {
    const id = this.tableId || this.MGetTableIdFromQuery();
    if (id) {
      await this.mStore.getState().loadTable(id, this.apiBase);
    } else {
      await this.mStore.getState().loadFirstTable(this.apiBase);
    }

    await this.MLoadHistory();
  }

  private MGetTableIdFromQuery(): string {
    if (typeof window === "undefined") {
      return "";
    }

    return new URLSearchParams(window.location.search).get("id")?.trim() ?? "";
  }

  private MResolveErrorColumnIds(): string[] {
    if (!this.mTable || this.mValidationErrors.length === 0) {
      return [];
    }

    const allColumns = [...this.mTable.inputColumns, ...this.mTable.outputColumns];
    const ids = new Set<string>();
    for (const message of this.mValidationErrors) {
      for (const column of allColumns) {
        if (message.includes(`'${column.name}'`) || message.includes(column.label)) {
          ids.add(column.id);
        }
      }
    }

    return [...ids];
  }

  private MHandleCellChange(event: CustomEvent<{ rowId: string; columnId: string; value: string }>): void {
    this.mStore.getState().updateCell(event.detail.rowId, event.detail.columnId, event.detail.value);
  }

  private MHandlePolicyChange(event: CustomEvent<string>): void {
    this.mStore.getState().setHitPolicy(event.detail);
  }

  private MHandleColumnReorder(event: CustomEvent<{ kind: "input" | "output"; fromIndex: number; toIndex: number }>): void {
    this.mStore.getState().reorderColumns(event.detail.kind, event.detail.fromIndex, event.detail.toIndex);
  }

  private MHandleRowDragStart(event: CustomEvent<{ rowIndex: number }>): void {
    this.mDragStartRowIndex = event.detail.rowIndex;
  }

  private async MHandleRowDrop(event: CustomEvent<{ rowIndex: number }>): Promise<void> {
    if (this.mDragStartRowIndex < 0) {
      return;
    }

    await this.mStore
      .getState()
      .reorderRows(this.mDragStartRowIndex, event.detail.rowIndex, this.reorderEndpoint)
      .catch(() => undefined);

    this.mDragStartRowIndex = -1;
  }

  private MAddRow(): void {
    const table = this.mStore.getState().table;
    if (!table) {
      return;
    }

    if (table.rows.length >= this.maxRows) {
      return;
    }

    this.mStore.getState().addRow();
  }

  private MAddInputColumn(): void {
    this.mStore.getState().addColumn("input");
  }

  private MAddOutputColumn(): void {
    this.mStore.getState().addColumn("output");
  }

  private MDeleteColumn(event: CustomEvent<string>): void {
    this.mStore.getState().deleteColumn(event.detail);
  }

  private async MValidate(): Promise<void> {
    await this.mStore.getState().validate(this.validateEndpoint);
    this.dispatchEvent(new CustomEvent("validate", { bubbles: true, composed: true }));
  }

  private async MSave(): Promise<void> {
    await this.mStore.getState().saveTable(this.apiBase);
    await this.MLoadHistory();
    this.dispatchEvent(new CustomEvent("save", { bubbles: true, composed: true }));
  }

  private async MExport(format: string): Promise<void> {
    const blob = await this.mStore.getState().exportTable(this.exportEndpoint, format);
    this.dispatchEvent(
      new CustomEvent<{ format: string; blob: Blob }>("export", {
        detail: { format, blob },
        bubbles: true,
        composed: true
      })
    );
  }

  private async MLoadHistory(): Promise<void> {
    const tableId = this.mStore.getState().table?.id?.trim() ?? "";
    if (!tableId) {
      this.mLeftVersion = 0;
      this.mRightVersion = 0;
      this.mVersionHistory = [];
      this.mLeftTable = null;
      this.mRightTable = null;
      this.mDiffError = "";
      return;
    }

    await this.mStore.getState().loadHistory(this.MResolveHistoryEndpoint()).catch(() => undefined);
    if (this.mVersionHistory.length > 0) {
      const sorted = [...this.mVersionHistory].sort((left, right) => right.version - left.version);
      this.mLeftVersion = sorted[0]?.version ?? 0;
      this.mRightVersion = sorted[1]?.version ?? sorted[0]?.version ?? 0;
    } else {
      this.mLeftVersion = 0;
      this.mRightVersion = 0;
    }

    await this.MLoadSelectedVersions();
  }

  private MResolveHistoryEndpoint(): string {
    const trimmed = (this.historyEndpoint ?? "").trim();
    const apiBaseTrimmed = (this.apiBase ?? "").trim();
    if (trimmed && !(trimmed === M_DEFAULT_HISTORY_ENDPOINT && apiBaseTrimmed && apiBaseTrimmed !== M_DEFAULT_API_BASE)) {
      return trimmed;
    }

    return `${this.apiBase.replace(/\/$/, "")}/{id}/versions`;
  }

  private MResolveVersionEndpoint(): string {
    const explicit = (this.historyVersionEndpoint ?? "").trim();
    const apiBaseTrimmed = (this.apiBase ?? "").trim();
    if (
      explicit &&
      !(explicit === M_DEFAULT_HISTORY_VERSION_ENDPOINT && apiBaseTrimmed && apiBaseTrimmed !== M_DEFAULT_API_BASE)
    ) {
      return explicit;
    }

    const history = this.MResolveHistoryEndpoint();
    if (history.includes("{v}")) {
      return history;
    }

    return `${history.replace(/\/$/, "")}/{v}`;
  }

  private async MLoadSelectedVersions(): Promise<void> {
    const versionEndpoint = this.MResolveVersionEndpoint();
    const leftVersion = this.mLeftVersion;
    const rightVersion = this.mRightVersion;

    if (leftVersion <= 0 && rightVersion <= 0) {
      this.mLeftTable = null;
      this.mRightTable = null;
      this.mDiffError = "";
      return;
    }

    const requestId = ++this.mVersionRequestId;
    this.mDiffLoading = true;
    this.mDiffError = "";

    try {
      const leftPromise =
        leftVersion > 0 ? this.mStore.getState().loadVersionSnapshot(versionEndpoint, leftVersion) : Promise.resolve(null);
      const rightPromise =
        rightVersion > 0
          ? rightVersion === leftVersion
            ? leftPromise
            : this.mStore.getState().loadVersionSnapshot(versionEndpoint, rightVersion)
          : Promise.resolve(null);
      const [left, right] = await Promise.all([leftPromise, rightPromise]);
      if (requestId !== this.mVersionRequestId) {
        return;
      }

      this.mLeftTable = left?.table ?? null;
      this.mRightTable = right?.table ?? null;
    } catch (error) {
      if (requestId !== this.mVersionRequestId) {
        return;
      }

      this.mLeftTable = null;
      this.mRightTable = null;
      this.mDiffError = error instanceof Error ? error.message : "Failed to load version snapshots.";
    } finally {
      if (requestId === this.mVersionRequestId) {
        this.mDiffLoading = false;
      }
    }
  }

  private MHandleLeftVersionChange(event: Event): void {
    this.mLeftVersion = Number((event.target as HTMLSelectElement).value || 0);
    void this.MLoadSelectedVersions();
  }

  private MHandleRightVersionChange(event: Event): void {
    this.mRightVersion = Number((event.target as HTMLSelectElement).value || 0);
    void this.MLoadSelectedVersions();
  }

  private MOnScroll(event: Event): void {
    const element = event.currentTarget as HTMLDivElement;
    this.mScrollTop = element.scrollTop;
  }

  private MRenderRows(errorColumnIds: string[]) {
    if (!this.mTable) {
      return html``;
    }

    const rowHeight = 44;
    const viewportHeight = 420;
    const rows = this.mTable.rows;
    const startIndex = Math.max(0, Math.floor(this.mScrollTop / rowHeight) - 10);
    const endIndex = Math.min(rows.length, startIndex + 45);
    const visibleRows = rows.slice(startIndex, endIndex);
    const topSpacer = startIndex * rowHeight;
    const bottomSpacer = Math.max(0, rows.length * rowHeight - topSpacer - visibleRows.length * rowHeight);

    return html`
      <div class="max-h-[420px] overflow-auto" @scroll=${this.MOnScroll}>
        <div style=${`height:${topSpacer}px`}></div>
        <div class="space-y-2">
          ${visibleRows.map(
            (row, offset) => html`
              <mu-dt-data-row
                .row=${row}
                .rowIndex=${startIndex + offset}
                .inputColumns=${this.mTable?.inputColumns ?? []}
                .outputColumns=${this.mTable?.outputColumns ?? []}
                .feelEndpoint=${this.feelEndpoint}
                .errorColumnIds=${errorColumnIds}
                @row-cell-change=${this.MHandleCellChange}
                @row-drag-start=${this.MHandleRowDragStart}
                @row-drop=${this.MHandleRowDrop}
              ></mu-dt-data-row>
            `
          )}
        </div>
        <div style=${`height:${bottomSpacer}px`}></div>
      </div>
    `;
  }

  render() {
    if (!this.mTable) {
      return html`<div class="rounded-lg border border-dashed border-[var(--color-mu-border)] p-6 text-sm text-zinc-500">Loading decision table...</div>`;
    }

    const errorColumnIds = this.MResolveErrorColumnIds();
    const sortedHistory = [...this.mVersionHistory].sort((left, right) => right.version - left.version);

    return html`
      <section class="space-y-4 rounded-xl border border-[var(--color-mu-border)] bg-[var(--color-mu-surface)] p-4">
        <header class="flex flex-wrap items-center gap-2">
          <h3 class="text-lg font-semibold">${this.mTable.name}</h3>
          <mu-dt-hit-policy-selector .value=${this.mTable.hitPolicy} @policy-change=${this.MHandlePolicyChange}></mu-dt-hit-policy-selector>
          <button class="rounded bg-[var(--color-mu-primary)] px-3 py-1 text-sm text-white" @click=${this.MAddRow}>Add Row</button>
          <button class="rounded border border-[var(--color-mu-border)] px-3 py-1 text-sm" @click=${this.MAddInputColumn}>Add Input</button>
          <button class="rounded border border-[var(--color-mu-border)] px-3 py-1 text-sm" @click=${this.MAddOutputColumn}>Add Output</button>
          <button class="rounded border border-[var(--color-mu-border)] px-3 py-1 text-sm" @click=${this.MValidate}>Validate</button>
          <button class="rounded border border-[var(--color-mu-border)] px-3 py-1 text-sm" @click=${this.MSave}>Save</button>
          <button class="rounded border border-[var(--color-mu-border)] px-3 py-1 text-sm" @click=${() => this.MExport("json")}>Export JSON</button>
          <button class="rounded border border-[var(--color-mu-border)] px-3 py-1 text-sm" @click=${() => this.MExport("excel")}>Export Excel</button>
          <button class="rounded border border-[var(--color-mu-border)] px-3 py-1 text-sm" @click=${() => this.MExport("dmn")}>Export DMN</button>
        </header>

        <mu-dt-header-row
          .inputColumns=${this.mTable.inputColumns}
          .outputColumns=${this.mTable.outputColumns}
          @column-reorder=${this.MHandleColumnReorder}
        ></mu-dt-header-row>

        ${this.MRenderRows(errorColumnIds)}

        <div class="grid gap-3 lg:grid-cols-2">
          <mu-dt-column-config
            .columns=${[...this.mTable.inputColumns, ...this.mTable.outputColumns]}
            @delete-column=${this.MDeleteColumn}
          ></mu-dt-column-config>

          <aside class="space-y-2 rounded border border-[var(--color-mu-border)] bg-white p-3 text-sm">
            <h4 class="font-semibold">Validation panel</h4>
            <div>
              <div class="text-xs font-medium text-zinc-600">Errors</div>
              <ul class="list-disc pl-5 text-xs text-red-700">
                ${this.mValidationErrors.length === 0
                  ? html`<li>None</li>`
                  : this.mValidationErrors.map((error) => html`<li>${error}</li>`)}
              </ul>
            </div>
            <div>
              <div class="text-xs font-medium text-zinc-600">Warnings (gaps)</div>
              <ul class="list-disc pl-5 text-xs text-amber-700">
                ${this.mValidationWarnings.length === 0
                  ? html`<li>None</li>`
                  : this.mValidationWarnings.map((warning) => html`<li>${warning}</li>`)}
              </ul>
            </div>
          </aside>
        </div>

        ${!this.enableVersionDiff
          ? html``
          : html`
              <section class="space-y-2 rounded border border-[var(--color-mu-border)] bg-white p-3">
                <header class="flex flex-wrap items-center gap-2">
                  <h4 class="font-semibold">Version diff</h4>
                  ${this.mDiffLoading ? html`<span class="animate-pulse text-xs text-zinc-400">Loading...</span>` : html``}
                  ${this.mDiffError ? html`<span class="text-xs text-red-500">${this.mDiffError}</span>` : html``}
                  <button class="rounded border border-[var(--color-mu-border)] px-2 py-1 text-xs" @click=${this.MLoadHistory}>
                    Reload history
                  </button>
                  <label class="text-xs">
                    Left:
                    <select
                      class="rounded border border-[var(--color-mu-border)] px-1 py-0.5"
                      .value=${String(this.mLeftVersion)}
                      @change=${this.MHandleLeftVersionChange}
                    >
                      ${sortedHistory.map((item) => html`<option value=${item.version}>v${item.version} (${item.changeType})</option>`)}
                    </select>
                  </label>
                  <label class="text-xs">
                    Right:
                    <select
                      class="rounded border border-[var(--color-mu-border)] px-1 py-0.5"
                      .value=${String(this.mRightVersion)}
                      @change=${this.MHandleRightVersionChange}
                    >
                      ${sortedHistory.map((item) => html`<option value=${item.version}>v${item.version} (${item.changeType})</option>`)}
                    </select>
                  </label>
                </header>
                <mu-dt-version-diff
                  .leftVersion=${this.mLeftVersion}
                  .rightVersion=${this.mRightVersion}
                  .leftTable=${this.mLeftTable}
                  .rightTable=${this.mRightTable}
                ></mu-dt-version-diff>
              </section>
            `}
      </section>
    `;
  }
}
