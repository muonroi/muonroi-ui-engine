# UI Engine Architecture

## Design Principles

1. Backend-first metadata: menu, screen, action, and visibility are authored by backend.
2. Contract-first runtime: frontend renders from `MUiEngineManifest` without embedding business permission logic.
3. Adapter-driven UI kit: component mapping is pluggable (PrimeNG, Material, custom kits).
4. Auto client generation: API models can be generated from OpenAPI and consumed by runtime.

## Runtime Flow

1. FE boots and calls `GET /api/v1/auth/ui-engine/current`.
2. FE can optionally call `GET /api/v1/auth/ui-engine/contract-info` for schema compatibility check.
3. `MUiEngineRuntime` normalizes manifest and prepares navigation/screen/action indexes.
4. Adapter maps abstract components to UI-library components.
5. FE renders pages from runtime state; permissions and disabled reasons are already resolved by backend.

## UI Library Adapters

- Core keeps abstract component types (`page-content`, `tab-content`, `panel`...).
- Adapter packages map these types into specific UI libraries.
- Current adapter: `@muonroi/ui-engine-primeng`.
- Additional adapters can be shipped without changing backend contracts.

## Hybrid Boundary

### Backend (`MuonroiBuildingBlock`)

- Contracts (`MUiEngineManifest` and related types)
- Composition logic from permissions/RBAC/license
- API endpoints (`ui-engine/{userId}`, `ui-engine/current`)

### UI Engine Repo (`Muonroi.Ui.Engine`)

- Runtime state and helpers
- Framework adapters
- MVC integration client
- OpenAPI generation scripts
