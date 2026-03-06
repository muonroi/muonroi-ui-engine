import { createStore } from "zustand/vanilla";
import type {
  MDecisionTableCell,
  MDecisionTableColumn,
  MDecisionTableModel,
  MDecisionTableVersionSnapshot,
  MDecisionTableRow,
  MValidationError,
  MValidationResultPayload
} from "../models.js";

export interface DecisionTableEditorState {
  table: MDecisionTableModel | null;
  isDirty: boolean;
  selectedRowIds: Set<string>;
  validationErrors: MValidationError[];
  validationWarnings: string[];
  versionHistory: MDecisionTableVersionSnapshot[];
  history: { past: MDecisionTableModel[]; future: MDecisionTableModel[] };

  loadTable(id: string, apiBase: string): Promise<void>;
  loadFirstTable(apiBase: string): Promise<void>;
  createNewTable(name?: string): void;
  saveTable(apiBase: string): Promise<void>;
  addRow(afterRowId?: string): void;
  deleteRows(rowIds: string[]): void;
  reorderRows(fromIndex: number, toIndex: number, reorderEndpoint?: string): Promise<void>;
  reorderColumns(kind: "input" | "output", fromIndex: number, toIndex: number): void;
  addColumn(type: "input" | "output"): void;
  deleteColumn(columnId: string): void;
  updateCell(rowId: string, columnId: string, value: string): void;
  setHitPolicy(policy: string): void;
  undo(): void;
  redo(): void;
  validate(endpoint: string): Promise<void>;
  exportTable(endpoint: string, format: string): Promise<Blob>;
  loadHistory(endpoint: string, page?: number, pageSize?: number): Promise<void>;
}

export type MDecisionTableStore = ReturnType<typeof MCreateDecisionTableStore>;

const M_HISTORY_LIMIT = 50;

export function MCreateDecisionTableStore() {
  return createStore<DecisionTableEditorState>((set, get) => ({
    table: null,
    isDirty: false,
    selectedRowIds: new Set<string>(),
    validationErrors: [],
    validationWarnings: [],
    versionHistory: [],
    history: { past: [], future: [] },

    async loadTable(id, apiBase) {
      const response = await fetch(`${apiBase.replace(/\/$/, "")}/${id}`);
      if (!response.ok) {
        throw new Error(`Unable to load decision table ${id}`);
      }

      const table = (await response.json()) as MDecisionTableModel;
      set({
        table: MNormalizeTable(table),
        isDirty: false,
        selectedRowIds: new Set<string>(),
        validationErrors: [],
        validationWarnings: [],
        versionHistory: [],
        history: { past: [], future: [] }
      });
    },

    async loadFirstTable(apiBase) {
      const response = await fetch(`${apiBase.replace(/\/$/, "")}?page=1&pageSize=1`);
      if (!response.ok) {
        throw new Error("Unable to load decision table list.");
      }

      const payload = (await response.json()) as { items?: MDecisionTableModel[] };
      const first = payload.items?.[0];
      if (!first?.id) {
        get().createNewTable();
        return;
      }

      await get().loadTable(first.id, apiBase);
    },

    createNewTable(name) {
      const table = MCreateEmptyTable(name);
      set({
        table,
        isDirty: true,
        selectedRowIds: new Set<string>(),
        validationErrors: [],
        validationWarnings: [],
        versionHistory: [],
        history: { past: [], future: [] }
      });
    },

    async saveTable(apiBase) {
      const table = get().table;
      if (!table) {
        return;
      }

      const base = apiBase.replace(/\/$/, "");
      const isCreate = !table.id;
      const url = isCreate ? base : `${base}/${table.id}`;
      const method = isCreate ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(table)
      });

      if (!response.ok) {
        throw new Error(`Unable to save decision table ${table.id || "(new)"}`);
      }

      const saved = (await response.json()) as MDecisionTableModel;
      set({ table: MNormalizeTable(saved), isDirty: false });
    },

    addRow(afterRowId) {
      const state = get();
      const table = state.table;
      if (!table) {
        return;
      }

      MCommitHistory(set, state);
      const templateRow: MDecisionTableRow = {
        id: MCreateId(),
        order: table.rows.length,
        inputCells: table.inputColumns.map((column) => ({ columnId: column.id, expression: "-" })),
        outputCells: table.outputColumns.map((column) => ({ columnId: column.id, expression: "" }))
      };

      const clone = MCloneTable(table);
      if (!afterRowId) {
        clone.rows.push(templateRow);
      } else {
        const index = clone.rows.findIndex((row) => row.id === afterRowId);
        if (index === -1) {
          clone.rows.push(templateRow);
        } else {
          clone.rows.splice(index + 1, 0, templateRow);
        }
      }

      clone.rows.forEach((row, index) => {
        row.order = index;
      });

      set({ table: clone, isDirty: true });
    },

    deleteRows(rowIds) {
      const state = get();
      const table = state.table;
      if (!table || rowIds.length === 0) {
        return;
      }

      const rowIdSet = new Set(rowIds);
      MCommitHistory(set, state);
      const clone = MCloneTable(table);
      clone.rows = clone.rows.filter((row) => !rowIdSet.has(row.id));
      clone.rows.forEach((row, index) => {
        row.order = index;
      });

      set({ table: clone, isDirty: true });
    },

    async reorderRows(fromIndex, toIndex, reorderEndpoint) {
      const state = get();
      const table = state.table;
      if (!table || fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= table.rows.length || toIndex >= table.rows.length) {
        return;
      }

      const previous = MCloneTable(table);
      MCommitHistory(set, state);
      const clone = MCloneTable(table);
      const [moved] = clone.rows.splice(fromIndex, 1);
      clone.rows.splice(toIndex, 0, moved);
      clone.rows.forEach((row, index) => {
        row.order = index;
      });

      set({ table: clone, isDirty: true });
      if (!reorderEndpoint) {
        return;
      }

      if (!clone.id?.trim()) {
        return;
      }

      const endpoint = reorderEndpoint.replace("{id}", encodeURIComponent(clone.id));
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rowIds: clone.rows.map((row) => row.id)
        })
      });

      if (!response.ok) {
        set({ table: previous });
        throw new Error(`Unable to reorder decision table ${clone.id}`);
      }

      const payload = (await response.json()) as MDecisionTableModel;
      set({ table: MNormalizeTable(payload), isDirty: true });
    },

    reorderColumns(kind, fromIndex, toIndex) {
      const state = get();
      const table = state.table;
      if (!table || fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
        return;
      }

      MCommitHistory(set, state);
      const clone = MCloneTable(table);
      const columns = kind === "input" ? clone.inputColumns : clone.outputColumns;
      if (fromIndex >= columns.length || toIndex >= columns.length) {
        return;
      }

      const [moved] = columns.splice(fromIndex, 1);
      columns.splice(toIndex, 0, moved);

      clone.rows.forEach((row) => {
        const cells = kind === "input" ? row.inputCells : row.outputCells;
        const [movedCell] = cells.splice(fromIndex, 1);
        cells.splice(toIndex, 0, movedCell);
      });

      set({ table: clone, isDirty: true });
    },

    addColumn(type) {
      const state = get();
      const table = state.table;
      if (!table) {
        return;
      }

      MCommitHistory(set, state);
      const clone = MCloneTable(table);
      const column: MDecisionTableColumn = {
        id: MCreateId(),
        name: `${type}_${Date.now()}`,
        label: type === "input" ? "Input" : "Output",
        dataType: "string",
        kind: type
      };

      if (type === "input") {
        clone.inputColumns.push(column);
        clone.rows.forEach((row) => {
          row.inputCells.push({ columnId: column.id, expression: "-" });
        });
      } else {
        clone.outputColumns.push(column);
        clone.rows.forEach((row) => {
          row.outputCells.push({ columnId: column.id, expression: "" });
        });
      }

      set({ table: clone, isDirty: true });
    },

    deleteColumn(columnId) {
      const state = get();
      const table = state.table;
      if (!table) {
        return;
      }

      MCommitHistory(set, state);
      const clone = MCloneTable(table);
      const inputIndex = clone.inputColumns.findIndex((column) => column.id === columnId);
      if (inputIndex >= 0) {
        clone.inputColumns.splice(inputIndex, 1);
        clone.rows.forEach((row) => {
          row.inputCells = row.inputCells.filter((cell) => cell.columnId !== columnId);
        });
      }

      const outputIndex = clone.outputColumns.findIndex((column) => column.id === columnId);
      if (outputIndex >= 0) {
        clone.outputColumns.splice(outputIndex, 1);
        clone.rows.forEach((row) => {
          row.outputCells = row.outputCells.filter((cell) => cell.columnId !== columnId);
        });
      }

      set({ table: clone, isDirty: true });
    },

    updateCell(rowId, columnId, value) {
      const state = get();
      const table = state.table;
      if (!table) {
        return;
      }

      MCommitHistory(set, state);
      const clone = MCloneTable(table);
      const row = clone.rows.find((item) => item.id === rowId);
      if (!row) {
        return;
      }

      const update = (cells: MDecisionTableCell[]) => {
        const cell = cells.find((item) => item.columnId === columnId);
        if (cell) {
          cell.expression = value;
        }
      };

      update(row.inputCells);
      update(row.outputCells);
      set({ table: clone, isDirty: true });
    },

    setHitPolicy(policy) {
      const state = get();
      const table = state.table;
      if (!table) {
        return;
      }

      MCommitHistory(set, state);
      set({
        table: {
          ...table,
          hitPolicy: policy
        },
        isDirty: true
      });
    },

    undo() {
      const state = get();
      if (state.history.past.length === 0 || !state.table) {
        return;
      }

      const past = [...state.history.past];
      const previous = past.pop();
      if (!previous) {
        return;
      }

      set({
        table: previous,
        isDirty: true,
        history: {
          past,
          future: [MCloneTable(state.table), ...state.history.future].slice(0, M_HISTORY_LIMIT)
        }
      });
    },

    redo() {
      const state = get();
      if (state.history.future.length === 0 || !state.table) {
        return;
      }

      const [next, ...future] = state.history.future;
      set({
        table: next,
        isDirty: true,
        history: {
          past: [...state.history.past, MCloneTable(state.table)].slice(-M_HISTORY_LIMIT),
          future
        }
      });
    },

    async validate(endpoint) {
      const table = get().table;
      if (!table) {
        return;
      }

      if (!table.id?.trim()) {
        throw new Error("Decision table must be saved before validation.");
      }

      const response = await fetch(endpoint.replace("{id}", encodeURIComponent(table.id)), {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error(`Unable to validate decision table ${table.id}`);
      }

      const payload = (await response.json()) as MValidationResultPayload | { result?: MValidationResultPayload };
      const result = "result" in payload && payload.result ? payload.result : (payload as MValidationResultPayload);
      const errors = (result.errors ?? []).map((message) => MMapError(message));
      set({
        validationErrors: errors,
        validationWarnings: result.warnings ?? []
      });
    },

    async exportTable(endpoint, format) {
      const table = get().table;
      if (!table) {
        throw new Error("No decision table loaded.");
      }

      if (!table.id?.trim()) {
        throw new Error("Decision table must be saved before export.");
      }

      const url = endpoint.replace("{id}", encodeURIComponent(table.id)).replace("{format}", encodeURIComponent(format));
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Unable to export decision table ${table.id}`);
      }

      return await response.blob();
    },

    async loadHistory(endpoint, page = 1, pageSize = 20) {
      const table = get().table;
      if (!table) {
        set({ versionHistory: [] });
        return;
      }

      if (!table.id?.trim()) {
        set({ versionHistory: [] });
        return;
      }

      const rawUrl = endpoint.replace("{id}", encodeURIComponent(table.id));
      const separator = rawUrl.includes("?") ? "&" : "?";
      const response = await fetch(`${rawUrl}${separator}page=${page}&pageSize=${pageSize}`);
      if (!response.ok) {
        throw new Error(`Unable to load history for decision table ${table.id}`);
      }

      const payload = (await response.json()) as MDecisionTableVersionSnapshot[];
      set({ versionHistory: payload ?? [] });
    }
  }));
}

function MCommitHistory(
  set: (next: Partial<DecisionTableEditorState>) => void,
  state: DecisionTableEditorState
): void {
  if (!state.table) {
    return;
  }

  set({
    history: {
      past: [...state.history.past, MCloneTable(state.table)].slice(-M_HISTORY_LIMIT),
      future: []
    }
  });
}

function MCloneTable(table: MDecisionTableModel): MDecisionTableModel {
  return JSON.parse(JSON.stringify(table)) as MDecisionTableModel;
}

function MCreateEmptyTable(name?: string): MDecisionTableModel {
  const inputColumnId = MCreateId();
  const outputColumnId = MCreateId();
  return {
    id: "",
    name: name?.trim() || "New Decision Table",
    description: "",
    hitPolicy: "First",
    inputColumns: [
      {
        id: inputColumnId,
        name: "input_1",
        label: "Input 1",
        dataType: "string",
        kind: "input"
      }
    ],
    outputColumns: [
      {
        id: outputColumnId,
        name: "output_1",
        label: "Output 1",
        dataType: "string",
        kind: "output"
      }
    ],
    rows: [
      {
        id: MCreateId(),
        order: 0,
        inputCells: [{ columnId: inputColumnId, expression: "-" }],
        outputCells: [{ columnId: outputColumnId, expression: "" }]
      }
    ],
    version: 1
  };
}

function MCreateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function MMapError(message: string): MValidationError {
  const lower = message.toLowerCase();
  if (lower.includes("overlap")) {
    return { code: "overlap", message };
  }

  if (lower.includes("invalid input expression")) {
    return { code: "feel-syntax", message };
  }

  return { code: "validation", message };
}

function MNormalizeTable(table: MDecisionTableModel): MDecisionTableModel {
  const clone = MCloneTable(table);
  clone.inputColumns = clone.inputColumns.map((column) => ({ ...column, kind: "input" }));
  clone.outputColumns = clone.outputColumns.map((column) => ({ ...column, kind: "output" }));
  clone.rows = [...clone.rows].sort((left, right) => left.order - right.order);
  return clone;
}
