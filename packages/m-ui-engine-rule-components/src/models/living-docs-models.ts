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
 * Mirrors C# TestCoverageInfo (inner object in TraceabilityMatrixRow + ImpactRow).
 *
 * Authoritative shape from plan-01 serialized ImpactListResponse:
 *   { state, exampleId?, unitTestCode? }
 * DRIFT FIX: replaced stale { linkedTestIds?, exampleCount? } with correct fields.
 */
export interface TestCoverageInfo {
  state: TestCoverageState;
  exampleId?: string | null;
  unitTestCode?: string | null;
}

/**
 * Mirrors C# RequirementRef (inner object in TraceabilityMatrixRow + ImpactRow).
 *
 * Authoritative shape from plan-01 serialized ImpactListResponse:
 *   { id, title, sourceRef?, approver? }
 * DRIFT FIX: replaced stale { requirementId, title?, source? } with correct camelCase fields.
 * approver is required for the D-05 Approver column.
 */
export interface RequirementRef {
  id: string;
  title?: string | null;
  sourceRef?: string | null;
  approver?: string | null;
}

/**
 * Mirrors C# DecisionTableCellInfo (optional inner object in TraceabilityMatrixRow).
 *
 * DRIFT FIX: replaced stale { columnCount, rowCount, hitPolicy } with full 5-field shape.
 */
export interface DecisionTableCellInfo {
  tableId: string;
  hitPolicy: string;
  inputColumnCount: number;
  outputColumnCount: number;
  rowCount: number;
}

// ---------------------------------------------------------------------------
// Impact analysis types (plan-01 ImpactListResponse — Phase 05)
// ---------------------------------------------------------------------------

/**
 * One row in the impact list (D-05 columns).
 * Mirrors C# ImpactRow (ImpactListResponse.cs).
 */
export interface ImpactRow {
  nodeId: string;
  title: string;
  /** RequirementRef MUST carry approver after the drift fix above. */
  requirements: RequirementRef[];
  /** Three-state coverage. DryRunExampleOnly is NEVER "covered" (C-01). */
  testCoverage: TestCoverageInfo;
  /** "allow→block" | "block→allow" | "none" (Unicode → U+2192) */
  impactType: string;
}

/**
 * One UAT checklist case (D-02 — grouped under a UatRuleGroup).
 * Mirrors C# UatCase (ImpactListResponse.cs).
 */
export interface UatCase {
  exampleId: string;
  expectedOutcome: "allow" | "block";
  /** Three-state; DryRunExampleOnly is NEVER badge--success (C-01). */
  coverageBadge: TestCoverageState;
}

/**
 * Top-level impact list response.
 * Mirrors C# ImpactListResponse (ImpactListResponse.cs).
 * Authoritative JSON shape confirmed in plan-01 SUMMARY §ImpactListResponse JSON Shape.
 */
export interface ImpactListResponse {
  workflow: string;
  fromVersion: number;
  toVersion: number;
  rows: ImpactRow[];
  uatChecklist: {
    nodeId: string;
    title: string;
    cases: UatCase[];
  }[];
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

/**
 * Mirrors the C# record: Muonroi.ControlPlane.Api.LivingDocs.Traceability.Models.TraceabilityMatrixResponse
 *
 * The top-level envelope from GET /api/v1/traceability/{workflow}/{version}.
 *
 * Round-trip provenance (D-06 / TRACE-01, Phase 17): when this version was produced from an
 * ingested source document, `sourceDocumentId` (tenant-internal GUID) and `sourceRef` (human-readable
 * issue/page key for display) are non-null. For manually-authored / NL-copilot versions both are null —
 * the UI then shows NO provenance (honest: never a fabricated source link).
 *
 * The provenance is VERSION-scoped (envelope-level), NOT per-node. Mirror of the C# record:
 *   TraceabilityMatrixResponse(string Workflow, int Version, IReadOnlyList<TraceabilityMatrixRow> Rows,
 *                              Guid? SourceDocumentId = null, string? SourceRef = null)
 * JSON (camelCase): workflow, version, rows, sourceDocumentId (string|null GUID), sourceRef (string|null).
 */
export interface TraceabilityMatrixResponse {
  workflow: string;
  version: number;
  rows: TraceabilityMatrixRow[];
  /** Tenant-internal source-document GUID; non-null only for ingested versions. Carried for linking, not rendered raw (T-17-16). */
  sourceDocumentId?: string | null;
  /** Human-readable source reference (issue/page key) for display; non-null only for ingested versions. */
  sourceRef?: string | null;
}
