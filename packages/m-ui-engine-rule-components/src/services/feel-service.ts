export interface MFeelEvaluateRequest {
  expression: string;
  context: Record<string, unknown>;
}

export interface MFeelEvaluateResponse {
  success: boolean;
  result: unknown;
  expression: string;
}

export interface MFeelAutocompleteResponse {
  suggestions: string[];
  token: string;
}

export interface MFeelServiceOptions {
  baseUrl?: string;
  evaluateEndpoint?: string;
  autocompleteEndpoint?: string;
  examplesEndpoint?: string;
  fetchImpl?: typeof fetch;
}

export class MFeelService {
  private readonly mBaseUrl: string;
  private readonly mEvaluateEndpoint: string;
  private readonly mAutocompleteEndpoint: string;
  private readonly mExamplesEndpoint: string;
  private readonly mFetch: typeof fetch;

  constructor(options: MFeelServiceOptions = {}) {
    this.mBaseUrl = options.baseUrl ?? "";
    this.mEvaluateEndpoint = options.evaluateEndpoint ?? "/api/v1/feel/evaluate";
    this.mAutocompleteEndpoint = options.autocompleteEndpoint ?? "/api/v1/feel/autocomplete";
    this.mExamplesEndpoint = options.examplesEndpoint ?? "/api/v1/feel/examples";
    this.mFetch = options.fetchImpl ?? fetch;
  }

  public async MEvaluate(request: MFeelEvaluateRequest): Promise<MFeelEvaluateResponse> {
    return await this.MPost<MFeelEvaluateResponse>(this.mEvaluateEndpoint, request);
  }

  public async MAutocomplete(partialExpression: string, dataType?: string): Promise<MFeelAutocompleteResponse> {
    return await this.MPost<MFeelAutocompleteResponse>(this.mAutocompleteEndpoint, {
      partialExpression,
      dataType
    });
  }

  public async MExamples(): Promise<Record<string, string[]>> {
    const response = await this.mFetch(this.MResolveUrl(this.mExamplesEndpoint));
    if (!response.ok) {
      throw new Error(`FEEL examples request failed: ${response.status}`);
    }

    return (await response.json()) as Record<string, string[]>;
  }

  private async MPost<T>(path: string, payload: unknown): Promise<T> {
    const response = await this.mFetch(this.MResolveUrl(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`FEEL request failed: ${response.status}`);
    }

    return (await response.json()) as T;
  }

  private MResolveUrl(endpoint: string): string {
    if (/^https?:\/\//i.test(endpoint)) {
      return endpoint;
    }

    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const base = this.mBaseUrl?.trim();
    if (!base) {
      return path;
    }

    return `${base.replace(/\/$/, "")}${path}`;
  }
}
