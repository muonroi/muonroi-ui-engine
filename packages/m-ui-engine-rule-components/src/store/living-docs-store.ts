import { createStore } from "zustand/vanilla";
import type { LivingDocModel } from "../models/living-docs-models.js";

/**
 * State shape for the living-docs store.
 * Follows the DecisionTableEditorState pattern from decision-table-store.ts.
 *
 * pendingVersion drives the D-01 notify-don't-yank banner:
 * when non-null, a new version is available but has NOT been applied yet.
 */
export interface LivingDocsStoreState {
  doc: LivingDocModel | null;
  isLoading: boolean;
  error: string | null;
  pendingVersion: number | null;

  loadDoc(apiBase: string, workflow: string, version: number | "active"): Promise<void>;
  setDoc(doc: LivingDocModel): void;
  setPendingVersion(v: number | null): void;
  clearError(): void;
}

export type MLivingDocsStore = ReturnType<typeof MCreateLivingDocsStore>;

/**
 * Factory function returning a framework-agnostic zustand/vanilla store.
 * Designed for use in both Lit web components and React consumers.
 *
 * loadDoc throws on non-ok fetch responses — no silent catch (CLAUDE.md rule).
 * Tenant scope is enforced by the API; the store passes no tenant override.
 */
export function MCreateLivingDocsStore() {
  return createStore<LivingDocsStoreState>((set) => ({
    doc: null,
    isLoading: false,
    error: null,
    pendingVersion: null,

    async loadDoc(apiBase: string, workflow: string, version: number | "active") {
      set({ isLoading: true, error: null });
      const response = await fetch(
        `${apiBase.replace(/\/$/, "")}/living-docs/${encodeURIComponent(workflow)}/${version}`
      );
      if (!response.ok) {
        const msg = `Unable to load living doc ${workflow} v${version} (status ${response.status})`;
        set({ isLoading: false, error: msg });
        throw new Error(`[living-docs-store] ${msg}`);
      }
      const doc = (await response.json()) as LivingDocModel;
      set({ doc, isLoading: false, error: null });
    },

    setDoc(doc: LivingDocModel) {
      set({ doc });
    },

    setPendingVersion(v: number | null) {
      set({ pendingVersion: v });
    },

    clearError() {
      set({ error: null });
    }
  }));
}
