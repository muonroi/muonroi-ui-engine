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
        class="sticky top-0 z-10 grid gap-2 bg-[var(--color-mu-surface)] pb-2"
        style=${`grid-template-columns: 72px repeat(${this.inputColumns.length + this.outputColumns.length}, minmax(180px, 1fr));`}
      >
        <div class="sticky left-0 z-20 flex items-center justify-center rounded border border-[var(--color-mu-border)] bg-zinc-100 text-xs font-semibold text-zinc-500">
          #
        </div>
        ${this.inputColumns.map(
          (column, index) => html`
            <div
              class="rounded border border-[var(--color-mu-border)] bg-blue-50 px-2 py-2 text-xs font-semibold uppercase tracking-wide"
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
              class="rounded border border-[var(--color-mu-border)] bg-emerald-50 px-2 py-2 text-xs font-semibold uppercase tracking-wide"
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

