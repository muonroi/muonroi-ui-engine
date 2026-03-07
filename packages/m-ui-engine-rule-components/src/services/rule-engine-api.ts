import type { MDecisionTableModel, MDecisionTableVersionInfo, MDecisionTableVersionSnapshot } from "../models.js";

export interface MRuleEngineApiOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  getAccessToken?: () => string | null;
}

export interface MNRulesDefinition {
  id: string;
  name: string;
  description?: string;
  ruleExpression: string;
  actionExpression: string;
  updatedAtUtc: string;
}

export interface MCepConfig {
  id: string;
  name: string;
  windowType: string;
  windowSizeSeconds: number;
  timeToLiveSeconds: number;
  updatedAtUtc: string;
}

export class MRuleEngineApi {
  private readonly mBaseUrl: string;
  private readonly mFetch: typeof fetch;
  private readonly mGetAccessToken?: () => string | null;

  constructor(options: MRuleEngineApiOptions) {
    this.mBaseUrl = options.baseUrl.replace(/\/$/, "");
    this.mFetch = options.fetchImpl ?? fetch;
    this.mGetAccessToken = options.getAccessToken;
  }

  public async MListDecisionTables(): Promise<MDecisionTableModel[]> {
    const payload = await this.MRequest<{ items?: MDecisionTableModel[] }>("/decision-tables");
    return payload.items ?? [];
  }

  public async MGetDecisionTable(id: string): Promise<MDecisionTableModel> {
    return await this.MRequest<MDecisionTableModel>(`/decision-tables/${id}`);
  }

  public async MSaveDecisionTable(id: string, table: MDecisionTableModel): Promise<MDecisionTableModel> {
    return await this.MRequest<MDecisionTableModel>(`/decision-tables/${id}`, {
      method: "PUT",
      body: JSON.stringify(table)
    });
  }

  public async MValidateDecisionTable(id: string): Promise<unknown> {
    return await this.MRequest(`/decision-tables/${id}/validate`, { method: "POST" });
  }

  public async MExportDecisionTable(id: string, format: "excel" | "json" | "xml" | "dmn"): Promise<Blob> {
    return await this.MRequestBlob(`/decision-tables/${id}/export/${format}`);
  }

  public async MListDecisionTableVersions(id: string): Promise<MDecisionTableVersionInfo[]> {
    return await this.MRequest<MDecisionTableVersionInfo[]>(`/decision-tables/${id}/versions`);
  }

  public async MGetDecisionTableVersion(id: string, version: number): Promise<MDecisionTableVersionSnapshot> {
    return await this.MRequest<MDecisionTableVersionSnapshot>(`/decision-tables/${id}/versions/${version}`);
  }

  public async MListNRules(): Promise<MNRulesDefinition[]> {
    return await this.MRequest<MNRulesDefinition[]>("/rule-engine/nrules");
  }

  public async MSaveNRules(id: string, definition: MNRulesDefinition): Promise<MNRulesDefinition> {
    return await this.MRequest<MNRulesDefinition>(`/rule-engine/nrules/${id}`, {
      method: "PUT",
      body: JSON.stringify(definition)
    });
  }

  public async MTestNRules(ruleId: string, facts: Array<Record<string, unknown>>): Promise<unknown> {
    return await this.MRequest("/rule-engine/test", {
      method: "POST",
      body: JSON.stringify({ ruleId, facts })
    });
  }

  public async MListCepConfigs(): Promise<MCepConfig[]> {
    return await this.MRequest<MCepConfig[]>("/rule-engine/cep");
  }

  public async MSaveCepConfig(id: string, config: MCepConfig): Promise<MCepConfig> {
    return await this.MRequest<MCepConfig>(`/rule-engine/cep/${id}`, {
      method: "PUT",
      body: JSON.stringify(config)
    });
  }

  public async MSimulateCep(id: string, events: Array<Record<string, unknown>>): Promise<unknown> {
    return await this.MRequest(`/rule-engine/cep/${id}/simulate`, {
      method: "POST",
      body: JSON.stringify({ events })
    });
  }

  private async MRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.mFetch(`${this.mBaseUrl}${path}`, this.MBuildInit(init));
    if (!response.ok) {
      throw new Error(`RuleEngine API error: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  }

  private async MRequestBlob(path: string, init: RequestInit = {}): Promise<Blob> {
    const response = await this.mFetch(`${this.mBaseUrl}${path}`, this.MBuildInit(init));
    if (!response.ok) {
      throw new Error(`RuleEngine API error: ${response.status} ${response.statusText}`);
    }

    return await response.blob();
  }

  private MBuildInit(init: RequestInit): RequestInit {
    const headers = new Headers(init.headers ?? {});
    if (!headers.has("Content-Type") && init.body) {
      headers.set("Content-Type", "application/json");
    }

    const token = this.mGetAccessToken?.();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return {
      ...init,
      headers
    };
  }
}
