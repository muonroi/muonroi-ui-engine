---
status: awaiting_human_verify
trigger: "Fix remaining 4 MRF009 warnings on cond-overweight and cond-barge-check nodes"
created: 2026-03-19T01:00:00Z
updated: 2026-03-19T01:05:00Z
---

## Current Focus

hypothesis: CONFIRMED — FEEL condition nodes (no ruleCode) include upstream-inherited fields in their output contract via rawResponseFields or nodeContract.responseDelta. These fields lack runtimeWritten/valueExpression, so MRF009 fires.
test: Filter baseFields for FEEL condition nodes to only include explicitly authored fields (with runtimeWritten or valueExpression)
expecting: MRF009 warnings for liner.count/liner.valid should disappear
next_action: Human verification needed in Rule Studio

## Symptoms

expected: MRF009 should NOT fire for liner.count/liner.valid on FEEL condition nodes because these fields are inherited from upstream code-first rules.
actual: Still 4 MRF009 warnings after fix at line 566-579.
errors: "Condition output 'liner.count' is metadata-only" and "liner.valid is metadata-only"
reproduction: Load Rule Studio with v24 flow. cond-overweight and cond-barge-check show MRF009 warnings.
started: After fixing MRF005 (converter now preserves code-first outputFields).

## Eliminated

## Evidence

- timestamp: 2026-03-19T01:00:10Z
  checked: buildOutputContract lines 271-386 — how rawResponseFields is sourced for condition nodes
  found: rawResponseFields comes from node.data.responseContract?.fields or nodeContract?.responseDelta?.fields. For FEEL condition nodes, either source may contain upstream-inherited fields (liner.count, liner.valid) that the condition doesn't actually produce.
  implication: These fields end up in annotatedBase and the output contract

- timestamp: 2026-03-19T01:00:20Z
  checked: Annotation logic at lines 309-314
  found: For condition without ruleCode: runtimeWritten = Boolean(field.runtimeWritten ?? field.valueExpression?.trim()). Server-returned fields have neither property, so runtimeWritten becomes false.
  implication: MRF009 filter correctly catches these but the real issue is they shouldn't be in the output at all

- timestamp: 2026-03-19T01:00:30Z
  checked: buildVisibleScopeFromSource propagation
  found: Downstream nodes get upstream + output from source. Removing fields from condition output doesn't break downstream scope because they're still available via the upstream propagation path.
  implication: Safe to filter these fields from condition output contract

- timestamp: 2026-03-19T01:03:00Z
  checked: Build after applying fix
  found: Build succeeds. The filter adds effectiveBase that excludes fields without runtimeWritten or valueExpression for FEEL condition nodes only.
  implication: Fix is syntactically correct, needs runtime verification

## Resolution

root_cause: FEEL condition nodes (no ruleCode) include upstream-inherited fields (liner.count, liner.valid) in their output contract via rawResponseFields (node.data.responseContract or nodeContract.responseDelta). These fields have no runtimeWritten flag or valueExpression, so the annotation at line 309-314 sets runtimeWritten=false. The MRF009 check at line 566-579 correctly detects them as "metadata-only" but the real issue is these fields shouldn't be in the condition's output contract — they're upstream scope, not condition outputs.
fix: Added effectiveBase filter in buildOutputContract (line 303-309) that filters baseFields for FEEL condition nodes (no ruleCode) to only include fields with runtimeWritten=true or valueExpression. Upstream-inherited fields without these markers are excluded from the condition's output contract entirely.
verification: Build succeeds. Awaiting human verification in Rule Studio.
files_changed:
  - packages/m-ui-engine-rule-components/src/components/rule-flow/rule-flow-authoring.ts
