import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { LivingDocModel } from "../../models/living-docs-models.js";
import { LivingDocsApiClient } from "../../services/living-docs-api.js";

/**
 * mu-living-docs — BA-facing living document viewer.
 *
 * Renders LivingDocModel sections as readable prose blocks.
 * Each node carries a "trace this rule" button that dispatches
 * `living-docs-node-trace-requested` (composed, bubbling) with { nodeId: string }.
 *
 * Property contract (UI-01):
 *   api-base-url  — base URL for the living-docs read API
 *   tenant-id     — active tenant ID (passed through to API client)
 *   workflow      — workflow identifier
 *   version       — rule version (Number)
 *   doc-json      — optional: pre-fetched doc JSON (bypasses API call)
 *   read-only     — always true for this phase (default true)
 *
 * Threat T-04-04: LogicProse rendered via Lit text interpolation (auto-escaped, not unsafeHTML).
 * Threat T-04-05: fetch failures set _error (no silent catch).
 */
@customElement("mu-living-docs")
export class MuLivingDocs extends LitElement {
  @property({ attribute: "api-base-url" }) apiBaseUrl = "";
  @property({ attribute: "tenant-id" }) tenantId = "";
  @property({ attribute: "workflow" }) workflow = "";
  @property({ type: Number, attribute: "version" }) version = 0;
  @property({ attribute: "doc-json" }) docJson = "";
  @property({ type: Boolean, attribute: "read-only" }) readOnly = true;

  @state() private _doc: LivingDocModel | null = null;
  @state() private _loading = false;
  @state() private _error: string | null = null;

  private _apiClient: LivingDocsApiClient | null = null;

  connectedCallback() {
    super.connectedCallback();
    if (this.apiBaseUrl) {
      this._apiClient = new LivingDocsApiClient(this.apiBaseUrl);
    }
    if (!this.docJson && this.apiBaseUrl && this.workflow && this.version) {
      void this._loadDoc();
    }
  }

  updated(changed: Map<string, unknown>) {
    // Handle doc-json bypass — parse pre-fetched JSON directly (no API call needed)
    if (changed.has("docJson") && this.docJson) {
      try {
        this._doc = JSON.parse(this.docJson) as LivingDocModel;
        this._error = null;
      } catch (err) {
        this._error = err instanceof Error ? err.message : String(err);
        console.error(`[mu-living-docs] Failed to parse doc-json: ${this._error}`);
      }
      return;
    }

    // Update API client when base URL changes
    if (changed.has("apiBaseUrl") && this.apiBaseUrl) {
      this._apiClient = new LivingDocsApiClient(this.apiBaseUrl);
    }

    // Trigger fetch when any relevant property changes (and no doc-json bypass)
    const triggerKeys = ["apiBaseUrl", "workflow", "version"];
    const shouldFetch = triggerKeys.some((k) => changed.has(k));
    if (shouldFetch && !this.docJson && this.apiBaseUrl && this.workflow && this.version) {
      void this._loadDoc();
    }
  }

  private async _loadDoc(): Promise<void> {
    if (!this._apiClient || !this.workflow || !this.version) return;
    this._loading = true;
    this._error = null;
    try {
      this._doc = await this._apiClient.getLivingDoc(this.workflow, this.version);
    } catch (err) {
      // Threat T-04-05: error is surfaced in the render tree — never swallowed silently
      this._error = err instanceof Error ? err.message : String(err);
      console.error(
        `[mu-living-docs] _loadDoc failed — workflow=${this.workflow} version=${this.version}: ${this._error}`
      );
    } finally {
      this._loading = false;
    }
  }

  /**
   * Dispatches living-docs-node-trace-requested (composed + bubbling) so the React host page
   * can switch to the Matrix tab and pre-filter by nodeId (D-11).
   */
  private _dispatchNodeTraceRequested(nodeId: string): void {
    this.dispatchEvent(
      new CustomEvent("living-docs-node-trace-requested", {
        detail: { nodeId },
        bubbles: true,
        composed: true
      })
    );
  }

  render() {
    if (this._loading) {
      return html`<div class="ld-loading">Loading...</div>`;
    }

    if (this._error) {
      return html`<div class="ld-error" role="alert">
        Could not load the living doc. Check your connection and try again.
        <span class="ld-error__detail">${this._error}</span>
      </div>`;
    }

    if (!this._doc || this._doc.sections.length === 0) {
      return html`
        <div class="ld-empty">
          <h2 class="ld-empty__heading">No living doc generated yet</h2>
          <p class="ld-empty__body">
            Edit a rule to trigger the first generation, or check that the generator
            subscription is enabled.
          </p>
        </div>
      `;
    }

    return html`
      <div class="ld-viewer">
        ${this._doc.sections.map(
          (section) => html`
            <div class="ld-node" data-node-id=${section.nodeId}>
              <div class="ld-node__header">
                <h3 class="ld-node__title">${section.title}</h3>
                <button
                  class="node-trace-btn"
                  aria-label="Trace rule ${section.title} in matrix"
                  title="Trace rule ${section.title} in matrix"
                  @click=${() => this._dispatchNodeTraceRequested(section.nodeId)}
                >
                  &#x2934;
                </button>
              </div>
              <p class="ld-node__prose">${section.logicProse}</p>
            </div>
          `
        )}
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

    /* ── Loading ─────────────────────────────────────── */
    .ld-loading {
      padding: var(--mu-space-md, 16px);
      color: var(--mu-text-muted);
    }

    /* ── Error state ─────────────────────────────────── */
    .ld-error {
      padding: var(--mu-space-md, 16px);
      background: var(--mu-color-error-bg);
      color: var(--mu-color-error-text);
      border-left: 4px solid var(--mu-color-error);
    }
    .ld-error__detail {
      display: block;
      font-size: 12px; /* --mu-text-sm */
      margin-top: var(--mu-space-xs, 4px);
      font-family: var(--mu-font-mono, monospace);
      opacity: 0.8;
    }

    /* ── Empty state ─────────────────────────────────── */
    .ld-empty {
      padding: var(--mu-space-xl, 32px) var(--mu-space-lg, 24px);
      text-align: center;
      color: var(--mu-text-muted);
    }
    .ld-empty__heading {
      font-size: 16px; /* --mu-text-md */
      font-weight: 600; /* --mu-font-semibold */
      line-height: 24px;
      margin: 0 0 var(--mu-space-sm, 8px) 0;
      color: var(--mu-text-primary);
    }
    .ld-empty__body {
      font-size: 14px; /* --mu-text-base */
      line-height: 24px;
      margin: 0;
    }

    /* ── Viewer shell ────────────────────────────────── */
    .ld-viewer {
      padding: var(--mu-space-lg, 24px);
      display: flex;
      flex-direction: column;
      gap: var(--mu-space-xl, 32px);
    }

    /* ── Node block ──────────────────────────────────── */
    .ld-node {
      border: 1px solid var(--mu-border-subtle);
      border-radius: 8px;
      padding: var(--mu-space-md, 16px);
      background: var(--mu-surface-raised);
    }
    .ld-node__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--mu-space-sm, 8px);
    }
    .ld-node__title {
      font-size: 16px; /* --mu-text-md */
      font-weight: 600; /* --mu-font-semibold */
      line-height: 24px;
      margin: 0;
      color: var(--mu-text-primary);
    }

    /* ── Trace button — 44×44 touch target (A11Y) ────── */
    .node-trace-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      min-height: 44px;
      border: none;
      background: transparent;
      color: var(--mu-color-interactive);
      font-size: 18px;
      cursor: pointer;
      border-radius: 4px;
      padding: var(--mu-space-xs, 4px);
      flex-shrink: 0;
    }
    .node-trace-btn:hover {
      background: var(--mu-color-interactive-subtle, var(--mu-surface-raised));
    }
    .node-trace-btn:focus-visible {
      outline: 2px solid var(--mu-color-interactive);
      outline-offset: 2px;
    }

    /* ── Prose ───────────────────────────────────────── */
    .ld-node__prose {
      font-size: 14px; /* --mu-text-base */
      line-height: 24px;
      margin: 0;
      color: var(--mu-text-secondary, var(--mu-text-primary));
      white-space: pre-wrap;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "mu-living-docs": MuLivingDocs;
  }
}
