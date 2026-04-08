# Claude Vault — Structured Dashboard

## Problem Statement

> "로컬에서 실행 중인 Claude Code 세션들의 상태를, 하나의 웹 대시보드에서 실시간으로 확인하고 싶다."

## Recommended Direction

문서의 핵심 아키텍처(Event-First, Raw+Normalized 분리, Projection 모델, 상태 전이 규칙)를 유지하되, TypeScript 풀스택 단일 프로세스로 구현한다.

### Architecture

```
Claude Code (Hooks)
    |
    v
Next.js API Routes (Hook 수신 + Ingest)
    |
    v
SQLite (better-sqlite3, WAL mode)
  - raw_events (원본 보존)
  - events (정규화)
  - projections (현재 상태)
    |
    v
Next.js App Router (Dashboard UI)
  + SSE (실시간 업데이트)
```

문서의 6-layer를 2-process(Claude Code + Next.js)로 압축:
- Collection + Processing + Storage + Delivery = **Next.js 서버**
- Presentation = **Next.js 클라이언트**
- 별도 Collector daemon 없음. Hook이 직접 API Route 호출.

### Tech Stack

- **Next.js 15** (App Router, API Routes)
- **better-sqlite3** + **Drizzle ORM** (WAL mode)
- **SSE** (실시간 상태 반영)
- **shadcn/ui + Tailwind CSS** (UI)
- **TypeScript** 전체

### Data Model (문서 기반, 8 테이블)

| 테이블 | 문서 참조 | 역할 |
|--------|-----------|------|
| `raw_events` | 04_DATA_MODEL 8절 | 원본 이벤트 보존 |
| `events` | 04_DATA_MODEL 9절 | 정규화된 표준 이벤트 |
| `session_current` | 04_DATA_MODEL 10절 | 세션 상태 projection |
| `task_current` | 04_DATA_MODEL 12절 | 태스크 상태 projection |
| `tool_exec_current` | 04_DATA_MODEL 14절 | 툴 실행 상태 projection |
| `agent_current` | 04_DATA_MODEL 15절 | 에이전트 상태 projection |
| `alert_current` | 04_DATA_MODEL 18절 | 알림 상태 projection |
| `processor_checkpoint` | 04_DATA_MODEL 20절 | 처리 위치 관리 |

### 문서 설계에서 유지하는 것

- **Event-First Architecture**: events가 source of truth, projection은 파생
- **Raw + Normalized 분리**: raw_events + events 2단 저장
- **Projection 모델**: SessionCurrent, TaskCurrent, ToolExecutionCurrent, AgentCurrent, AlertCurrent
- **상태 전이 규칙**: 문서의 상태값 표준 사전 (24절) 그대로 적용
- **Heartbeat / Stale 판정**: heartbeat timeout 기반 stale 감지
- **Alert 모델**: 기본 이상 탐지 규칙 (heartbeat timeout, tool failure, session stale 등)
- **SSE 실시간 반영**: projection 변경 시 SSE 이벤트 발행
- **6개 UI 화면**: 홈 대시보드, 세션 상세, Tool 타임라인, Task/Agent 화면, Alert 패널, 이벤트 타임라인
- **Idempotency**: idempotency_key 기반 중복 제거
- **상태별 색상/아이콘 구분**: UXR-001, UXR-002

### 문서 설계에서 바꾸는 것

| 원래 | 변경 | 이유 |
|------|------|------|
| FastAPI + React 분리 | Next.js 풀스택 | TS 풀스택 선호 |
| PostgreSQL + Redis | SQLite (WAL) | 1인 사용, 단일 프로세스 |
| Local Collector daemon | Next.js 서버가 직접 수집 | 프로세스 단순화 |
| Docker Compose 멀티 컨테이너 | `npm start` 단일 프로세스 | 설치 단순화 |
| 다중 사용자/팀 확장 | 1인 사용 우선 | 실제 사용 시나리오 |

## Key Assumptions to Validate

- [ ] Claude Code HTTP hook이 안정적으로 동작하는지 (실패 시 본작업에 영향 여부)
- [ ] Hook payload에 session_id, tool_use_id, agent_id 등 핵심 식별자가 실제로 포함되는지
- [ ] SQLite WAL 모드에서 멀티 에이전트 동시 hook write가 문제없는지
- [ ] Next.js API route가 hook 수신 + SSE 스트리밍을 동시에 안정적으로 처리하는지
- [ ] Raw + Normalized 분리가 1인 사용에서 실제로 재처리 가치가 있는지

## MVP Scope

### 포함 (문서 1단계 + 2단계 통합)

**수집 계층:**
1. 10개 Hook 수신 API endpoint (문서 10.1절 전체)
2. Raw Event 저장 (envelope 포함)
3. Normalized Event 변환 (문서 11절 표준 이벤트 타입)
4. Idempotency key 기반 중복 제거
5. Heartbeat 생성 + stale 판정

**Projection 계층:**
6. SessionCurrent projection (문서 10절 전체 필드)
7. ToolExecutionCurrent projection (문서 14절)
8. TaskCurrent projection (문서 12절)
9. AgentCurrent projection (문서 15절)
10. AlertCurrent projection (heartbeat timeout, tool failure, session stale, repeated failure)

**실시간 계층:**
11. SSE 기반 실시간 상태 push

**UI 계층:**
12. 홈 대시보드 (활성 세션, 실행 중 tool, alert 요약)
13. 세션 상세 화면 (세션 메타 + tool/task/agent 패널)
14. Tool 타임라인 화면 (실행 순서, duration, 성공/실패)
15. Task/Agent 화면 (상태 목록, 계층 연결)
16. Alert 패널 (활성 alert, 이력)
17. 이벤트 타임라인 (시간순 전체 이벤트 흐름)
18. 상태별 색상/아이콘 구분
19. 기본 필터 (상태, 기간)

### 후순위

- TeamCurrent (agent 추적으로 당분간 충분)
- OTel 연동 / 비용 추적 그래프
- SessionStatsDaily / 트렌드 분석
- 검색 고도화 (search_text 기반)
- 다중 호스트 확장
- 인증/권한 체계
- 모바일 최적화
- Push notification / Slack 연동
- ReplayJob / ProjectionBuildState

## Not Doing (and Why)

- **별도 Collector daemon** — 1인 사용이라 Next.js 서버가 직접 수집하면 충분. 프로세스 단순화.
- **PostgreSQL / Redis** — SQLite WAL로 1인 사용 충분. DB 마이그레이션 비용 대비 이점 없음.
- **다중 사용자 인증** — localhost 전용. 외부 노출 필요 시 추후 추가.
- **모바일 최적화** — 데스크탑 대시보드가 핵심 시나리오. 반응형은 후순위.
- **Team topology 고도화** — AgentCurrent로 teammate도 추적 가능. TeamCurrent는 후순위.
- **CQRS 완전 분리** — 논리적 분리만 유지. 물리적 서비스 분리 불필요.
- **Batch/Stream transport** — 단건 HTTP POST로 충분. 고부하 시나리오 아님.
- **Spool fallback** — Hook 실패 시 이벤트 유실 허용. 치명적이지 않음.

## Open Questions

- Hook 설정을 `claude-vault init` 명령으로 자동화할 수 있는가?
- 비용 추정 데이터를 hook payload에서 얻을 수 있는가, OTel이 필수인가?
- 기존 GPT-5.4 작성 문서 5개의 처리 방침 (보관/업데이트/폐기)
- SQLite → PostgreSQL 마이그레이션 경로를 Drizzle이 원활히 지원하는가?

## References

- `docs/claude_code_monitoring_web_service_architecture_v_1_0.md` — 원본 아키텍처
- `docs/01_system_architecture.md` — 시스템 아키텍처
- `docs/02_requirements_spec.md` — 요구사항 명세
- `docs/03_event_collection_spec.md` — 이벤트 수집 명세
- `docs/04_data_model_spec.md` — 데이터 모델 명세
