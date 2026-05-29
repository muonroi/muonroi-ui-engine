# Phase 9.3 — WS-C PDF Designer (PLAN)

> **Branch:** `phase/09.3-ws-c-pdf-designer`
> **Predecessor:** Phase 9.2 in `muonroi-control-plane` (merged develop `94d3246`) — REST surface + SignalR hot-reload live
> **Parent:** ROADMAP (building-block) Phase 9, Workstream C
> **Scope:** Add `@muonroi/ui-engine-pdf-designer` package — React Designer component for PDF templates, mirroring `MuRuleFlowEditor` shape from `m-ui-engine-rule-components`.

## Goal

Enterprise tenants edit PDF templates through a React component that emits only **PROFILE-V1**-valid layout. The component talks to control-plane's `/api/v1/control-plane/pdf-templates/*` endpoints (Phase 9.2), subscribes to `RuleSetChangeHub` `TemplateChanged` events for live preview, and gates premium features through `pdf.designer` capability (Phase 9.1).

## Mirror map

| Existing (rule-components) | New (pdf-designer) |
|---|---|
| `packages/m-ui-engine-rule-components/` | `packages/m-ui-engine-pdf-designer/` |
| `components/rule-flow/MuRuleFlowEditor.tsx` | `components/pdf-template/MuPdfTemplateDesigner.tsx` |
| `hooks/useRuleFlowHistory.ts` | `hooks/usePdfTemplateHistory.ts` |
| `services/` (REST client for rulesets) | `services/PdfTemplateApiClient.ts` |
| SignalR ruleset change subscription | `services/PdfTemplateChangeSubscription.ts` (uses `m-ui-engine-signalr`) |
| `models/` ruleset DTOs | `models/` PdfTemplate DTOs matching control-plane 9.2 schema |
| `license/` capability gate | reuse — gate component under `pdf.designer` |
| `register-flow.ts` | `register-pdf-template.ts` |

## In-scope

| ID | Item | Notes |
|----|------|-------|
| U1 | Create `packages/m-ui-engine-pdf-designer/` with package.json, tsconfig, vite config, README — mirror rule-components scaffolding | Commercial pkg license (LICENSE-COMMERCIAL); add to pnpm-workspace |
| U2 | DTOs in `models/` matching 9.2 schema | `PdfTemplate`, `PdfTemplateVersion`, `PdfTemplateChange`, `PdfTemplateStatus` enum, lifecycle action payloads |
| U3 | `PdfTemplateApiClient` service | Methods for each of the 11 endpoints in 9.2 (list/get/create/update/submit/approve/reject/activate); accepts base URL + auth token |
| U4 | `PdfTemplateChangeSubscription` service | Subscribes to `RuleSetChangeHub` `TemplateChanged` SignalR method; emits typed `TemplateChange` events to consumers; reuses `m-ui-engine-signalr` |
| U5 | `MuPdfTemplateDesigner` React component | Editor surface emitting **PROFILE-V1-valid** template JSON only; validates against capability contract before submit |
| U6 | `usePdfTemplateHistory` hook | Undo/redo history matching `useRuleFlowHistory` pattern |
| U7 | Capability gate wrapper | `<RequireCapability key="pdf.designer">` reused from `license/`; component renders feature-locked stub when gate denies |
| U8 | Vitest tests | API client mocked (MSW or fetch-mock), DTO serialization, history hook unit tests, designer render smoke test |
| U9 | Build output: `muonroi-ui-engine-pdf-designer-0.1.0.tgz` via `npm pack` | Match version baseline of other 0.1.x packages OR start at 0.1.0-alpha if commercial-package versioning differs |

## Out-of-scope (deferred)

- Visual WYSIWYG canvas for layout primitives (Phase 9.x — large scope; v1 Designer accepts JSON-edit-form for template structure, no drag-drop layout yet — confirm with user; flag as Open Question 1)
- License-server PDF entitlement issuance (→ **9.4 WS-D**)
- TCIS cutover integration (→ **9.5**)
- Angular / PrimeNG flavor packages (parallel adapters; React first per ROADMAP §"new commercial component `@muonroi/ui-engine-pdf-designer`"; Angular/PrimeNG = later mirror sub-phases if needed)

## Waves

| Wave | Owner | Output |
|------|-------|--------|
| **R** | sonnet researcher | RESEARCH.md — full audit of `m-ui-engine-rule-components` shape (package.json, tsconfig, vite configs, build pipeline, license-gate pattern, SignalR consumer hook, REST client convention, test setup), capability gate plumbing, profile-v1 validation entry point from building-block |
| **A** | sonnet executor | U1 + U2 (package scaffolding + DTOs) |
| **B** | sonnet executor | U3 + U4 (API client + SignalR subscription) |
| **C** | sonnet executor | U5 + U6 + U7 (Designer component + history hook + capability gate) |
| **D** | sonnet executor | U8 + U9 (tests + build/pack) |
| **V** | opus verifier | VERIFICATION.md + merge develop |

A blocks B/C; D depends on all prior. B and C can parallel after A.

## Success criteria

| ID | Criterion | Verify |
|----|-----------|--------|
| SC1 | `pnpm -w build` produces `packages/m-ui-engine-pdf-designer/dist/*.esm.js` and types | Output file list |
| SC2 | API client compiles against 9.2 endpoint shapes (no field-name drift) | Manual diff vs 9.2 DTOs |
| SC3 | SignalR subscription receives `TemplateChanged` events when a real control-plane fires (smoke — manual or mocked) | Mock test with fake hub |
| SC4 | Designer emits JSON validatable as PROFILE-V1 template (uses validator from building-block if exposed, otherwise schema-only check) | Unit test |
| SC5 | `<RequireCapability key="pdf.designer">` blocks render when gate denies | Unit test |
| SC6 | `muonroi-ui-engine-pdf-designer-0.1.0.tgz` packs with LICENSE-COMMERCIAL embedded | `tar -tzf` |
| SC7 | All existing ui-engine tests still pass | `pnpm test` repo-wide |

## Risks / open questions (researcher must resolve)

1. **Designer editor surface — JSON-edit-form vs WYSIWYG canvas?** v1 Designer scope. Recommend JSON+form-based editor for 9.3, defer WYSIWYG to 9.x. RESEARCH should check what `MuRuleFlowEditor` is (visual flow editor) vs what makes sense here.
2. **PROFILE-V1 validation entry point** — building-block has the policy gate `LegacyPrintPolicy` (PROFILE-V1.md §4 reject list). Is there a public JSON-schema or validator the Designer can invoke client-side? If not, validation is server-side only on submit; Designer just shows lint warnings.
3. **SignalR client** — does `m-ui-engine-signalr` already speak to `RuleSetChangeHub`? Or does it abstract hubs? RESEARCH confirms.
4. **Versioning** — pin `0.1.0` or follow rule-components `0.1.22`? Commercial channel may version independently.
5. **Auth/tenant token plumbing** — how does rule-components pass tenant + auth token to the API client? Mirror exactly.

## Sequencing

R → A → (B ∥ C) → D → V → merge develop

## References

- `D:\sources\Core\muonroi-building-block\.planning\ROADMAP.md` §"Phase 9 WS-C"
- `D:\sources\Core\muonroi-building-block\PROFILE-V1.md` (Designer must emit valid templates only)
- `D:\sources\Core\muonroi-control-plane\.planning\phases\09.2-ws-b-control-plane\VERIFICATION.md` (endpoint surface + SignalR hub spec)
- `packages/m-ui-engine-rule-components/src/components/rule-flow/MuRuleFlowEditor.tsx` (mirror target)
- Memory `[[project_muonroi_ecosystem_topology]]`
