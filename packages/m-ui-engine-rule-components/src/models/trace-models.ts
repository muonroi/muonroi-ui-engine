/**
 * Matches Muonroi.RuleEngine.Core.Tracing.RuleTracePhase enum.
 */
export enum MRuleTracePhase {
  BeforeEval = 0,
  AfterEval = 1,
  AfterExec = 2,
  Error = 3,
  Compensate = 4,
}

/**
 * Matches Muonroi.RuleEngine.Core.Tracing.RuleTraceEntry record.
 * JSON-serialized by RuleTracingEndpoints GET /{tenantId}/traces.
 */
export interface MRuleTraceEntry {
  traceId: string;
  traceSessionId?: string | null;
  parentNodeId?: string | null;
  tenantId: string;
  correlationId: string;
  userId: string;
  sourceType: string;
  ruleName: string;
  ruleSetVersion: string;
  phase: MRuleTracePhase;
  executedAt: string; // ISO 8601
  elapsedMs: number;
  isSuccess: boolean;
  failureReason?: string | null;
  exceptionType?: string | null;
  exceptionMessage?: string | null;
  inputFactsJson?: string | null;
  outputFactsJson?: string | null;
  changedFactKeys?: string[] | null;
}

/**
 * Debugger mode status for a tenant.
 */
export interface MRuleDebuggerStatus {
  tenantId: string;
  isEnabled: boolean;
  enabledUntil?: string | null;
}

/**
 * Request to enable debugger mode.
 */
export interface MEnableDebuggerRequest {
  durationMinutes?: number; // default 30
}

/**
 * Trace query parameters.
 */
export interface MTraceQueryParams {
  correlationId?: string;
  from?: string; // ISO 8601
}
