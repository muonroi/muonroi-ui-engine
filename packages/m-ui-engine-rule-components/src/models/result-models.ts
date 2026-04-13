/**
 * Per-rule execution result.
 * Matches OrchestratorResult.RuleResults[key].
 */
export interface MRuleResult {
  ruleCode: string;
  isPass: boolean;
  errors: string[];
  elapsedMs?: number;
}

/**
 * Aggregated validation summary.
 * Matches the shape returned by validate-rules endpoints.
 */
export interface MValidationSummary {
  isAllPassed: boolean;
  totalRules: number;
  passedCount: number;
  failedCount: number;
  totalElapsedMs: number;
  ruleResults: MRuleResult[];
}

/**
 * Container-level error detail (ePORT-specific but typed generically).
 */
export interface MValidationDetailError {
  entityId: string;
  messages: { type: string; content: string }[];
}
