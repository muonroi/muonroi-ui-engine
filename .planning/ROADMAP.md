# Roadmap: Control Plane Dashboard Modernization

## Milestones

- ✅ **v1.0 Rule Studio Core** - Phases 1-12 (shipped)
- ✅ **v1.1 Design & Accessibility** - Phases 13-17 (shipped)
- 📋 **v2.0 Dashboard Modernization** - Phases 18-22 (planned)

## Phases

<details>
<summary>v1.0 Rule Studio Core (Phases 1-12) - SHIPPED</summary>

See previous planning artifacts for phases 1-12.

</details>

<details>
<summary>v1.1 Design & Accessibility (Phases 13-17) - SHIPPED</summary>

See previous planning artifacts for phases 13-17.

</details>

### v2.0 Dashboard Modernization

**Milestone Goal:** Transform the Control Plane dashboard into a professional admin interface with tenant management, consistent layout, and dark mode.

- [ ] **Phase 18: Bug Fixes & API Foundation** - Fix Invalid Date bug and expose tenant CRUD API
- [ ] **Phase 19: Dashboard Layout** - Sidebar navigation, header bar, breadcrumbs, responsive layout
- [ ] **Phase 20: Tenant Management UI** - Full tenant CRUD interface with quota and feature flag management
- [ ] **Phase 21: Page Modernization** - Consistent cards, tables, forms, and states across all pages
- [ ] **Phase 22: Dark Mode** - Theme toggle and full light/dark theme support

## Phase Details

### Phase 18: Bug Fixes & API Foundation
**Goal**: Users see correct dates everywhere and the backend is ready for tenant management
**Depends on**: Phase 17 (v1.1 complete)
**Requirements**: PMOD-02, TMGT-07
**Success Criteria** (what must be TRUE):
  1. All date displays across the dashboard show correctly formatted dates (no "Invalid Date" text anywhere)
  2. Backend tenant CRUD endpoints (list, create, read, update, deactivate) respond with correct data when called via API
  3. Tenant API endpoints enforce proper authentication and return appropriate error responses for unauthorized requests
**Plans**: TBD

Plans:
- [ ] 18-01: Fix Invalid Date bug across all date components
- [ ] 18-02: Implement tenant CRUD API endpoints in Control Plane

### Phase 19: Dashboard Layout
**Goal**: Users navigate the dashboard through a professional sidebar, header, and breadcrumb system
**Depends on**: Phase 18
**Requirements**: DLYT-01, DLYT-02, DLYT-03, DLYT-04
**Success Criteria** (what must be TRUE):
  1. User can navigate between all dashboard pages using a persistent sidebar with grouped menu categories
  2. User sees their identity and can access quick actions from the top header bar on every page
  3. User can see their current location in the page hierarchy via breadcrumbs and click to navigate up
  4. Dashboard layout adapts gracefully when browser window is resized to tablet width (768px)
  5. Sidebar can be collapsed/expanded without breaking page content layout
**Plans**: TBD

Plans:
- [ ] 19-01: Sidebar navigation with grouped categories
- [ ] 19-02: Header bar, breadcrumbs, and responsive behavior

### Phase 20: Tenant Management UI
**Goal**: Admin users can fully manage tenants from the dashboard without needing API calls
**Depends on**: Phase 18 (API), Phase 19 (layout)
**Requirements**: TMGT-01, TMGT-02, TMGT-03, TMGT-04, TMGT-05, TMGT-06
**Success Criteria** (what must be TRUE):
  1. User can view a paginated tenant list with working search by name and filter by tier/status
  2. User can create a new tenant via a form with validation, and see it appear in the list immediately
  3. User can edit any tenant's details (name, tier, quota limits) and see changes reflected after save
  4. User can deactivate a tenant and see its status change; can reactivate a deactivated tenant
  5. User can view a tenant's quota usage as visual indicators (progress bars or similar) showing current vs. limit
**Plans**: TBD

Plans:
- [ ] 20-01: Tenant list page with search, filter, and pagination
- [ ] 20-02: Tenant create/edit forms with validation
- [ ] 20-03: Tenant detail view with quota usage and feature flags

### Phase 21: Page Modernization
**Goal**: Every dashboard page looks and behaves consistently using shared patterns
**Depends on**: Phase 19 (layout), Phase 20 (tenant pages as reference)
**Requirements**: PMOD-01, PMOD-03, PMOD-04, PMOD-05
**Success Criteria** (what must be TRUE):
  1. All dashboard pages use card-based content areas with consistent padding, borders, and shadows
  2. All data tables across the dashboard have identical column header styling, sort indicators, and pagination controls
  3. All forms show inline validation errors on blur, disable submit when invalid, and show success/error toast on completion
  4. Every page displays a skeleton loader during data fetch and a meaningful empty state when no data exists
**Plans**: TBD

Plans:
- [ ] 21-01: Shared card layout and table components
- [ ] 21-02: Form patterns, loading states, and empty states

### Phase 22: Dark Mode
**Goal**: Users can work in dark mode with full visual fidelity across the entire dashboard
**Depends on**: Phase 19 (layout), Phase 21 (all pages modernized)
**Requirements**: DARK-01, DARK-02
**Success Criteria** (what must be TRUE):
  1. User can click a toggle in the header to switch between light and dark theme, and the preference persists across sessions
  2. All pages, components, cards, tables, forms, and charts render with correct contrast and no visual artifacts in dark mode
  3. Theme switch happens instantly without a full page reload or visible flash of unstyled content
**Plans**: TBD

Plans:
- [ ] 22-01: Theme infrastructure (CSS custom properties, toggle, persistence)
- [ ] 22-02: Dark mode audit and fixes across all pages

## Progress

**Execution Order:** 18 -> 19 -> 20 -> 21 -> 22

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 18. Bug Fixes & API Foundation | v2.0 | 0/2 | Not started | - |
| 19. Dashboard Layout | v2.0 | 0/2 | Not started | - |
| 20. Tenant Management UI | v2.0 | 0/3 | Not started | - |
| 21. Page Modernization | v2.0 | 0/2 | Not started | - |
| 22. Dark Mode | v2.0 | 0/2 | Not started | - |
