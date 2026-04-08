# Claude Vault — Implementation Plan

> See full plan at: `.claude/plans/delegated-gathering-wind.md`

## Summary

6 Phases, 각각 수직 슬라이스 (hook → DB → projection → SSE → UI):

1. **Foundation + Session E2E** — 스캐폴딩, DB 8테이블, Pipeline, Session, SSE, 홈 대시보드
2. **Tool Execution E2E** — Tool 정규화/Projection, Session Detail, Tool Timeline
3. **Task + Agent E2E** — Task/Agent 정규화/Projection, Task/Agent View
4. **Alerts + Heartbeat** — Stale 감지, Alert 규칙, Alert Panel
5. **Event Timeline + Filters** — 이벤트 타임라인, 필터, Query API
6. **Polish + Hook Installer** — Hook config 자동생성, 테스트 스크립트, README

## Tech Stack

- Next.js 15 (App Router + API Routes)
- better-sqlite3 + Drizzle ORM (WAL mode)
- SSE (실시간)
- shadcn/ui + Tailwind CSS
- TypeScript 전체
