# SENTINEL-X Platform

## Overview

Production-grade multi-domain global situational awareness, intelligence fusion, and operational decision-support platform. pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 + WebSocket (ws library)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + Recharts + TanStack Query

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Architecture

### Artifacts
- **API Server** (`artifacts/api-server`) — Express REST API + WebSocket gateway, port proxied at `/api-server/`
- **Sentinel Platform** (`artifacts/sentinel-platform`) — React web app, mounted at `/`
- **Canvas** (`artifacts/mockup-sandbox`) — Component preview server for UI development

### Database Schema (lib/db/src/schema/)
- `threats` — Multi-domain threat intelligence records
- `incidents` — Operational incidents and events
- `assets` — Tracked assets (vessels, aircraft, satellites, etc.)
- `signals` — SIGINT/ELINT signal intercepts
- `gps_anomalies` — GPS spoofing/jamming events
- `alerts` — Alert management with SLA tracking
- `cases` + `case_notes` — Investigation case management
- `users` — RBAC user management with clearance levels
- `audit_logs` — Full audit trail
- `workspaces` — Team collaboration workspaces
- `knowledge_nodes` + `knowledge_edges` — Knowledge graph (entity relationships)
- `activity_events` — Live activity feed events

### API Routes (`artifacts/api-server/src/routes/`)
- `/api/auth/` — Login, logout, session management
- `/api/alerts/` — Alert CRUD + stats
- `/api/cases/` + `/api/cases/:id/notes` — Case management + notes
- `/api/analytics/` — Overview, threat trend, domains, regions, assets, MTTR
- `/api/knowledge/` — Knowledge graph nodes and edges
- `/api/workspaces/` — Workspace CRUD
- `/api/admin/` — System status, user management, audit logs
- `/api/ai/` — Briefing generation, natural language queries, summarization
- `/api/search/` — Global multi-entity search
- `/api/threats/`, `/api/incidents/`, `/api/assets/`, `/api/signals/`, `/api/gps-anomalies/`
- WebSocket at `/ws` — Real-time streaming (alerts, asset updates, heartbeats)

### Frontend Pages (`artifacts/sentinel-platform/src/pages/`)
- `login.tsx` — Authentication gate with demo credentials
- `dashboard.tsx` — Global Watch command center with live data charts
- `map.tsx` — SVG tactical map with asset tracking + threat visualization
- `alerts.tsx` — Alert management with CRUD, filters, status actions
- `cases.tsx` — Investigation case management with AI summaries + notes
- `analytics.tsx` — Multi-chart analytics dashboard (area, bar, pie, radar)
- `search.tsx` — Global intelligence search across all entities
- `knowledge.tsx` — Interactive force-directed knowledge graph visualizer
- `copilot.tsx` — AI copilot chat + intelligence briefing generator
- `admin.tsx` — Admin console: system status, user management, audit logs
- `workspaces.tsx` — Team workspace management
- Plus existing: `threats.tsx`, `incidents.tsx`, `assets.tsx`, `signals.tsx`, `gps.tsx`, `settings.tsx`

### Frontend Contexts
- `AuthContext` — Session management with JWT token storage
- `RealtimeContext` — WebSocket connection state + live alert feed

## Demo Credentials
All accounts use password: `password`
- `admin` — super_admin, TOP SECRET clearance
- `analyst1` — analyst, SECRET clearance
- `operator1` — operator, SECRET clearance
- `exec1` — executive, TOP SECRET clearance

## Domains Covered
aviation, maritime, orbital, seismic, conflict, weather, cyber, nuclear, sigint, infrastructure, energy, logistics, border, telecom, public_safety

## Real-time Features
- WebSocket gateway streams live alerts, asset position updates, heartbeats every 15s
- Simulation engine ticks every 15 seconds updating asset positions and generating events
- AIS maritime stream integration for live vessel tracking

## API Proxy Routing
- Frontend at `/` → Vite dev server
- API at `/api-server/` → Express API server (port 8080)
- WebSocket at `/api-server/ws` → WS gateway

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
