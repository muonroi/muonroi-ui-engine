/**
 * Mirrors the C# record: Muonroi.ControlPlane.Api.LivingDocs.Traceability.Models.TestCoverageState
 *
 * Serialized by NAME (JsonStringEnumConverter) — MUST be a string union, never an ordinal.
 * Do NOT compare against integers: compare against "UnitTestLinked" | "DryRunExampleOnly" | "None".
 */
export type TestCoverageState = "UnitTestLinked" | "DryRunExampleOnly" | "None";

/**
 * Mirrors the C# record: Muonroi.ControlPlane.Api.LivingDocs.Models.FactRef
 */
export interface FactRef {
  name: string;
  label: string;
  dataType: string;
  description?: string | null;
}

/**
 * Mirrors the C# record: Muonroi.ControlPlane.Api.LivingDocs.Models.DecisionNarrative
 * One section of the living doc — one rule node's BA-readable description.
 */
export interface DecisionNarrative {
  nodeId: string;
  title: string;
  inputs: FactRef[];
  outputs: FactRef[];
  logicProse: string;  // BA-readable prose, no raw FEEL
  sourceKind: string;  // e.g. "feel" | "decision-table" | "nrules" | etc.
}

/**
 * Mirrors the C# record: Muonroi.ControlPlane.Api.LivingDocs.Models.Coverage
 */
export interface Coverage {
  unitTestLinkedCount: number;
  dryRunExampleCount: number;
  noCoverageCount: number;
  totalNodes: number;
}

/**
 * Mirrors the C# record: Muonroi.ControlPlane.Api.LivingDocs.Models.LivingDoc
 *
 * The top-level response from GET /api/v1/living-docs/{workflow}/{version}.
 * Provenance: drift-proofing covers rule-logic layer only (C-04).
 */
export interface LivingDocModel {
  workflow: string;
  version: number;
  tenantId: string;
  generatedAt: string;              // ISO 8601
  generatedFromVersionHash: string; // SHA-256 provenance hash
  sections: DecisionNarrative[];
  factDictionary: FactRef[];
  coverage: Coverage;
}

/**
 * Mirrors C# TestCoverageInfo (inner object in TraceabilityMatrixRow).
 */
export interface TestCoverageInfo {
  state: TestCoverageState;
  linkedTestIds?: string[] | null;
  exampleCount?: number | null;
}

/**
 * Mirrors C# RequirementRef (inner object in TraceabilityMatrixRow).
 */
export interface RequirementRef {
  requirementId: string;
  title?: string | null;
  source?: string | null;
}

/**
 * Mirrors C# DecisionTableCellInfo (optional inner object in TraceabilityMatrixRow).
 */
export interface DecisionTableCellInfo {
  columnCount: number;
  rowCount: number;
  hitPolicy: string;
}

/**
 * Mirrors the C# record: Muonroi.ControlPlane.Api.LivingDocs.Traceability.Models.TraceabilityMatrixRow
 *
 * One row in the traceability matrix — one rule node mapped to its requirements + test coverage.
 * Consumed from GET /api/v1/traceability/{workflow}/{version}.
 */
export interface TraceabilityMatrixRow {
  nodeId: string;
  title: string;
  nodeType: string;                      // "feel" | "decision-table" | "nrules" | etc.
  requirements: RequirementRef[];
  testCoverage: TestCoverageInfo;
  decisionTable?: DecisionTableCellInfo | null;
}
