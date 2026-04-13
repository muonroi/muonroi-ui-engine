import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { MRuleTracePhase } from "../../models/trace-models.js";
import type { MRuleTraceEntry } from "../../models/trace-models.js";
import { MRuleTraceApiClient } from "../../services/trace-api.js";

const PHASE_LABELS = ["BeforeEval", "AfterEval", "AfterExec", "Error", "Compensate"];
/**
 * CSS class suffixes for phase badge colors — mapped via .trace-phase--* CSS rules
 * using design token vars instead of hardcoded hex.
 */
const PHASE_CLASS_SUFFIXES = ["before-eval", "after-eval", "after-exec", "error", "compensate"];

@customElement("mu-rule-trace-viewer")
export class MuRuleTraceViewer extends LitElement {
  @property({ attribute: "api-base-url" }) apiBaseUrl = "";
  @property({ attribute: "tenant-id" }) tenantId = "";
  @property({ attribute: "correlation-id" }) correlationId = "";
  @property({ type: Boolean, attribute: "read-only" }) readOnly = false;
  @property({ attribute: "traces-json" }) tracesJson = "";

  @state() private _traces: MRuleTraceEntry[] = [];
  @state() private _loading = false;
  @state() private _error: string | null = null;
  @state() private _expandedIds = new Set<string>();
  @state() private _phaseFilter: MRuleTracePhase | "all" = "all";
  @state() private _successFilter: "all" | "success" | "failure" = "all";

  @state() private _apiClient: MRuleTraceApiClient | null = null;

  connectedCallback() {
    super.connectedCallback();
    if (this.apiBaseUrl) {
      this._apiClient = new MRuleTraceApiClient(this.apiBaseUrl);
    }
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has("tracesJson") && this.tracesJson) {
      try {
        this._traces = JSON.parse(this.tracesJson);
      } catch {
        /* ignore parse errors */
      }
    }
    if (changed.has("apiBaseUrl") && this.apiBaseUrl) {
      this._apiClient = new MRuleTraceApiClient(this.apiBaseUrl);
    }
  }

  async loadTraces() {
    if (!this._apiClient || !this.tenantId) return;
    this._loading = true;
    this._error = null;
    try {
      this._traces = await this._apiClient.mQueryTraces(this.tenantId, {
        correlationId: this.correlationId || undefined,
      });
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err);
    } finally {
      this._loading = false;
    }
  }

  async enableDebugger(minutes = 30) {
    if (!this._apiClient || !this.tenantId) return;
    await this._apiClient.mEnableDebugger(this.tenantId, {
      durationMinutes: minutes,
    });
  }

  async disableDebugger() {
    if (!this._apiClient || !this.tenantId) return;
    await this._apiClient.mDisableDebugger(this.tenantId);
  }

  private _phaseLabel(phase: MRuleTracePhase): string {
    return PHASE_LABELS[phase] ?? "Unknown";
  }

  private _phaseClassSuffix(phase: MRuleTracePhase): string {
    return PHASE_CLASS_SUFFIXES[phase] ?? "before-eval";
  }

  private get _filteredTraces(): MRuleTraceEntry[] {
    return this._traces.filter((t) => {
      if (this._phaseFilter !== "all" && t.phase !== this._phaseFilter)
        return false;
      if (this._successFilter === "success" && !t.isSuccess) return false;
      if (this._successFilter === "failure" && t.isSuccess) return false;
      return true;
    });
  }

  private _toggleExpand(traceId: string) {
    const next = new Set(this._expandedIds);
    if (next.has(traceId)) next.delete(traceId);
    else next.add(traceId);
    this._expandedIds = next;
  }

  private _formatJson(json: string | null | undefined): string {
    if (!json) return "\u2014";
    try {
      return JSON.stringify(JSON.parse(json), null, 2);
    } catch {
      return json;
    }
  }

  render() {
    return html`
      <div class="trace-viewer">
        <div class="trace-header">
          <span class="trace-title">Execution Traces</span>
          ${this._apiClient
            ? html`
                <button
                  @click=${() => this.loadTraces()}
                  ?disabled=${this._loading}
                >
                  ${this._loading ? "Loading..." : "Refresh"}
                </button>
              `
            : nothing}
        </div>

        <div class="trace-filters">
          <select
            @change=${(e: Event) => {
              const val = (e.target as HTMLSelectElement).value;
              this._phaseFilter =
                val === "all" ? "all" : (Number(val) as MRuleTracePhase);
            }}
          >
            <option value="all">All Phases</option>
            ${[0, 1, 2, 3, 4].map(
              (p) => html`
                <option value=${p}>
                  ${this._phaseLabel(p as MRuleTracePhase)}
                </option>
              `
            )}
          </select>
          <select
            @change=${(e: Event) => {
              this._successFilter = (e.target as HTMLSelectElement).value as
                | "all"
                | "success"
                | "failure";
            }}
          >
            <option value="all">All</option>
            <option value="success">Pass</option>
            <option value="failure">Fail</option>
          </select>
          <span class="trace-count">${this._filteredTraces.length} traces</span>
        </div>

        ${this._error
          ? html`<div class="trace-error">${this._error}</div>`
          : nothing}

        <div class="trace-list">
          ${this._filteredTraces.map(
            (trace) => html`
              <div
                class="trace-row ${trace.isSuccess ? "" : "trace-row--fail"}"
                @click=${() => this._toggleExpand(trace.traceId)}
              >
                <span
                  class="trace-phase trace-phase--${this._phaseClassSuffix(trace.phase)}"
                >
                  ${this._phaseLabel(trace.phase)}
                </span>
                <span class="trace-rule">${trace.ruleName}</span>
                <span class="trace-elapsed">${trace.elapsedMs}ms</span>
                <span class="trace-icon"
                  >${trace.isSuccess ? "\u2713" : "\u2717"}</span
                >
              </div>
              ${this._expandedIds.has(trace.traceId)
                ? html`
                    <div class="trace-detail">
                      ${trace.failureReason
                        ? html`
                            <div class="trace-detail__error">
                              <strong>Failure:</strong> ${trace.failureReason}
                            </div>
                          `
                        : nothing}
                      ${trace.changedFactKeys?.length
                        ? html`
                            <div class="trace-detail__changed">
                              <strong>Changed facts:</strong>
                              ${trace.changedFactKeys.join(", ")}
                            </div>
                          `
                        : nothing}
                      <div class="trace-detail__facts">
                        <div>
                          <strong>Input Facts:</strong>
                          <pre>${this._formatJson(trace.inputFactsJson)}</pre>
                        </div>
                        <div>
                          <strong>Output Facts:</strong>
                          <pre>${this._formatJson(trace.outputFactsJson)}</pre>
                        </div>
                      </div>
                    </div>
                  `
                : nothing}
            `
          )}
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      font-family: system-ui, sans-serif;
      font-size: 14px;
    }
    .trace-viewer {
      border: 1px solid var(--mu-border-subtle);
      border-radius: 8px;
      overflow: hidden;
    }
    .trace-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: var(--mu-surface-raised);
      border-bottom: 1px solid var(--mu-border-subtle);
    }
    .trace-title {
      font-weight: 600;
      font-size: 14px;
    }
    .trace-filters {
      display: flex;
      gap: 8px;
      padding: 8px 16px;
      border-bottom: 1px solid var(--mu-border-subtle);
      align-items: center;
    }
    .trace-filters select {
      padding: 4px 8px;
      border: 1px solid var(--mu-border-default);
      border-radius: 4px;
      font-size: 12px;
    }
    .trace-count {
      margin-left: auto;
      font-size: 12px;
      color: var(--mu-text-muted);
    }
    .trace-error {
      padding: 8px 16px;
      background: var(--mu-color-error-bg);
      color: var(--mu-color-error-text);
      font-size: 12px;
    }
    .trace-list {
      max-height: 600px;
      overflow-y: auto;
    }
    .trace-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      cursor: pointer;
      border-bottom: 1px solid var(--mu-border-subtle);
    }
    .trace-row:hover {
      background: var(--mu-surface-raised);
    }
    .trace-row--fail {
      background: var(--mu-color-error-bg);
    }
    .trace-phase {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      color: white;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }
    /* Phase badge colors using semantic tokens */
    .trace-phase--before-eval {
      background: var(--mu-node-condition);
    }
    .trace-phase--after-eval {
      background: var(--mu-color-interactive);
    }
    .trace-phase--after-exec {
      background: var(--mu-color-success-text);
    }
    .trace-phase--error {
      background: var(--mu-color-error);
    }
    .trace-phase--compensate {
      background: var(--mu-color-warning);
    }
    .trace-rule {
      flex: 1;
      font-family: monospace;
      font-size: 13px;
    }
    .trace-elapsed {
      font-size: 12px;
      color: var(--mu-text-muted);
      font-family: monospace;
    }
    .trace-icon {
      font-size: 14px;
    }
    .trace-detail {
      padding: 8px 16px 8px 40px;
      background: var(--mu-surface-raised);
      border-bottom: 1px solid var(--mu-border-subtle);
    }
    .trace-detail__error {
      color: var(--mu-color-error-text);
      margin-bottom: 8px;
      font-size: 13px;
    }
    .trace-detail__changed {
      margin-bottom: 8px;
      font-size: 12px;
      color: var(--mu-color-success-text);
    }
    .trace-detail__facts {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .trace-detail__facts pre {
      font-size: 11px;
      background: var(--mu-surface-canvas);
      color: var(--mu-text-primary);
      padding: 8px;
      border-radius: 4px;
      overflow-x: auto;
      max-height: 200px;
    }
    button {
      padding: 6px 12px;
      border: 1px solid var(--mu-border-default);
      border-radius: 4px;
      background: var(--mu-surface-base);
      cursor: pointer;
      font-size: 12px;
    }
    button:hover {
      background: var(--mu-surface-raised);
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "mu-rule-trace-viewer": MuRuleTraceViewer;
  }
}
