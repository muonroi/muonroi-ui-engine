import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { MRenderCommercialLicenseGate } from "../../license/m-commercial-guard.js";
import tailwindStyles from "../../styles/tailwind.css?inline";

const M_FEATURE_KEY = "rule-flow-designer";

@customElement("mu-rule-flow-designer")
export class MuRuleFlowDesigner extends LitElement {
  static styles = [unsafeCSS(tailwindStyles)];

  @property({ type: String, attribute: "graph-json" })
  graphJson = "";

  render() {
    const licenseGate = MRenderCommercialLicenseGate(M_FEATURE_KEY);
    if (licenseGate) {
      return licenseGate;
    }

    return html`
      <section class="rounded-lg border border-[var(--color-mu-border)] bg-white p-4">
        <h3 class="mb-3 text-lg font-semibold">Rule Flow Designer</h3>
        <svg viewBox="0 0 480 180" class="h-52 w-full rounded border border-[var(--color-mu-border)] bg-zinc-50">
          <rect x="32" y="60" width="120" height="48" rx="10" fill="white" stroke="oklch(55% 0.2 250)" />
          <rect x="188" y="60" width="120" height="48" rx="10" fill="white" stroke="oklch(55% 0.2 250)" />
          <rect x="344" y="60" width="120" height="48" rx="10" fill="white" stroke="oklch(55% 0.2 250)" />
          <text x="50" y="88" font-size="12">Start</text>
          <text x="208" y="88" font-size="12">Decision</text>
          <text x="365" y="88" font-size="12">Action</text>
          <line x1="152" y1="84" x2="188" y2="84" stroke="oklch(55% 0.2 250)" stroke-width="2" />
          <line x1="308" y1="84" x2="344" y2="84" stroke="oklch(55% 0.2 250)" stroke-width="2" />
        </svg>
      </section>
    `;
  }
}


