# 01_SYSTEM_ARCHITECTURE

**문서 ID**: CC-MON-001  
**버전**: v1.0  
**작성일**: 2026-04-08  
**상태**: Draft Fixed Baseline

---

## 1. 문서 목적

본 문서는 **Claude Code 모니터링 웹 서비스**의 상위 시스템 아키텍처를 정의한다.

본 문서의 목적은 다음과 같다.

1. 시스템을 구성하는 핵심 컴포넌트를 식별한다.
2. 컴포넌트 간 데이터 흐름과 책임 경계를 정의한다.
3. 수집, 저장, 조회, 실시간 전달, 시각화의 전체 구조를 고정한다.
4. MVP와 확장형 구조를 동시에 수용할 수 있는 아키텍처 기준을 제시한다.

본 문서는 이후 데이터 모델, Collector 설계, API 명세, UI 명세, 배포 문서의 상위 기준 문서로 사용한다.

---

## 2. 아키텍처 목표

본 시스템의 아키텍처는 다음 목표를 만족해야 한다.

### 2.1 관찰 가능성 확보

Claude Code 세션, 작업, 도구 실행, 하위 에이전트, 팀 작업 상태를 외부에서 관찰할 수 있어야 한다.

### 2.2 최소 침습 수집

Claude Code의 기존 사용 흐름을 크게 바꾸지 않고, 외부 수집 계층을 통해 상태를 확보해야 한다.

### 2.3 실시간 상태 반영

현재 작업상태, tool 실행상태, task 진행상태, heartbeat 이상 여부를 실시간에 가깝게 반영해야 한다.

### 2.4 이력 기반 복원

순간 상태만이 아니라 이벤트 이력을 저장하여 현재 상태를 재구성할 수 있어야 한다.

### 2.5 웹/모바일 조회 지원

데스크톱 웹과 모바일 브라우저 모두에서 핵심 상태를 조회할 수 있어야 한다.

### 2.6 확장성

단일 사용자 로컬 배포부터 다중 인스턴스 중앙형 수집 구조까지 확장 가능해야 한다.

---

## 3. 아키텍처 원칙

### 3.1 Event-First Architecture

모든 상태는 원칙적으로 이벤트로부터 파생된다. 현재 상태 화면은 projection 이며, 원천 진실(source of truth)은 수집된 이벤트이다.

### 3.2 Raw + Normalized 이중 저장

수집된 원본 이벤트는 가능한 한 보존하고, 조회 및 UI를 위해 표준 정규화 이벤트를 별도로 생성한다.

### 3.3 Write / Read 분리

수집 계층과 조회 계층을 논리적으로 분리한다.

- Write side: Collector, Event ingest, normalization
- Read side: Projection, query API, realtime delivery

### 3.4 Current State + Timeline 병행

현재 상태 조회와 시간순 이력 조회를 모두 지원한다.

### 3.5 Push + Pull 병행

- Pull: REST API 기반 조회
- Push: SSE 또는 WebSocket 기반 실시간 반영

### 3.6 Mobile Summary First

모바일에서는 상세 분석보다 **현재 상태 요약**이 우선되도록 설계한다.

### 3.7 Security by Default

기본적으로 최소 수집, 최소 노출, 최소 권한을 적용한다.

---

## 4. 상위 시스템 구조

시스템은 다음 6개 레이어로 구성한다.

1. **Claude Code Runtime Layer**
2. **Collection Layer**
3. **Processing Layer**
4. **Storage Layer**
5. **Delivery Layer**
6. **Presentation Layer**

이를 개념적으로 표현하면 다음과 같다.

```text
[Claude Code Runtime]
        │
        ▼
[Hook / Collector / Observer]
        │
        ▼
[Normalizer / Correlator / Projector]
        │
 ┌──────┴───────────────┐
 ▼                      ▼
[Raw Event Store]   [Current Projection Store]
        │                      │
        └──────────┬───────────┘
                   ▼
        [Query API / Realtime Stream]
                   │
          ┌────────┴─────────┐
          ▼                  ▼
     [Web Dashboard]   [Mobile Browser UI]
```

---

## 5. 레이어별 설명

## 5.1 Claude Code Runtime Layer

본 레이어는 실제 Claude Code 가 실행되는 영역이다.

### 책임

- 세션 실행
- 사용자 프롬프트 처리
- tool 호출 실행
- task/subagent/team 작업 수행
- hook 이벤트 발생

### 관찰 대상

- 세션 시작/종료
- user prompt submit
- pre/post tool use
- tool failure
- permission request/denied
- task created/completed
- subagent start/stop
- stop / stop failure
- compact / session end
- 기타 heartbeat 성격의 상태

### 비고

이 레이어는 본 시스템이 직접 제어하지 않는다. 관찰 가능한 인터페이스를 통해 상태를 외부 수집한다.

---

## 5.2 Collection Layer

Claude Code 외부에서 이벤트를 수집하는 계층이다.

### 주요 컴포넌트

- Hook Receiver
- Local Collector Agent
- File/Log Tail Watcher (선택)
- Session Heartbeat Reporter
- Optional Status Snapshotter

### 책임

- Claude Code hook 이벤트 수신
- 로컬 상태성 정보 수집
- 이벤트 전송 재시도
- 네트워크 장애 시 임시 버퍼링
- 수집 시점 timestamp 부여
- source instance 식별자 부여

### 입력

- hook stdin/json payload
- collector side heartbeat
- session metadata
- optional local status file

### 출력

- raw event envelope
- heartbeat event
- status snapshot event

### 설계 원칙

- Claude Code 실행 장비 가까이에 위치
- lightweight process 로 동작
- 일시적 API 서버 장애 시에도 손실 최소화

---

## 5.3 Processing Layer

수집된 이벤트를 해석하고, 상태 전이를 계산하고, projection 을 만드는 계층이다.

### 주요 컴포넌트

- Event Ingest Service
- Schema Validator
- Event Normalizer
- Correlation Engine
- State Transition Engine
- Projection Builder
- Alert Evaluator

### 책임

- raw event schema validation
- 표준 이벤트 모델 변환
- 동일 session/task/tool/subagent 관계 연결
- 상태 전이 계산
- 현재 상태 projection 생성
- 이상 이벤트 평가

### 핵심 처리

#### 5.3.1 Normalization

다양한 hook/event payload 를 시스템 표준 이벤트로 변환한다.

예시:
- `PreToolUse(Bash)` → `tool.execution.requested`
- `PostToolUse(Write)` → `tool.execution.succeeded`
- `PostToolUseFailure(Bash)` → `tool.execution.failed`
- `TaskCreated` → `task.created`
- `TaskCompleted` → `task.completed`

#### 5.3.2 Correlation

다음 키를 기준으로 연관관계를 구성한다.

- session_id
- task_id
- tool_use_id
- agent_id
- team_name
- teammate_name
- source_instance_id

#### 5.3.3 Projection

아래 현재 상태 뷰를 만든다.

- current session status
- current task status
- current tool status
- current subagent status
- team overview status
- stale/heartbeat timeout status

---

## 5.4 Storage Layer

이벤트와 projection 을 저장하는 계층이다.

### 저장소 분리 원칙

#### 5.4.1 Raw Event Store

원본 이벤트를 저장한다.

목적:
- 감사 추적
- 디버깅
- 재처리
- 정규화 로직 개선 시 재투영

#### 5.4.2 Normalized Event Store

정규화된 표준 이벤트를 저장한다.

목적:
- 상태 재생성
- 이력 조회
- timeline 구성

#### 5.4.3 Projection Store

현재 상태를 저장한다.

목적:
- 빠른 dashboard 조회
- 현재 상태 요약
- 모바일 요약 응답 최적화

#### 5.4.4 Cache / Stream Store

실시간 전달과 빠른 상태 push 를 위한 캐시성 저장소를 둔다.

목적:
- pub/sub
- last status cache
- realtime fan-out

### 권장 구성

- PostgreSQL: 영속 이벤트 + projection 주 저장소
- Redis: pub/sub, cache, short-lived state
- Object/File store: 필요 시 대용량 raw payload 보관

---

## 5.5 Delivery Layer

웹/모바일 및 외부 클라이언트에게 상태를 전달하는 계층이다.

### 주요 컴포넌트

- REST Query API
- SSE Stream API
- WebSocket Gateway (선택)
- Alert Webhook Dispatcher (선택)

### 책임

- 현재 상태 조회 API 제공
- timeline 조회 API 제공
- 실시간 상태 push 제공
- 모바일 친화적 요약 응답 제공
- 인증/인가 적용

### API 유형

#### 5.5.1 Query API

- 세션 목록 조회
- active session 조회
- session detail 조회
- task/subagent/team detail 조회
- timeline/event history 조회

#### 5.5.2 Realtime API

- session status changed
- task status changed
- tool execution changed
- heartbeat lost/restored
- alert raised/cleared

---

## 5.6 Presentation Layer

사용자에게 실제 화면을 제공하는 계층이다.

### 주요 화면

- Dashboard
- Active Sessions View
- Session Detail View
- Task/Subagent Timeline
- Team Status View
- Alert Center
- Mobile Summary Screen

### 책임

- 현재 진행상황 가시화
- 실시간 상태 반영
- drill-down 탐색
- 모바일 요약 확인

### UI 원칙

- 데스크톱: 다수 세션/세부 상태 중심
- 모바일: 현재 상태 카드/핵심 알림 중심
- 색상/아이콘으로 상태 구분
- 진행중 / 대기 / 차단 / 실패 / 종료 상태 즉시 구분

---

## 6. 핵심 컴포넌트 상세

## 6.1 Hook Receiver

Claude Code hook 가 호출하는 로컬 또는 원격 endpoint/command 어댑터이다.

### 역할

- hook event payload 수신
- 공통 envelope 생성
- collector 로 전달

### 입력 예시

- SessionStart
- UserPromptSubmit
- PreToolUse
- PostToolUse
- PermissionRequest
- SubagentStart
- TaskCompleted

### 비고

hook command 방식과 HTTP hook 방식 모두 수용 가능하도록 추상화한다.

---

## 6.2 Local Collector Agent

Claude Code 실행 호스트에서 동작하는 이벤트 수집 프로세스이다.

### 역할

- Hook Receiver 로부터 이벤트 수집
- local queue buffering
- 중앙 ingest API 전송
- heartbeat 생성
- collector 상태 보고

### 요구 특성

- 경량성
- 자동 재시도
- 일시적 오프라인 허용
- 중복 방지 키 부여

---

## 6.3 Event Ingest Service

모든 수집 이벤트의 서버측 진입점이다.

### 역할

- 인증 확인
- schema validation
- raw event 저장
- 비동기 processing enqueue

### 비기능 요구

- idempotency support
- burst traffic 수용
- low latency ack

---

## 6.4 Event Normalizer

원본 이벤트를 표준 이벤트로 변환한다.

### 역할

- event type mapping
- 필드 정규화
- 누락 필드 기본값 처리
- 민감정보 마스킹

### 출력 예시

- session.started
- prompt.submitted
- tool.started
- tool.succeeded
- tool.failed
- task.started
- task.completed
- agent.started
- agent.stopped
- session.stopped

---

## 6.5 Correlation Engine

이벤트 간 연관관계를 형성한다.

### 역할

- 동일 실행 흐름 연결
- tool_use_id 기반 연속 이벤트 연결
- task/subagent/team topology 구성
- session tree 생성

### 예시

하나의 세션 아래에:
- 여러 task
- 각 task 아래 tool 실행
- subagent start/stop 이벤트
- team member activity

를 계층적으로 묶는다.

---

## 6.6 Projection Builder

이벤트 스트림을 현재 상태 뷰로 변환한다.

### projection 예시

- `session_current`
- `task_current`
- `tool_current`
- `agent_current`
- `team_current`
- `alert_current`

### projection 속성 예시

- current_status
- started_at
- updated_at
- last_heartbeat_at
- is_stale
- current_step
- last_error
- progress_hint

---

## 6.7 Alert Evaluator

이상 상태를 규칙 기반으로 평가한다.

### 주요 규칙 예시

- heartbeat timeout
- tool failure rate spike
- task blocked too long
- permission request not resolved
- session unexpectedly terminated
- collector disconnected

### 출력

- alert.raised
- alert.updated
- alert.cleared

---

## 6.8 Query API Server

조회용 API 서버이다.

### 역할

- projection 기반 조회
- timeline/history 조회
- filter/search 제공
- UI 데이터 조합 응답

### 설계 방향

- read optimized
- paging/filter/search 지원
- summary endpoint 별도 제공

---

## 6.9 Realtime Gateway

실시간 상태 변경을 push 하는 계층이다.

### 역할

- state change event fan-out
- SSE stream 유지
- websocket 확장 대응
- reconnect support

### 기본 권장

초기 MVP 는 SSE 우선으로 설계한다.

이유:
- 구현 단순
- 브라우저 친화적
- 모바일 브라우저 대응 용이
- 서버 자원 관리가 비교적 단순

---

## 6.10 Web UI

상태를 종합적으로 보여주는 메인 UI 이다.

### 주요 뷰

- 전체 active session dashboard
- session 상세
- 팀/서브에이전트 구조 뷰
- 시간순 이벤트 타임라인
- alert panel

---

## 6.11 Mobile Summary UI

모바일 브라우저 최적화 뷰이다.

### 주요 목표

- 지금 살아있는가?
- 현재 무슨 작업 중인가?
- 실패/멈춤/대기 상태인가?
- 마지막 heartbeat 는 언제인가?

### 원칙

상세 분석보다 1-screen summary 우선

---

## 7. 데이터 흐름

## 7.1 기본 흐름

```text
Claude Code
  → Hook Event 발생
  → Local Collector 수집
  → Ingest API 전송
  → Raw Event 저장
  → Normalize / Correlate
  → Projection 갱신
  → Realtime Stream 발행
  → Web/Mobile UI 반영
```

## 7.2 조회 흐름

```text
User Browser
  → Query API 요청
  → Projection Store 조회
  → 필요 시 timeline join
  → 응답 반환
```

## 7.3 이상 탐지 흐름

```text
Event / Heartbeat
  → Alert Evaluator
  → alert state 생성
  → UI 반영 / webhook dispatch
```

---

## 8. 상태 계층 모델

상태는 다음 계층으로 관리한다.

### 8.1 Session

가장 상위 실행 단위

### 8.2 Task

세션 내 작업 단위

### 8.3 Tool Execution

실제 Bash/Read/Edit/WebFetch 등 실행 단위

### 8.4 Agent / Subagent

독립 context 작업 단위

### 8.5 Team / Teammate

다중 세션 협업 구조 단위

### 8.6 Alert

이상 상태 단위

---

## 9. 아키텍처 패턴

## 9.1 Event Sourcing-lite

완전한 event sourcing 까지는 아니더라도, 상태가 이벤트로부터 재구성 가능하도록 설계한다.

## 9.2 CQRS-lite

- write path: ingest/normalize/project
- read path: projection/query

## 9.3 Observer Pattern

Claude Code 실행 상태를 외부 observer 가 관찰한다.

## 9.4 Projection Pattern

화면별 요구에 맞는 현재 상태 모델을 별도로 유지한다.

## 9.5 Stream Update Pattern

실시간 UI 반영을 위해 projection 변경 시 stream event 를 발행한다.

---

## 10. 배포 토폴로지

## 10.1 단일 사용자 로컬형

```text
[Claude Code Host]
  - Claude Code
  - Collector
  - API Server
  - DB
  - Web UI
```

### 용도

- 개인용
- MVP
- 가장 빠른 검증

## 10.2 로컬 수집 + 외부 조회형

```text
[Local PC]
  - Claude Code
  - Collector
      │
      ▼
[Remote Server/VPS]
  - Ingest API
  - DB
  - Web UI
```

### 용도

- 모바일 원격 조회
- 외부 네트워크에서 진행상황 확인

## 10.3 다중 인스턴스 중앙형

```text
[Host A: Claude Code + Collector] ─┐
[Host B: Claude Code + Collector] ─┼→ [Central Monitor Platform]
[Host C: Claude Code + Collector] ─┘
```

### 용도

- 팀/조직 단위 통합 모니터링

---

## 11. 보안 경계

### 11.1 로컬 수집 경계

Claude Code 와 Collector 사이

### 11.2 전송 경계

Collector 와 Ingest API 사이

### 11.3 조회 경계

Browser 와 Query API 사이

### 11.4 데이터 보호 경계

- raw payload
- prompt 내용
- command 내용
- file path
- token/secret

민감도에 따라 마스킹/비수집/권한 분리를 적용한다.

---

## 12. 장애 및 복구 관점

### 12.1 Collector 장애

- local queue 재시작 복구
- 전송 재시도
- heartbeat 누락 alert

### 12.2 API 장애

- collector side buffering
- 재전송

### 12.3 Projection 장애

- raw/normalized event 재처리로 복원

### 12.4 UI 장애

- 저장된 projection 기반 복구 가능

---

## 13. MVP 기준 아키텍처

MVP 는 다음 최소 구성으로 한다.

### 13.1 포함 컴포넌트

- Hook 기반 Collector
- Ingest API
- Raw Event Store
- Projection Builder
- PostgreSQL
- Redis(optional minimal)
- REST API
- SSE API
- React Web UI
- 모바일 responsive summary

### 13.2 제외 또는 후순위

- 고급 WebSocket topology
- 다중 tenant 고도화
- 복잡한 role-based access matrix
- OTEL full pipeline integration 고도화
- 외부 알림 다채널 연계

---

## 14. 확장 방향

### 14.1 다중 사용자/다중 프로젝트

- tenant 분리
- project namespace
- user-scoped dashboard

### 14.2 알림 자동화

- Slack
- Email
- Webhook
- Mobile push

### 14.3 분석 기능

- session throughput
- tool usage distribution
- failure hotspot
- stuck pattern analysis

### 14.4 비용/usage 가시화

Claude Code 및 관련 사용량 데이터를 연계할 수 있는 구조로 확장 가능하게 설계한다.

---

## 15. 기술 선택 권고안

현재 시점 기준 권고안은 다음과 같다.

### 15.1 Backend

- FastAPI
- Pydantic v2
- SQLAlchemy 또는 SQLModel
- Redis pub/sub 또는 stream

### 15.2 Frontend

- React
- TypeScript
- Responsive dashboard UI
- SSE client 우선

### 15.3 DB

- PostgreSQL 우선
- Redis 보조

### 15.4 배포

- Docker Compose 기반 우선
- 필요 시 VPS/클라우드 배포 확장

---

## 16. 아키텍처 결론

본 시스템은 **Claude Code 외부 관찰형 모니터링 플랫폼**으로 정의한다.

핵심 구조는 다음과 같다.

1. Claude Code에서 발생한 이벤트를 hook/collector 로 수집한다.
2. 수집 이벤트를 raw + normalized 형태로 저장한다.
3. 표준 상태 모델과 projection 을 생성한다.
4. REST + SSE 로 웹/모바일에 전달한다.
5. 현재 상태, 이력, 이상 상태를 통합적으로 시각화한다.

이 아키텍처는 다음 요구를 동시에 만족한다.

- 단일 사용자 MVP 가능
- 모바일 진행상황 조회 가능
- 실시간 상태 반영 가능
- 다중 세션/에이전트/팀 구조 확장 가능
- 보안과 최소 침습 원칙 유지 가능

---

## 17. 다음 작성 대상

다음 문서:

- `02_REQUIREMENTS_SPEC.md`

---

버전 정보: GPT-5.4 Thinking

