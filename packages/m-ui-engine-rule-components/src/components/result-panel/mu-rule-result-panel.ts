import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { MValidationSummary, MRuleResult } from "../../models/result-models.js";

@customElement("mu-rule-result-panel")
export class MuRuleResultPanel extends LitElement {
  @property({ attribute: "result-json" }) resultJson = "";
  @property({ type: Boolean }) loading = false;

  @state() private _result: MValidationSummary | null = null;
  @state() private _showTrace = false;
  @state() private _expandedRule: string | null = null;

  updated(changed: Map<string, unknown>) {
    if (changed.has("resultJson") && this.resultJson) {
      try {
        this._result = JSON.parse(this.resultJson);
      } catch {
        this._result = null;
      }
    }
  }

  private get _failedRules(): MRuleResult[] {
    return this._result?.ruleResults.filter((r) => !r.isPass) ?? [];
  }

  private _toggleExpand(code: string) {
    this._expandedRule = this._expandedRule === code ? null : code;
  }

  render() {
    if (this.loading) {
      return html`
        <div class="loading">
          <div class="spinner"></div>
          <span>Validating...</span>
        </div>
      `;
    }

    if (!this._result) return nothing;

    return html`
      <div class="panel">
        <div
          class="header ${this._result.isAllPassed
            ? "header--pass"
            : "header--fail"}"
        >
          <span class="header-icon"
            >${this._result.isAllPassed ? "\u2713" : "\u26A0"}</span
          >
          <span class="header-text">
            ${this._result.isAllPassed
              ? "All validations passed"
              : `${this._failedRules.length} error(s) found`}
          </span>
          <span class="header-time">${this._result.totalElapsedMs}ms</span>
        </div>

        ${!this._showTrace
          ? html`
              ${this._failedRules.map(
                (rule) => html`
                  <div class="error-card">
                    <span class="error-icon">\u2717</span>
                    <div class="error-messages">
                      ${rule.errors.map((err) => html`<div>${err}</div>`)}
                    </div>
                  </div>
                `
              )}
              ${this._result.isAllPassed
                ? html`
                    <div class="success-card">
                      <span>\u2713</span>
                      <span>All ${this._result.totalRules} rules passed</span>
                    </div>
                  `
                : nothing}
              <button
                class="toggle-btn"
                @click=${() => {
                  this._showTrace = true;
                }}
              >
                View execution trace \u2192
              </button>
            `
          : html`
              <button
                class="toggle-btn"
                @click=${() => {
                  this._showTrace = false;
                }}
              >
                \u2190 Back to summary
              </button>
              <div class="trace-summary">
                ${this._result.totalRules} rules |
                ${this._result.passedCount} pass |
                ${this._result.failedCount} fail
              </div>
              ${this._result.ruleResults.map(
                (rule) => html`
                  <div
                    class="rule-row ${rule.isPass ? "" : "rule-row--fail"}"
                    @click=${() => this._toggleExpand(rule.ruleCode)}
                  >
                    <span class="rule-icon"
                      >${rule.isPass ? "\u2713" : "\u2717"}</span
                    >
                    <span class="rule-code">${rule.ruleCode}</span>
                  </div>
                  ${this._expandedRule === rule.ruleCode &&
                  rule.errors.length > 0
                    ? html`
                        <div class="rule-detail">
                          ${rule.errors.map(
                            (err) => html`<div>${err}</div>`
                          )}
                        </div>
                      `
                    : nothing}
                `
              )}
            `}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      overflow-y: auto;
      max-height: calc(100vh - 200px);
      font-family: system-ui, sans-serif;
      font-size: 14px;
    }
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      gap: 8px;
    }
    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid var(--mu-border-subtle);
      border-top-color: var(--mu-color-interactive);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    .panel {
      padding: 12px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 12px;
    }
    .header--pass {
      background: var(--mu-color-success-bg);
      border-left: 3px solid var(--mu-color-success-border);
    }
    .header--fail {
      background: var(--mu-color-error-bg);
      border-left: 3px solid var(--mu-color-error);
    }
    .header-icon {
      font-size: 16px;
    }
    .header-text {
      font-size: 13px;
      font-weight: 600;
      flex: 1;
    }
    .header--pass .header-text {
      color: var(--mu-color-success-text);
    }
    .header--fail .header-text {
      color: var(--mu-color-error-text);
    }
    .header-time {
      font-size: 11px;
      font-family: monospace;
      color: var(--mu-text-muted);
    }
    .error-card {
      display: flex;
      gap: 8px;
      padding: 8px 12px;
      margin-bottom: 8px;
      background: var(--mu-color-error-bg);
      border-left: 3px solid var(--mu-color-error-border);
      border-radius: 4px;
    }
    .error-icon {
      color: var(--mu-color-error);
    }
    .error-messages {
      font-size: 13px;
      color: var(--mu-text-muted);
    }
    .success-card {
      display: flex;
      gap: 8px;
      padding: 8px 12px;
      background: var(--mu-color-success-bg);
      border-left: 3px solid var(--mu-color-success-border);
      border-radius: 4px;
      font-size: 13px;
      color: var(--mu-color-success-text);
    }
    .toggle-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 8px;
      margin-top: 12px;
      border: none;
      background: none;
      color: var(--mu-text-muted);
      cursor: pointer;
      font-size: 12px;
    }
    .toggle-btn:hover {
      color: var(--mu-color-interactive);
    }
    .trace-summary {
      font-size: 12px;
      color: var(--mu-text-muted);
      margin-bottom: 8px;
    }
    .rule-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      margin-bottom: 2px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }
    .rule-row:hover {
      background: var(--mu-surface-raised);
    }
    .rule-row--fail {
      background: var(--mu-color-error-bg);
    }
    .rule-icon {
      font-size: 12px;
    }
    .rule-code {
      font-family: monospace;
      font-size: 12px;
    }
    .rule-detail {
      margin: 0 0 8px 28px;
      padding: 8px;
      background: var(--mu-surface-raised);
      border-radius: 4px;
      font-size: 12px;
      color: var(--mu-text-secondary);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "mu-rule-result-panel": MuRuleResultPanel;
  }
}
