import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { MDecisionTableColumn } from "../../models.js";
import tailwindStyles from "../../styles/tailwind.css?inline";

type ColumnKind = "input" | "output";

@customElement("mu-dt-header-row")
export class MuDtHeaderRow extends LitElement {
  static styles = [unsafeCSS(tailwindStyles)];

  @property({ attribute: false })
  inputColumns: MDecisionTableColumn[] = [];

  @property({ attribute: false })
  outputColumns: MDecisionTableColumn[] = [];

  @state()
  private mDragging?: { kind: ColumnKind; index: number };

  private MOnDragStart(kind: ColumnKind, index: number): void {
    this.mDragging = { kind, index };
  }

  private MOnDrop(kind: ColumnKind, index: number): void {
    if (!this.mDragging || this.mDragging.kind !== kind) {
      this.mDragging = undefined;
      return;
    }

    this.dispatchEvent(
      new CustomEvent<{ kind: ColumnKind; fromIndex: number; toIndex: number }>("column-reorder", {
        detail: {
          kind,
          fromIndex: this.mDragging.index,
          toIndex: index
        },
        bubbles: true,
        composed: true
      })
    );

    this.mDragging = undefined;
  }

  private MAllowDrop(event: DragEvent): void {
    event.preventDefault();
  }

  render() {
    return html`
      <div
        role="row"
        class="sticky top-0 z-10 grid bg-[var(--color-mu-surface)] pb-2"
        style=${`grid-template-columns: 72px repeat(${this.inputColumns.length + this.outputColumns.length}, minmax(180px, 1fr)); gap: var(--mu-space-sm);`}
      >
        <div
          role="columnheader"
          scope="col"
          aria-label="Row number"
          class="sticky left-0 z-20 flex items-center justify-center rounded border border-[var(--color-mu-border)] bg-[var(--color-mu-surface)] text-xs font-semibold text-zinc-500"
          style="min-height: 40px; padding: var(--mu-space-xs) var(--mu-space-sm);"
        >
          #
        </div>
        ${this.inputColumns.map(
          (column, index) => html`
            <div
              role="columnheader"
              scope="col"
              aria-label=${"Input: " + column.label}
              class="rounded border border-[var(--color-mu-border)] bg-blue-50 px-[var(--mu-space-sm)] py-[var(--mu-space-xs)] text-xs font-semibold uppercase tracking-wide"
              style="min-height: 40px; display: flex; align-items: center;"
              draggable="true"
              @dragstart=${() => this.MOnDragStart("input", index)}
              @dragover=${this.MAllowDrop}
              @drop=${() => this.MOnDrop("input", index)}
            >
              IN: ${column.label}
            </div>
          `
        )}
        ${this.outputColumns.map(
          (column, index) => html`
            <div
              role="columnheader"
              scope="col"
              aria-label=${"Output: " + column.label}
              class="rounded border border-[var(--color-mu-border)] bg-emerald-50 px-[var(--mu-space-sm)] py-[var(--mu-space-xs)] text-xs font-semibold uppercase tracking-wide"
              style="min-height: 40px; display: flex; align-items: center;"
              draggable="true"
              @dragstart=${() => this.MOnDragStart("output", index)}
              @dragover=${this.MAllowDrop}
              @drop=${() => this.MOnDrop("output", index)}
            >
              OUT: ${column.label}
            </div>
          `
        )}
      </div>
    `;
  }
}

