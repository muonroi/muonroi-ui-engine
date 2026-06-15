import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import "../ba-status-badge/mu-ba-status-badge.js";
import "../source-badge/mu-source-badge.js";
import "../coverage-badge/mu-coverage-badge.js";

/**
 * mu-document-list — BA workspace document list.
 *
 * Renders one row per supplied workflow, a search slot, a pending-count chip
 * (null → "N/A", never "0" when null — D-06/honesty), and a single create CTA.
 *
 * Zero Vietnamese/Cát Lái strings are baked into this component (D-17/D-18).
 * All copy arrives as attributes. Row data arrives as a JSON string in the `rows` attribute.
 *
 * Attributes:
 *   rows               — JSON array of DocumentRow objects (string, parsed internally)
 *   pending-count      — Number | null; null renders "N/A" in the count chip
 *   pending-label      — label for the pending count chip (string)
 *   create-label       — label for the create CTA button (string)
 *   search-placeholder — placeholder passed into the search slot (string; informational)
 *   heading            — page heading text (string)
 *   empty              — Boolean; when true, rows are suppressed (host shows empty-state instead)
 *
 * Events:
 *   document-create — CTA clicked; no detail (bubbles:true, composed:true)
 *   document-open   — row clicked; detail: { path: string } (encodeURIComponent-safe)
 *
 * Composes mu-ba-status-badge, mu-source-badge, mu-coverage-badge per row.
 *
 * Threat T-20-01: all text bound via Lit html`` interpolation (auto-escaped); pendingLabel.replace()
 *   operates on a plain string then is interpolated — still escaped; no unsafeHTML (carried T-19-01).
 * Threat T-20-02: producer (DocumentsPage.tsx:59) name-only encodes the workflow segment; component
 *   dispatches openPath verbatim — no whole-path re-encoding (ASVS V5 trust boundary at producer).
 * Threat T-19-03: pending-count null → "N/A" (honesty; no sensitive data).
 */

export interface DocumentRow {
  workflowName: string;
  statusLabel: string;
  statusVariant: string;
  sourceLabel: string;
  covered: boolean;
  coverageLabel: string;
  coverageTooltip: string;
  openPath: string;
}

@customElement("mu-document-list")
export class MuDocumentList extends LitElement {
  @property({ attribute: "rows" }) rows = "";
  @property({ type: Number, attribute: "pending-count" }) pendingCount: number | null = null;
  @property({ attribute: "pending-label" }) pendingLabel = "";
  @property({ attribute: "create-label" }) createLabel = "";
  @property({ attribute: "search-placeholder" }) searchPlaceholder = "";
  @property({ attribute: "heading" }) heading = "";
  @property({ type: Boolean, attribute: "empty" }) empty = false;

  private get _parsedRows(): DocumentRow[] {
    if (!this.rows) return [];
    try {
      const parsed = JSON.parse(this.rows);
      return Array.isArray(parsed) ? (parsed as DocumentRow[]) : [];
    } catch {
      return [];
    }
  }

  private _dispatchCreate(): void {
    this.dispatchEvent(
      new CustomEvent("document-create", {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _dispatchOpen(openPath: string): void {
    // T-20-02: path safety is enforced at the producer (DocumentsPage.tsx:59 name-only encodes
    // the workflow segment via encodeURIComponent(workflowName)). Re-encoding the full path here
    // would turn "/" separators into "%2F", which react-router cannot match against "/documents/:workflow".
    // Component dispatches verbatim; consumer matches a fixed /documents/:workflow segment — no
    // external-URL navigation possible (ASVS V5 trust boundary held at the producer).
    this.dispatchEvent(
      new CustomEvent("document-open", {
        detail: { path: openPath },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _renderRow(row: DocumentRow) {
    return html`
      <button
        class="doc-row"
        @click=${() => this._dispatchOpen(row.openPath)}
      >
        <span class="doc-name">${row.workflowName}</span>
        <span class="doc-badges">
          <mu-ba-status-badge
            variant=${row.statusVariant}
            label=${row.statusLabel}
          ></mu-ba-status-badge>
          <mu-source-badge
            label=${row.sourceLabel}
          ></mu-source-badge>
          <mu-coverage-badge
            ?covered=${row.covered}
            label=${row.coverageLabel}
            tooltip=${row.coverageTooltip}
          ></mu-coverage-badge>
        </span>
      </button>
    `;
  }

  render() {
    const rows = this._parsedRows;
    // Nullable-numeric → "N/A" honesty pattern (mirrors mu-journey-home.ts:69-72)
    const countDisplay = this.pendingCount === null ? "N/A" : String(this.pendingCount);

    return html`
      <div class="doc-list">
        <div class="doc-list-header">
          ${this.heading
            ? html`<h2 class="doc-heading">${this.heading}</h2>`
            : nothing}
          ${this.pendingLabel
            ? html`<span class="pending-chip">${this.pendingLabel.replace("{n}", countDisplay)}</span>`
            : nothing}
          <button class="create-cta" @click=${() => this._dispatchCreate()}>
            ${this.createLabel}
          </button>
        </div>

        <slot name="search"></slot>

        ${!this.empty
          ? html`
              <div class="doc-rows">
                ${rows.map((row) => this._renderRow(row))}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      font-family: system-ui, sans-serif;
      font-size: 14px; /* --mu-text-base */
      color: var(--mu-text-primary);
      background: var(--mu-surface-canvas);
    }

    .doc-list {
      display: flex;
      flex-direction: column;
      gap: var(--mu-space-md, 16px);
      padding: var(--mu-space-lg, 24px);
    }

    .doc-list-header {
      display: flex;
      align-items: center;
      gap: var(--mu-space-sm, 8px);
      flex-wrap: wrap;
    }

    .doc-heading {
      margin: 0;
      font-size: 16px; /* --mu-text-md */
      font-weight: 600; /* --mu-font-semibold */
      line-height: 24px;
      color: var(--mu-text-primary);
      flex: 1;
    }

    .pending-chip {
      display: inline-block;
      padding: var(--mu-space-xs, 4px) var(--mu-space-sm, 8px);
      background: var(--mu-color-interactive);
      color: #ffffff;
      border-radius: var(--mu-radius-sm, 4px);
      font-size: 13px; /* --mu-text-sm */
      font-weight: 600;
      line-height: 20px;
    }

    .create-cta {
      padding: var(--mu-space-sm, 8px) var(--mu-space-md, 16px);
      background: var(--mu-color-interactive);
      color: var(--mu-text-on-accent, #ffffff);
      border: none;
      border-radius: var(--mu-radius-sm, 4px);
      font-size: 14px; /* --mu-text-base */
      font-weight: 600;
      cursor: pointer;
      line-height: 20px;
    }

    .create-cta:hover {
      opacity: 0.88;
    }

    .create-cta:focus-visible {
      outline: 2px solid var(--mu-color-interactive);
      outline-offset: 2px;
    }

    .doc-rows {
      display: flex;
      flex-direction: column;
      gap: var(--mu-space-sm, 8px);
    }

    .doc-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--mu-space-md, 16px);
      padding: var(--mu-space-md, 16px);
      background: var(--mu-surface-raised);
      border: 1px solid var(--mu-border-default);
      border-radius: var(--mu-radius-md, 8px);
      cursor: pointer;
      text-align: left;
      font-size: 14px;
      font-family: inherit;
      color: var(--mu-text-primary);
      width: 100%;
      box-sizing: border-box;
    }

    .doc-row:hover {
      border-color: var(--mu-color-interactive);
    }

    .doc-row:focus-visible {
      outline: 2px solid var(--mu-color-interactive);
      outline-offset: 2px;
    }

    .doc-name {
      flex: 1;
      font-weight: 400;
    }

    .doc-badges {
      display: flex;
      align-items: center;
      gap: var(--mu-space-sm, 8px);
      flex-shrink: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "mu-document-list": MuDocumentList;
  }
}
