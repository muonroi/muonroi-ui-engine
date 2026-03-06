import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { MDecisionTableModel } from "../../models.js";
import tailwindStyles from "../../styles/tailwind.css?inline";

@customElement("mu-dt-version-diff")
export class MuDtVersionDiff extends LitElement {
  static styles = [unsafeCSS(tailwindStyles)];

  @property({ type: Number, attribute: "left-version" })
  leftVersion = 0;

  @property({ type: Number, attribute: "right-version" })
  rightVersion = 0;

  @property({ attribute: false })
  leftTable: MDecisionTableModel | null = null;

  @property({ attribute: false })
  rightTable: MDecisionTableModel | null = null;

  private MRenderTable(table: MDecisionTableModel | null, side: "left" | "right") {
    if (!table) {
      return html`<div class="text-xs text-zinc-500">No snapshot selected.</div>`;
    }

    const columns = [...table.inputColumns, ...table.outputColumns];
    return html`
      <div class="overflow-auto">
        <table class="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th class="sticky left-0 z-10 border border-[var(--color-mu-border)] bg-zinc-100 px-2 py-1">#</th>
              ${columns.map((column) => html`<th class="border border-[var(--color-mu-border)] bg-zinc-100 px-2 py-1">${column.label}</th>`)}
            </tr>
          </thead>
          <tbody>
            ${table.rows.map((row, rowIndex) => {
              const values = [...row.inputCells.map((x) => x.expression), ...row.outputCells.map((x) => x.expression)];
              return html`
                <tr>
                  <td class="sticky left-0 z-10 border border-[var(--color-mu-border)] bg-white px-2 py-1">${rowIndex + 1}</td>
                  ${values.map(
                    (value, columnIndex) => html`
                      <td class="border border-[var(--color-mu-border)] px-2 py-1 ${this.MDiffClass(side, rowIndex, columnIndex, value)}">${value}</td>
                    `
                  )}
                </tr>
              `;
            })}
          </tbody>
        </table>
      </div>
    `;
  }

  private MDiffClass(side: "left" | "right", rowIndex: number, columnIndex: number, value: string): string {
    const leftValue = this.MValueAt(this.leftTable, rowIndex, columnIndex);
    const rightValue = this.MValueAt(this.rightTable, rowIndex, columnIndex);
    if (leftValue === rightValue) {
      return "";
    }

    if (side === "left") {
      return value ? "bg-red-50 text-red-700" : "bg-zinc-50";
    }

    return value ? "bg-emerald-50 text-emerald-700" : "bg-zinc-50";
  }

  private MValueAt(table: MDecisionTableModel | null, rowIndex: number, columnIndex: number): string {
    if (!table) {
      return "";
    }

    const row = table.rows[rowIndex];
    if (!row) {
      return "";
    }

    const inputCount = table.inputColumns.length;
    if (columnIndex < inputCount) {
      return row.inputCells[columnIndex]?.expression ?? "";
    }

    return row.outputCells[columnIndex - inputCount]?.expression ?? "";
  }

  render() {
    return html`
      <section class="grid gap-3 md:grid-cols-2">
        <article class="rounded-lg border border-[var(--color-mu-border)] bg-white p-3">
          <h4 class="mb-2 text-sm font-semibold">Version ${this.leftVersion || "A"}</h4>
          ${this.MRenderTable(this.leftTable, "left")}
        </article>
        <article class="rounded-lg border border-[var(--color-mu-border)] bg-white p-3">
          <h4 class="mb-2 text-sm font-semibold">Version ${this.rightVersion || "B"}</h4>
          ${this.MRenderTable(this.rightTable, "right")}
        </article>
      </section>
    `;
  }
}

