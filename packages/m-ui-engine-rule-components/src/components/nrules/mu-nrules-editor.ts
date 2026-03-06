import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import tailwindStyles from "../../styles/tailwind.css?inline";

@customElement("mu-nrules-editor")
export class MuNrulesEditor extends LitElement {
  static styles = [unsafeCSS(tailwindStyles)];

  @property({ type: String, attribute: "api-base" })
  apiBase = "/api/v1/rule-engine/nrules";

  @property({ type: String, attribute: "test-endpoint" })
  testEndpoint = "/api/v1/rule-engine/test";

  @state()
  private mRuleName = "";

  @state()
  private mCondition = "";

  @state()
  private mAction = "";

  private MSave(): void {
    this.dispatchEvent(
      new CustomEvent("save", {
        detail: {
          name: this.mRuleName,
          condition: this.mCondition,
          action: this.mAction
        },
        bubbles: true,
        composed: true
      })
    );
  }

  private MTest(): void {
    this.dispatchEvent(new CustomEvent("validate", { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <section class="space-y-3 rounded-lg border border-[var(--color-mu-border)] bg-white p-4">
        <h3 class="text-lg font-semibold">NRules Editor</h3>
        <label class="block text-sm">
          Rule name
          <input class="mt-1 w-full rounded border border-[var(--color-mu-border)] px-2 py-1" .value=${this.mRuleName} @input=${(e: Event) => (this.mRuleName = (e.target as HTMLInputElement).value)} />
        </label>
        <div>
          <p class="mb-1 text-sm font-medium">Condition</p>
          <mu-nrules-condition .value=${this.mCondition} @condition-change=${(e: CustomEvent<string>) => (this.mCondition = e.detail)}></mu-nrules-condition>
        </div>
        <div>
          <p class="mb-1 text-sm font-medium">Action</p>
          <mu-nrules-action .value=${this.mAction} @action-change=${(e: CustomEvent<string>) => (this.mAction = e.detail)}></mu-nrules-action>
        </div>
        <div class="flex gap-2">
          <button class="rounded bg-[var(--color-mu-primary)] px-3 py-1 text-sm text-white" @click=${this.MSave}>Save</button>
          <button class="rounded border border-[var(--color-mu-border)] px-3 py-1 text-sm" @click=${this.MTest}>Run Test</button>
        </div>
      </section>
    `;
  }
}

