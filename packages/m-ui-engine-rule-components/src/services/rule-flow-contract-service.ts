import type {
  MRuleFlowContractReference,
  MRuleFlowContractSchema,
  MRuleFlowContractSourceType
} from "../models.js";
import { MBuildRuleComponentHeaders } from "../runtime/request-context.js";

export interface MRuleFlowContractServiceOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  tenantId?: string;
}

export interface MRuleFlowContractLookupResponse {
  sourceType: MRuleFlowContractSourceType;
  sourceCode: string;
  title?: string;
  description?: string;
  requestContract?: MRuleFlowContractSchema;
  responseContract?: MRuleFlowContractSchema;
}

export interface MRuleFlowNodeContractLookupResponse {
  flowCode: string;
  nodeId: string;
  nodeType?: string;
  ruleCode?: string;
  order?: number;
  dependsOn?: string[];
  requestScope?: MRuleFlowContractSchema;
  responseDelta?: MRuleFlowContractSchema;
}

export interface MRuleFlowSummary {
  workflowName: string;
  versions?: number[];
  activeVersion?: number | null;
}

export class MRuleFlowContractService {
  private readonly mBaseUrl: string;
  private readonly mFetch: typeof fetch;
  private readonly mTenantId: string;

  constructor(options: MRuleFlowContractServiceOptions) {
    const fetchImpl = (options.fetchImpl ?? globalThis.fetch).bind(globalThis);
    this.mBaseUrl = options.baseUrl.replace(/\/$/, "");
    this.mFetch = (input: RequestInfo | URL, init?: RequestInit) => fetchImpl(input, init);
    this.mTenantId = options.tenantId?.trim() ?? "";
  }

  public async MGetByReference(reference: MRuleFlowContractReference): Promise<MRuleFlowContractLookupResponse> {
    const sourceType = reference.sourceType.trim();
    const sourceCode = reference.sourceCode.trim();
    if (!sourceType || !sourceCode) {
      throw new Error("Contract reference requires sourceType and sourceCode.");
    }

    const response = await this.mFetch(`${this.mBaseUrl}/rule-contracts/${encodeURIComponent(sourceType)}/${encodeURIComponent(sourceCode)}`, {
      headers: MBuildRuleComponentHeaders(undefined, { tenantId: this.mTenantId })
    });
    if (!response.ok) {
      throw new Error(`Rule-flow contract request failed: ${response.status}`);
    }

    return (await response.json()) as MRuleFlowContractLookupResponse;
  }

  public async MGetFlowContract(flowCode: string): Promise<MRuleFlowContractLookupResponse> {
    const normalized = flowCode.trim();
    if (!normalized) {
      throw new Error("Flow code is required.");
    }

    const response = await this.mFetch(`${this.mBaseUrl}/flow-contracts/${encodeURIComponent(normalized)}`, {
      headers: MBuildRuleComponentHeaders(undefined, { tenantId: this.mTenantId })
    });
    if (!response.ok) {
      throw new Error(`Flow contract request failed: ${response.status}`);
    }

    return (await response.json()) as MRuleFlowContractLookupResponse;
  }

  public async MGetNodeAuthoringContract(flowCode: string, nodeId: string): Promise<MRuleFlowNodeContractLookupResponse> {
    const normalizedFlow = flowCode.trim();
    const normalizedNode = nodeId.trim();
    if (!normalizedFlow || !normalizedNode) {
      throw new Error("Flow code and node id are required.");
    }

    const response = await this.mFetch(
      `${this.mBaseUrl}/rule-flow/${encodeURIComponent(normalizedFlow)}/nodes/${encodeURIComponent(normalizedNode)}/authoring-contract`,
      {
        headers: MBuildRuleComponentHeaders(undefined, { tenantId: this.mTenantId })
      }
    );
    if (!response.ok) {
      throw new Error(`Node authoring contract request failed: ${response.status}`);
    }

    return (await response.json()) as MRuleFlowNodeContractLookupResponse;
  }

  public async MListFlows(): Promise<MRuleFlowSummary[]> {
    const response = await this.mFetch(`${this.mBaseUrl}/rulesets`, {
      headers: MBuildRuleComponentHeaders(undefined, { tenantId: this.mTenantId })
    });
    if (!response.ok) {
      throw new Error(`Ruleset list request failed: ${response.status}`);
    }

    return (await response.json()) as MRuleFlowSummary[];
  }
}
