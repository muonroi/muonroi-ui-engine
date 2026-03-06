import { createStore } from "zustand/vanilla";

export interface MRuleEngineStoreState {
  currentScreenKey: string | null;
  currentTier: string;
  isSchemaStale: boolean;
  lastSchemaHash?: string;
  setScreen(screenKey: string | null): void;
  setTier(tier: string): void;
  markSchemaChanged(schemaHash?: string): void;
  clearSchemaStale(): void;
}

export function MCreateRuleEngineStore() {
  return createStore<MRuleEngineStoreState>((set) => ({
    currentScreenKey: null,
    currentTier: "Free",
    isSchemaStale: false,
    lastSchemaHash: undefined,
    setScreen(screenKey) {
      set({ currentScreenKey: screenKey });
    },
    setTier(tier) {
      set({ currentTier: tier });
    },
    markSchemaChanged(schemaHash) {
      set({ isSchemaStale: true, lastSchemaHash: schemaHash });
    },
    clearSchemaStale() {
      set({ isSchemaStale: false });
    }
  }));
}
