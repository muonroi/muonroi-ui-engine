import { describe, expect, it } from "vitest";
import type { MUiEngineCatalogBinding, MUiEngineCatalogRuleDescriptor } from "../src/contracts.js";

const rules: MUiEngineCatalogRuleDescriptor[] = [
  {
    code: "FCD_VALIDATE_LINER",
    name: "ValidateLinerRule",
    order: 1,
    dependsOn: [],
    hookPoint: "BeforeRule",
    ruleType: "Validation",
    contextType: "FcdCreateContext",
    source: "code-first",
    isEnabled: true,
    isCompensatable: false
  },
  {
    code: "FCD_VALIDATE_TAXCODE",
    name: "ValidateTaxCodeRule",
    order: 2,
    dependsOn: ["FCD_VALIDATE_LINER"],
    hookPoint: "BeforeRule",
    ruleType: "Validation",
    contextType: "FcdCreateContext",
    source: "code-first",
    isEnabled: true,
    isCompensatable: false
  }
];

const bindings: MUiEngineCatalogBinding[] = [
  {
    endpointRoute: "/api/v2/full-container/delivery/create",
    httpMethod: "POST",
    contextType: "FcdCreateContext",
    workflowName: "fcd-create-runtime-full",
    rules: [
      { code: "FCD_VALIDATE_LINER", order: 1, hookPoint: "BeforeRule" },
      { code: "FCD_VALIDATE_TAXCODE", order: 2, hookPoint: "BeforeRule" }
    ]
  }
];

function hasDependencyCycle(
  orderedCodes: readonly string[],
  byCode: Readonly<Record<string, MUiEngineCatalogRuleDescriptor>>
): boolean {
  const selected = new Set(orderedCodes);
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (code: string): boolean => {
    if (visited.has(code)) {
      return false;
    }

    if (visiting.has(code)) {
      return true;
    }

    visiting.add(code);
    const descriptor = byCode[code];
    if (descriptor) {
      for (const dependency of descriptor.dependsOn) {
        if (!selected.has(dependency)) {
          continue;
        }

        if (visit(dependency)) {
          return true;
        }
      }
    }

    visiting.delete(code);
    visited.add(code);
    return false;
  };

  for (const code of orderedCodes) {
    if (visit(code)) {
      return true;
    }
  }

  return false;
}

describe("bindings parity", () => {
  it("ensures every binding rule exists in rule descriptors", () => {
    const known = new Set(rules.map((x) => x.code));
    for (const binding of bindings) {
      for (const rule of binding.rules) {
        expect(known.has(rule.code)).toBe(true);
      }
    }
  });

  it("ensures dependencies reference valid codes", () => {
    const known = new Set(rules.map((x) => x.code));
    for (const descriptor of rules) {
      for (const dependency of descriptor.dependsOn) {
        expect(known.has(dependency)).toBe(true);
      }
    }
  });

  it("detects no cycle for valid chain", () => {
    const byCode = Object.fromEntries(rules.map((x) => [x.code, x]));
    const ordered = bindings[0].rules.map((x) => x.code);
    expect(hasDependencyCycle(ordered, byCode)).toBe(false);
  });

  it("detects cycle when descriptors create loop", () => {
    const withCycle: MUiEngineCatalogRuleDescriptor[] = [
      {
        ...rules[0],
        dependsOn: ["FCD_VALIDATE_TAXCODE"]
      },
      {
        ...rules[1],
        dependsOn: ["FCD_VALIDATE_LINER"]
      }
    ];

    const byCode = Object.fromEntries(withCycle.map((x) => [x.code, x]));
    const ordered = withCycle.map((x) => x.code);
    expect(hasDependencyCycle(ordered, byCode)).toBe(true);
  });
});
