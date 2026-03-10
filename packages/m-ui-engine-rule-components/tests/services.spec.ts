import { describe, expect, it } from "vitest";
import { MFeelService } from "../src/services/feel-service";
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
});
