import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { virtualize } from "@lit-labs/virtualizer/virtualize.js";
import type { TraceabilityMatrixRow } from "../../models/living-docs-models.js";
import { LivingDocsApiClient } from "../../services/living-docs-api.js";

type FilterCoverage = "all" | "none" | "dry-run-example-only" | "unit-test-linked";

interface RequirementGroup {
  /** The unique key for this group (requirement id or "__no_req__"). */
  requirementId: string;
  title: string;
  rows: TraceabilityMatrixRow[];
}

@customElement("mu-traceability-matrix")
export class MuTraceabilityMatrix extends LitElement {
  @property({ attribute: "api-base-url" }) apiBaseUrl = "";
  @property({ attribute: "tenant-id" }) tenantId = "";
  @property({ attribute: "workflow" }) workflow = "";
  @property({ type: Number, attribute: "version" }) version = 0;
  /** Pre-filter to a single rule node — the "trace this rule" jump target (D-11). */
  @property({ attribute: "filter-rule" }) filterRule = "";
  /** Coverage-state quick filter (D-10). Default "all" = no filter. */
  @property({ attribute: "filter-coverage" }) filterCoverage: FilterCoverage = "all";
  /**
   * Round-trip source-document reference (D-06 / TRACE-01, Phase 17). When this version was
   * produced from an ingested source document, the consumer passes the human-readable issue/page
   * key here and the component renders "Ingested from {sourceRef}". Null/empty ⇒ no provenance
   * surface (honest — a manually-authored / NL-copilot version shows NO fabricated source link).
   * Version-scoped (envelope-level), NOT per-node. Auto-populated from the matrix response when the
   * component fetches its own data, or set explicitly by the consumer.
   */
  @property({ attribute: "source-ref" }) sourceRef: string | null = null;
  /**
   * Tenant-internal source-document GUID (D-06). Carried for linking only — NEVER rendered raw
   * (T-17-16). sourceRef is the display field.
   */
  @property({ attribute: "source-document-id" }) sourceDocumentId: string | null = null;
  @property({ attribute: "auth-token" }) authToken = "";

  @state() private _rows: TraceabilityMatrixRow[] = [];
  @state() private _loading = false;
  @state() private _error: string | null = null;
  @state() private _activeCoverageFilter: FilterCoverage = "all";
  @state() private _apiClient: LivingDocsApiClient | null = null;

  connectedCallback() {
    super.connectedCallback();
    if (this.apiBaseUrl) {
      this._apiClient = new LivingDocsApiClient(this.apiBaseUrl, this.authToken);
    }
    if (this.apiBaseUrl && this.workflow && this.version) {
      void this._loadMatrix();
    }
  }

  updated(changed: Map<string, unknown>) {
    if ((changed.has("apiBaseUrl") || changed.has("authToken")) && this.apiBaseUrl) {
      this._apiClient = new LivingDocsApiClient(this.apiBaseUrl, this.authToken);
    }
    if (changed.has("filterCoverage")) {
      this._activeCoverageFilter = this.filterCoverage;
    }
    const needsLoad =
      changed.has("apiBaseUrl") ||
      changed.has("authToken") ||
      changed.has("workflow") ||
      changed.has("version");
    if (needsLoad && this.apiBaseUrl && this.workflow && this.version) {
      void this._loadMatrix();
    }
  }

  private async _loadMatrix(): Promise<void> {
    if (!this._apiClient || !this.workflow || !this.version) return;
    this._loading = true;
    this._error = null;
    try {
      const response = await this._apiClient.getTraceabilityMatrix(
        this.workflow,
        this.version
      );
      this._rows = response.rows;
      // D-06 / TRACE-01: surface the round-trip source-document provenance from the envelope
      // (version-scoped). Null for non-ingested versions ⇒ no provenance shown. A consumer that
      // sets source-ref explicitly takes precedence only when it has not been overwritten here.
      this.sourceRef = response.sourceRef ?? null;
      this.sourceDocumentId = response.sourceDocumentId ?? null;
    } catch (err) {
      this._error =
        err instanceof Error ? err.message : String(err);
      console.error(
        `[mu-traceability-matrix] _loadMatrix failed — workflow=${this.workflow} version=${this.version}: ${this._error}`,
        { stack: err instanceof Error ? err.stack?.split("\n").slice(0, 3) : undefined }
      );
    } finally {
      this._loading = false;
    }
  }

  /**
   * Maps a TestCoverageState string to the correct badge CSS class.
   * Three distinct, non-interchangeable mappings (C-02 honesty constraint).
   * DryRunExampleOnly MUST map to badge--info, NEVER badge--success.
   */
  private _coverageBadgeClass(state: string): string {
    switch (state) {
      case "UnitTestLinked":    return "badge--success";  // --mu-color-success-bg/text
      case "DryRunExampleOnly": return "badge--info";     // --mu-color-info-bg/text
      case "None":              return "badge--warning";  // --mu-color-warning-bg/text
      default:                  return "badge--warning";
    }
  }

  private _coverageBadgeLabel(state: string): string {
    switch (state) {
      case "UnitTestLinked":    return "Unit tested";
      case "DryRunExampleOnly": return "Example only";
      case "None":              return "No coverage";
      default:                  return "No coverage";
    }
  }

  private _coverageBadgeIcon(state: string): string {
    switch (state) {
      case "UnitTestLinked":    return "✓";   // ✓
      case "DryRunExampleOnly": return "◻";   // ◻
      case "None":              return "⚠";   // ⚠
      default:                  return "⚠";
    }
  }

  private _coverageBadgeTooltip(state: string): string {
    switch (state) {
      case "UnitTestLinked":
        return "Covered by automated unit test linked via [MExtractAsRule]";
      case "DryRunExampleOnly":
        return "Covered by a dry-run example input only — not an automated unit test";
      case "None":
        return "No test case or example linked to this rule";
      default:
        return "No test case or example linked to this rule";
    }
  }

  /**
   * Returns rows filtered by filterRule (nodeId match) and the active coverage filter.
   * Both filters can be active simultaneously (D-10, D-11).
   */
  private get _filteredRows(): TraceabilityMatrixRow[] {
    return this._rows.filter((row) => {
      if (this.filterRule && row.nodeId !== this.filterRule) return false;
      if (this._activeCoverageFilter === "none" && row.testCoverage.state !== "None")
        return false;
      if (
        this._activeCoverageFilter === "dry-run-example-only" &&
        row.testCoverage.state !== "DryRunExampleOnly"
      )
        return false;
      if (
        this._activeCoverageFilter === "unit-test-linked" &&
        row.testCoverage.state !== "UnitTestLinked"
      )
        return false;
      return true;
    });
  }

  /**
   * Groups filtered rows by requirement (D-09).
   * A row with multiple requirements appears under each of them.
   * Rows with no requirements appear under a synthetic "No requirement" group.
   */
  private get _groupedRows(): RequirementGroup[] {
    const map = new Map<string, RequirementGroup>();

    for (const row of this._filteredRows) {
      if (row.requirements.length === 0) {
        const key = "__no_req__";
        if (!map.has(key)) {
          map.set(key, { requirementId: key, title: "No requirement", rows: [] });
        }
        map.get(key)!.rows.push(row);
      } else {
        for (const req of row.requirements) {
          if (!map.has(req.id)) {
            map.set(req.id, {
              requirementId: req.id,
              title: req.title ?? req.id,
              rows: []
            });
          }
          map.get(req.id)!.rows.push(row);
        }
      }
    }

    return Array.from(map.values());
  }

  private _dispatchFilterChange(coverage: FilterCoverage) {
    this.dispatchEvent(
      new CustomEvent("matrix-filter-change", {
        detail: { coverage },
        bubbles: true,
        composed: true
      })
    );
  }

  private _setFilter(coverage: FilterCoverage) {
    this._activeCoverageFilter = coverage;
    this._dispatchFilterChange(coverage);
  }

  private _dispatchTraceRule(nodeId: string) {
    this.dispatchEvent(
      new CustomEvent("matrix-trace-rule", {
        detail: { nodeId },
        bubbles: true,
        composed: true
      })
    );
  }

  private _renderBadge(state: string) {
    const cls = this._coverageBadgeClass(state);
    const label = this._coverageBadgeLabel(state);
    const icon = this._coverageBadgeIcon(state);
    const tooltip = this._coverageBadgeTooltip(state);
    return html`
      <span
        class="badge ${cls}"
        title="${tooltip}"
        aria-label="${tooltip}"
      >${icon} ${label}</span>
    `;
  }

  private _renderRow(row: TraceabilityMatrixRow) {
    return html`
      <div class="matrix-row" role="row" key="${row.nodeId}">
        <div class="matrix-cell matrix-cell--node" role="cell">
          <span class="node-id">${row.nodeId}</span>
          <span class="node-title">${row.title}</span>
        </div>
        <div class="matrix-cell matrix-cell--type" role="cell">
          <span class="node-type">${row.nodeType}</span>
        </div>
        <div class="matrix-cell matrix-cell--coverage" role="cell">
          ${this._renderBadge(row.testCoverage.state)}
        </div>
        <div class="matrix-cell matrix-cell--actions" role="cell">
          <button
            class="trace-btn"
            aria-label="Trace rule ${row.title} in matrix"
            @click=${() => this._dispatchTraceRule(row.nodeId)}
          >&#x2197;</button>
        </div>
      </div>
    `;
  }

  /**
   * Builds a flat list of items representing the grouped row structure, where each
   * item is either a requirement-group header sentinel or a data row.
   * This flat list is passed to @lit-labs/virtualizer so the DOM is windowed
   * while requirement headers and rule rows all appear in sorted order (D-09).
   */
  private _buildVirtualItems(): Array<{ type: "header"; group: RequirementGroup } | { type: "row"; row: TraceabilityMatrixRow }> {
    const items: Array<{ type: "header"; group: RequirementGroup } | { type: "row"; row: TraceabilityMatrixRow }> = [];
    for (const group of this._groupedRows) {
      items.push({ type: "header", group });
      for (const row of group.rows) {
        items.push({ type: "row", row });
      }
    }
    return items;
  }

  render() {
    const virtualItems = this._buildVirtualItems();

    return html`
      <div class="matrix-wrapper">
        <div class="matrix-header">
          <span class="matrix-title">Traceability Matrix</span>
          <span class="matrix-count">${this._filteredRows.length} rule(s)</span>
        </div>

        <!-- D-06 / TRACE-01: round-trip source-document provenance (version-scoped). Rendered ONLY
             when sourceRef is present — a non-ingested version shows nothing (honest, T-17-14). -->
        ${this.sourceRef
          ? html`
              <div class="matrix-source-doc" role="note">
                <span class="matrix-source-doc__icon" aria-hidden="true">&#x1F517;</span>
                <span class="matrix-source-doc__label"
                  >Ingested from
                  <span class="matrix-source-doc__ref">${this.sourceRef}</span></span
                >
              </div>
            `
          : nothing}

        <!-- Coverage-state filter bar (D-10): "No coverage" is FIRST explicit filter -->
        <div class="filter-bar" role="group" aria-label="Coverage filter">
          <button
            class="filter-btn ${this._activeCoverageFilter === "all" ? "filter-btn--active" : ""}"
            @click=${() => this._setFilter("all")}
          >All</button>
          <button
            class="filter-btn ${this._activeCoverageFilter === "none" ? "filter-btn--active" : ""}"
            @click=${() => this._setFilter("none")}
          >No coverage</button>
          <button
            class="filter-btn ${this._activeCoverageFilter === "dry-run-example-only" ? "filter-btn--active" : ""}"
            @click=${() => this._setFilter("dry-run-example-only")}
          >Example only</button>
          <button
            class="filter-btn ${this._activeCoverageFilter === "unit-test-linked" ? "filter-btn--active" : ""}"
            @click=${() => this._setFilter("unit-test-linked")}
          >Unit tested</button>
        </div>

        ${this._error
          ? html`<div class="matrix-error">${this._error}</div>`
          : nothing}

        ${this._loading
          ? html`<div class="matrix-loading">Loading traceability matrix…</div>`
          : nothing}

        ${!this._loading && !this._error && this._filteredRows.length === 0
          ? html`
              <div class="matrix-empty">
                <strong>No traceability data</strong>
                <p>Add requirements and link rules in the traceability matrix to see coverage.</p>
              </div>
            `
          : nothing}

        ${!this._loading && this._filteredRows.length > 0
          ? html`
              <div class="matrix-colhead" role="row">
                <span class="matrix-th" role="columnheader">Rule</span>
                <span class="matrix-th" role="columnheader">Type</span>
                <span class="matrix-th" role="columnheader">Coverage</span>
                <span class="matrix-th" role="columnheader" aria-label="Actions"></span>
              </div>
              <div class="matrix-body" role="rowgroup" aria-label="Traceability matrix">
                ${virtualize({
                  items: virtualItems,
                  renderItem: (item) =>
                    item.type === "header"
                      ? html`
                          <div class="matrix-req-header" role="rowgroup">
                            <div class="matrix-req-title">
                              <span class="req-id">${item.group.requirementId}</span>
                              <span class="req-label">${item.group.title}</span>
                            </div>
                          </div>
                        `
                      : this._renderRow(item.row)
                })}
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
      font-size: 14px;
    }

    .matrix-wrapper {
      border: 1px solid var(--mu-border-subtle);
      border-radius: 8px;
      overflow: hidden;
    }

    .matrix-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: var(--mu-surface-raised);
      border-bottom: 1px solid var(--mu-border-subtle);
    }

    .matrix-title {
      font-weight: 600;
      font-size: 16px;
    }

    .matrix-count {
      font-size: 12px;
      color: var(--mu-text-muted);
    }

    /* Source-document provenance (D-06 / TRACE-01) — only rendered for ingested versions */
    .matrix-source-doc {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: var(--mu-color-info-bg, var(--mu-surface-raised));
      color: var(--mu-color-info-text, var(--mu-text-muted));
      border-bottom: 1px solid var(--mu-border-subtle);
      font-size: 13px;
    }

    .matrix-source-doc__icon {
      font-size: 13px;
    }

    .matrix-source-doc__ref {
      font-family: var(--mu-font-mono, monospace);
      font-weight: 600;
    }

    /* Filter bar (D-10) */
    .filter-bar {
      display: flex;
      gap: 8px;
      padding: 8px 16px;
      border-bottom: 1px solid var(--mu-border-subtle);
      flex-wrap: wrap;
    }

    .filter-btn {
      min-width: 44px;
      min-height: 44px;
      padding: 6px 14px;
      border: 1px solid var(--mu-border-default);
      border-radius: 6px;
      background: var(--mu-surface-base);
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      color: var(--mu-text-primary);
      transition: background 0.1s, border-color 0.1s;
    }

    .filter-btn:hover {
      background: var(--mu-surface-raised);
    }

    .filter-btn--active {
      border-color: var(--mu-color-interactive);
      background: var(--mu-color-interactive-subtle, var(--mu-surface-raised));
      color: var(--mu-color-interactive);
    }

    .filter-btn:focus-visible {
      outline: 2px solid var(--mu-color-interactive);
      outline-offset: 2px;
    }

    /* Error / loading / empty states */
    .matrix-error {
      padding: 8px 16px;
      background: var(--mu-color-error-bg);
      color: var(--mu-color-error-text);
      font-size: 13px;
    }

    .matrix-loading {
      padding: 24px 16px;
      text-align: center;
      color: var(--mu-text-muted);
      font-size: 13px;
    }

    .matrix-empty {
      padding: 32px 16px;
      text-align: center;
      color: var(--mu-text-muted);
    }

    .matrix-empty p {
      margin: 8px 0 0;
      font-size: 13px;
    }

    /* Virtualized scroll body. Use contain:content (layout/paint/style) NOT
       contain:strict — strict adds size containment, which collapses the
       element to height:0 when only max-height is set, giving the virtualizer
       a zero-height viewport so it renders no rows. content-containment keeps
       the perf isolation while letting the body size to its content up to
       max-height. */
    .matrix-body {
      max-height: 600px;
      overflow-y: auto;
      contain: content;
    }

    /* Shared 4-column grid template for the column header and every data row.
       The matrix uses CSS grid (not <table>) because @lit-labs/virtualizer
       forces display:block on its managed children, which collapses native
       table-cell column alignment. */
    .matrix-colhead,
    .matrix-row {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1.2fr) 64px;
      align-items: center;
      /* virtualizer positions items absolutely → without an explicit width a
         grid container shrinks to content and the fr tracks collapse. Force
         full width so columns line up with .matrix-colhead. */
      width: 100%;
      box-sizing: border-box;
    }

    .matrix-req-header {
      width: 100%;
      box-sizing: border-box;
    }

    /* Column header sits ABOVE the virtualized scroll body (not inside it):
       the virtualizer absolutely-positions its items from the scroller's top,
       which would overlap an in-scroller sticky header. Both use the same grid
       template + scrollbar-gutter so columns stay aligned. */
    .matrix-colhead {
      background: var(--mu-surface-raised);
      border-bottom: 1px solid var(--mu-border-subtle);
    }

    .matrix-th {
      padding: 8px 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
    }

    /* Requirement group header row (D-09) — spans the full width */
    .matrix-req-header {
      background: var(--mu-surface-canvas);
    }

    .matrix-req-title {
      padding: 10px 16px;
      border-bottom: 1px solid var(--mu-border-subtle);
    }

    .req-id {
      font-size: 11px;
      font-family: var(--mu-font-mono, monospace);
      color: var(--mu-text-muted);
      margin-right: 8px;
    }

    .req-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--mu-text-primary);
    }

    /* Matrix rows */
    .matrix-row {
      border-bottom: 1px solid var(--mu-border-subtle);
    }

    .matrix-row:hover {
      background: var(--mu-surface-raised);
    }

    .matrix-cell {
      padding: 8px 16px;
      vertical-align: middle;
    }

    .matrix-cell--node {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .node-id {
      font-family: var(--mu-font-mono, monospace);
      font-size: 11px;
      color: var(--mu-text-muted);
    }

    .node-title {
      font-size: 14px;
      color: var(--mu-text-primary);
    }

    .node-type {
      font-size: 11px;
      font-family: var(--mu-font-mono, monospace);
      color: var(--mu-text-muted);
    }

    /* Coverage badges (C-02 three-state — each class is distinct) */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }

    .badge--success {
      background: var(--mu-color-success-bg);
      color: var(--mu-color-success-text);
    }

    .badge--info {
      background: var(--mu-color-info-bg);
      color: var(--mu-color-info-text);
    }

    .badge--warning {
      background: var(--mu-color-warning-bg);
      color: var(--mu-color-warning-text);
    }

    /* Trace-rule action button */
    .trace-btn {
      min-width: 44px;
      min-height: 44px;
      padding: 6px;
      border: 1px solid var(--mu-border-default);
      border-radius: 4px;
      background: var(--mu-surface-base);
      cursor: pointer;
      font-size: 16px;
      color: var(--mu-color-interactive);
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .trace-btn:hover {
      background: var(--mu-surface-raised);
    }

    .trace-btn:focus-visible {
      outline: 2px solid var(--mu-color-interactive);
      outline-offset: 2px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "mu-traceability-matrix": MuTraceabilityMatrix;
  }
}
