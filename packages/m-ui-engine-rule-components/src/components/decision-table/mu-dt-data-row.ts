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
        class="grid gap-2"
        style=${`grid-template-columns: 72px repeat(${this.inputColumns.length + this.outputColumns.length}, minmax(180px, 1fr));`}
        @dragover=${this.MAllowDrop}
        @drop=${this.MOnDrop}
      >
        <button
          class="flex cursor-grab items-center justify-center rounded border border-[var(--color-mu-border)] bg-zinc-50 text-xs text-zinc-500"
          draggable="true"
          @dragstart=${this.MOnDragStart}
        >
          ${this.row.order + 1}
        </button>

        ${this.row.inputCells.map((cell, index) => {
          const dataType = this.inputColumns[index]?.dataType ?? "string";
          return html`
            <mu-dt-cell
              .rowId=${this.row?.id ?? ""}
              .columnId=${cell.columnId}
              .value=${cell.expression}
              .feelEndpoint=${this.feelEndpoint}
              .dataType=${dataType}
              .hasError=${errorSet.has(cell.columnId)}
              @cell-change=${this.MHandleCellChange}
            ></mu-dt-cell>
          `;
        })}
        ${this.row.outputCells.map((cell) => html`
          <mu-dt-cell
            .rowId=${this.row?.id ?? ""}
            .columnId=${cell.columnId}
            .value=${cell.expression}
            .hasError=${errorSet.has(cell.columnId)}
            @cell-change=${this.MHandleCellChange}
          ></mu-dt-cell>
        `)}
      </div>
    `;
  }
}

