/**
 * Service for managing external connectors (CRUD, testing, credentials, catalog).
 * Follows the static-method pattern with explicit apiBase + headers parameters.
 */

export interface MConnectorConfig {
  id: string;
  name: string;
  connectorType: string;
  description?: string;
  config: Record<string, unknown>;
  credentialId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MConnectorTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}

export interface MConnectorMetadata {
  connectorType: string;
  displayName: string;
  description?: string;
  icon?: string;
  category?: string;
  configSchema?: Record<string, unknown>;
  credentialFields?: string[];
  requiresCredentials?: boolean;
}

export class MConnectorService {
  /**
   * List all configured connectors for the current tenant.
   */
  static async MListConnectors(apiBase: string, headers: HeadersInit): Promise<MConnectorConfig[]> {
    const url = `${apiBase.replace(/\/$/, "")}/connectors`;
    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      throw new Error(`Failed to list connectors: ${response.status}`);
    }
    return (await response.json()) as MConnectorConfig[];
  }

  /**
   * Get a single connector by ID.
   */
  static async MGetConnector(apiBase: string, id: string, headers: HeadersInit): Promise<MConnectorConfig> {
    const normalizedId = id.trim();
    if (!normalizedId) {
      throw new Error("Connector ID is required.");
    }
    const url = `${apiBase.replace(/\/$/, "")}/connectors/${encodeURIComponent(normalizedId)}`;
    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      throw new Error(`Failed to get connector ${normalizedId}: ${response.status}`);
    }
    return (await response.json()) as MConnectorConfig;
  }

  /**
   * Create or update a connector configuration.
   */
  static async MSaveConnector(apiBase: string, config: MConnectorConfig, headers: HeadersInit): Promise<MConnectorConfig> {
    const url = config.id
      ? `${apiBase.replace(/\/$/, "")}/connectors/${encodeURIComponent(config.id)}`
      : `${apiBase.replace(/\/$/, "")}/connectors`;
    const method = config.id ? "PUT" : "POST";
    const response = await fetch(url, {
      method,
      headers: { ...MHeadersToRecord(headers), "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
    if (!response.ok) {
      throw new Error(`Failed to save connector: ${response.status}`);
    }
    return (await response.json()) as MConnectorConfig;
  }

  /**
   * Test a connector connection by ID.
   */
  static async MTestConnector(apiBase: string, id: string, headers: HeadersInit): Promise<MConnectorTestResult> {
    const normalizedId = id.trim();
    if (!normalizedId) {
      throw new Error("Connector ID is required for testing.");
    }
    const url = `${apiBase.replace(/\/$/, "")}/connectors/${encodeURIComponent(normalizedId)}/test`;
    const response = await fetch(url, { method: "POST", headers });
    if (!response.ok) {
      throw new Error(`Failed to test connector ${normalizedId}: ${response.status}`);
    }
    return (await response.json()) as MConnectorTestResult;
  }

  /**
   * Get the catalog of available connector types and their metadata.
   */
  static async MGetCatalog(apiBase: string, headers: HeadersInit): Promise<MConnectorMetadata[]> {
    const url = `${apiBase.replace(/\/$/, "")}/connectors/catalog`;
    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      throw new Error(`Failed to load connector catalog: ${response.status}`);
    }
    const raw = (await response.json()) as Array<Record<string, unknown>>;
    return raw.map((item) => ({
      connectorType: String(item.type ?? item.connectorType ?? ""),
      displayName: String(item.displayName ?? ""),
      description: typeof item.description === "string" ? item.description : undefined,
      icon: typeof item.iconSvg === "string" ? item.iconSvg : typeof item.icon === "string" ? item.icon : undefined,
      category: typeof item.category === "string" ? item.category : undefined,
      requiresCredentials: Boolean(item.requiresCredentials),
      credentialFields: Array.isArray(item.credentialFields) ? item.credentialFields as string[] : undefined
    }));
  }

  /**
   * Save or update credentials for a specific connector.
   */
  static async MSaveCredentials(
    apiBase: string,
    connectorId: string,
    creds: Record<string, string>,
    headers: HeadersInit
  ): Promise<void> {
    const normalizedId = connectorId.trim();
    if (!normalizedId) {
      throw new Error("Connector ID is required for saving credentials.");
    }
    const url = `${apiBase.replace(/\/$/, "")}/connectors/${encodeURIComponent(normalizedId)}/credentials`;
    const response = await fetch(url, {
      method: "PUT",
      headers: { ...MHeadersToRecord(headers), "Content-Type": "application/json" },
      body: JSON.stringify(creds)
    });
    if (!response.ok) {
      throw new Error(`Failed to save credentials for connector ${normalizedId}: ${response.status}`);
    }
  }
}

/**
 * Convert HeadersInit to a plain Record for spread compatibility.
 */
function MHeadersToRecord(headers: HeadersInit): Record<string, string> {
  if (headers instanceof Headers) {
    const record: Record<string, string> = {};
    headers.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }
  if (Array.isArray(headers)) {
    const record: Record<string, string> = {};
    for (const [key, value] of headers) {
      record[key] = value;
    }
    return record;
  }
  return headers as Record<string, string>;
}
