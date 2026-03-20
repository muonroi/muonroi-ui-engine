import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import tailwindStyles from "../../styles/tailwind.css?inline";

@customElement("mu-upgrade-prompt")
export class MuUpgradePrompt extends LitElement {
  static styles = [unsafeCSS(tailwindStyles)];

  @property({ type: String, attribute: "required-tier" })
  requiredTier = "Professional";

  @property({ type: String, attribute: "capability-key" })
  capabilityKey = "";

  render() {
    return html`
      <section class="rounded-lg border border-[var(--color-mu-border)] bg-amber-50 p-4 text-sm">
        <h3 class="font-semibold">Upgrade required</h3>
        <p>
          Capability <strong>${this.capabilityKey || "rule-engine"}</strong> requires tier
          <strong>${this.requiredTier}</strong>.
        </p>
        <a href="/account/upgrade" class="mt-2 inline-block rounded bg-black px-3 py-1 text-xs text-white">Upgrade</a>
      </section>
    `;
  }
}

