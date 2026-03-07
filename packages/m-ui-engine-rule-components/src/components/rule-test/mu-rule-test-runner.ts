import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { MRenderCommercialLicenseGate } from "../../license/m-commercial-guard.js";
import tailwindStyles from "../../styles/tailwind.css?inline";

const M_FEATURE_KEY = "rule-test-runner";

@customElement("mu-rule-test-runner")
export class MuRuleTestRunner extends LitElement {
  static styles = [unsafeCSS(tailwindStyles)];

  @property({ type: String, attribute: "test-endpoint" })
  testEndpoint = "";

  @state()
  private mPayload = '{"facts": []}';

  @state()
  private mResult = "";

  private async MRun(): Promise<void> {
    this.dispatchEvent(
      new CustomEvent("run", {
        detail: { payload: this.mPayload },
        bubbles: true,
        composed: true
      })
    );
    this.mResult = "Rule test request dispatched.";
  }

  render() {
    const licenseGate = MRenderCommercialLicenseGate(M_FEATURE_KEY);
    if (licenseGate) {
      return licenseGate;
    }

    return html`
      <section class="space-y-2 rounded-lg border border-[var(--color-mu-border)] bg-white p-4">
        <h3 class="text-base font-semibold">Rule Test Runner</h3>
        <textarea class="min-h-24 w-full rounded border border-[var(--color-mu-border)] p-2 text-xs" .value=${this.mPayload} @input=${(e: Event) => (this.mPayload = (e.target as HTMLTextAreaElement).value)}></textarea>
        <button class="rounded bg-[var(--color-mu-primary)] px-3 py-1 text-sm text-white" @click=${this.MRun}>Run Test</button>
        <pre class="rounded border border-[var(--color-mu-border)] bg-zinc-50 p-2 text-xs">${this.mResult}</pre>
      </section>
    `;
  }
}


