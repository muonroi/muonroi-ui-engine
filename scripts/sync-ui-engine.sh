#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Sync UI engine artifacts from backend catalog + manifest.

Usage:
  ./scripts/sync-ui-engine.sh \
    --be-url http://localhost:5000 \
    --token <bearer-token> \
    --output ./src/generated/ui-engine \
    [--tenant-id <tenant-id>] \
    [--watch] [--framework angular|react|all]
EOF
}

BE_URL=""
TOKEN=""
OUTPUT_DIR=""
WATCH_MODE="false"
FRAMEWORK="all"
TENANT_ID=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --be-url)
      BE_URL="${2:-}"
      shift 2
      ;;
    --token)
      TOKEN="${2:-}"
      shift 2
      ;;
    --output)
      OUTPUT_DIR="${2:-}"
      shift 2
      ;;
    --watch)
      WATCH_MODE="true"
      shift 1
      ;;
    --tenant-id)
      TENANT_ID="${2:-}"
      shift 2
      ;;
    --framework)
      FRAMEWORK="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "${BE_URL}" || -z "${OUTPUT_DIR}" ]]; then
  echo "--be-url and --output are required." >&2
  exit 1
fi

if [[ -z "${TOKEN}" ]]; then
  echo "--token is required because catalog and manifest endpoints are authorized." >&2
  exit 1
fi

case "${FRAMEWORK}" in
  angular|react|all) ;;
  *)
    echo "Invalid --framework value: ${FRAMEWORK}" >&2
    exit 1
    ;;
esac

if [[ -n "${TOKEN}" && "${TOKEN}" != Bearer* ]]; then
  TOKEN="Bearer ${TOKEN}"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

mkdir -p "${OUTPUT_DIR}/core" "${OUTPUT_DIR}/api" "${OUTPUT_DIR}/api/angular" "${OUTPUT_DIR}/models" "${OUTPUT_DIR}/features"

fetch_json() {
  local endpoint="$1"
  local outfile="$2"
  local url="${BE_URL%/}${endpoint}"

  local -a headers=()
  if [[ -n "${TOKEN}" ]]; then
    headers+=(-H "Authorization: ${TOKEN}")
  fi
  if [[ -n "${TENANT_ID:-}" ]]; then
    headers+=(-H "X-Tenant-Id: ${TENANT_ID}")
  fi

  curl -fsSL "${headers[@]}" "${url}" -o "${outfile}"
}

generate_artifacts() {
  local contract_file="${TMP_DIR}/contract-info.json"
  local apis_file="${TMP_DIR}/catalog-apis.json"
  local rules_file="${TMP_DIR}/catalog-rules.json"
  local bindings_file="${TMP_DIR}/catalog-bindings.json"
  local graph_file="${TMP_DIR}/catalog-graph.json"
  local swagger_file="${TMP_DIR}/swagger.json"

  local contract_candidates=(
    "/api/v1/ui-engine/contract-info"
    "/api/v1/auth/ui-engine/contract-info"
    "/api/v1/ui-engine-lab/ui-engine/contract-info"
  )
  local contract_found=""
  for candidate in "${contract_candidates[@]}"; do
    if fetch_json "${candidate}" "${contract_file}" 2>/dev/null; then
      contract_found="${candidate}"
      break
    fi
  done
  if [[ -z "${contract_found}" ]]; then
    echo "Unable to resolve ui-engine contract-info endpoint from candidates: ${contract_candidates[*]}" >&2
    exit 1
  fi

  local manifest_endpoint
  manifest_endpoint="$(python - <<'PY' "${contract_file}"
import json,sys
obj=json.load(open(sys.argv[1], encoding='utf-8'))
if isinstance(obj, dict) and 'result' in obj and isinstance(obj['result'], dict):
    obj=obj['result']
print(obj.get('currentManifestEndpoint','/api/v1/ui-engine/current'))
PY
)"

  local schema_hash_endpoint
  schema_hash_endpoint="$(python - <<'PY' "${contract_file}"
import json,sys
obj=json.load(open(sys.argv[1], encoding='utf-8'))
if isinstance(obj, dict) and 'result' in obj and isinstance(obj['result'], dict):
    obj=obj['result']
print(obj.get('schemaHashEndpoint','/api/v1/ui-engine/schema-hash'))
PY
)"

  local manifest_file="${TMP_DIR}/manifest.json"
  fetch_json "${manifest_endpoint}" "${manifest_file}"
  fetch_json "/api/v1/ui-engine/catalog/apis" "${apis_file}"
  fetch_json "/api/v1/ui-engine/catalog/rules" "${rules_file}"
  fetch_json "/api/v1/ui-engine/catalog/bindings" "${bindings_file}"
  fetch_json "/api/v1/ui-engine/catalog/graph" "${graph_file}"
  curl -fsSL "${BE_URL%/}/swagger/v1/swagger.json" -o "${swagger_file}"

  bash "${SCRIPT_DIR}/generate-ui-clients.sh" \
    --openapi "${swagger_file}" \
    --framework "${FRAMEWORK}" \
    --output "${OUTPUT_DIR}/api/openapi"

  if command -v npx >/dev/null 2>&1; then
    npx --yes openapi-typescript "${swagger_file}" -o "${OUTPUT_DIR}/models/api-types.ts"
  fi

  if [[ ! -f "${OUTPUT_DIR}/models/api-types.ts" ]]; then
    cat > "${OUTPUT_DIR}/models/api-types.ts" <<'EOF'
export interface paths {}
EOF
  fi

  python - <<'PY' "${manifest_file}" "${apis_file}" "${rules_file}" "${bindings_file}" "${graph_file}" "${OUTPUT_DIR}"
import json
import pathlib
import re
import sys

manifest_file, apis_file, rules_file, bindings_file, graph_file, output_dir = sys.argv[1:]
out = pathlib.Path(output_dir)


def unwrap(obj):
    if isinstance(obj, dict) and 'result' in obj:
        return obj['result']
    return obj

manifest = unwrap(json.load(open(manifest_file, encoding='utf-8')))
apis = unwrap(json.load(open(apis_file, encoding='utf-8')))
rules = unwrap(json.load(open(rules_file, encoding='utf-8')))
bindings = unwrap(json.load(open(bindings_file, encoding='utf-8')))
graph = unwrap(json.load(open(graph_file, encoding='utf-8')))

if not isinstance(apis, list):
    apis = []
if not isinstance(rules, list):
    rules = []
if not isinstance(bindings, list):
    bindings = []
if not isinstance(manifest, dict):
    manifest = {}
if not isinstance(graph, dict):
    graph = {"nodes": [], "edges": []}


def esc(value):
    return str(value).replace('\\', '\\\\').replace("'", "\\'")


def to_ident(value: str) -> str:
    cleaned = re.sub(r'[^a-zA-Z0-9]+', '_', value).strip('_')
    if not cleaned:
        cleaned = 'op'
    if cleaned[0].isdigit():
        cleaned = f'op_{cleaned}'
    return cleaned


def to_pascal(value: str) -> str:
    parts = re.split(r'[^a-zA-Z0-9]+', value)
    parts = [p for p in parts if p]
    if not parts:
        return 'Generated'
    return ''.join(part[0].upper() + part[1:] for part in parts)


def to_camel(value: str) -> str:
    pascal = to_pascal(value)
    return pascal[0].lower() + pascal[1:] if pascal else 'op'

(out / 'models' / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
(out / 'models' / 'catalog-apis.json').write_text(json.dumps(apis, indent=2), encoding='utf-8')
(out / 'models' / 'catalog-rules.json').write_text(json.dumps(rules, indent=2), encoding='utf-8')
(out / 'models' / 'catalog-bindings.json').write_text(json.dumps(bindings, indent=2), encoding='utf-8')
(out / 'models' / 'catalog-graph.json').write_text(json.dumps(graph, indent=2), encoding='utf-8')

service_lines = [
    '/* auto-generated by sync-ui-engine.sh */',
    'export interface MGeneratedApiOperation {',
    '  operationId: string;',
    '  method: string;',
    '  path: string;',
    '  requestType?: string;',
    '  responseType?: string;',
    '}',
    '',
    'export const MGeneratedApiOperations: Record<string, MGeneratedApiOperation> = {'
]

for api in apis:
    method = str(api.get('httpMethod', 'GET')).upper()
    path = str(api.get('route', '/'))
    op = to_ident(f"{api.get('controllerName','Api')}_{api.get('actionName','Action')}_{method}_{path}")
    req_type = api.get('requestType')
    res_type = api.get('responseType')
    service_lines.append(f"  {op}: {{")
    service_lines.append(f"    operationId: '{op}',")
    service_lines.append(f"    method: '{method}',")
    service_lines.append(f"    path: '{path}',")
    if req_type:
        service_lines.append(f"    requestType: '{req_type}',")
    if res_type:
        service_lines.append(f"    responseType: '{res_type}',")
    service_lines.append('  },')

service_lines += [
    '};',
    '',
    'export class MGeneratedApiService {',
    '  constructor(private readonly mFetch: <T>(path: string, init?: RequestInit) => Promise<T>) {}',
    '',
    '  async MCall(operationId: string, body?: unknown): Promise<unknown> {',
    '    const op = MGeneratedApiOperations[operationId];',
    '    if (!op) {',
    '      throw new Error(`Unknown operationId: ${operationId}`);',
    '    }',
    '    return await this.mFetch(op.path, {',
    '      method: op.method,',
    '      headers: body ? { "Content-Type": "application/json" } : undefined,',
    '      body: body ? JSON.stringify(body) : undefined',
    '    });',
    '  }',
    '}',
    ''
]

(out / 'api' / 'services.ts').write_text('\n'.join(service_lines), encoding='utf-8')

screens = manifest.get('screens') or []
route_registry = [
    '/* auto-generated by sync-ui-engine.sh */',
    'export interface MGeneratedComponentEntry {',
    '  componentKey: string;',
    '  componentType: string;',
    '  order: number;',
    '  props: Record<string, string>;',
    '}',
    '',
    'export interface MGeneratedRouteEntry {',
    '  screenKey: string;',
    '  uiKey: string;',
    '  title: string;',
    '  route: string;',
    '  isEnabled: boolean;',
    '  isVisible: boolean;',
    '  layoutTemplate: string;',
    '  dataSourceKey?: string | null;',
    '  actionKeys: string[];',
    '  componentsBySlot: Record<string, MGeneratedComponentEntry[]>;',
    '}',
    '',
    'export const MGeneratedRouteRegistry: MGeneratedRouteEntry[] = ['
]

for screen in screens:
    components = screen.get('components') or []
    by_slot = {}
    for component in sorted(components, key=lambda x: int(x.get('order', 0))):
        slot = str(component.get('slot') or 'main')
        if slot not in by_slot:
            by_slot[slot] = []
        by_slot[slot].append({
            'componentKey': component.get('componentKey') or '',
            'componentType': component.get('componentType') or '',
            'order': int(component.get('order', 0)),
            'props': component.get('props') or {}
        })

    route_registry.append('  {')
    route_registry.append(f"    screenKey: '{esc(screen.get('screenKey',''))}',")
    route_registry.append(f"    uiKey: '{esc(screen.get('uiKey',''))}',")
    route_registry.append(f"    title: '{esc(screen.get('title',''))}',")
    route_registry.append(f"    route: '{esc(screen.get('route','/'))}',")
    route_registry.append(f"    isEnabled: {str(bool(screen.get('isEnabled', False))).lower()},")
    route_registry.append(f"    isVisible: {str(bool(screen.get('isVisible', False))).lower()},")
    route_registry.append(f"    layoutTemplate: '{esc((screen.get('layout') or {}).get('template', 'default-page'))}',")
    data_source_key = screen.get('dataSourceKey')
    if data_source_key is None:
        route_registry.append('    dataSourceKey: null,')
    else:
        route_registry.append(f"    dataSourceKey: '{esc(data_source_key)}',")
    action_keys = screen.get('actionKeys') or []
    route_registry.append(f"    actionKeys: {json.dumps(action_keys, ensure_ascii=True)},")
    route_registry.append(f"    componentsBySlot: {json.dumps(by_slot, ensure_ascii=True)},")
    route_registry.append('  },')

route_registry += ['];', '']
(out / 'features' / 'route-registry.ts').write_text('\n'.join(route_registry), encoding='utf-8')

nav_groups = manifest.get('navigationGroups') or []
nav_registry = [
    '/* auto-generated by sync-ui-engine.sh */',
    'export interface MGeneratedNavItem {',
    '  nodeKey: string;',
    '  title: string;',
    '  route: string;',
    '  icon?: string | null;',
    '  order: number;',
    '  isEnabled: boolean;',
    '  isVisible: boolean;',
    '  screenKey?: string | null;',
    '  actionKeys: string[];',
    '  children: MGeneratedNavItem[];',
    '}',
    '',
    'export interface MGeneratedNavGroup {',
    '  groupName: string;',
    '  groupDisplayName: string;',
    '  items: MGeneratedNavItem[];',
    '}',
    '',
    'export const MGeneratedNavRegistry: MGeneratedNavGroup[] = ['
]

def map_nav_item(node):
    return {
        'nodeKey': node.get('nodeKey') or '',
        'title': node.get('title') or '',
        'route': node.get('route') or '/',
        'icon': node.get('icon'),
        'order': int(node.get('order', 0)),
        'isEnabled': bool(node.get('isEnabled', False)),
        'isVisible': bool(node.get('isVisible', False)),
        'screenKey': node.get('screenKey'),
        'actionKeys': node.get('actionKeys') or [],
        'children': [map_nav_item(child) for child in (node.get('children') or [])]
    }

for group in nav_groups:
    items = [map_nav_item(item) for item in (group.get('items') or [])]
    nav_registry.append('  {')
    nav_registry.append(f"    groupName: '{esc(group.get('groupName',''))}',")
    nav_registry.append(f"    groupDisplayName: '{esc(group.get('groupDisplayName',''))}',")
    nav_registry.append(f"    items: {json.dumps(items, ensure_ascii=True)},")
    nav_registry.append('  },')

nav_registry += ['];', '']
(out / 'features' / 'nav-registry.ts').write_text('\n'.join(nav_registry), encoding='utf-8')

data_sources = manifest.get('dataSources') or []
data_source_lines = [
    '/* auto-generated by sync-ui-engine.sh */',
    'export interface MGeneratedDataSource {',
    '  dataSourceKey: string;',
    '  uiKey: string;',
    '  screenKey: string;',
    '  endpointPath: string;',
    '  httpMethod: string;',
    '  requestModel?: string | null;',
    '  responseModel?: string | null;',
    '}',
    '',
    'export const MGeneratedDataSources: MGeneratedDataSource[] = ['
]

for ds in data_sources:
    data_source_lines.append('  {')
    data_source_lines.append(f"    dataSourceKey: '{esc(ds.get('dataSourceKey',''))}',")
    data_source_lines.append(f"    uiKey: '{esc(ds.get('uiKey',''))}',")
    data_source_lines.append(f"    screenKey: '{esc(ds.get('screenKey',''))}',")
    data_source_lines.append(f"    endpointPath: '{esc(ds.get('endpointPath','/'))}',")
    data_source_lines.append(f"    httpMethod: '{esc(str(ds.get('httpMethod','GET')).upper())}',")
    req_model = ds.get('requestModel')
    res_model = ds.get('responseModel')
    data_source_lines.append(f"    requestModel: {json.dumps(req_model, ensure_ascii=True)},")
    data_source_lines.append(f"    responseModel: {json.dumps(res_model, ensure_ascii=True)},")
    data_source_lines.append('  },')

data_source_lines.extend([
    '];',
    '',
    'export async function MFetchGeneratedDataSource<T>(',
    '  fetcher: <TResp>(path: string, init?: RequestInit) => Promise<TResp>,',
    '  dataSourceKey: string,',
    '  opts?: {',
    '    pathParams?: Record<string, string | number>;',
    '    query?: Record<string, string | number | boolean | null | undefined>;',
    '    body?: unknown;',
    '  }',
    '): Promise<T> {',
    '  const source = MGeneratedDataSources.find((x) => x.dataSourceKey === dataSourceKey);',
    '  if (!source) {',
    '    throw new Error(`Unknown dataSourceKey: ${dataSourceKey}`);',
    '  }',
    '',
    '  let path = source.endpointPath;',
    '  if (opts?.pathParams) {',
    '    for (const [key, value] of Object.entries(opts.pathParams)) {',
    '      path = path.replace(`{${key}}`, encodeURIComponent(String(value)));',
    '    }',
    '  }',
    '',
    '  const params = new URLSearchParams();',
    '  if (opts?.query) {',
    '    for (const [key, value] of Object.entries(opts.query)) {',
    '      if (value === null || value === undefined) {',
    '        continue;',
    '      }',
    '',
    '      params.set(key, String(value));',
    '    }',
    '  }',
    '',
    '  const queryString = params.toString();',
    '  if (queryString.length > 0) {',
    '    path = `${path}?${queryString}`;',
    '  }',
    '',
    '  return await fetcher<T>(path, {',
    '    method: source.httpMethod,',
    '    headers: opts?.body ? { "Content-Type": "application/json" } : undefined,',
    '    body: opts?.body ? JSON.stringify(opts.body) : undefined',
    '  });',
    '}',
    ''
])

for ds in data_sources:
    key = str(ds.get('dataSourceKey') or '')
    method_name = f"mFetch{to_pascal(key)}"
    data_source_lines.extend([
        f"export async function {method_name}<T>(",
        '  fetcher: <TResp>(path: string, init?: RequestInit) => Promise<TResp>,',
        '  opts?: {',
        '    pathParams?: Record<string, string | number>;',
        '    query?: Record<string, string | number | boolean | null | undefined>;',
        '    body?: unknown;',
        '  }',
        '): Promise<T> {',
        f"  return await MFetchGeneratedDataSource<T>(fetcher, '{esc(key)}', opts);",
        '}',
        ''
    ])

(out / 'features' / 'data-sources.ts').write_text('\n'.join(data_source_lines), encoding='utf-8')

profile = manifest.get('authProfile') or {
    'tokenSource': 'header',
    'tokenKey': 'Authorization',
    'tenantHeaderKey': 'X-Tenant-Id',
    'correlationIdKey': 'X-Correlation-Id',
    'failurePolicy': '401',
    'refreshPath': '/api/v1/auth/refresh-token'
}

core_lines = [
    '/* auto-generated by sync-ui-engine.sh */',
    'import { MBuildInterceptorFromAuthProfile } from "@muonroi/ui-engine-core";',
    '',
    f"const profile = {json.dumps(profile, ensure_ascii=True, indent=2)} as const;",
    '',
    'export function MCreateGeneratedAuthFetch(opts?: {',
    '  baseApiUrl?: string;',
    '  mGetToken?: () => string | null;',
    '  mGetTenantId?: () => string | null;',
    '  mFetch?: typeof fetch;',
    '}) {',
    '  return MBuildInterceptorFromAuthProfile({',
    '    profile,',
    '    baseApiUrl: opts?.baseApiUrl,',
    '    mGetToken: opts?.mGetToken,',
    '    mGetTenantId: opts?.mGetTenantId,',
    '    mFetch: opts?.mFetch',
    '  });',
    '}',
    ''
]
(out / 'core' / 'auth-interceptor.ts').write_text('\n'.join(core_lines), encoding='utf-8')

# Angular typed DI services by controller
angular_dir = out / 'api' / 'angular'
angular_dir.mkdir(parents=True, exist_ok=True)

auth_profile_json = json.dumps(profile, ensure_ascii=True, indent=2)
(angular_dir / 'base.ts').write_text('\n'.join([
    '/* auto-generated by sync-ui-engine.sh */',
    'import { InjectionToken } from "@angular/core";',
    'import type { MUiEngineAuthContext } from "@muonroi/ui-engine-angular";',
    'import type { MUiEngineAuthProfile } from "@muonroi/ui-engine-core";',
    '',
    "export const M_UI_ENGINE_BASE_URL = new InjectionToken<string>('M_UI_ENGINE_BASE_URL');",
    "export const M_UI_ENGINE_AUTH_PROFILE = new InjectionToken<MUiEngineAuthProfile>('M_UI_ENGINE_AUTH_PROFILE');",
    "export const M_UI_ENGINE_AUTH_CONTEXT = new InjectionToken<MUiEngineAuthContext | undefined>('M_UI_ENGINE_AUTH_CONTEXT');",
    '',
    f'export const MGeneratedDefaultAuthProfile: MUiEngineAuthProfile = {auth_profile_json};',
    ''
]), encoding='utf-8')

header_lines = [
    '/* auto-generated by sync-ui-engine.sh */',
    'import { Inject, Injectable, Optional } from "@angular/core";',
    'import { HttpClient } from "@angular/common/http";',
    'import type { Observable } from "rxjs";',
    'import { MUiEngineAngularServiceBase } from "@muonroi/ui-engine-angular";',
    'import type { MUiEngineAuthContext } from "@muonroi/ui-engine-angular";',
    'import type { MUiEngineAuthProfile } from "@muonroi/ui-engine-core";',
    'import { M_UI_ENGINE_AUTH_CONTEXT, M_UI_ENGINE_AUTH_PROFILE, M_UI_ENGINE_BASE_URL } from "./base.js";',
    'import type { paths as OpenApiPaths } from "../../models/api-types.js";',
    '',
    'type PathKey = keyof OpenApiPaths & string;',
    'type MethodKey<P extends PathKey> = keyof OpenApiPaths[P] & string;',
    'type OperationValue<P extends string, M extends string> = P extends PathKey ? (M extends MethodKey<P> ? OpenApiPaths[P][M] : never) : never;',
    'type JsonRequestBody<P extends string, M extends string> = OperationValue<P, M> extends { requestBody: { content: { "application/json": infer T } } } ? T : unknown;',
    'type JsonResponseBody<P extends string, M extends string> =',
    '  OperationValue<P, M> extends { responses: infer R }',
    '    ? R extends Record<string | number, unknown>',
    '      ? (R extends { 200: { content: { "application/json": infer T200 } } } ? T200 :',
    '        R extends { 201: { content: { "application/json": infer T201 } } } ? T201 :',
    '        R extends { 202: { content: { "application/json": infer T202 } } } ? T202 :',
    '        unknown)',
    '      : unknown',
    '    : unknown;',
    ''
]

controllers = {}
for api in apis:
    key = str(api.get('controllerName') or 'Default')
    controllers.setdefault(key, []).append(api)

index_exports = ['/* auto-generated by sync-ui-engine.sh */', "export * from './base.js';"]

for controller_name, controller_apis in sorted(controllers.items(), key=lambda x: x[0].lower()):
    class_name = f"{to_pascal(controller_name)}ApiService"
    file_name = f"{to_ident(controller_name).lower()}-api.service.ts"

    lines = list(header_lines)
    lines.extend([
        '/**',
        ' * Generated API service.',
        ' * Interceptor note: use MBuildInterceptorFromAuthProfile(profile) in app bootstrap to align auth headers with backend profile.',
        ' */'
    ])
    lines.append('@Injectable({ providedIn: "root" })')
    lines.append(f'export class {class_name} extends MUiEngineAngularServiceBase ' + '{')
    lines.append('  constructor(')
    lines.append('    private readonly http: HttpClient,')
    lines.append('    @Inject(M_UI_ENGINE_BASE_URL) mBaseApiUrl: string,')
    lines.append('    @Inject(M_UI_ENGINE_AUTH_PROFILE) mAuthProfile: MUiEngineAuthProfile,')
    lines.append('    @Optional() @Inject(M_UI_ENGINE_AUTH_CONTEXT) mAuthContext?: MUiEngineAuthContext')
    lines.append('  ) {')
    lines.append('    super(mBaseApiUrl, mAuthProfile, mAuthContext);')
    lines.append('  }')
    lines.append('')

    method_names = set()
    for api in sorted(controller_apis, key=lambda x: (str(x.get('route', '/')).lower(), str(x.get('httpMethod', 'GET')).upper())):
        path = str(api.get('route', '/'))
        method = str(api.get('httpMethod', 'GET')).upper()
        method_lc = method.lower()
        base_name = to_camel(str(api.get('actionName') or 'execute'))
        if base_name in method_names:
            base_name = f"{base_name}{method.title()}"
        method_names.add(base_name)

        has_body = method in {'POST', 'PUT', 'PATCH'}
        lines.append(
            f"  public {base_name}(opts?: {{ pathParams?: Record<string, string | number>; query?: Record<string, string | number | boolean | null | undefined>; body?: JsonRequestBody<'{esc(path)}', '{method_lc}'> }}): Observable<JsonResponseBody<'{esc(path)}', '{method_lc}'>> {{"
        )
        lines.append(f"    const url = this.mBuildUrl('{esc(path)}', opts?.pathParams, opts?.query);")
        if has_body:
            lines.append(
                f"    return this.http.request<JsonResponseBody<'{esc(path)}', '{method_lc}'>>('{method}', url, {{ headers: this.mHeaders(), body: opts?.body }});"
            )
        else:
            lines.append(
                f"    return this.http.request<JsonResponseBody<'{esc(path)}', '{method_lc}'>>('{method}', url, {{ headers: this.mHeaders() }});"
            )
        lines.append('  }')
        lines.append('')

    lines.append('}')

    (angular_dir / file_name).write_text('\n'.join(lines) + '\n', encoding='utf-8')
    index_exports.append(f"export * from './{file_name[:-3]}.js';")

index_exports.append('')
(angular_dir / 'index.ts').write_text('\n'.join(index_exports), encoding='utf-8')
PY

  fetch_json "${schema_hash_endpoint}" "${TMP_DIR}/schema.json"
  local current_hash
  current_hash="$(python - <<'PY' "${TMP_DIR}/schema.json"
import json,sys
obj=json.load(open(sys.argv[1], encoding='utf-8'))
if isinstance(obj, dict) and 'result' in obj:
    obj=obj['result']
print(obj.get('schemaHash',''))
PY
)"

  echo "Sync completed. Output: ${OUTPUT_DIR}"
  echo "Current schema hash: ${current_hash}"

  LAST_SCHEMA_HASH="${current_hash}"
  SCHEMA_HASH_ENDPOINT="${schema_hash_endpoint}"
}

fetch_schema_hash() {
  local schema_file="${TMP_DIR}/schema.json"
  fetch_json "${SCHEMA_HASH_ENDPOINT:-/api/v1/ui-engine/schema-hash}" "${schema_file}"
  python - <<'PY' "${schema_file}"
import json,sys
obj=json.load(open(sys.argv[1], encoding='utf-8'))
if isinstance(obj, dict) and 'result' in obj:
    obj=obj['result']
print(obj.get('schemaHash',''))
PY
}

generate_artifacts

if [[ "${WATCH_MODE}" != "true" ]]; then
  exit 0
fi

echo "Watch mode enabled. Polling schema hash every 30s..."
while true; do
  sleep 30
  new_hash="$(fetch_schema_hash)"
  if [[ -z "${LAST_SCHEMA_HASH:-}" || "${new_hash}" != "${LAST_SCHEMA_HASH}" ]]; then
    echo "Schema changed: ${LAST_SCHEMA_HASH:-<none>} -> ${new_hash}. Regenerating..."
    generate_artifacts
  fi
done
