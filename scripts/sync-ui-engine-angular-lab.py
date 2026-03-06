#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import pathlib
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Sync UI engine generated Angular lab from backend.")
    p.add_argument("--base-url", default="http://127.0.0.1:9021")
    p.add_argument("--token", required=True)
    p.add_argument("--tenant-id", default="")
    p.add_argument("--service-prefix", default="")
    p.add_argument("--output", default="src/app/ui-engine-generated")
    p.add_argument("--project-root", default=".")
    return p.parse_args()


def token(raw: str) -> str:
    t = raw.strip()
    return t if t.lower().startswith("bearer ") else f"Bearer {t}"


def unwrap(payload: Any) -> Any:
    if isinstance(payload, dict) and "result" in payload:
        return payload["result"]
    return payload


def get_json(base_url: str, bearer: str, tenant_id: str, path: str) -> Any:
    if not path.startswith("/"):
        path = f"/{path}"
    req = urllib.request.Request(f"{base_url.rstrip('/')}{path}")
    req.add_header("Authorization", bearer)
    if tenant_id.strip():
        req.add_header("TenantId", tenant_id.strip())
        req.add_header("X-Tenant-Id", tenant_id.strip())
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def write(path: pathlib.Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def write_json(path: pathlib.Path, payload: Any) -> None:
    write(path, json.dumps(payload, indent=2, ensure_ascii=True))


def find_contract(base_url: str, bearer: str, tenant_id: str) -> tuple[str, dict[str, Any]]:
    candidates = [
        "/api/v1/ui-engine/contract-info",
        "/api/v1/auth/ui-engine/contract-info",
        "/api/v1/ui-engine-lab/ui-engine/contract-info",
    ]
    for path in candidates:
        try:
            data = unwrap(get_json(base_url, bearer, tenant_id, path))
            if isinstance(data, dict):
                return path, data
        except (urllib.error.HTTPError, urllib.error.URLError):
            continue
    raise RuntimeError("contract-info not reachable")


def as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def normalize_catalog_route(route: str) -> str:
    cleaned = route.strip().lower()
    cleaned = cleaned.split("?", 1)[0]
    cleaned = re.sub(r"\{[^}]+\}", "", cleaned)
    cleaned = re.sub(r"/+", "/", cleaned).strip("/")
    if cleaned.startswith("api/"):
        cleaned = re.sub(r"^api/v\d+/?", "", cleaned)
    return cleaned.strip("/")


def route_roots(route: str) -> set[str]:
    normalized = normalize_catalog_route(route)
    if not normalized:
        return set()
    parts = [p for p in normalized.split("/") if p]
    roots: set[str] = set()
    roots.add(parts[0])
    if len(parts) >= 2:
        roots.add("/".join(parts[:2]))
    if len(parts) >= 3:
        roots.add("/".join(parts[:3]))
    roots.add("/".join(parts))
    return roots


def collect_route_candidates(apis: Any, bindings: Any) -> list[str]:
    with_rules: list[str] = []
    for b in as_list(bindings):
        entry = as_dict(b)
        if len(as_list(entry.get("rules"))) > 0:
            route = str(entry.get("endpointRoute", "")).strip()
            if route:
                with_rules.append(route)
    if with_rules:
        return with_rules

    routes: list[str] = []
    for a in as_list(apis):
        route = str(as_dict(a).get("route", "")).strip()
        if route:
            routes.append(route)
    return routes


def parse_service_prefixes(project_root: pathlib.Path) -> dict[str, set[str]]:
    services_root = project_root / "src" / "app" / "services"
    if not services_root.exists():
        return {}

    pattern = re.compile(r"""['"`]([a-z0-9-]+)\/api\/v\d+\/([^'"`]+)['"`]""", re.IGNORECASE)
    prefixes: dict[str, set[str]] = {}
    for ts_file in services_root.rglob("*.ts"):
        try:
            content = ts_file.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for m in pattern.finditer(content):
            prefix = m.group(1).strip().lower()
            suffix = m.group(2).strip().strip("/")
            if not prefix:
                continue
            if prefix not in prefixes:
                prefixes[prefix] = set()
            if suffix:
                prefixes[prefix].add(suffix.lower())
    return prefixes


def resolve_manifest_service_prefix(manifest: Any) -> str:
    m = as_dict(manifest)
    app_shell = as_dict(m.get("appShell"))
    hints = as_dict(m.get("generationHints"))
    for key in (
        "servicePrefix",
        "serviceName",
        "apiServicePrefix",
        "apiGatewayService",
        "uiEngineServicePrefix",
    ):
        value = hints.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip().strip("/")
    for key in ("servicePrefix", "serviceName", "apiServicePrefix"):
        value = app_shell.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip().strip("/")
    return ""


def discover_service_prefix(project_root: pathlib.Path, route_candidates: list[str]) -> str:
    service_map = parse_service_prefixes(project_root)
    if not service_map:
        return ""

    target_roots: set[str] = set()
    for route in route_candidates:
        target_roots.update(route_roots(route))
    if not target_roots:
        return ""

    best_prefix = ""
    best_score = 0
    for prefix, suffixes in service_map.items():
        score = 0
        for suffix in suffixes:
            suffix_roots = route_roots(f"/api/v1/{suffix}")
            if not suffix_roots:
                continue
            for tr in target_roots:
                if tr in suffix_roots:
                    score += 6
                    continue
                if any(tr.startswith(sr + "/") or sr.startswith(tr + "/") for sr in suffix_roots):
                    score += 3
                    continue
                if tr.split("/", 1)[0] in {sr.split("/", 1)[0] for sr in suffix_roots}:
                    score += 1
        if score > best_score:
            best_score = score
            best_prefix = prefix
    return best_prefix


def ensure_route(project_root: pathlib.Path) -> None:
    entry = project_root / "src" / "app" / "pages" / "ui-engine-lab" / "ui-engine-lab.entry.component.ts"
    write(
        entry,
        """import { Component } from '@angular/core';
import { UiEngineLabGeneratedComponent } from '@/ui-engine-generated/lab/ui-engine-lab.generated.component';
@Component({
  selector: 'app-ui-engine-lab-entry',
  standalone: true,
  imports: [UiEngineLabGeneratedComponent],
  template: '<app-ui-engine-lab-generated />',
})
export class UiEngineLabEntryComponent {}
""",
    )

    route_file = project_root / "src" / "app" / "features" / "feature.routing.ts"
    content = route_file.read_text(encoding="utf-8")
    if "path: 'ui-engine-lab'" in content:
        return
    marker = "export const FEATURE_ROUTES: Routes = ["
    insert = """export const FEATURE_ROUTES: Routes = [
    {
        path: 'ui-engine-lab',
        loadComponent: () => import('@/pages/ui-engine-lab/ui-engine-lab.entry.component').then((m) => m.UiEngineLabEntryComponent)
    },
"""
    route_file.write_text(content.replace(marker, insert, 1), encoding="utf-8")


def main() -> int:
    args = parse_args()
    base_url = args.base_url
    bearer = token(args.token)
    tenant_id = args.tenant_id
    gen = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    contract_path, contract = find_contract(base_url, bearer, tenant_id)
    manifest_ep = contract.get("currentManifestEndpoint", "/api/v1/ui-engine/current")
    schema_ep = contract.get("schemaHashEndpoint", "/api/v1/ui-engine/schema-hash")
    manifest = unwrap(get_json(base_url, bearer, tenant_id, str(manifest_ep)))
    schema = unwrap(get_json(base_url, bearer, tenant_id, str(schema_ep)))
    apis = unwrap(get_json(base_url, bearer, tenant_id, "/api/v1/ui-engine/catalog/apis"))
    rules = unwrap(get_json(base_url, bearer, tenant_id, "/api/v1/ui-engine/catalog/rules"))
    bindings = unwrap(get_json(base_url, bearer, tenant_id, "/api/v1/ui-engine/catalog/bindings"))
    project_root = pathlib.Path(args.project_root)
    route_candidates = collect_route_candidates(apis, bindings)

    service_prefix = args.service_prefix.strip().strip("/")
    service_prefix_source = "cli"
    if not service_prefix:
        service_prefix = resolve_manifest_service_prefix(manifest)
        service_prefix_source = "manifest" if service_prefix else "auto-detect"
    if not service_prefix:
        service_prefix = discover_service_prefix(project_root, route_candidates)
        service_prefix_source = "auto-detect" if service_prefix else "fallback"

    out = pathlib.Path(args.output)
    write_json(out / "models" / "manifest.generated.json", manifest if isinstance(manifest, dict) else {})
    write_json(out / "models" / "catalog-apis.generated.json", apis if isinstance(apis, list) else [])
    write_json(out / "models" / "catalog-rules.generated.json", rules if isinstance(rules, list) else [])
    write_json(out / "models" / "catalog-bindings.generated.json", bindings if isinstance(bindings, list) else [])

    write(
        out / "core" / "schema.generated.ts",
        f"""/* AUTO-GENERATED ({gen}) */
export const UI_ENGINE_CONTRACT_ENDPOINT = '{contract_path}';
export const UI_ENGINE_MANIFEST_ENDPOINT = '{manifest_ep}';
export const UI_ENGINE_SCHEMA_HASH_ENDPOINT = '{schema_ep}';
export const UI_ENGINE_SCHEMA_HASH = '{(schema or {{}}).get('schemaHash','')}';
export const UI_ENGINE_SERVICE_PREFIX = '{service_prefix}';
export const UI_ENGINE_SERVICE_PREFIX_SOURCE = '{service_prefix_source}';
""",
    )
    write(
        out / "core" / "generation-meta.generated.ts",
        f"""/* AUTO-GENERATED ({gen}) */
export const UI_ENGINE_GENERATION_META = {{
  generatedAtUtc: '{gen}',
  generator: '@muonroi/ui-engine-sync (sync-ui-engine-angular-lab.py)',
  counts: {{ apis: {len(apis) if isinstance(apis,list) else 0}, rules: {len(rules) if isinstance(rules,list) else 0}, bindings: {len(bindings) if isinstance(bindings,list) else 0} }},
  serviceMapping: {{ prefix: '{service_prefix}', source: '{service_prefix_source}' }}
}} as const;
""",
    )

    write(
        out / "lab" / "ui-engine-lab.generated.types.ts",
        f"""/* AUTO-GENERATED ({gen}) */
export interface UiEngineContractInfo {{ currentManifestEndpoint: string; schemaHashEndpoint: string; }}
export interface UiEngineManifest {{ schemaVersion: string; tenantId?: string; }}
export interface UiEngineRuleRef {{ code: string; order: number; hookPoint: string; }}
export interface UiEngineRuleBinding {{ endpointRoute: string; httpMethod: string; contextType?: string; workflowName?: string; rules: UiEngineRuleRef[]; }}
export interface UiEngineCatalogApiDescriptor {{ route: string; httpMethod: string; }}
export interface UiEngineCatalogRuleDescriptor {{ code: string; dependsOn: string[]; source: string; }}
export interface RuleOrderChangeRequest {{ endpointRoute: string; tenantId: string; orderedRuleCodes: string[]; }}
export interface RuleOrderChangeValidationResult {{ isValid: boolean; errors: string[]; warnings: string[]; }}
export interface RuleChangeRecord {{ appliedAtUtc: string; appliedBy: string; newOrder: string[]; }}
export interface RuntimeWorkflowSummary {{ workflowName: string; activeVersion?: number; versions: number[]; }}
export interface RuntimeExportResponse {{ workflowName: string; version?: number; ruleSetJson: string; validationShape?: string; }}
export interface RuntimeValidationResult {{ isValid: boolean; shape?: string; errors: string[]; warnings?: string[]; }}
export interface RuntimeSaveResponse {{ workflowName: string; savedVersion: number; activeVersion?: number; activated: boolean; }}
export interface ManifestValidationResponse {{ isValid: boolean; errors: string[]; warnings: string[]; }}
export interface ManifestPromptResponse {{ prompt: string; missingFields: string[]; apiCount: number; ruleCount: number; }}
""",
    )

    write(
        out / "lab" / "ui-engine-lab.generated.gateway.ts",
        f"""/* AUTO-GENERATED ({gen}) */
import {{ HttpClient }} from '@angular/common/http';
import {{ Injectable }} from '@angular/core';
import {{ Observable, forkJoin, map, switchMap }} from 'rxjs';
import {{ ManifestPromptResponse, ManifestValidationResponse, RuleChangeRecord, RuleOrderChangeRequest, RuleOrderChangeValidationResult, RuntimeExportResponse, RuntimeSaveResponse, RuntimeValidationResult, RuntimeWorkflowSummary, UiEngineCatalogApiDescriptor, UiEngineCatalogRuleDescriptor, UiEngineContractInfo, UiEngineManifest, UiEngineRuleBinding }} from './ui-engine-lab.generated.types';
import {{ UI_ENGINE_CONTRACT_ENDPOINT, UI_ENGINE_MANIFEST_ENDPOINT, UI_ENGINE_SCHEMA_HASH_ENDPOINT, UI_ENGINE_SERVICE_PREFIX }} from '../core/schema.generated';
@Injectable({{ providedIn: 'root' }})
export class UiEngineLabGeneratedGateway {{
  constructor(private readonly http: HttpClient) {{}}
  loadSnapshot() {{
    return this.loadContractInfo().pipe(switchMap((contract) => forkJoin({{
      contract: [contract],
      manifest: this.http.get<unknown>(this.url(contract.currentManifestEndpoint || UI_ENGINE_MANIFEST_ENDPOINT)).pipe(map((x) => this.unwrap<UiEngineManifest>(x))),
      schema: this.http.get<unknown>(this.url(contract.schemaHashEndpoint || UI_ENGINE_SCHEMA_HASH_ENDPOINT)).pipe(map((x) => this.unwrap<any>(x))),
      apis: this.http.get<unknown>(this.url('/api/v1/ui-engine/catalog/apis')).pipe(map((x) => this.unwrap<UiEngineCatalogApiDescriptor[]>(x))),
      rules: this.http.get<unknown>(this.url('/api/v1/ui-engine/catalog/rules')).pipe(map((x) => this.unwrap<UiEngineCatalogRuleDescriptor[]>(x))),
      bindings: this.http.get<unknown>(this.url('/api/v1/ui-engine/catalog/bindings')).pipe(map((x) => this.unwrap<UiEngineRuleBinding[]>(x))),
    }})), map((all) => ({{ contract: all.contract[0], manifest: all.manifest, schema: all.schema, apis: all.apis, rules: all.rules, bindings: all.bindings }})));
  }}
  loadContractInfo(): Observable<UiEngineContractInfo> {{ return this.http.get<unknown>(this.url(UI_ENGINE_CONTRACT_ENDPOINT)).pipe(map((x) => this.unwrap<UiEngineContractInfo>(x))); }}
  loadRuntimeWorkflows(): Observable<RuntimeWorkflowSummary[]> {{ return this.http.get<unknown>(this.url('/api/v1/rule-engine/rulesets')).pipe(map((x) => this.unwrap<RuntimeWorkflowSummary[]>(x))); }}
  exportRuntimeWorkflow(workflow: string, version?: number): Observable<RuntimeExportResponse> {{ const q = version ? `?version=${{version}}` : ''; return this.http.get<unknown>(this.url(`/api/v1/rule-engine/rulesets/${{encodeURIComponent(workflow)}}/export${{q}}`)).pipe(map((x) => this.unwrap<RuntimeExportResponse>(x))); }}
  validateRuntimeWorkflow(workflow: string, ruleSet: unknown): Observable<RuntimeValidationResult> {{ return this.http.post<unknown>(this.url(`/api/v1/rule-engine/rulesets/${{encodeURIComponent(workflow)}}/validate`), {{ ruleSet }}).pipe(map((x) => this.unwrap<RuntimeValidationResult>(x))); }}
  saveRuntimeWorkflow(workflow: string, ruleSet: unknown, activateAfterSave: boolean, detail?: string): Observable<RuntimeSaveResponse> {{ return this.http.post<unknown>(this.url(`/api/v1/rule-engine/rulesets/${{encodeURIComponent(workflow)}}`), {{ ruleSet, activateAfterSave, detail }}).pipe(map((x) => this.unwrap<RuntimeSaveResponse>(x))); }}
  activateRuntimeWorkflow(workflow: string, version: number, detail?: string): Observable<RuntimeWorkflowSummary> {{ return this.http.post<unknown>(this.url(`/api/v1/rule-engine/rulesets/${{encodeURIComponent(workflow)}}/activate/${{version}}`), {{ detail }}).pipe(map((x) => this.unwrap<RuntimeWorkflowSummary>(x))); }}
  validateRuleOrder(request: RuleOrderChangeRequest): Observable<RuleOrderChangeValidationResult> {{ return this.http.post<unknown>(this.url('/api/v1/ui-engine/changes/validate'), request).pipe(map((x) => this.unwrap<RuleOrderChangeValidationResult>(x))); }}
  applyRuleOrder(request: RuleOrderChangeRequest): Observable<RuleChangeRecord> {{ return this.http.post<unknown>(this.url('/api/v1/ui-engine/changes/apply'), request).pipe(map((x) => this.unwrap<RuleChangeRecord>(x))); }}
  loadRuleOrderHistory(endpointRoute: string, tenantId: string): Observable<RuleChangeRecord[]> {{ return this.http.get<unknown>(this.url(`/api/v1/ui-engine/changes/history?endpointRoute=${{encodeURIComponent(endpointRoute)}}&tenantId=${{encodeURIComponent(tenantId)}}`)).pipe(map((x) => this.unwrap<RuleChangeRecord[]>(x))); }}
  validateManifest(manifest: unknown): Observable<ManifestValidationResponse> {{ return this.http.post<unknown>(this.url('/api/v1/ui-engine/manifest/validate'), manifest).pipe(map((x) => this.unwrap<ManifestValidationResponse>(x))); }}
  generateManifestPrompt(manifest: unknown, catalogApis: UiEngineCatalogApiDescriptor[], catalogRules: UiEngineCatalogRuleDescriptor[]): Observable<ManifestPromptResponse> {{ return this.http.post<unknown>(this.url('/api/v1/ui-engine/manifest/generate-prompt'), {{ manifest, catalogApis, catalogRules }}).pipe(map((x) => this.unwrap<ManifestPromptResponse>(x))); }}
  private unwrap<T>(payload: unknown): T {{ if (payload && typeof payload === 'object' && 'result' in payload) return (payload as any).result as T; return payload as T; }}
  private url(path: string): string {{
    const p = path.startsWith('/') ? path : `/${{path}}`;
    const cfg = (window as any).runtimeConfig ?? {{}};
    const runtimeService = String(cfg?.uiEngineServiceName ?? cfg?.uiEngineServicePrefix ?? '').trim();
    const detectedService = String(UI_ENGINE_SERVICE_PREFIX ?? '').trim();
    const service = this.normalizeSegment(runtimeService || detectedService);
    const gatewayRoot = String(cfg?.apiUrl ?? '').trim();
    const serviceMap = (cfg?.uiEngineServiceBaseUrls ?? cfg?.serviceBaseUrls ?? {{}}) as Record<string, string>;

    if (service) {{
      const mappedBase = String(serviceMap?.[service] ?? '').trim();
      if (mappedBase) {{
        return this.joinPath(mappedBase, p);
      }}
    }}

    const explicitBase = String(cfg?.uiEngineBaseUrl ?? '').trim();
    if (explicitBase) {{
      return this.joinPath(explicitBase, p);
    }}

    if (service && gatewayRoot) {{
      return this.joinPath(gatewayRoot, `${{service}}${{p}}`);
    }}
    if (service) {{
      return this.joinPath('/', `${{service}}${{p}}`);
    }}
    if (gatewayRoot) {{
      return this.joinPath(gatewayRoot, p);
    }}
    return this.joinPath('/be', p);
  }}
  private joinPath(base: string, path: string): string {{
    const p = path.startsWith('/') ? path : `/${{path}}`;
    const b = String(base ?? '').trim();
    if (!b) return p;
    if (/^https?:\\/\\//i.test(b)) {{
      return `${{b.replace(/\\/+$/, '')}}${{p}}`;
    }}
    const normalized = (b.startsWith('/') ? b : `/${{b}}`).replace(/\\/+$/, '');
    return `${{normalized}}${{p}}`;
  }}
  private normalizeSegment(value: string): string {{
    return String(value ?? '').trim().replace(/^\\/+|\\/+$/g, '');
  }}
}}
""",
    )

    write(
        out / "lab" / "ui-engine-lab.generated.component.ts",
        f"""/* AUTO-GENERATED ({gen}) */
import {{ CommonModule }} from '@angular/common';
import {{ CdkDragDrop, DragDropModule, moveItemInArray }} from '@angular/cdk/drag-drop';
import {{ Component, OnInit }} from '@angular/core';
import {{ FormsModule }} from '@angular/forms';
import {{ ActivatedRoute }} from '@angular/router';
import {{ TenantService }} from '@/core/_authentication/tenant.service';
import {{ UI_ENGINE_GENERATION_META }} from '../core/generation-meta.generated';
import {{ UiEngineLabGeneratedGateway }} from './ui-engine-lab.generated.gateway';
import {{ ManifestPromptResponse, ManifestValidationResponse, RuleChangeRecord, RuleOrderChangeValidationResult, RuntimeValidationResult, RuntimeWorkflowSummary, UiEngineCatalogApiDescriptor, UiEngineCatalogRuleDescriptor, UiEngineContractInfo, UiEngineManifest, UiEngineRuleBinding }} from './ui-engine-lab.generated.types';
@Component({{ selector: 'app-ui-engine-lab-generated', standalone: true, imports: [CommonModule, FormsModule, DragDropModule], templateUrl: './ui-engine-lab.generated.component.html', styleUrl: './ui-engine-lab.generated.component.scss' }})
export class UiEngineLabGeneratedComponent implements OnInit {{
  activeBlock: 'mapping' | 'runtime' | 'manifest' | 'history' = 'mapping';
  readonly generationMeta = UI_ENGINE_GENERATION_META;
  isLoading = true; isValidatingOrder = false; isApplyingOrder = false; errorMessage = '';
  tenantId = ''; schemaHash = ''; contractInfo?: UiEngineContractInfo; manifest?: UiEngineManifest;
  apis: UiEngineCatalogApiDescriptor[] = []; rules: UiEngineCatalogRuleDescriptor[] = []; bindings: UiEngineRuleBinding[] = [];
  selectedBindingRoute = ''; editableRuleOrder: string[] = []; localOrderValidation: RuleOrderChangeValidationResult = {{ isValid: true, errors: [], warnings: [] }};
  orderValidation?: RuleOrderChangeValidationResult; applyRecord?: RuleChangeRecord; orderHistory: RuleChangeRecord[] = [];
  runtimeWorkflows: RuntimeWorkflowSummary[] = []; selectedWorkflow = ''; runtimeRuleSetJson = ''; runtimeValidation?: RuntimeValidationResult; runtimeSaveMessage = ''; runtimeError = ''; runtimeActivateAfterSave = true; isRuntimeBusy = false;
  manifestDraftJson = ''; manifestValidation?: ManifestValidationResponse; promptResult?: ManifestPromptResponse; promptText = ''; manifestError = ''; isManifestBusy = false;
  constructor(private readonly gateway: UiEngineLabGeneratedGateway, private readonly route: ActivatedRoute, private readonly tenantService: TenantService) {{}}
  ngOnInit(): void {{
    this.tenantId = this.route.snapshot.paramMap.get('tenantId') ?? this.tenantService.tenantValue?.tenantId ?? '';
    this.refresh();
  }}
  selectBlock(block: 'mapping' | 'runtime' | 'manifest' | 'history'): void {{ this.activeBlock = block; }}
  get selectedBinding(): UiEngineRuleBinding | undefined {{ return this.bindings.find((x) => x.endpointRoute === this.selectedBindingRoute); }}
  get selectedBindingHasRules(): boolean {{ return (this.selectedBinding?.rules?.length ?? 0) > 0; }}
  get selectedWorkflowSummary(): RuntimeWorkflowSummary | undefined {{ return this.runtimeWorkflows.find((x) => x.workflowName === this.selectedWorkflow); }}
  get selectedRulesWithMeta(): Array<{{ code: string; descriptor?: UiEngineCatalogRuleDescriptor }}> {{ return this.editableRuleOrder.map((code) => ({{ code, descriptor: this.rules.find((r) => r.code === code) }})); }}
  get effectiveOrderValidation(): RuleOrderChangeValidationResult {{ return this.orderValidation ?? this.localOrderValidation; }}
  get canApplyOrder(): boolean {{ return !!this.selectedBindingRoute && !!this.tenantId && this.editableRuleOrder.length > 0 && this.effectiveOrderValidation.isValid && !this.isApplyingOrder; }}
  onBindingChange(route: string): void {{
    this.selectedBindingRoute = route;
    this.rebuildEditableRuleOrder();
    this.localOrderValidation = this.validateOrderLocally(this.editableRuleOrder);
    this.orderValidation = undefined;
    this.applyRecord = undefined;
    this.orderHistory = [];
    this.loadHistory();
    const workflowFromBinding = this.selectedBinding?.workflowName ?? '';
    if (workflowFromBinding && this.runtimeWorkflows.some((x) => x.workflowName === workflowFromBinding)) {{
      this.selectedWorkflow = workflowFromBinding;
      this.loadRuntimeExport();
    }}
  }}
  onDropRule(event: CdkDragDrop<string[]>): void {{ if (event.previousIndex === event.currentIndex) return; const prev = [...this.editableRuleOrder]; moveItemInArray(this.editableRuleOrder, event.previousIndex, event.currentIndex); const attempted = this.validateOrderLocally(this.editableRuleOrder); if (!attempted.isValid) {{ this.editableRuleOrder = prev; this.localOrderValidation = this.validateOrderLocally(this.editableRuleOrder); this.orderValidation = {{ isValid: false, errors: ['Invalid reorder: dependency order violated. Change reverted.', ...attempted.errors], warnings: attempted.warnings }}; return; }} this.localOrderValidation = attempted; this.orderValidation = undefined; this.applyRecord = undefined; }}
  refresh(): void {{
    this.isLoading = true;
    this.errorMessage = '';
    this.gateway.loadSnapshot().subscribe({{
      next: (s) => {{
        this.contractInfo = s.contract;
        this.manifest = s.manifest;
        this.schemaHash = s.schema?.schemaHash || '';
        this.apis = [...(s.apis || [])];
        this.rules = [...(s.rules || [])].sort((a,b)=>a.code.localeCompare(b.code));
        this.bindings = [...(s.bindings || [])].sort((a,b)=>a.endpointRoute.localeCompare(b.endpointRoute));
        if (!this.tenantId) this.tenantId = s.manifest?.tenantId || this.tenantService.tenantValue?.tenantId || '';
        if (!this.selectedBindingRoute && this.bindings.length > 0) {{
          const preferred = this.bindings.find((x)=>(x.rules?.length ?? 0) > 0) ?? this.bindings[0];
          this.selectedBindingRoute = preferred.endpointRoute;
        }}
        this.rebuildEditableRuleOrder();
        this.localOrderValidation = this.validateOrderLocally(this.editableRuleOrder);
        this.manifestDraftJson = JSON.stringify(this.manifest ?? {{}}, null, 2);
        this.manifestValidation = undefined;
        this.promptResult = undefined;
        this.promptText = '';
        this.loadHistory();
        this.loadRuntimeWorkflows();
        this.isLoading = false;
      }},
      error: (e) => {{ this.errorMessage = this.extractErrorMessage(e); this.isLoading = false; }}
    }});
  }}
  loadRuntimeWorkflows(): void {{
    this.gateway.loadRuntimeWorkflows().subscribe({{
      next: (items) => {{
        this.runtimeWorkflows = [...(items || [])].sort((a,b)=>a.workflowName.localeCompare(b.workflowName));
        const preferred = this.selectedBinding?.workflowName ?? '';
        if (this.selectedWorkflow && this.runtimeWorkflows.some((x)=>x.workflowName===this.selectedWorkflow)) {{
          this.loadRuntimeExport();
          return;
        }}
        if (preferred && this.runtimeWorkflows.some((x)=>x.workflowName===preferred)) {{
          this.selectedWorkflow = preferred;
        }} else if (this.runtimeWorkflows.length > 0) {{
          this.selectedWorkflow = this.runtimeWorkflows[0].workflowName;
        }} else {{
          this.selectedWorkflow = '';
          this.runtimeRuleSetJson = '';
          return;
        }}
        this.loadRuntimeExport();
      }},
      error: (e) => {{ this.runtimeError = this.extractErrorMessage(e); }}
    }});
  }}
  onWorkflowChange(name: string): void {{
    this.selectedWorkflow = name;
    this.runtimeValidation = undefined;
    this.runtimeSaveMessage = '';
    this.runtimeError = '';
    this.loadRuntimeExport();
  }}
  loadRuntimeExport(version?: number): void {{
    if (!this.selectedWorkflow) return;
    this.isRuntimeBusy = true;
    this.gateway.exportRuntimeWorkflow(this.selectedWorkflow, version).subscribe({{
      next: (res) => {{
        this.runtimeRuleSetJson = this.prettyJson(res.ruleSetJson);
        this.runtimeValidation = {{ isValid: true, shape: res.validationShape, errors: [] }};
        this.isRuntimeBusy = false;
      }},
      error: (e) => {{ this.runtimeError = this.extractErrorMessage(e); this.isRuntimeBusy = false; }}
    }});
  }}
  validateRuntimeJson(): void {{
    const payload = this.tryParseJson(this.runtimeRuleSetJson, 'Runtime JSON');
    if (!payload.ok || !this.selectedWorkflow) return;
    this.isRuntimeBusy = true;
    this.gateway.validateRuntimeWorkflow(this.selectedWorkflow, payload.value).subscribe({{
      next: (res) => {{ this.runtimeValidation = res; this.isRuntimeBusy = false; }},
      error: (e) => {{ this.runtimeError = this.extractErrorMessage(e); this.isRuntimeBusy = false; }}
    }});
  }}
  saveRuntimeJson(): void {{
    const payload = this.tryParseJson(this.runtimeRuleSetJson, 'Runtime JSON');
    if (!payload.ok || !this.selectedWorkflow) return;
    this.isRuntimeBusy = true;
    this.gateway.saveRuntimeWorkflow(this.selectedWorkflow, payload.value, this.runtimeActivateAfterSave, 'ui-engine-lab save').subscribe({{
      next: (res) => {{
        this.runtimeSaveMessage = `Saved v${{res.savedVersion}}; active=${{res.activeVersion ?? 'n/a'}}; activated=${{res.activated}}`;
        this.isRuntimeBusy = false;
        this.loadRuntimeWorkflows();
      }},
      error: (e) => {{ this.runtimeError = this.extractErrorMessage(e); this.isRuntimeBusy = false; }}
    }});
  }}
  activateRuntimeVersion(version: number): void {{
    if (!this.selectedWorkflow) return;
    this.isRuntimeBusy = true;
    this.gateway.activateRuntimeWorkflow(this.selectedWorkflow, version, 'ui-engine-lab activate').subscribe({{
      next: (res) => {{
        this.runtimeSaveMessage = `Activated v${{res.activeVersion ?? version}}`;
        this.isRuntimeBusy = false;
        this.loadRuntimeWorkflows();
      }},
      error: (e) => {{ this.runtimeError = this.extractErrorMessage(e); this.isRuntimeBusy = false; }}
    }});
  }}
  validateOrder(): void {{ if (!this.selectedBindingRoute || !this.tenantId || this.editableRuleOrder.length === 0) return; const local = this.validateOrderLocally(this.editableRuleOrder); this.localOrderValidation = local; if (!local.isValid) {{ this.orderValidation = local; return; }} this.isValidatingOrder = true; const req = {{ endpointRoute: this.selectedBindingRoute, tenantId: this.tenantId, orderedRuleCodes: [...this.editableRuleOrder] }}; this.gateway.validateRuleOrder(req).subscribe({{ next: (r) => {{ this.localOrderValidation = r; this.orderValidation = r; this.isValidatingOrder = false; }}, error: (e) => {{ this.errorMessage = this.extractErrorMessage(e); this.isValidatingOrder = false; }} }}); }}
  applyOrder(): void {{ if (!this.selectedBindingRoute || !this.tenantId || this.editableRuleOrder.length === 0) return; const local = this.validateOrderLocally(this.editableRuleOrder); this.localOrderValidation = local; if (!local.isValid) {{ this.orderValidation = local; return; }} const req = {{ endpointRoute: this.selectedBindingRoute, tenantId: this.tenantId, orderedRuleCodes: [...this.editableRuleOrder] }}; this.isApplyingOrder = true; this.gateway.validateRuleOrder(req).subscribe({{ next: (v) => {{ this.localOrderValidation = v; this.orderValidation = v; if (!v.isValid) {{ this.isApplyingOrder = false; return; }} this.gateway.applyRuleOrder(req).subscribe({{ next: (r) => {{ this.applyRecord = r; this.isApplyingOrder = false; this.loadHistory(); }}, error: (e) => {{ this.errorMessage = this.extractErrorMessage(e); this.isApplyingOrder = false; }} }}); }}, error: (e) => {{ this.errorMessage = this.extractErrorMessage(e); this.isApplyingOrder = false; }} }}); }}
  validateManifestDraft(): void {{
    const payload = this.tryParseJson(this.manifestDraftJson, 'Manifest JSON');
    if (!payload.ok) return;
    this.isManifestBusy = true;
    this.gateway.validateManifest(payload.value).subscribe({{
      next: (res) => {{ this.manifestValidation = res; this.isManifestBusy = false; }},
      error: (e) => {{ this.manifestError = this.extractErrorMessage(e); this.isManifestBusy = false; }}
    }});
  }}
  generatePromptFromCurrent(): void {{ this.generatePrompt(this.manifest ?? {{}}); }}
  generatePromptFromDraft(): void {{
    const payload = this.tryParseJson(this.manifestDraftJson, 'Manifest JSON');
    if (!payload.ok) return;
    this.generatePrompt(payload.value);
  }}
  resetManifestDraft(): void {{ this.manifestDraftJson = JSON.stringify(this.manifest ?? {{}}, null, 2); this.manifestValidation = undefined; this.manifestError = ''; }}
  trackRuleByCode(_: number, item: {{ code: string }}): string {{ return item.code; }}
  private loadHistory(): void {{ if (!this.selectedBindingRoute || !this.tenantId) {{ this.orderHistory = []; return; }} this.gateway.loadRuleOrderHistory(this.selectedBindingRoute, this.tenantId).subscribe({{ next: (h) => {{ this.orderHistory = h; }}, error: () => {{ this.orderHistory = []; }} }}); }}
  private rebuildEditableRuleOrder(): void {{ const b = this.selectedBinding; if (!b) {{ this.editableRuleOrder = []; return; }} this.editableRuleOrder = [...b.rules].sort((a,b2)=>a.order-b2.order).map((x)=>x.code); }}
  private generatePrompt(manifestPayload: unknown): void {{
    this.isManifestBusy = true;
    this.gateway.generateManifestPrompt(manifestPayload, this.apis, this.rules).subscribe({{
      next: (res) => {{
        this.promptResult = res;
        this.promptText = res.prompt || '';
        this.isManifestBusy = false;
      }},
      error: (e) => {{ this.manifestError = this.extractErrorMessage(e); this.isManifestBusy = false; }}
    }});
  }}
  private validateOrderLocally(codes: string[]): RuleOrderChangeValidationResult {{ const r: RuleOrderChangeValidationResult = {{ isValid: true, errors: [], warnings: [] }}; const b = this.selectedBinding; if (!b) {{ r.errors.push('No endpoint binding selected.'); r.isValid = false; return r; }} if (!codes.length) {{ if ((b.rules?.length ?? 0) === 0) {{ r.warnings.push('Selected endpoint has no mapped rules. Bind workflow/ruleset first.'); r.isValid = true; return r; }} r.errors.push('orderedRuleCodes is required.'); r.isValid = false; return r; }} const norm = codes.map((x)=>x.trim()).filter(Boolean); const idx = new Map<string,number>(); const available = new Set(b.rules.map((x)=>x.code.toLowerCase())); const desc = new Map(this.rules.map((x)=>[x.code.toLowerCase(), x] as const)); norm.forEach((code,i)=>{{ const k=code.toLowerCase(); if (idx.has(k)) r.errors.push(`Rule code '${{code}}' is duplicated.`); else idx.set(k,i); if (!available.has(k)) r.errors.push(`Rule code '${{code}}' is not available for selected endpoint.`); }}); norm.forEach((code,i)=>{{ const d=desc.get(code.toLowerCase()); if(!d) return; (d.dependsOn||[]).forEach((dep)=>{{ const di = idx.get(dep.toLowerCase()); if (di===undefined) r.errors.push(`Rule '${{code}}' requires dependency '${{dep}}' in ordered list.`); else if (di>i) r.errors.push(`Rule '${{code}}' must be placed after dependency '${{dep}}'.`); }}); }}); b.rules.forEach((x)=>{{ if (!idx.has(x.code.toLowerCase())) r.warnings.push(`Rule '${{x.code}}' will be disabled for tenant '${{this.tenantId || '_global'}}'.`); }}); r.isValid = r.errors.length===0; return r; }}
  private tryParseJson(raw: string, label: string): {{ ok: true; value: unknown }} | {{ ok: false }} {{
    try {{
      return {{ ok: true, value: JSON.parse(raw) }};
    }} catch (e) {{
      this.errorMessage = `${{label}} parse error: ${{this.extractErrorMessage(e)}}`;
      return {{ ok: false }};
    }}
  }}
  private prettyJson(raw: string): string {{
    try {{
      return JSON.stringify(JSON.parse(raw), null, 2);
    }} catch {{
      return raw;
    }}
  }}
  private extractErrorMessage(error: unknown): string {{ const p = error as any; return p?.error?.message ?? p?.message ?? 'Unknown error'; }}
}}
""",
    )

    write(
        out / "lab" / "ui-engine-lab.generated.component.html",
        """<section class="lab-shell">
  <header class="lab-header">
    <div>
      <p class="eyebrow">Muonroi UI Engine</p>
      <h1>Rule Engine Operations Lab</h1>
      <p class="subtitle">Block-based workspace for endpoint mapping, runtime rules, manifest prompt, and governance history.</p>
    </div>
    <div class="header-actions">
      <button type="button" (click)="refresh()" [disabled]="isLoading">Refresh</button>
    </div>
  </header>

  <div class="state-banner" *ngIf="isLoading">Loading catalog + manifest...</div>
  <div class="state-banner error" *ngIf="errorMessage">{{ errorMessage }}</div>

  <div class="summary-grid" *ngIf="!isLoading">
    <article class="card">
      <h3>Generated Source</h3>
      <p>Generator: <code>{{ generationMeta.generator }}</code></p>
      <p>Generated at: <code>{{ generationMeta.generatedAtUtc }}</code></p>
      <p>Schema hash: <code>{{ schemaHash || '-' }}</code></p>
      <p>Service prefix: <code>{{ generationMeta.serviceMapping?.prefix || '-' }}</code> <span class="hint">({{ generationMeta.serviceMapping?.source || 'n/a' }})</span></p>
    </article>
    <article class="card">
      <h3>Coverage</h3>
      <p>APIs: <strong>{{ apis.length }}</strong></p>
      <p>Rules: <strong>{{ rules.length }}</strong></p>
      <p>Bindings: <strong>{{ bindings.length }}</strong></p>
    </article>
    <article class="card">
      <h3>Context</h3>
      <p>Tenant: <code>{{ tenantId || '_global' }}</code></p>
      <p>Manifest schema: <code>{{ manifest?.schemaVersion || '-' }}</code></p>
    </article>
  </div>

  <nav class="block-nav" *ngIf="!isLoading">
    <button type="button" [class.active]="activeBlock === 'mapping'" (click)="selectBlock('mapping')">1. Endpoint Mapping</button>
    <button type="button" [class.active]="activeBlock === 'runtime'" (click)="selectBlock('runtime')">2. Rule Runtime</button>
    <button type="button" [class.active]="activeBlock === 'manifest'" (click)="selectBlock('manifest')">3. Manifest + Prompt</button>
    <button type="button" [class.active]="activeBlock === 'history'" (click)="selectBlock('history')">4. Change History</button>
  </nav>

  <section *ngIf="!isLoading && activeBlock === 'mapping'">
    <article class="card">
      <h3>Endpoint Mapping</h3>
      <select [ngModel]="selectedBindingRoute" (ngModelChange)="onBindingChange($event)">
        <option *ngFor="let b of bindings" [value]="b.endpointRoute">{{ b.httpMethod }} {{ b.endpointRoute }} ({{ b.rules.length }} rules)</option>
      </select>
      <div class="meta-box" *ngIf="selectedBinding">
        <p>Context: <code>{{ selectedBinding.contextType || 'n/a' }}</code></p>
        <p>Workflow: <code>{{ selectedBinding.workflowName || 'n/a' }}</code></p>
        <p>Mapped rules: <strong>{{ selectedBinding.rules.length }}</strong></p>
      </div>
    </article>
  </section>

  <section *ngIf="!isLoading && activeBlock === 'runtime'" class="runtime-grid">
    <article class="card">
      <h3>Rule Order (Endpoint Bound)</h3>
      <p class="hint">Drag-drop rule order. If DependsOn is violated, UI auto reverts.</p>
      <div class="rule-list" cdkDropList [cdkDropListData]="editableRuleOrder" cdkDropListLockAxis="y" (cdkDropListDropped)="onDropRule($event)">
        <div class="rule-item" *ngFor="let item of selectedRulesWithMeta; trackBy: trackRuleByCode" cdkDrag cdkDragLockAxis="y">
          <div class="rule-handle">::</div>
          <div>
            <div class="rule-code">{{ item.code }}</div>
            <div class="rule-meta">source: {{ item.descriptor?.source || 'unknown' }}</div>
            <div class="rule-meta">dependsOn: {{ item.descriptor?.dependsOn?.join(', ') || 'none' }}</div>
          </div>
        </div>
      </div>
      <div class="meta-box" *ngIf="!selectedBindingHasRules">No mapped rules for this endpoint yet. Bind workflow/ruleset first.</div>
      <div class="button-row">
        <button type="button" (click)="validateOrder()" [disabled]="isValidatingOrder || editableRuleOrder.length === 0">Validate Order</button>
        <button type="button" (click)="applyOrder()" [disabled]="!canApplyOrder">Apply Order</button>
      </div>
      <div class="validation-box" *ngIf="orderValidation || !localOrderValidation.isValid || localOrderValidation.warnings.length > 0">
        <p>Status: <strong>{{ effectiveOrderValidation.isValid ? 'VALID' : 'INVALID' }}</strong></p>
        <div class="tag error" *ngFor="let e of effectiveOrderValidation.errors">{{ e }}</div>
        <div class="tag warn" *ngFor="let w of effectiveOrderValidation.warnings">{{ w }}</div>
      </div>
    </article>

    <article class="card">
      <h3>Runtime JSON Ruleset</h3>
      <p class="hint">Edit JSON rule runtime, then validate/save/activate without BE rebuild.</p>
      <div class="field-grid">
        <label>
          Workflow
          <select [ngModel]="selectedWorkflow" (ngModelChange)="onWorkflowChange($event)">
            <option *ngFor="let wf of runtimeWorkflows" [value]="wf.workflowName">{{ wf.workflowName }} (active: {{ wf.activeVersion ?? 'n/a' }})</option>
          </select>
        </label>
        <label class="checkbox">
          <input type="checkbox" [ngModel]="runtimeActivateAfterSave" (ngModelChange)="runtimeActivateAfterSave = $event" />
          Activate after save
        </label>
      </div>
      <textarea class="editor" [(ngModel)]="runtimeRuleSetJson"></textarea>
      <div class="button-row">
        <button type="button" (click)="loadRuntimeExport()" [disabled]="isRuntimeBusy || !selectedWorkflow">Reload</button>
        <button type="button" (click)="validateRuntimeJson()" [disabled]="isRuntimeBusy || !selectedWorkflow">Validate JSON</button>
        <button type="button" (click)="saveRuntimeJson()" [disabled]="isRuntimeBusy || !selectedWorkflow">Save Version</button>
      </div>
      <div class="versions" *ngIf="selectedWorkflowSummary?.versions?.length">
        <span>Activate existing version:</span>
        <button type="button" *ngFor="let v of selectedWorkflowSummary?.versions" (click)="activateRuntimeVersion(v)" [disabled]="isRuntimeBusy">Activate v{{ v }}</button>
      </div>
      <div class="validation-box" *ngIf="runtimeValidation || runtimeSaveMessage || runtimeError">
        <div class="tag" *ngIf="runtimeValidation">Validation: {{ runtimeValidation?.isValid ? 'VALID' : 'INVALID' }} <span *ngIf="runtimeValidation?.shape">({{ runtimeValidation?.shape }})</span></div>
        <div class="tag error" *ngFor="let e of (runtimeValidation?.errors || [])">{{ e }}</div>
        <div class="tag warn" *ngFor="let w of (runtimeValidation?.warnings || [])">{{ w }}</div>
        <div class="tag" *ngIf="runtimeSaveMessage">{{ runtimeSaveMessage }}</div>
        <div class="tag error" *ngIf="runtimeError">{{ runtimeError }}</div>
      </div>
    </article>
  </section>

  <section *ngIf="!isLoading && activeBlock === 'manifest'" class="runtime-grid">
    <article class="card">
      <h3>Manifest Draft</h3>
      <p class="hint">Review/edit manifest draft, validate contract completeness.</p>
      <textarea class="editor" [(ngModel)]="manifestDraftJson"></textarea>
      <div class="button-row">
        <button type="button" (click)="resetManifestDraft()" [disabled]="isManifestBusy">Reset from current</button>
        <button type="button" (click)="validateManifestDraft()" [disabled]="isManifestBusy">Validate Manifest</button>
      </div>
      <div class="validation-box" *ngIf="manifestValidation || manifestError">
        <div class="tag" *ngIf="manifestValidation">Validation: {{ manifestValidation?.isValid ? 'VALID' : 'INVALID' }}</div>
        <div class="tag error" *ngFor="let e of (manifestValidation?.errors || [])">{{ e }}</div>
        <div class="tag warn" *ngFor="let w of (manifestValidation?.warnings || [])">{{ w }}</div>
        <div class="tag error" *ngIf="manifestError">{{ manifestError }}</div>
      </div>
    </article>

    <article class="card">
      <h3>Prompt Generator</h3>
      <p class="hint">Generate AI prompt from current catalog + manifest to complete missing fields.</p>
      <div class="button-row">
        <button type="button" (click)="generatePromptFromCurrent()" [disabled]="isManifestBusy">Generate from current</button>
        <button type="button" (click)="generatePromptFromDraft()" [disabled]="isManifestBusy">Generate from draft</button>
      </div>
      <div class="meta-box" *ngIf="promptResult">
        <p>Missing fields: <strong>{{ promptResult.missingFields.length }}</strong></p>
        <p>Catalog API count: <strong>{{ promptResult.apiCount }}</strong></p>
        <p>Catalog rule count: <strong>{{ promptResult.ruleCount }}</strong></p>
      </div>
      <textarea class="editor" [ngModel]="promptText" readonly></textarea>
    </article>
  </section>

  <section *ngIf="!isLoading && activeBlock === 'history'">
    <article class="card">
      <h3>Change History</h3>
      <p class="hint">Governance log for selected endpoint + tenant.</p>
      <table>
        <thead><tr><th>Applied At (UTC)</th><th>By</th><th>Rule Count</th></tr></thead>
        <tbody>
          <tr *ngFor="let h of orderHistory"><td>{{ h.appliedAtUtc }}</td><td>{{ h.appliedBy }}</td><td>{{ h.newOrder.length }}</td></tr>
          <tr *ngIf="orderHistory.length === 0"><td colspan="3">No history records.</td></tr>
        </tbody>
      </table>
    </article>
  </section>
</section>
""",
    )

    write(
        out / "lab" / "ui-engine-lab.generated.component.scss",
        """:host { --bg:#f4f8fb; --card:#ffffff; --text:#0f172a; --muted:#475569; --line:#cbd5e1; --accent:#e0f2fe; --accent-strong:#0284c7; --danger:#b91c1c; --dangerbg:#fef2f2; --warn:#92400e; --warnbg:#fffbeb; }
.lab-shell { min-height:100%; padding:20px; display:flex; flex-direction:column; gap:14px; color:var(--text); background:radial-gradient(circle at top left,#dbeafe 0%,transparent 44%),radial-gradient(circle at bottom right,#cffafe 0%,transparent 48%),var(--bg); }
.lab-header { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; }
.eyebrow { margin:0; font-size:11px; letter-spacing:1.2px; text-transform:uppercase; color:#0369a1; font-weight:700; }
.subtitle { margin:4px 0 0; color:var(--muted); max-width:720px; }
.header-actions { display:flex; gap:8px; flex-wrap:wrap; }
button { border:1px solid var(--accent-strong); background:var(--accent); color:#075985; border-radius:10px; padding:7px 12px; font-weight:600; cursor:pointer; }
button[disabled] { cursor:not-allowed; opacity:.45; }
.state-banner { border-radius:10px; padding:9px 12px; border:1px solid #93c5fd; background:#eff6ff; }
.state-banner.error { border-color:#fecaca; color:var(--danger); background:var(--dangerbg); }
.summary-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; }
.block-nav { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; }
.block-nav button { background:#f8fafc; color:#0f172a; border-color:#93c5fd; text-align:left; }
.block-nav button.active { background:#dbeafe; color:#075985; border-color:#0284c7; }
.runtime-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.card { background:var(--card); border:1px solid #bfdbfe; border-radius:14px; padding:14px; box-shadow:0 4px 14px rgba(15,23,42,.04); }
.card h3 { margin:0 0 8px; }
.card p { margin:4px 0; }
.hint { color:var(--muted); font-size:12px; }
select { width:100%; border:1px solid var(--line); border-radius:10px; padding:8px; background:#fff; }
.field-grid { display:grid; grid-template-columns:1fr auto; gap:10px; align-items:end; margin:8px 0; }
.checkbox { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--muted); }
.editor { width:100%; min-height:220px; border:1px solid #cbd5e1; border-radius:10px; padding:10px; font-family:Consolas, 'Courier New', monospace; font-size:12px; background:#f8fafc; resize:vertical; }
.meta-box { margin-top:8px; border:1px dashed #7dd3fc; border-radius:10px; padding:8px; background:#f8fafc; }
.button-row { margin-top:8px; display:flex; gap:8px; flex-wrap:wrap; }
.versions { margin-top:8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap; font-size:12px; color:var(--muted); }
.rule-list { margin-top:8px; border:1px dashed #93c5fd; border-radius:10px; background:#f8fafc; padding:8px; display:flex; flex-direction:column; gap:8px; min-height:120px; }
.rule-item { display:grid; grid-template-columns:24px 1fr; gap:8px; border:1px solid #bfdbfe; background:#fff; border-radius:10px; padding:8px; cursor:grab; touch-action:none; }
.rule-item:active { cursor:grabbing; }
.rule-handle { color:#0369a1; font-weight:700; user-select:none; }
.rule-code { font-weight:700; }
.rule-meta { font-size:12px; color:var(--muted); }
.rule-item.cdk-drag-preview { box-shadow:0 8px 28px rgba(2,132,199,.25); border-color:#38bdf8; }
.rule-item.cdk-drag-placeholder { opacity:.35; }
.rule-list.cdk-drop-list-dragging .rule-item:not(.cdk-drag-placeholder) { transition:transform 120ms ease; }
.validation-box { margin-top:8px; border:1px solid #d1d5db; border-radius:10px; background:#f8fafc; padding:8px; }
.tag { margin-top:5px; border-radius:8px; padding:4px 8px; font-size:12px; border:1px solid #cbd5e1; background:#fff; color:#0f172a; }
.tag.error { border-color:#fecaca; background:var(--dangerbg); color:var(--danger); }
.tag.warn { border-color:#fde68a; background:var(--warnbg); color:var(--warn); }
table { width:100%; border-collapse:collapse; font-size:13px; }
th,td { border-bottom:1px solid #e5e7eb; padding:6px 4px; text-align:left; vertical-align:top; }
@media (max-width:1200px){ .runtime-grid{grid-template-columns:1fr;} }
@media (max-width:980px){ .lab-header{flex-direction:column;} .summary-grid{grid-template-columns:1fr;} .block-nav{grid-template-columns:1fr 1fr;} .field-grid{grid-template-columns:1fr;} }
""",
    )

    ensure_route(project_root)
    print(f"[sync-ui-engine] success apis={len(apis) if isinstance(apis,list) else 0} rules={len(rules) if isinstance(rules,list) else 0} bindings={len(bindings) if isinstance(bindings,list) else 0} servicePrefix={service_prefix or '-'} source={service_prefix_source}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
