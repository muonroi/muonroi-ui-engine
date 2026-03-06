import type {
  MUiEngineCatalogApiDescriptor,
  MUiEngineCatalogBinding,
  MUiEngineCatalogGraph,
  MUiEngineCatalogRuleDescriptor
} from "./contracts.js";

export class MUiEngineCatalogClient {
  private readonly mFetch: <T>(path: string, init?: RequestInit) => Promise<T>;

  constructor(fetcher: <T>(path: string, init?: RequestInit) => Promise<T>) {
    this.mFetch = fetcher;
  }

  public async MLoadApis(): Promise<MUiEngineCatalogApiDescriptor[]> {
    return await this.mFetch<MUiEngineCatalogApiDescriptor[]>("/ui-engine/catalog/apis");
  }

  public async MLoadRules(): Promise<MUiEngineCatalogRuleDescriptor[]> {
    return await this.mFetch<MUiEngineCatalogRuleDescriptor[]>("/ui-engine/catalog/rules");
  }

  public async MLoadBindings(): Promise<MUiEngineCatalogBinding[]> {
    return await this.mFetch<MUiEngineCatalogBinding[]>("/ui-engine/catalog/bindings");
  }

  public async MLoadGraph(): Promise<MUiEngineCatalogGraph> {
    return await this.mFetch<MUiEngineCatalogGraph>("/ui-engine/catalog/graph");
  }
}
