import { createStore } from "zustand/vanilla";
import type {
  MConnectorConfig,
  MConnectorMetadata,
  MConnectorTestResult
} from "../services/connector-service.js";
import { MConnectorService } from "../services/connector-service.js";

export interface MConnectorStoreState {
  connectors: MConnectorConfig[];
  catalog: MConnectorMetadata[];
  selectedConnector: MConnectorConfig | null;
  testResult: MConnectorTestResult | null;
  isDirty: boolean;

  loadConnectors(apiBase: string, headers: HeadersInit): Promise<void>;
  loadCatalog(apiBase: string, headers: HeadersInit): Promise<void>;
  selectConnector(connector: MConnectorConfig | null): void;
  saveConnector(apiBase: string, config: MConnectorConfig, headers: HeadersInit): Promise<void>;
  testConnection(apiBase: string, id: string, headers: HeadersInit): Promise<void>;
  saveCredentials(apiBase: string, connectorId: string, creds: Record<string, string>, headers: HeadersInit): Promise<void>;
  setDirty(dirty: boolean): void;
}

export type MConnectorStore = ReturnType<typeof MCreateConnectorStore>;

export function MCreateConnectorStore() {
  return createStore<MConnectorStoreState>((set, get) => ({
    connectors: [],
    catalog: [],
    selectedConnector: null,
    testResult: null,
    isDirty: false,

    async loadConnectors(apiBase, headers) {
      const connectors = await MConnectorService.MListConnectors(apiBase, headers);
      set({ connectors });
    },

    async loadCatalog(apiBase, headers) {
      const catalog = await MConnectorService.MGetCatalog(apiBase, headers);
      set({ catalog });
    },

    selectConnector(connector) {
      set({ selectedConnector: connector, testResult: null });
    },

    async saveConnector(apiBase, config, headers) {
      const saved = await MConnectorService.MSaveConnector(apiBase, config, headers);
      const { connectors } = get();
      const existingIndex = connectors.findIndex((c) => c.id === saved.id);
      const updated = existingIndex >= 0
        ? connectors.map((c, i) => (i === existingIndex ? saved : c))
        : [...connectors, saved];
      set({ connectors: updated, selectedConnector: saved, isDirty: false });
    },

    async testConnection(apiBase, id, headers) {
      const testResult = await MConnectorService.MTestConnector(apiBase, id, headers);
      set({ testResult });
    },

    async saveCredentials(apiBase, connectorId, creds, headers) {
      await MConnectorService.MSaveCredentials(apiBase, connectorId, creds, headers);
    },

    setDirty(dirty) {
      set({ isDirty: dirty });
    }
  }));
}
