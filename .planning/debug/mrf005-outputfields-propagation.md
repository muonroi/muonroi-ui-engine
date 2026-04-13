---
status: verifying
trigger: "MRF005 validation error: barge.isBarge not in upstream scope of cond-barge-check despite being declared in rule-barge outputFields"
created: 2026-03-19T00:00:00Z
updated: 2026-03-19T00:01:00Z
---

## Current Focus

hypothesis: CONFIRMED — graph converter at m-rule-flow-graph-converter.ts:248-256 filters out code-first outputFields for condition nodes
test: Fix applied, build succeeded, deployed to consumer app
expecting: MRF005 error for barge.isBarge should no longer appear
next_action: Human verification needed

## Symptoms

expected: Code-first rule outputFields (e.g. barge.isBarge declared on rule-barge node) should propagate through upstream scope to downstream nodes like cond-barge-check.
actual: MRF005 error blocks publish. barge.isBarge not in upstream scope of cond-barge-check despite being declared in rule-barge's data.outputFields.
errors: "MRF005 [cond-barge-check] Expression references 'barge.isBarge' but that field is not available in input scope."
reproduction: Load Rule Studio with v24 flow (FCD_V4_RULES). The flow has code-first condition nodes with outputFields declarations (empty valueExpression). MRF005 fires for cond-barge-check.
started: outputFields were added to code-first rule nodes in v24. Previous fix attempted to include them in buildOutputContract but they're not showing up.

## Eliminated

- hypothesis: buildOutputContract not combining overrideFields correctly with MMergeFields
  evidence: MMergeFields works correctly — it merges by path. The problem is upstream: the fields never reach buildOutputContract because the converter destroys them.
  timestamp: 2026-03-19T00:00:30Z

- hypothesis: MNormalizeNodeData drops outputFields during normalization
  evidence: MNormalizeNodeData uses ...candidate spread which preserves outputFields. The issue is the converter sets outputFields=[] BEFORE normalization runs.
  timestamp: 2026-03-19T00:00:40Z

## Evidence

- timestamp: 2026-03-19T00:00:10Z
  checked: m-rule-flow-graph-converter.ts lines 247-257 — how outputFields is set for condition nodes
  found: For condition nodes, outputFields is derived from contractOverride.responseFields filtered by non-empty valueExpression. Code-first nodes have empty valueExpression, so all their fields are filtered out.
  implication: This is the root cause — outputFields is set to [] for code-first condition nodes

- timestamp: 2026-03-19T00:00:20Z
  checked: MNormalizeNodeData — how it processes outputFields and contractOverride
  found: When outputFields=[] and no contractOverride exists, normalizer produces contractOverride=undefined. No fields survive to buildOutputContract.
  implication: Confirms the converter is the root source of data loss

- timestamp: 2026-03-19T00:00:30Z
  checked: buildOutputContract lines 280-370 for condition nodes
  found: Both overrideFields (from contractOverride.responseFields) and nodeOutputFields (from data.outputFields) are empty after converter destroys them. Output is just resultPayload.
  implication: Downstream nodes never see barge.isBarge in upstream scope → MRF005 fires

- timestamp: 2026-03-19T00:00:50Z
  checked: The previous fix at lines 286-296 (declaredOutputFields)
  found: This fix reads node.data.outputFields but it's already [] after the converter. The fix was correct in intent but ineffective because data was destroyed upstream.
  implication: Fix must be in the converter, not in buildOutputContract

## Resolution

root_cause: MRuleFlowGraphConverter.MNormalizeGraph (line 248-256) filters condition node outputFields to only include fields with non-empty valueExpression. Code-first condition nodes declare FactBag outputs with empty valueExpression (runtime provides values), so their field declarations are silently dropped. This means barge.isBarge never enters the output contract, never appears in downstream upstream scope, and MRF005 correctly reports it as missing.
fix: Modified the converter to also include code-first output declarations (fields from data.outputFields with empty/no valueExpression) alongside expression-based fields. Deduplicates by path with expression fields taking priority.
verification: Build succeeds. Awaiting human verification in Rule Studio.
files_changed:
  - packages/m-ui-engine-rule-components/src/utils/m-rule-flow-graph-converter.ts
