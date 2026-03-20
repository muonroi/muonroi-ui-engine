import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { MDecisionTableColumn, MDecisionTableRow } from "../../models.js";
import tailwindStyles from "../../styles/tailwind.css?inline";

@customElement("mu-dt-data-row")
export class MuDtDataRow extends LitElement {
  static styles = [unsafeCSS(tailwindStyles)];

  @property({ attribute: false })
  row: MDecisionTableRow | null = null;

  @property({ attribute: false })
  inputColumns: MDecisionTableColumn[] = [];

  @property({ attribute: false })
  outputColumns: MDecisionTableColumn[] = [];

  @property({ type: Number, attribute: "row-index" })
  rowIndex = -1;

  @property({ type: String, attribute: "feel-endpoint" })
  feelEndpoint = "/api/v1/feel/autocomplete";

  @property({ attribute: false })
  errorColumnIds: string[] = [];

  private MHandleCellChange(event: CustomEvent<{ rowId: string; columnId: string; value: string }>): void {
    this.dispatchEvent(
      new CustomEvent("row-cell-change", {
        detail: event.detail,
        bubbles: true,
        composed: true
      })
    );
  }

  private MOnDragStart(): void {
    if (!this.row) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent<{ rowId: string; rowIndex: number }>("row-drag-start", {
        detail: { rowId: this.row.id, rowIndex: this.rowIndex },
        bubbles: true,
        composed: true
      })
    );
  }

  private MAllowDrop(event: DragEvent): void {
    event.preventDefault();
  }

  private MOnDrop(): void {
    if (!this.row) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent<{ rowId: string; rowIndex: number }>("row-drop", {
        detail: { rowId: this.row.id, rowIndex: this.rowIndex },
        bubbles: true,
        composed: true
      })
    );
  }

  render() {
    if (!this.row) {
      return html``;
    }

    const errorSet = new Set(this.errorColumnIds);
    return html`
      <div
        role="row"
        aria-rowindex=${this.rowIndex + 2}
        class="grid"
        style=${`grid-template-columns: 72px repeat(${this.inputColumns.length + this.outputColumns.length}, minmax(180px, 1fr)); gap: var(--mu-space-sm);`}
        @dragover=${this.MAllowDrop}
        @drop=${this.MOnDrop}
      >
        <button
          role="gridcell"
          aria-label=${"Drag to reorder row " + (this.rowIndex + 1)}
          class="flex cursor-grab items-center justify-center rounded border border-[var(--color-mu-border)] bg-zinc-50 text-xs text-zinc-500"
          style="min-height: 40px; padding: var(--mu-space-xs) var(--mu-space-sm);"
          draggable="true"
          @dragstart=${this.MOnDragStart}
        >
          ${this.row.order + 1}
        </button>

        ${this.row.inputCells.map((cell, index) => {
          const dataType = this.inputColumns[index]?.dataType ?? "string";
          const hasError = errorSet.has(cell.columnId);
          return html`
            <div role="gridcell" ?aria-invalid=${hasError}>
              <mu-dt-cell
                .rowId=${this.row?.id ?? ""}
                .columnId=${cell.columnId}
                .value=${cell.expression}
                .feelEndpoint=${this.feelEndpoint}
                .dataType=${dataType}
                .hasError=${hasError}
                @cell-change=${this.MHandleCellChange}
              ></mu-dt-cell>
              ${hasError ? html`<span style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;">Error in this cell</span>` : ""}
            </div>
          `;
        })}
        ${this.row.outputCells.map((cell) => {
          const hasError = errorSet.has(cell.columnId);
          return html`
            <div role="gridcell" ?aria-invalid=${hasError}>
              <mu-dt-cell
                .rowId=${this.row?.id ?? ""}
                .columnId=${cell.columnId}
                .value=${cell.expression}
                .hasError=${hasError}
                @cell-change=${this.MHandleCellChange}
              ></mu-dt-cell>
              ${hasError ? html`<span style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;">Error in this cell</span>` : ""}
            </div>
          `;
        })}
      </div>
    `;
  }
}

