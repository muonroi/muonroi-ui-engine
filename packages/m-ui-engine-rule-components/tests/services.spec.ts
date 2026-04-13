import { describe, expect, it } from "vitest";
import { MFeelService } from "../src/services/feel-service";
import { MRuleCatalogService } from "../src/services/rule-catalog-service";
import { MRuleEngineApi } from "../src/services/rule-engine-api";
import { MRuleFlowContractService } from "../src/services/rule-flow-contract-service";

function MCreateDetachedFetchResponse(body: unknown): typeof fetch {
  const fetchHost = {
    fetch(this: unknown, _input: RequestInfo | URL, _init?: RequestInit) {
      if (this !== globalThis) {
        throw new TypeError("Illegal invocation");
      }

      return Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        })
      );
    }
  };

  return fetchHost.fetch as typeof fetch;
}

describe("service fetch binding", () => {
  it("binds detached fetch implementations for rule flow contracts", async () => {
    const service = new MRuleFlowContractService({
      baseUrl: "http://localhost:5000/api/v1/control-plane",
      fetchImpl: MCreateDetachedFetchResponse({ flowCode: "FCD", nodeId: "RULE_A" })
    });

    const response = await service.MGetNodeAuthoringContract("FCD", "RULE_A");
    expect(response.nodeId).toBe("RULE_A");
  });

  it("binds detached fetch implementations for rule catalog requests", async () => {
    const service = new MRuleCatalogService({
      baseUrl: "http://localhost:5000/api/v1/rule-catalog",
      fetchImpl: MCreateDetachedFetchResponse([{ category: "Testing", items: [{ code: "RULE_A", displayName: "Rule A", tags: [] }] }])
    });

    const response = await service.MListCatalog();
    expect(response[0]?.items[0]?.code).toBe("RULE_A");
  });

  it("binds detached fetch implementations for FEEL service", async () => {
    const service = new MFeelService({
      baseUrl: "http://localhost:5000",
      fetchImpl: MCreateDetachedFetchResponse({ success: true, result: true, expression: "a = 1" })
    });

    const response = await service.MEvaluate({ expression: "a = 1", context: {} });
    expect(response.success).toBe(true);
  });

  it("binds detached fetch implementations for rule engine API", async () => {
    const service = new MRuleEngineApi({
      baseUrl: "http://localhost:5000/api/v1/control-plane",
      fetchImpl: MCreateDetachedFetchResponse({ items: [{ id: "dt-1", code: "DT_1", name: "DecisionTable" }] })
    });

    const response = await service.MListDecisionTables();
    expect(response).toHaveLength(1);
  });

  it("normalizes control-plane base URLs for decision table endpoints", async () => {
    const calls: string[] = [];
    const fetchImpl = ((input: RequestInfo | URL) => {
      calls.push(String(input));
      return Promise.resolve(
        new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        })
      );
    }) as typeof fetch;

    const service = new MRuleEngineApi({
      baseUrl: "http://localhost:5001/api/v1/control-plane",
      fetchImpl
    });

    await service.MListDecisionTables();
    expect(calls[0]).toBe("http://localhost:5001/api/v1/decision-tables");
  });

  it("emits query parameters for filtered rule catalog requests", async () => {
    const calls: string[] = [];
    const fetchImpl = ((input: RequestInfo | URL) => {
      calls.push(String(input));
      return Promise.resolve(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        })
      );
    }) as typeof fetch;

    const service = new MRuleCatalogService({
      baseUrl: "http://localhost:5001/api/v1/rule-catalog",
      fetchImpl
    });

    await service.MListCatalog({ category: "Shipping", search: "liner", includeHidden: true });
    expect(calls[0]).toBe("http://localhost:5001/api/v1/rule-catalog?category=Shipping&search=liner&includeHidden=true");
  });
});
