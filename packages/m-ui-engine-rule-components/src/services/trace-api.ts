import type {
  MRuleTraceEntry,
  MEnableDebuggerRequest,
  MTraceQueryParams,
} from "../models/trace-models.js";
import { MBuildRuleComponentHeaders } from "../runtime/request-context.js";

/**
 * API client for /muonroi/rule-debugger/* endpoints.
 * Designed for both React (control-plane dashboard) and
 * Lit web component (embeddable trace viewer) consumers.
 */
export class MRuleTraceApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly mGetHeaders?: () => HeadersInit
  ) {}

  private async mFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const base = this.mGetHeaders?.() ?? MBuildRuleComponentHeaders();
    const headers = new Headers(base);
    if (init?.headers) {
      const extra = new Headers(init.headers);
      extra.forEach((v, k) => headers.set(k, v));
    }
    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    if (!res.ok)
      throw new Error(`Trace API ${res.status}: ${await res.text()}`);
    return res.json();
  }

  /**
   * Enable debugger mode for tenant.
   * POST /muonroi/rule-debugger/{tenantId}/enable
   */
  async mEnableDebugger(
    tenantId: string,
    req?: MEnableDebuggerRequest
  ): Promise<void> {
    await this.mFetch(`/muonroi/rule-debugger/${tenantId}/enable`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req ?? {}),
    });
  }

  /**
   * Disable debugger mode for tenant.
   * POST /muonroi/rule-debugger/{tenantId}/disable
   */
  async mDisableDebugger(tenantId: string): Promise<void> {
    await this.mFetch(`/muonroi/rule-debugger/${tenantId}/disable`, {
      method: "POST",
    });
  }

  /**
   * Query execution traces for tenant.
   * GET /muonroi/rule-debugger/{tenantId}/traces?correlationId=X&from=Y
   */
  async mQueryTraces(
    tenantId: string,
    params?: MTraceQueryParams
  ): Promise<MRuleTraceEntry[]> {
    const qs = new URLSearchParams();
    if (params?.correlationId) qs.set("correlationId", params.correlationId);
    if (params?.from) qs.set("from", params.from);
    const query = qs.toString();
    return this.mFetch(
      `/muonroi/rule-debugger/${tenantId}/traces${query ? `?${query}` : ""}`
    );
  }
}
