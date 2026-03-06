import { describe, expect, it } from "vitest";
import type {
  MUiEngineAuthProfile,
  MUiEngineCatalogApiDescriptor,
  MUiEngineCatalogBinding,
  MUiEngineCatalogGraph,
  MUiEngineCatalogRuleDescriptor,
  MUiEngineManifestV2
} from "../src/contracts.js";

const apis: MUiEngineCatalogApiDescriptor[] = [
  {
    route: "/api/v2/full-container/delivery/create",
    httpMethod: "POST",
    controllerName: "FullContainerDeliveryV2",
    actionName: "CreateV2",
    requestType: "CreateCommand",
    responseType: "CreateResponse",
    authSchemes: ["Bearer"],
    policies: [],
    requiresTenantId: true
  }
];

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
    source: "rulegen",
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

const graph: MUiEngineCatalogGraph = {
  nodes: [
    {
      id: "endpoint:post:/api/v2/full-container/delivery/create",
      type: "endpoint",
      label: "POST /api/v2/full-container/delivery/create",
      data: {}
    },
    {
      id: "rule:fcd_validate_liner",
      type: "rule",
      label: "FCD_VALIDATE_LINER",
      data: {}
    }
  ],
  edges: [
    {
      from: "endpoint:post:/api/v2/full-container/delivery/create",
      to: "rule:fcd_validate_liner",
      edgeType: "triggers"
    }
  ]
};

const authProfiles: MUiEngineAuthProfile[] = [
  {
    tokenSource: "header",
    tokenKey: "Authorization",
    refreshPath: "/api/v1/auth/refresh-token",
    tenantHeaderKey: "X-Tenant-Id",
    correlationIdKey: "X-Correlation-Id",
    failurePolicy: "401"
  },
  {
    tokenSource: "cookie",
    tokenKey: "access_token",
    tenantHeaderKey: "X-Tenant-Id",
    correlationIdKey: "X-Correlation-Id",
    failurePolicy: "retry"
  },
  {
    tokenSource: "localStorage",
    tokenKey: "accessToken",
    tenantHeaderKey: "X-Tenant-Id",
    correlationIdKey: "X-Correlation-Id",
    failurePolicy: "redirect"
  }
];

const manifest: MUiEngineManifestV2 = {
  schemaVersion: "mui.engine.v2",
  generatedAtUtc: new Date().toISOString(),
  userId: "00000000-0000-0000-0000-000000000001",
  tenantId: "tenant-a",
  licenseTier: "Enterprise",
  navigationGroups: [],
  screens: [],
  actions: [],
  dataSources: [],
  appShell: {
    rootLayout: "m-shell",
    slots: ["header", "content"]
  },
  authProfile: authProfiles[0],
  apiContracts: [
    {
      operationId: "FullContainerDeliveryV2_CreateV2",
      endpointPath: "/api/v2/full-container/delivery/create",
      httpMethod: "POST",
      requestSchemaRef: "CreateCommand",
      responseSchemaRef: "CreateResponse",
      tags: ["FullContainerDeliveryV2"]
    }
  ],
  ruleBindings: [
    {
      endpointRoute: "/api/v2/full-container/delivery/create",
      workflowName: "fcd-create-runtime-full",
      contextType: "FcdCreateContext",
      orderedRules: ["FCD_VALIDATE_LINER", "FCD_VALIDATE_TAXCODE"]
    }
  ],
  generationHints: {
    watchEnabled: true,
    outputBasePath: "./src/generated/ui-engine"
  }
};

describe("catalog snapshot", () => {
  it("has required api descriptor fields", () => {
    expect(apis[0].route).toBeTruthy();
    expect(apis[0].httpMethod).toBeTruthy();
    expect(apis[0].controllerName).toBeTruthy();
    expect(apis[0].actionName).toBeTruthy();
  });

  it("ensures binding rules are monotonic by order", () => {
    const orders = bindings[0].rules.map((x) => x.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it("ensures graph edges reference existing nodes", () => {
    const nodeIds = new Set(graph.nodes.map((x) => x.id));
    for (const edge of graph.edges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
    }
  });

  it("ensures manifest v2 ruleBindings orderedRules has no duplicates", () => {
    const ordered = manifest.ruleBindings?.[0].orderedRules ?? [];
    expect(new Set(ordered).size).toBe(ordered.length);
  });

  it("ensures auth profile tokenSource is valid", () => {
    const allowed = new Set(["header", "cookie", "localStorage"]);
    for (const profile of authProfiles) {
      expect(allowed.has(profile.tokenSource)).toBe(true);
    }
  });

  it("matches snapshot", () => {
    expect({ manifest, apis, rules, bindings, graph }).toMatchSnapshot();
  });
});
