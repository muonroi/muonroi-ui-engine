import { html, type TemplateResult } from "lit";
import { MLicenseVerifier } from "@muonroi/ui-engine-core";

const M_DEFAULT_PRICING_URL = "https://muonroi.com/pricing";

const M_PACKAGE_FEATURE_KEYS = [
  "ui-engine.rule-components",
  "rule-components",
  "rule-engine",
  "rules.runtime"
];

const M_FEATURE_ALIASES: Record<string, string[]> = {
  "decision-table": ["rule-components.decision-table"],
  "decision-table-list": ["rule-components.decision-table"],
  "nrules-editor": ["rule-components.nrules-editor"],
  "cep-window-config": ["rule-components.cep-window-config"],
  "feel-playground": ["rule-components.feel-playground"],
  "rule-flow-designer": ["rule-components.rule-flow-designer"],
  "rule-test-runner": ["rule-components.rule-test-runner"],
  "ui-engine-app": ["rule-components.ui-engine-app"]
};

export function MCanRenderCommercialFeature(featureKey: string): boolean {
  return MLicenseVerifier.hasAnyFeature(MResolveFeatureCandidates(featureKey));
}

export function MRenderCommercialLicenseGate(
  featureKey: string,
  pricingUrl = M_DEFAULT_PRICING_URL
): TemplateResult | null {
  if (MCanRenderCommercialFeature(featureKey)) {
    return null;
  }

  const license = MLicenseVerifier.current;
  const isExpired = license.reason === "expired";
  const title = isExpired ? "License expired" : "License required";
  const message = isExpired
    ? "Your Muonroi commercial license has expired."
    : "This component requires a Muonroi commercial license.";

  return html`
    <section class="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <h3 class="text-base font-semibold">${title}</h3>
      <p>${message}</p>
      <p class="text-xs">
        Feature: <code>${featureKey}</code>
        ${license.tier ? html`<span class="ml-2">Current tier: <strong>${license.tier}</strong></span>` : html``}
      </p>
      ${license.expiresAt
        ? html`<p class="text-xs">Expires at: ${license.expiresAt.toISOString()}</p>`
        : html``}
      <a href=${pricingUrl} target="_blank" rel="noopener" class="inline-block rounded bg-amber-900 px-3 py-1 text-xs text-white">
        Get a license
      </a>
    </section>
  `;
}

function MResolveFeatureCandidates(featureKey: string): string[] {
  const candidates = [
    ...M_PACKAGE_FEATURE_KEYS,
    featureKey,
    ...(M_FEATURE_ALIASES[featureKey] ?? [])
  ];

  return [...new Set(candidates.map((item) => item.trim()).filter((item) => item.length > 0))];
}
