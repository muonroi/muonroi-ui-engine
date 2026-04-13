# Project: Control Plane Dashboard Modernization

## Core Value

Transform the Control Plane dashboard from a functional prototype into a professional, production-quality admin interface with proper tenant management, consistent layout, and dark mode support.

## Constraints

- Must work within existing Control Plane API infrastructure
- UI built with React + PrimeReact component library
- Must follow professional token system (no inline styles, no hardcoded values)
- Phase numbering continues from v1.1 (phases 13-17), starting at 18
- All changes in muonroi-control-plane dashboard

## Key Decisions

| # | Date | Decision | Rationale |
|---|------|----------|-----------|
| 1 | 2026-03-20 | Start v2.0 at Phase 18 | Continuous numbering: v1.0=1-12, v1.1=13-17 |
| 2 | 2026-03-20 | Bug fixes + API first (Phase 18) | Foundation must be stable before UI work |
| 3 | 2026-03-20 | Layout before pages | Sidebar/header/breadcrumb must exist before page content modernization |
| 4 | 2026-03-20 | Dark mode last | Requires design system and all pages finalized first |
