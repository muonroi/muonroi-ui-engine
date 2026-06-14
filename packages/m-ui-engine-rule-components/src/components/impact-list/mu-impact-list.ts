import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { virtualize } from "@lit-labs/virtualizer/virtualize.js";
import type { ImpactListResponse, ImpactRow, UatCase } from "../../models/living-docs-models.js";
import { LivingDocsApiClient } from "../../services/living-docs-api.js";

@customElement("mu-impact-list")
export class MuImpactList extends LitElement {
  @property({ attribute: "api-base-url" }) apiBaseUrl = "";
  @property({ attribute: "tenant-id" }) tenantId = "";
  @property({ attribute: "workflow" }) workflow = "";
  @property({ type: Number, attribute: "from-version" }) fromVersion = 0;
  @property({ type: Number, attribute: "to-version" }) toVersion = 0;
  @property({ attribute: "auth-token" }) authToken = "";

  @state() private _data: ImpactListResponse | null = null;
  @state() private _loading = false;
  @state() private _error: string | null = null;
  @state() private _apiClient: LivingDocsApiClient | null = null;

  connectedCallback() {
    super.connectedCallback();
    if (this.apiBaseUrl) {
      this._apiClient = new LivingDocsApiClient(this.apiBaseUrl, this.authToken);
    }
    if (this.apiBaseUrl && this.workflow && this.fromVersion && this.toVersion) {
      void this._load();
    }
  }

  updated(changed: Map<string, unknown>) {
    if ((changed.has("apiBaseUrl") || changed.has("authToken")) && this.apiBaseUrl) {
      this._apiClient = new LivingDocsApiClient(this.apiBaseUrl, this.authToken);
    }
    const needsLoad =
      changed.has("apiBaseUrl") ||
      changed.has("authToken") ||
      changed.has("workflow") ||
      changed.has("fromVersion") ||
      changed.has("toVersion");
    if (needsLoad && this.apiBaseUrl && this.workflow && this.fromVersion && this.toVersion) {
      void this._load();
    }
  }

  private async _load(): Promise<void> {
    if (!this._apiClient || !this.workflow || !this.fromVersion || !this.toVersion) return;
    this._loading = true;
    this._error = null;
    try {
      const response = await this._apiClient.getImpactList(
        this.workflow,
        this.fromVersion,
        this.toVersion
      );
      this._data = response;
    } catch (err) {
      this._error =
        err instanceof Error ? err.message : String(err);
      console.error(
        `[mu-impact-list] _load failed — workflow=${this.workflow} from=${this.fromVersion} to=${this.toVersion}: ${this._error}`,
        { stack: err instanceof Error ? err.stack?.split("\n").slice(0, 3) : undefined }
      );
    } finally {
      this._loading = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Three-state coverage badge — COPIED VERBATIM from mu-traceability-matrix.ts
  // (C-01 / T-05-08 honesty constraint: DryRunExampleOnly -> badge--info, NEVER badge--success)
  // ---------------------------------------------------------------------------

  private _coverageBadgeClass(state: string): string {
    switch (state) {
      case "UnitTestLinked":    return "badge--success";  // --mu-color-success-bg/text
      case "DryRunExampleOnly": return "badge--info";     // --mu-color-info-bg/text  (NEVER success)
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
      case "UnitTestLinked":    return "✓";
      case "DryRunExampleOnly": return "◻";
      case "None":              return "⚠";
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

  private _renderBadge(state: string) {
    const cls     = this._coverageBadgeClass(state);
    const label   = this._coverageBadgeLabel(state);
    const icon    = this._coverageBadgeIcon(state);
    const tooltip = this._coverageBadgeTooltip(state);
    return html`
      <span class="badge ${cls}" title="${tooltip}" aria-label="${tooltip}"
      >${icon} ${label}</span>
    `;
  }

  // ---------------------------------------------------------------------------
  // Trace-jump: dispatch living-docs-node-trace-requested (C-05 / D-11)
  // ---------------------------------------------------------------------------

  private _dispatchTraceNode(nodeId: string) {
    this.dispatchEvent(
      new CustomEvent("living-docs-node-trace-requested", {
        detail: { nodeId },
        bubbles: true,
        composed: true
      })
    );
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  private _renderImpactRow(row: ImpactRow) {
    const approvers = row.requirements
      .map((r) => r.approver)
      .filter(Boolean)
      .join(", ");

    const testsToRerun = [
      row.testCoverage.exampleId ? `Example: ${row.testCoverage.exampleId}` : null,
      row.testCoverage.unitTestCode ? `Test: ${row.testCoverage.unitTestCode}` : null,
    ]
      .filter(Boolean)
      .join("; ");

    return html`
      <div class="impact-row" role="row">
        <div class="impact-cell impact-cell--rule" role="cell">
          <span class="node-id">${row.nodeId}</span>
          <span class="node-title">${row.title}</span>
        </div>
        <div class="impact-cell impact-cell--req" role="cell">
          ${row.requirements.length === 0
            ? html`<span class="muted">—</span>`
            : row.requirements.map(
                (r) => html`
                  <div class="req-entry">
                    <span class="req-title">${r.title ?? r.id}</span>
                    ${r.approver
                      ? html`<span class="req-approver">${r.approver}</span>`
                      : nothing}
                  </div>
                `
              )}
        </div>
        <div class="impact-cell impact-cell--tests" role="cell">
          ${this._renderBadge(row.testCoverage.state)}
          ${testsToRerun
            ? html`<span class="test-ref">${testsToRerun}</span>`
            : nothing}
        </div>
        <div class="impact-cell impact-cell--type" role="cell">
          <span class="impact-type">${row.impactType}</span>
        </div>
        <div class="impact-cell impact-cell--actions" role="cell">
          <button
            class="trace-btn"
            aria-label="Trace rule ${row.title} in matrix"
            @click=${() => this._dispatchTraceNode(row.nodeId)}
          >&#x2197;</button>
        </div>
      </div>
    `;
  }

  private _renderUatCase(c: UatCase) {
    return html`
      <div class="uat-case">
        <span class="uat-example-id">${c.exampleId}</span>
        <span class="uat-outcome uat-outcome--${c.expectedOutcome}">${c.expectedOutcome}</span>
        ${this._renderBadge(c.coverageBadge)}
      </div>
    `;
  }

  /**
   * Build a flat list for the virtualizer: alternating impact-row items and
   * uat-group + uat-case items. This avoids nested virtualizers while still
   * keeping the DOM windowed.
   */
  private _buildVirtualItems(): Array<
    | { type: "impact-row"; row: ImpactRow }
    | { type: "uat-group-header"; nodeId: string; title: string }
    | { type: "uat-case"; case_: UatCase; nodeId: string }
  > {
    if (!this._data) return [];
    const items: Array<
      | { type: "impact-row"; row: ImpactRow }
      | { type: "uat-group-header"; nodeId: string; title: string }
      | { type: "uat-case"; case_: UatCase; nodeId: string }
    > = [];

    for (const row of this._data.rows) {
      items.push({ type: "impact-row", row });
    }

    for (const group of this._data.uatChecklist) {
      items.push({ type: "uat-group-header", nodeId: group.nodeId, title: group.title });
      for (const c of group.cases) {
        items.push({ type: "uat-case", case_: c, nodeId: group.nodeId });
      }
    }

    return items;
  }

  render() {
    const virtualItems = this._buildVirtualItems();
    const rowCount = this._data?.rows.length ?? 0;

    return html`
      <div class="impact-wrapper">
        <div class="impact-header">
          <span class="impact-title">Impact Analysis</span>
          <span class="impact-count">${rowCount} affected rule(s)</span>
        </div>

        ${this._error
          ? html`<div class="impact-error">${this._error}</div>`
          : nothing}

        ${this._loading
          ? html`<div class="impact-loading">Loading impact analysis…</div>`
          : nothing}

        ${!this._loading && !this._error && this._data && rowCount === 0
          ? html`
              <div class="impact-empty">
                <strong>No impact detected</strong>
                <p>No rules changed behavior between the two selected versions.</p>
              </div>
            `
          : nothing}

        ${!this._loading && this._data && rowCount > 0
          ? html`
              <!-- Impact list section -->
              <div class="section-label">Affected Rules (D-05)</div>
              <div class="impact-colhead" role="row">
                <span class="impact-th" role="columnheader">Rule</span>
                <span class="impact-th" role="columnheader">Requirement / Approver</span>
                <span class="impact-th" role="columnheader">Tests to re-run</span>
                <span class="impact-th" role="columnheader">Impact type</span>
                <span class="impact-th" role="columnheader" aria-label="Actions"></span>
              </div>
              <div class="impact-body" role="rowgroup" aria-label="Impact list">
                ${virtualize({
                  items: virtualItems.filter((i) => i.type === "impact-row") as Array<{ type: "impact-row"; row: ImpactRow }>,
                  renderItem: (item) => this._renderImpactRow(item.row)
                })}
              </div>

              <!-- UAT checklist section (D-02) -->
              ${this._data.uatChecklist.length > 0
                ? html`
                    <div class="section-label">UAT Checklist (D-02)</div>
                    <div class="uat-body" aria-label="UAT checklist">
                      ${virtualize({
                        items: virtualItems.filter(
                          (i) => i.type === "uat-group-header" || i.type === "uat-case"
                        ) as Array<{ type: "uat-group-header"; nodeId: string; title: string } | { type: "uat-case"; case_: UatCase; nodeId: string }>,
                        renderItem: (item) =>
                          item.type === "uat-group-header"
                            ? html`
                                <div class="uat-group-header">
                                  <span class="uat-node-id">${item.nodeId}</span>
                                  <span class="uat-node-title">${item.title}</span>
                                </div>
                              `
                            : this._renderUatCase(item.case_)
                      })}
                    </div>
                  `
                : nothing}
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

    .impact-wrapper {
      border: 1px solid var(--mu-border-subtle);
      border-radius: 8px;
      overflow: hidden;
    }

    .impact-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: var(--mu-surface-raised);
      border-bottom: 1px solid var(--mu-border-subtle);
    }

    .impact-title {
      font-weight: 600;
      font-size: 16px;
    }

    .impact-count {
      font-size: 12px;
      color: var(--mu-text-muted);
    }

    .section-label {
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--mu-text-muted);
      background: var(--mu-surface-canvas);
      border-bottom: 1px solid var(--mu-border-subtle);
    }

    /* Error / loading / empty states */
    .impact-error {
      padding: 8px 16px;
      background: var(--mu-color-error-bg);
      color: var(--mu-color-error-text);
      font-size: 13px;
    }

    .impact-loading {
      padding: 24px 16px;
      text-align: center;
      color: var(--mu-text-muted);
      font-size: 13px;
    }

    .impact-empty {
      padding: 32px 16px;
      text-align: center;
      color: var(--mu-text-muted);
    }

    .impact-empty p {
      margin: 8px 0 0;
      font-size: 13px;
    }

    /* 5-column grid for impact list (D-05) */
    .impact-colhead,
    .impact-row {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(0, 2fr) minmax(0, 2fr) minmax(0, 1fr) 64px;
      align-items: center;
      width: 100%;
      box-sizing: border-box;
    }

    .impact-colhead {
      background: var(--mu-surface-raised);
      border-bottom: 1px solid var(--mu-border-subtle);
    }

    .impact-th {
      padding: 8px 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
    }

    .impact-body {
      max-height: 400px;
      overflow-y: auto;
      contain: content;
    }

    .impact-row {
      border-bottom: 1px solid var(--mu-border-subtle);
    }

    .impact-row:hover {
      background: var(--mu-surface-raised);
    }

    .impact-cell {
      padding: 8px 16px;
      vertical-align: middle;
    }

    .impact-cell--rule {
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

    .req-entry {
      display: flex;
      flex-direction: column;
      gap: 1px;
      margin-bottom: 4px;
    }

    .req-title {
      font-size: 13px;
      color: var(--mu-text-primary);
    }

    .req-approver {
      font-size: 11px;
      color: var(--mu-text-muted);
    }

    .muted {
      color: var(--mu-text-muted);
    }

    .test-ref {
      display: block;
      font-size: 11px;
      font-family: var(--mu-font-mono, monospace);
      color: var(--mu-text-muted);
      margin-top: 4px;
    }

    .impact-type {
      font-family: var(--mu-font-mono, monospace);
      font-size: 12px;
      color: var(--mu-text-primary);
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

    /* Coverage badges (C-01 three-state — each class is distinct) */
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

    /* UAT checklist (D-02) */
    .uat-body {
      max-height: 400px;
      overflow-y: auto;
      contain: content;
    }

    .uat-group-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--mu-surface-canvas);
      border-bottom: 1px solid var(--mu-border-subtle);
    }

    .uat-node-id {
      font-family: var(--mu-font-mono, monospace);
      font-size: 11px;
      color: var(--mu-text-muted);
    }

    .uat-node-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--mu-text-primary);
    }

    .uat-case {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 16px 6px 32px;
      border-bottom: 1px solid var(--mu-border-subtle);
    }

    .uat-example-id {
      font-family: var(--mu-font-mono, monospace);
      font-size: 11px;
      color: var(--mu-text-muted);
      min-width: 80px;
    }

    .uat-outcome {
      font-size: 12px;
      font-weight: 600;
      font-family: var(--mu-font-mono, monospace);
    }

    .uat-outcome--allow {
      color: var(--mu-color-success-text);
    }

    .uat-outcome--block {
      color: var(--mu-color-error-text);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "mu-impact-list": MuImpactList;
  }
}
