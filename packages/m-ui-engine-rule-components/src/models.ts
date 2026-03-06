export type MDecisionTableColumnKind = "input" | "output";

export interface MDecisionTableColumn {
  id: string;
  name: string;
  label: string;
  dataType: string;
  kind: MDecisionTableColumnKind;
}

export interface MDecisionTableCell {
  columnId: string;
  expression: string;
}

export interface MDecisionTableRow {
  id: string;
  order: number;
  inputCells: MDecisionTableCell[];
  outputCells: MDecisionTableCell[];
}

export interface MDecisionTableModel {
  id: string;
  name: string;
  description?: string;
  hitPolicy: string;
  inputColumns: MDecisionTableColumn[];
  outputColumns: MDecisionTableColumn[];
  rows: MDecisionTableRow[];
  version: number;
  tenantId?: string | null;
  createdAt?: string;
  modifiedAt?: string;
}

export interface MValidationError {
  code: string;
  message: string;
  rowId?: string;
  columnId?: string;
}

export interface MValidationResultPayload {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface MDecisionTableVersionSnapshot {
  tableId: string;
  version: number;
  changeType: string;
  actor?: string | null;
  reason?: string | null;
  timestamp: string;
  table: MDecisionTableModel;
}
