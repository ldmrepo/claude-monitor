# Claude Vault — Task List

## Phase 1: Foundation + Session E2E

- [ ] 1.1 Project Scaffolding (Next.js 15 + TS + Tailwind + shadcn/ui)
- [ ] 1.2 Database + Drizzle Schema (8 tables)
- [ ] 1.3 Shared Library (id, constants, timestamps)
- [ ] 1.4 Ingest Pipeline Core (validate → raw → normalize → project → broadcast)
- [ ] 1.5 Session Normalizer + Projection
- [ ] 1.6 Hook API Routes (session-start, stop, session-end)
- [ ] 1.7 SSE Infrastructure (server + client)
- [ ] 1.8 Home Dashboard (Screen 1)
- [ ] **CHECKPOINT 1**: E2E session hook → dashboard 실시간 반영

## Phase 2: Tool Execution E2E

- [ ] 2.1 Tool Normalizer (Pre/Post correlation)
- [ ] 2.2 Tool Projection (duration_ms, session counters)
- [ ] 2.3 Hook API Routes (pre-tool, post-tool, post-tool-failure)
- [ ] 2.4 Session Detail Screen (Screen 2)
- [ ] 2.5 Tool Timeline Screen (Screen 3)
- [ ] **CHECKPOINT 2**: Tool lifecycle 추적 + UI 동작

## Phase 3: Task + Agent E2E

- [ ] 3.1 Task Normalizer + Projection
- [ ] 3.2 Agent Normalizer + Projection
- [ ] 3.3 Hook API Routes (task-created, task-completed, subagent-start, subagent-stop)
- [ ] 3.4 Session Detail — Task/Agent Panels
- [ ] 3.5 Task/Agent View Screen (Screen 4)
- [ ] **CHECKPOINT 3**: 5개 projection 동작 + Session Detail 완성

## Phase 4: Alerts + Heartbeat/Stale

- [ ] 4.1 Heartbeat Timer + Stale Detection
- [ ] 4.2 Alert Projection (rules + lifecycle)
- [ ] 4.3 Alert Panel Screen (Screen 5)
- [ ] **CHECKPOINT 4**: Alert 시스템 동작 + 10개 hook endpoint 완성

## Phase 5: Event Timeline + Filters

- [ ] 5.1 Event Timeline Screen (Screen 6)
- [ ] 5.2 Cross-Screen Filtering
- [ ] 5.3 Query API Routes
- [ ] **CHECKPOINT 5**: 6개 UI 화면 + 필터 + API 완성

## Phase 6: Polish + Hook Installer

- [ ] 6.1 Hook Config Generator
- [ ] 6.2 Test Ingest Script
- [ ] 6.3 UI Polish (loading states, dark mode, error boundaries)
- [ ] 6.4 Health Check + README
- [ ] **CHECKPOINT 6 (Final)**: 전체 동작 검증
