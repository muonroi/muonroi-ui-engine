import { MPrimeNgRenderAdapter } from "@muonroi/ui-engine-primeng";
import type { MUiEngineComponent } from "@muonroi/ui-engine-core";

export class MPrimeNgRuleComponentsAdapter extends MPrimeNgRenderAdapter {
  constructor(componentMap?: Record<string, string>) {
    super({
      "decision-table-editor": "mu-decision-table",
      "decision-table-list": "mu-decision-table-list",
      "nrules-editor": "mu-nrules-editor",
      "cep-window-config": "mu-cep-window-config",
      "feel-playground": "mu-feel-playground",
      "rule-flow-designer": "mu-rule-flow-designer",
      ...(componentMap ?? {})
    });
  }
}

export function MMapRuleComponentToTag(componentType: string): string {
  const map: Record<string, string> = {
    "decision-table-editor": "mu-decision-table",
    "decision-table-list": "mu-decision-table-list",
    "nrules-editor": "mu-nrules-editor",
    "cep-window-config": "mu-cep-window-config",
    "feel-playground": "mu-feel-playground",
    "rule-flow-designer": "mu-rule-flow-designer"
  };

  return map[componentType] ?? `mu-${componentType}`;
}

export function MRenderRuleComponentMarkup(component: MUiEngineComponent): string {
  const tag = MMapRuleComponentToTag(component.componentType);
  const attrs = Object.entries(component.props ?? {})
    .map(([key, value]) => `${MToKebabCase(key)}="${MEscapeAttribute(value)}"`)
    .join(" ");

  return `<${tag} ${attrs}></${tag}>`;
}

function MToKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
}

function MEscapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
