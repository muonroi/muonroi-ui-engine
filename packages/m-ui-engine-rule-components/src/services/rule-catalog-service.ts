import type { MRuleCatalogGroup, MRuleCatalogItem } from "../models.js";
import { MBuildRuleComponentHeaders } from "../runtime/request-context.js";

export interface MRuleCatalogServiceOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  tenantId?: string;
}

export interface MRuleCatalogQuery {
  category?: string;
  search?: string;
  includeHidden?: boolean;
}

export class MRuleCatalogService {
  private readonly mBaseUrl: string;
  private readonly mFetch: typeof fetch;
  private readonly mTenantId: string;

  constructor(options: MRuleCatalogServiceOptions) {
    const fetchImpl = (options.fetchImpl ?? globalThis.fetch).bind(globalThis);
    this.mBaseUrl = options.baseUrl.replace(/\/$/, "");
    this.mFetch = (input: RequestInfo | URL, init?: RequestInit) => fetchImpl(input, init);
    this.mTenantId = options.tenantId?.trim() ?? "";
  }

  public async MListCatalog(query?: MRuleCatalogQuery): Promise<MRuleCatalogGroup[]> {
    const params = new URLSearchParams();
    if (query?.category?.trim()) {
      params.set("category", query.category.trim());
    }
    if (query?.search?.trim()) {
      params.set("search", query.search.trim());
    }
    if (query?.includeHidden) {
      params.set("includeHidden", "true");
    }

    const url = params.size > 0 ? `${this.mBaseUrl}?${params.toString()}` : this.mBaseUrl;
    const response = await this.mFetch(url, {
      headers: MBuildRuleComponentHeaders(undefined, { tenantId: this.mTenantId })
    });
    if (!response.ok) {
      throw new Error(`Rule catalog request failed: ${response.status}`);
    }

    return (await response.json()) as MRuleCatalogGroup[];
  }

  public async MGetItem(code: string, includeHidden = false): Promise<MRuleCatalogItem> {
    const normalizedCode = code.trim();
    if (!normalizedCode) {
      throw new Error("Rule catalog item code is required.");
    }

    const params = includeHidden ? "?includeHidden=true" : "";
    const response = await this.mFetch(`${this.mBaseUrl}/${encodeURIComponent(normalizedCode)}${params}`, {
      headers: MBuildRuleComponentHeaders(undefined, { tenantId: this.mTenantId })
    });
    if (!response.ok) {
      throw new Error(`Rule catalog item request failed: ${response.status}`);
    }

    return (await response.json()) as MRuleCatalogItem;
  }
}
