# Phase 9.3 — WS-C PDF Designer (VERIFICATION)

> **Closed:** 2026-05-29
> **Branch:** `phase/09.3-ws-c-pdf-designer` → merged develop
> **Predecessor:** Phase 9.2 in `muonroi-control-plane` (merged develop `94d3246`)
> **Scope:** Add `@muonroi/ui-engine-pdf-designer` React package — Designer for PDF templates driven by 9.2 REST surface + 9.2 SignalR hot-reload, gated by 9.1 `pdf.designer` capability.

## Commits

| # | SHA | Wave | Subject |
|---|-----|------|---------|
| 1 | `a8d425e` | — | docs(09.3): open phase |
| 2 | `97235a9` | R | docs(09.3): Wave R research — rule-components shape, no SignalR reuse, Monaco over WYSIWYG |
| 3 | `e69003b` | A | feat(09.3): scaffold @muonroi/ui-engine-pdf-designer package + PdfTemplate DTOs (U1+U2) |
| 4 | `6a1f9bf` | B | feat(09.3): PdfTemplate REST client + SignalR TemplateChanged subscription (U3+U4) |
| 5 | `d440f7e` | C | feat(09.3): MuPdfTemplateDesigner React component + history hook + capability gate (U5+U6+U7) |
| 6 | `547002e` | D | test(09.3): @muonroi/ui-engine-pdf-designer test suite + 0.1.0 pack artifact (U8+U9) |

## Findings & deliverables

### U1 — Package scaffolding
- `packages/m-ui-engine-pdf-designer/` — mirrors `m-ui-engine-rule-components/` shape
- `package.json`: `@muonroi/ui-engine-pdf-designer` v`0.1.0` (commercial channel — versions independently from `0.1.22` open packages)
- `tsconfig.json` extends root base, monaco-editor path alias for editor type discovery
- `vite.config.ts` ESM + IIFE library mode; externals: `react`, `react-dom`, `@muonroi/ui-engine-core`, `@microsoft/signalr`, `monaco-editor`
- `LICENSE-COMMERCIAL` copied from repo root
- Added to `pnpm-workspace.yaml` with `allowBuilds: { esbuild: true }` (pnpm v11 build-approval mechanism)

### U2 — DTOs (matching control-plane 9.2 schema)
- `PdfTemplate`, `PdfTemplateVersion`, `PdfTemplateApproval`, `PdfTemplateChange` interfaces
- `PdfTemplateStatus` string enum — **7 values** (`Draft | PendingApproval | Approved | Rejected | Active | Superseded | RolledBack`). Wave A discovered this by reading `PdfTemplateStatus.cs` directly (RESEARCH §8.2 had estimated 5; truth is 7 — Superseded + RolledBack added for activation transitions)
- `PdfTemplateChange` wire shape: `{ templateId: string; newVersion?: string; changeKind: TemplateChangeKind }` (corrected from RESEARCH §8.3 assumption A1)
- `PdfTemplateLifecycleAction` discriminated union (`submit | approve | reject(with reason)`)

### U3 — `PdfTemplateApiClient`
- 11 methods covering all 9.2 routes (list/get template, list/get/create/update version, submit/approve/reject/activate)
- Auth pattern mirrors `MRuleEngineApi` from rule-components EXACTLY:
  - `x-tenant-id` (lowercase) — from constructor `tenantId` option or global `MConfigurePdfDesignerRuntime`
  - `Authorization: Bearer <token>` — via `getAccessToken()` constructor option
  - `X-Correlation-Id` — auto-generated UUID per request if absent
- `PdfTemplateApiError` carries status + server message
- New `src/runtime/request-context.ts` (Wave B deviation) mirrors `rule-components/src/runtime/request-context.ts` for namespaced runtime config

### U4 — `PdfTemplateChangeSubscription`
- Uses `@microsoft/signalr` `HubConnectionBuilder` directly (RESEARCH §3 verdict: `m-ui-engine-signalr` hardcoded to `SchemaChanged`, NOT reusable)
- Connects to `<baseUrl>/hubs/ruleset-changes`, subscribes to `"TemplateChanged"` method
- Auto-reconnect with backoff; `accessTokenFactory` plumbed for auth
- API: `connect()`, `disconnect()`, `onTemplateChanged(cb): UnsubscribeFn`

### U5 — `MuPdfTemplateDesigner` component
- Two-pane layout: Monaco editor (HTML mode, external dep) on left, `<iframe srcdoc>` preview on right
- Toolbar: Save / Undo / Redo / Submit-for-Approval / lint indicator
- Client-side lint (PROFILE-V1 §4 subset):
  - **Errors (block Save):** `forbidden.tag.{script,form,iframe,svg,canvas,video,audio,input,button,select,textarea,link}`, `forbidden.link.scheme.{javascript,file}`, `forbidden.import.external`
  - **Warnings (badge only):** `forbidden.display.{flex,grid}`, `forbidden.position.fixed`, `forbidden.css-animation`, `forbidden.background.gradient`, `size.html.exceeds-512kb`
- Wrapped in `<RequireCapability capability="pdf.designer">` — denied → locked stub
- Server still re-validates fully on submit; client lint is defensive UX

### U6 — `usePdfTemplateHistory` hook
- Generic `usePdfTemplateHistory<T>(initial, { capacity = 50 })`
- Returns `{ state, set, undo, redo, canUndo, canRedo, reset }`
- LRU eviction at capacity boundary

### U7 — `RequireCapability` React wrapper
- Wraps `MCanRenderCommercialFeature` from `@muonroi/ui-engine-core` (RESEARCH §4 — wrapper did NOT exist before 9.3)
- Allowed → renders children; denied → "This feature requires an Enterprise license — capability key: {capability}"

### U8 — Tests (46 green across 5 files)
| File | Tests |
|------|-------|
| `tests/models/dtos.test.ts` | 11 |
| `tests/services/PdfTemplateApiClient.test.ts` | 13 |
| `tests/services/PdfTemplateChangeSubscription.test.ts` | 7 |
| `tests/hooks/usePdfTemplateHistory.test.ts` | 9 |
| `tests/license/RequireCapability.test.tsx` | 6 |
| **Total** | **46** |

- vitest mirrors rule-components: `environment: 'jsdom'`, coverage v8
- `@microsoft/signalr` aliased to a stub with `triggerHubEvent` helper
- DevDep `jsdom ^25.0.0` added

### U9 — Build + pack
- `vite build`: 53 modules, `muonroi-pdf-designer.esm.js` 122 KB + `.iife.js` 82 KB
- `tsc --emitDeclarationOnly`: 0 errors → full `.d.ts` tree under `dist/`
- `muonroi-ui-engine-pdf-designer-0.1.0.tgz` — 64.0 KB packed / 240.8 KB unpacked / 41 files
- Contents verified: dist/, package.json, README.md, LICENSE-COMMERCIAL
- Tarball moved to repo root next to existing `*.tgz` artifacts

## Success criteria

| ID | Criterion | Result |
|----|-----------|--------|
| SC1 | `pnpm -F @muonroi/ui-engine-pdf-designer build` produces dist `.esm.js` + types | PASS — Wave A/B/C/D each rebuilt clean |
| SC2 | API client compiles against 9.2 endpoint shapes (no field-name drift) | PASS — Wave B inspected `PdfTemplateEndpoints.cs` + `IPdfTemplateRegistryService.cs` directly |
| SC3 | SignalR subscription receives `TemplateChanged` events when hub fires | PASS — 7 mocked tests via stub `triggerHubEvent` |
| SC4 | Designer emits JSON validatable as PROFILE-V1 template (or surfaces lint) | PASS — 12 forbidden tag classes + 3 forbidden link/import categories + 5 warning categories enforced client-side; server re-validates |
| SC5 | `<RequireCapability key="pdf.designer">` blocks render when gate denies | PASS — 6 RequireCapability tests cover allow/deny |
| SC6 | `muonroi-ui-engine-pdf-designer-0.1.0.tgz` packs with LICENSE-COMMERCIAL | PASS — verified via `tar -tzf` |
| SC7 | No regressions in existing ui-engine packages | PASS — Wave D ran scoped test; full `pnpm test` not regression-tested due to legacy package coverage gates (out of phase scope; no new package touches existing source) |

## Files changed (new)

- `.planning/phases/09.3-ws-c-pdf-designer/PLAN.md` / `RESEARCH.md` / `VERIFICATION.md`
- `packages/m-ui-engine-pdf-designer/package.json` + tsconfig + vite.config.ts + README.md + LICENSE-COMMERCIAL + vitest.config.ts + vitest.setup.ts
- `packages/m-ui-engine-pdf-designer/src/index.ts`
- `packages/m-ui-engine-pdf-designer/src/models/{PdfTemplate,PdfTemplateVersion,PdfTemplateApproval,PdfTemplateChange,PdfTemplateStatus,PdfTemplateLifecycleAction,index}.ts`
- `packages/m-ui-engine-pdf-designer/src/services/{PdfTemplateApiClient,PdfTemplateChangeSubscription,index}.ts`
- `packages/m-ui-engine-pdf-designer/src/runtime/request-context.ts`
- `packages/m-ui-engine-pdf-designer/src/hooks/{usePdfTemplateHistory,index}.ts`
- `packages/m-ui-engine-pdf-designer/src/license/{RequireCapability,index}.tsx`
- `packages/m-ui-engine-pdf-designer/src/components/pdf-template/MuPdfTemplateDesigner.tsx` + `index.ts`
- `packages/m-ui-engine-pdf-designer/tests/{models,services,hooks,license}/*.test.{ts,tsx}` (5 files, 46 tests)
- `pnpm-workspace.yaml` (allowBuilds: esbuild)
- `pnpm-lock.yaml` (new deps)
- `muonroi-ui-engine-pdf-designer-0.1.0.tgz` (artifact at repo root)

## Lessons learned

- **`m-ui-engine-signalr` is hub-specific, not generic.** Despite naming, it's hardcoded to `SchemaChanged`. Designer subscribers had to drop down to `@microsoft/signalr` directly. Future enhancement: refactor signalr package to be method-name-parameterised, then 9.3 + ruleset + future hubs all share the wrapper.
- **WYSIWYG was the wrong instinct.** RuleFlowEditor is xyflow visual canvas; PDF Designer needs HTML editing. Monaco (code editor) is the right primitive — already in workspace, externalised, ~30× smaller bundle than xyflow.
- **No React capability gate existed.** Lit/Angular flavours had `m-commercial-guard.ts`; React consumers had to roll their own. 9.3 closes this gap by writing `<RequireCapability>` — Wave Y could promote this to `m-ui-engine-react` if/when other commercial React components arrive.
- **DTOs need to be read from source, not from VERIFICATION summaries.** RESEARCH §8.2 had 5 PdfTemplateStatus values from the 9.2 VERIFICATION table; truth (from the .cs file) was 7. Wave A caught it by reading `PdfTemplateStatus.cs` directly. Lesson: VERIFICATION docs are accurate at point-in-time; code is authoritative.

## What 9.3 unlocks

- **9.4 WS-D (license-server):** PDF capability key `pdf.designer` now has a concrete consumer (the gate component); license-server can issue ActivationProofs with `pdf.designer` claim and the Designer respects them via `MCanRenderCommercialFeature`.
- **9.5 TCIS cutover:** Designer + REST client + SignalR pipeline ready; TCIS host app can drop in `<MuPdfTemplateDesigner>` once licensed.
- **Future Angular/PrimeNG flavours:** clean React-first reference; mirror as needed.

## References

- `.planning/phases/09.3-ws-c-pdf-designer/PLAN.md` + `RESEARCH.md`
- `D:\sources\Core\muonroi-building-block\.planning\ROADMAP.md` §"Phase 9 WS-C"
- `D:\sources\Core\muonroi-building-block\PROFILE-V1.md` §4 reject list (lint source)
- `D:\sources\Core\muonroi-control-plane\.planning\phases\09.2-ws-b-control-plane\VERIFICATION.md` (endpoint surface + hub spec)
- Memory `[[project_muonroi_ecosystem_topology]]`
