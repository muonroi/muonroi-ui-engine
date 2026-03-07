import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { MRenderCommercialLicenseGate } from "../../license/m-commercial-guard.js";
import { MFeelService } from "../../services/feel-service.js";
import tailwindStyles from "../../styles/tailwind.css?inline";

const M_FEATURE_KEY = "feel-playground";

@customElement("mu-feel-playground")
export class MuFeelPlayground extends LitElement {
  static styles = [unsafeCSS(tailwindStyles)];

  @property({ type: String, attribute: "evaluate-endpoint" })
  evaluateEndpoint = "/api/v1/feel/evaluate";

  @property({ type: String, attribute: "autocomplete-endpoint" })
  autocompleteEndpoint = "/api/v1/feel/autocomplete";

  @property({ type: String, attribute: "examples-endpoint" })
  examplesEndpoint = "/api/v1/feel/examples";

  @state()
  private mExpression = "";

  @state()
  private mContextJson = '{"amount": 120}';

  @state()
  private mResult = "";

  @state()
  private mSuggestions: string[] = [];

  @state()
  private mExamples: Record<string, string[]> = {};

  private mFeelService = this.MCreateFeelService();

  connectedCallback(): void {
    super.connectedCallback();
    void this.MLoadExamples();
  }

  protected updated(changed: Map<PropertyKey, unknown>): void {
    if (
      changed.has("evaluateEndpoint") ||
      changed.has("autocompleteEndpoint") ||
      changed.has("examplesEndpoint")
    ) {
      this.mFeelService = this.MCreateFeelService();
      void this.MLoadExamples();
    }
  }

  private MCreateFeelService(): MFeelService {
    return new MFeelService({
      evaluateEndpoint: this.evaluateEndpoint,
      autocompleteEndpoint: this.autocompleteEndpoint,
      examplesEndpoint: this.examplesEndpoint
    });
  }

  private async MLoadExamples(): Promise<void> {
    try {
      this.mExamples = await this.mFeelService.MExamples();
    } catch {
      this.mExamples = {};
    }
  }

  private async MEvaluate(): Promise<void> {
    try {
      const context = JSON.parse(this.mContextJson) as Record<string, unknown>;
      const response = await this.mFeelService.MEvaluate({
        expression: this.mExpression,
        context
      });

      this.mResult = JSON.stringify(response.result, null, 2);
      this.dispatchEvent(
        new CustomEvent("change", {
          detail: response,
          bubbles: true,
          composed: true
        })
      );
    } catch (error) {
      this.mResult = `Error: ${String(error)}`;
    }
  }

  private async MAutocomplete(): Promise<void> {
    try {
      const response = await this.mFeelService.MAutocomplete(this.mExpression);
      this.mSuggestions = response.suggestions;
    } catch {
      this.mSuggestions = [];
    }
  }

  render() {
    const licenseGate = MRenderCommercialLicenseGate(M_FEATURE_KEY);
    if (licenseGate) {
      return licenseGate;
    }

    const exampleGroups = Object.entries(this.mExamples);
    return html`
      <section class="space-y-3 rounded-lg border border-[var(--color-mu-border)] bg-white p-4">
        <h3 class="text-lg font-semibold">FEEL Playground</h3>
        <textarea
          class="min-h-20 w-full rounded border border-[var(--color-mu-border)] p-2 text-sm"
          .value=${this.mExpression}
          @input=${(e: Event) => (this.mExpression = (e.target as HTMLTextAreaElement).value)}
          placeholder="Enter FEEL expression"
        ></textarea>
        <textarea
          class="min-h-20 w-full rounded border border-[var(--color-mu-border)] p-2 text-xs"
          .value=${this.mContextJson}
          @input=${(e: Event) => (this.mContextJson = (e.target as HTMLTextAreaElement).value)}
          placeholder="JSON context"
        ></textarea>
        <div class="flex gap-2">
          <button class="rounded bg-[var(--color-mu-primary)] px-3 py-1 text-sm text-white" @click=${this.MEvaluate}>Evaluate</button>
          <button class="rounded border border-[var(--color-mu-border)] px-3 py-1 text-sm" @click=${this.MAutocomplete}>Autocomplete</button>
        </div>
        <mu-feel-autocomplete .suggestions=${this.mSuggestions}></mu-feel-autocomplete>
        <pre class="rounded border border-[var(--color-mu-border)] bg-zinc-50 p-2 text-xs">${this.mResult}</pre>

        ${exampleGroups.length === 0
          ? html``
          : html`<section class="space-y-2 rounded border border-[var(--color-mu-border)] bg-zinc-50 p-2 text-xs">
              <h4 class="font-semibold">Examples</h4>
              ${exampleGroups.map(
                ([group, examples]) => html`
                  <div>
                    <div class="font-medium">${group}</div>
                    <ul class="list-disc pl-5">
                      ${examples.map((item) => html`<li>${item}</li>`)}
                    </ul>
                  </div>
                `
              )}
            </section>`}
      </section>
    `;
  }
}


