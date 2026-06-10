import type { ImpactListResponse, LivingDocModel, TraceabilityMatrixRow } from "../models/living-docs-models.js";

/**
 * Response shape for GET /api/v1/traceability/{workflow}/{version}.
 */
export interface TraceabilityMatrixResponse {
  rows: TraceabilityMatrixRow[];
  workflow: string;
  version: number;
}

/**
 * Response shape for GET /api/v1/traceability/trace/{workflow}/{nodeId}.
 */
export interface TraceRuleResponse {
  nodeId: string;
  workflow: string;
  rows: TraceabilityMatrixRow[];
}

/**
 * API client for the Living Docs read endpoints (Phase 1/3 routes).
 *
 * All methods throw on non-ok responses — no silent catch (CLAUDE.md rule).
 * Tenant scope is enforced by the API (C-07 explicit EF filter).
 * The client passes no tenant override — it cannot widen scope.
 */
export class LivingDocsApiClient {
  private readonly base: string;

  constructor(apiBaseUrl: string) {
    this.base = apiBaseUrl.replace(/\/$/, "");
  }

  /**
   * GET {base}/living-docs/{workflow}/{version}
   * Returns the generated living doc JSON for the given workflow + version.
   * Pass "active" as version to resolve the currently active version.
   */
  async getLivingDoc(workflow: string, version: number | "active"): Promise<LivingDocModel> {
    const url = `${this.base}/living-docs/${encodeURIComponent(workflow)}/${version}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `[LivingDocsApiClient] getLivingDoc failed — workflow=${workflow} version=${version} status=${response.status}`
      );
    }
    return (await response.json()) as LivingDocModel;
  }

  /**
   * GET {base}/traceability/{workflow}/{version}
   * Returns the full traceability matrix for the given workflow + version.
   */
  async getTraceabilityMatrix(workflow: string, version: number | "active"): Promise<TraceabilityMatrixResponse> {
    const url = `${this.base}/traceability/${encodeURIComponent(workflow)}/${version}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `[LivingDocsApiClient] getTraceabilityMatrix failed — workflow=${workflow} version=${version} status=${response.status}`
      );
    }
    return (await response.json()) as TraceabilityMatrixResponse;
  }

  /**
   * GET {base}/traceability/trace/{workflow}/{nodeId}
   * Returns traceability rows filtered to the given rule node.
   * Entry point for the "trace this rule" jump from the doc viewer (D-11).
   */
  async traceRule(workflow: string, nodeId: string): Promise<TraceRuleResponse> {
    const url = `${this.base}/traceability/trace/${encodeURIComponent(workflow)}/${encodeURIComponent(nodeId)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `[LivingDocsApiClient] traceRule failed — workflow=${workflow} nodeId=${nodeId} status=${response.status}`
      );
    }
    return (await response.json()) as TraceRuleResponse;
  }

  /**
   * GET {base}/traceability/{workflow}/impact?from={from}&to={to}
   * Returns the impact list + UAT checklist for the two given versions.
   * No tenant override — the client cannot widen scope (T-05-09).
   */
  async getImpactList(workflow: string, from: number, to: number): Promise<ImpactListResponse> {
    const url = `${this.base}/traceability/${encodeURIComponent(workflow)}/impact?from=${from}&to=${to}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `[LivingDocsApiClient] getImpactList failed — workflow=${workflow} from=${from} to=${to} status=${response.status}`
      );
    }
    return (await response.json()) as ImpactListResponse;
  }
}
