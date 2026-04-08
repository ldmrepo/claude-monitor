# 04_DATA_MODEL_SPEC

**문서 ID**: CC-MON-004  
**버전**: v1.0  
**작성일**: 2026-04-08  
**상태**: Draft Fixed Baseline

---

## 1. 문서 목적

본 문서는 **Claude Code 모니터링 웹 서비스**의 데이터 모델을 정의한다.

본 문서의 목적은 다음과 같다.

1. 이벤트 수집 문서에서 정의한 raw event / normalized event 를 저장 가능한 데이터 구조로 고정한다.
2. 현재 상태 조회를 위한 projection 모델을 정의한다.
3. 세션, 태스크, 툴 실행, 서브에이전트, 팀, collector, alert 등 주요 엔터티 간 관계를 명확히 한다.
4. 이후 API, UI, 운영 문서가 동일한 데이터 의미를 공유하도록 기준 모델을 제공한다.

본 문서는 논리 데이터 모델 중심 문서이며, 특정 DBMS 의 DDL 을 직접 기술하지 않는다.

---

## 2. 범위

본 문서는 다음을 포함한다.

- core entity 정의
- raw event 모델
- normalized event 모델
- current state projection 모델
- alert 및 health 모델
- 주요 관계 및 키 전략
- 상태값 표준
- 인덱싱 관점의 설계 기준
- 보존 및 재처리 관점의 분리 기준

본 문서는 다음을 직접 상세 설계하지 않는다.

- 실제 SQL DDL
- 마이그레이션 스크립트
- API request/response 상세
- UI widget 구조

---

## 3. 설계 원칙

### P-01 Event-first

시스템의 사실 원천(source of truth)은 이벤트다. projection 은 파생 상태다.

### P-02 Raw / Normalized / Projection 분리

원본 이벤트, 표준 이벤트, 현재 상태 모델을 명확히 분리한다.

### P-03 조회 목적 최적화

운영 UI 와 모바일 원격 조회는 projection 을 사용하고, 분석/복구는 event 계층을 사용한다.

### P-04 재처리 가능성

projection 은 삭제 후 재생성 가능해야 한다.

### P-05 부분 장애 허용

일부 projection 생성 실패가 전체 raw/normalized 보존을 막아서는 안 된다.

### P-06 확장 가능 식별자

단일 세션뿐 아니라 subagent, team, multi-host 수집을 확장 가능하게 설계한다.

### P-07 상태와 이력 분리

현재 상태(current state)와 상태 변화 이력(history)을 혼합하지 않는다.

---

## 4. 데이터 계층 구조

데이터 계층은 다음 4계층으로 구분한다.

1. **Raw Layer**
2. **Normalized Event Layer**
3. **Projection Layer**
4. **Operational Metadata Layer**

## 4.1 Raw Layer

목적:
- 원본 보존
- 파싱 실패 보존
- 재정규화 재처리

주요 모델:
- RawEvent
- RawIngestBatch (선택)

## 4.2 Normalized Event Layer

목적:
- 표준 이벤트 저장
- entity linkage 표준화
- downstream projection 입력

주요 모델:
- Event
- EventDeliveryState (선택)

## 4.3 Projection Layer

목적:
- 현재 상태 조회 최적화
- 모바일/웹 대시보드 지원

주요 모델:
- SessionCurrent
- TaskCurrent
- ToolExecutionCurrent
- AgentCurrent
- TeamCurrent
- CollectorCurrent
- AlertCurrent
- TimelineEntry (선택)

## 4.4 Operational Metadata Layer

목적:
- collector/ingest/processor 운영 상태 관리
- 리빌드 및 리플레이 관리

주요 모델:
- ProcessorCheckpoint
- ReplayJob
- CollectorLease
- ProjectionBuildState

---

## 5. 핵심 엔터티 목록

본 시스템의 핵심 엔터티는 다음과 같다.

- SourceInstance
- Session
- Task
- ToolExecution
- Agent
- Team
- Collector
- Alert
- Event
- Projection

이 중 Session, Task, ToolExecution, Agent, Team 은 사용자에게 직접 노출되는 핵심 운영 엔터티다.

---

## 6. 식별자 전략

## 6.1 공통 원칙

모든 주요 모델은 내부 고유 식별자와 외부 상관 식별자를 분리할 수 있어야 한다.

예:
- 내부 DB primary key
- Claude Code 원본 session_id
- tool_use_id
- task_id
- agent_id

## 6.2 식별자 종류

### 6.2.1 Internal ID

시스템 내부 고유 식별자. UUID 또는 ULID 권장.

### 6.2.2 Natural / Source ID

Claude Code 또는 collector 원본에서 제공하는 식별자.

### 6.2.3 Correlation ID

직접 식별자가 없을 때 linkage 를 위해 생성하는 상관 식별자.

---

## 7. SourceInstance 모델

## 7.1 목적

이벤트가 어느 collector / 어느 호스트 / 어느 실행 인스턴스에서 들어왔는지 추적한다.

## 7.2 주요 필드

- source_instance_id
- source_type
- host_id
- host_name
- collector_version
- runtime_version
- started_at
- last_seen_at
- status
- metadata_json

## 7.3 status 값

- active
- stale
- offline
- retired

## 7.4 용도

- host 단위 필터링
- stale source 감지
- collector 상태 그룹화

---

## 8. RawEvent 모델

## 8.1 목적

정규화 전 원본 이벤트 보존.

## 8.2 주요 필드

- raw_event_id
- envelope_id
- source_instance_id
- source_host
- source_type
- raw_event_type
- raw_payload_json
- raw_payload_size
- observed_at
- collected_at
- received_at
- schema_version
- idempotency_key
- normalization_status
- normalization_error
- parse_error
- duplicate_state
- tags_json

## 8.3 normalization_status 값

- pending
- normalized
- failed
- skipped

## 8.4 duplicate_state 값

- new
- duplicate_exact
- duplicate_semantic
- replayed

## 8.5 설계 메모

- raw_payload_json 은 가능한 원문 구조를 유지한다.
- 파싱 실패 시에도 parse_error 와 함께 저장한다.
- raw_event 는 삭제보다 보존 우선으로 설계한다.

---

## 9. Event 모델 (Normalized Event)

## 9.1 목적

시스템 공통 이벤트 계약을 저장한다.

## 9.2 주요 필드

- event_id
- event_type
- event_category
- event_version
- source_event_ref
- raw_event_id
- source_instance_id
- session_id
- task_id
- tool_use_id
- agent_id
- team_name
- teammate_name
- observed_at
- collected_at
- normalized_at
- status
- severity
- payload_json
- search_text
- ordering_key

## 9.3 status 의미

이 이벤트 자체의 처리 상태 또는 결과 상태를 나타내는 보조 값.

예:
- success
- failure
- denied
- deferred
- blocked
- running
- completed

## 9.4 ordering_key

정렬 안정화를 위한 내부 키.

권장 구성:
- observed_at
- raw_event_id 또는 envelope_id
- ingest sequence

## 9.5 search_text

검색용 요약 문자열.

예:
- tool_name
- task_subject
- error_message
- prompt snippet

---

## 10. SessionCurrent 모델

## 10.1 목적

특정 session 의 최신 상태를 조회하기 위한 projection.

## 10.2 주요 필드

- session_id
- source_instance_id
- session_name
- model_name
- working_directory
- transcript_path
- permission_mode
- active_agent_type
- start_source
- started_at
- last_activity_at
- stopped_at
- current_state
- stop_reason
- last_user_prompt_excerpt
- last_assistant_message_excerpt
- last_event_id
- last_event_type
- event_count
- prompt_count
- tool_call_count
- error_count
- warning_count
- active_task_count
- active_agent_count
- stale_at
- metadata_json

## 10.3 current_state 값

- initializing
- running
- idle
- compacting
- stopped
- failed
- stale

## 10.4 계산 목적

대시보드에서 세션 목록과 상세 헤더를 빠르게 제공한다.

---

## 11. SessionStatsDaily 모델

## 11.1 목적

일 단위 운영 통계 보관.

## 11.2 주요 필드

- stat_date
- session_id
- prompt_count
- tool_success_count
- tool_failure_count
- permission_denied_count
- compact_count
- active_minutes
- warning_count
- error_count

## 11.3 용도

- 일간 리포트
- 장기 트렌드 분석

---

## 12. TaskCurrent 모델

## 12.1 목적

태스크의 현재 상태를 조회하기 위한 projection.

## 12.2 주요 필드

- task_id
- session_id
- team_name
- teammate_name
- task_subject
- task_description
- created_at
- started_at
- completed_at
- updated_at
- current_state
- dependency_count
- unresolved_dependency_count
- assignee_agent_id
- assignee_name
- priority
- blocked_reason
- last_event_id
- metadata_json

## 12.3 current_state 값

- pending
- in_progress
- blocked
- completed
- failed
- cancelled

## 12.4 용도

- 팀 작업 보드
- 세션 상세의 task 패널
- 모바일 진행 상태 확인

---

## 13. TaskDependency 모델

## 13.1 목적

태스크 간 선행 관계를 표현한다.

## 13.2 주요 필드

- task_dependency_id
- task_id
- depends_on_task_id
- created_at
- relation_type

## 13.3 relation_type 값

- hard_block
- soft_block
- follow_up

---

## 14. ToolExecutionCurrent 모델

## 14.1 목적

툴 호출 단위의 최신 상태를 관리한다.

## 14.2 주요 필드

- tool_execution_id
- tool_use_id
- session_id
- task_id
- agent_id
- tool_name
- tool_category
- requested_at
- started_at
- finished_at
- current_state
- permission_state
- duration_ms
- run_in_background
- is_interrupt
- input_excerpt
- output_excerpt
- error_message
- retry_count
- last_event_id
- metadata_json

## 14.3 current_state 값

- requested
- running
- succeeded
- failed
- denied
- deferred
- interrupted

## 14.4 permission_state 값

- not_required
- requested
- allowed
- denied
- auto_allowed
- auto_denied

## 14.5 tool_category 값 예시

- bash
- read
- write
- edit
- web
- agent
- task
- hook_related
- mcp

---

## 15. AgentCurrent 모델

## 15.1 목적

subagent 또는 teammate 의 현재 상태를 관리한다.

## 15.2 주요 필드

- agent_id
- session_id
- team_name
- teammate_name
- agent_type
- model_name
- parent_agent_id
- started_at
- last_activity_at
- stopped_at
- current_state
- transcript_path
- last_message_excerpt
- task_count_total
- task_count_open
- task_count_completed
- error_count
- idle_since
- last_event_id
- metadata_json

## 15.3 current_state 값

- starting
- running
- idle
- stopped
- failed
- stale

## 15.4 구분 설명

AgentCurrent 는 다음 둘을 포괄한다.

- Claude Code subagent
- agent team teammate

필요 시 agent_scope 필드를 추가해 구분할 수 있다.

---

## 16. TeamCurrent 모델

## 16.1 목적

agent team 단위의 현재 상태를 관리한다.

## 16.2 주요 필드

- team_name
- lead_session_id
- started_at
- updated_at
- current_state
- member_count_total
- member_count_running
- member_count_idle
- member_count_stopped
- task_count_total
- task_count_pending
- task_count_in_progress
- task_count_completed
- task_count_blocked
- last_event_id
- last_event_type
- last_activity_at
- metadata_json

## 16.3 current_state 값

- starting
- running
- draining
- stopped
- failed
- stale

## 16.4 용도

- 팀 단위 현황 보드
- teammate 상태 요약
- 원격 진행률 확인

---

## 17. CollectorCurrent 모델

## 17.1 목적

collector 인스턴스의 현재 동작 상태를 조회한다.

## 17.2 주요 필드

- collector_id
- source_instance_id
- host_id
- host_name
- started_at
- last_heartbeat_at
- current_state
- queue_depth
- spool_file_count
- last_delivery_success_at
- last_delivery_failure_at
- consecutive_failure_count
- retry_backoff_until
- version
- metadata_json

## 17.3 current_state 값

- starting
- healthy
- degraded
- retrying
- stale
- offline

## 17.4 용도

- 원격에서 로컬 collector 가 살아있는지 확인
- 전송 지연 감시

---

## 18. AlertCurrent 모델

## 18.1 목적

운영자가 확인해야 하는 현재 alert 상태를 관리한다.

## 18.2 주요 필드

- alert_id
- alert_type
- alert_scope_type
- alert_scope_id
- title
- message
- severity
- status
- raised_at
- acknowledged_at
- cleared_at
- last_event_id
- fingerprint
- source_instance_id
- metadata_json

## 18.3 alert_scope_type 값

- session
- task
- tool_execution
- agent
- team
- collector
- system

## 18.4 status 값

- open
- acknowledged
- cleared
- suppressed

## 18.5 대표 alert 예시

- collector.stale
- session.stale
- repeated_tool_failure
- task_blocked_too_long
- team_no_progress
- permission_denied_spike

---

## 19. TimelineEntry 모델

## 19.1 목적

UI 타임라인 조회 최적화를 위한 읽기 전용 projection.

## 19.2 주요 필드

- timeline_entry_id
- session_id
- related_task_id
- related_agent_id
- related_tool_use_id
- event_id
- occurred_at
- category
- title
- summary
- severity
- icon_hint
- metadata_json

## 19.3 특징

- Event 의 경량 파생본
- UI 타임라인 렌더링 최적화 목적

---

## 20. ProcessorCheckpoint 모델

## 20.1 목적

이벤트 처리기/프로젝션 빌더의 진행 위치를 저장한다.

## 20.2 주요 필드

- processor_checkpoint_id
- processor_name
- stream_name
- last_processed_event_id
- last_processed_observed_at
- last_processed_at
- status
- metadata_json

## 20.3 status 값

- active
- lagging
- failed
- paused

---

## 21. ReplayJob 모델

## 21.1 목적

재생성/재처리 작업을 관리한다.

## 21.2 주요 필드

- replay_job_id
- replay_type
- target_scope_type
- target_scope_id
- requested_at
- started_at
- finished_at
- requested_by
- current_state
- progress_percent
- input_range_json
- result_summary_json
- error_message

## 21.3 replay_type 값

- renormalize
- rebuild_projection
- full_replay
- partial_backfill

## 21.4 current_state 값

- queued
- running
- completed
- failed
- cancelled

---

## 22. ProjectionBuildState 모델

## 22.1 목적

projection 테이블 단위의 빌드 상태를 기록한다.

## 22.2 주요 필드

- projection_name
- build_version
- last_built_at
- last_event_id
- current_state
- lag_count
- error_message

## 22.3 current_state 값

- ready
- building
- lagging
- failed

---

## 23. 엔터티 관계

## 23.1 주요 관계 개요

- SourceInstance 1:N RawEvent
- RawEvent 1:0..1 Event
- Session 1:N Event
- Session 1:N TaskCurrent
- Session 1:N ToolExecutionCurrent
- Session 1:N AgentCurrent
- TeamCurrent 1:N AgentCurrent
- TeamCurrent 1:N TaskCurrent
- Event 0..N → Session/Task/Tool/Agent/Team/Collector/Alert linkage

## 23.2 관계 해석 원칙

projection 모델은 event 기반으로 갱신되며, 관계의 기준은 natural id + correlation rule 조합으로 결정한다.

---

## 24. 상태값 표준 사전

## 24.1 Session 상태 표준

- initializing
- running
- idle
- compacting
- stopped
- failed
- stale

## 24.2 Task 상태 표준

- pending
- in_progress
- blocked
- completed
- failed
- cancelled

## 24.3 Tool 상태 표준

- requested
- running
- succeeded
- failed
- denied
- deferred
- interrupted

## 24.4 Agent 상태 표준

- starting
- running
- idle
- stopped
- failed
- stale

## 24.5 Collector 상태 표준

- starting
- healthy
- degraded
- retrying
- stale
- offline

## 24.6 Alert 상태 표준

- open
- acknowledged
- cleared
- suppressed

---

## 25. 인덱싱 및 조회 최적화 기준

## 25.1 RawEvent 인덱싱 기준

권장 인덱스 축:

- raw_event_type
- collected_at
- observed_at
- source_instance_id
- normalization_status
- idempotency_key

## 25.2 Event 인덱싱 기준

권장 인덱스 축:

- event_type
- event_category
- session_id
- task_id
- agent_id
- tool_use_id
- observed_at
- severity

## 25.3 Projection 인덱싱 기준

### SessionCurrent
- current_state
- last_activity_at
- source_instance_id

### TaskCurrent
- current_state
- session_id
- team_name
- assignee_agent_id

### ToolExecutionCurrent
- session_id
- current_state
- tool_name
- requested_at

### AgentCurrent
- session_id
- team_name
- current_state
- last_activity_at

### TeamCurrent
- current_state
- last_activity_at

### CollectorCurrent
- current_state
- last_heartbeat_at

### AlertCurrent
- status
- severity
- raised_at
- alert_scope_type

---

## 26. 보존 정책 관점 분리

## 26.1 RawEvent

가장 오래 보존 가능해야 한다.

목적:
- 감사
- 재처리
- 분석

## 26.2 Event

중장기 보존 대상.

목적:
- 표준 이력 조회
- 통계 생성

## 26.3 Projection

재생성 가능하므로 상대적으로 짧은 보존도 허용 가능하다.

목적:
- 실시간 조회

## 26.4 AlertCurrent

현재 상태 기준이므로 cleared 후 별도 history 계층으로 이관 가능하다.

---

## 27. 데이터 무결성 규칙

## 27.1 RawEvent 무결성

- raw_event_id 는 유일해야 한다.
- envelope_id 는 source_instance 내에서 중복 허용하지 않는 것을 권장한다.

## 27.2 Event 무결성

- event_id 는 유일해야 한다.
- raw_event_id 와의 연결은 최대 1:1 을 기본으로 한다.

## 27.3 Projection 무결성

- 동일 natural id 당 projection current row 는 1개여야 한다.
- projection 갱신은 last_event_id 기반 낙관적 제어를 권장한다.

## 27.4 상태 전이 무결성

- completed 이후 in_progress 회귀 금지
- stopped 이후 running 회귀는 explicit resume event 가 있을 때만 허용
- cleared alert 는 open 으로 회귀 시 새 alert 로 처리하는 것을 권장

---

## 28. 마스킹/표시용 분리 필드

## 28.1 원칙

저장용 원문과 표시용 요약은 분리할 수 있어야 한다.

## 28.2 권장 필드

- input_excerpt
- output_excerpt
- last_user_prompt_excerpt
- last_assistant_message_excerpt
- summary

이 필드들은 UI 표시 최적화를 위해 존재하며, 원문 전체를 대체하지 않는다.

---

## 29. 다중 호스트 / 다중 세션 확장 고려

## 29.1 필요성

향후 여러 로컬 머신 또는 여러 Claude Code 인스턴스 모니터링이 가능해야 한다.

## 29.2 핵심 필드

- source_instance_id
- host_id
- source_host
- collector_id

## 29.3 설계 효과

- 동일 사용자의 여러 머신 구분 가능
- 동일 호스트의 여러 세션 구분 가능
- 모바일 원격 상태판에서 host 별 grouping 가능

---

## 30. MVP 필수 모델

MVP 에서 반드시 구현할 모델:

1. RawEvent
2. Event
3. SessionCurrent
4. TaskCurrent
5. ToolExecutionCurrent
6. AgentCurrent
7. TeamCurrent
8. CollectorCurrent
9. AlertCurrent
10. ProcessorCheckpoint

후순위 모델:

- SessionStatsDaily
- TimelineEntry
- ReplayJob
- ProjectionBuildState
- TaskDependency

---

## 31. 권장 저장소 역할 분리

## 31.1 Event Store 성격 저장소

대상:
- RawEvent
- Event

특징:
- append 중심
- 이력 보존
- 재처리 기반

## 31.2 Projection Store 성격 저장소

대상:
- SessionCurrent
- TaskCurrent
- ToolExecutionCurrent
- AgentCurrent
- TeamCurrent
- CollectorCurrent
- AlertCurrent

특징:
- upsert 중심
- 읽기 최적화
- 현재 상태 빠른 조회

## 31.3 Operational Store 성격 저장소

대상:
- ProcessorCheckpoint
- ReplayJob
- ProjectionBuildState

특징:
- 운영 제어 목적

---

## 32. 예시 조회 시나리오와 모델 사용

## 32.1 모바일에서 지금 진행 중인 세션 확인

사용 모델:
- SessionCurrent
- CollectorCurrent
- AgentCurrent
- TaskCurrent

## 32.2 특정 세션의 최근 실패 툴 호출 확인

사용 모델:
- ToolExecutionCurrent
- Event
- RawEvent

## 32.3 팀 작업이 왜 멈췄는지 확인

사용 모델:
- TeamCurrent
- TaskCurrent
- AgentCurrent
- AlertCurrent
- Event

## 32.4 projection 오류 복구

사용 모델:
- RawEvent
- Event
- ReplayJob
- ProjectionBuildState

---

## 33. 오픈 이슈

### OI-01

SessionCurrent 와 AgentCurrent 의 stale 판정 책임을 projection updater 와 alert engine 중 어디에 둘지 추가 결정이 필요하다.

### OI-02

ToolExecutionCurrent 에 입력/출력 excerpt 저장 시 민감정보 마스킹 책임 계층을 명확히 해야 한다.

### OI-03

대규모 장기 보존 시 RawEvent 와 Event 의 파티셔닝 기준(일/주/월)에 대한 별도 운영 문서가 필요하다.

---

## 34. 결론

본 문서는 Claude Code 모니터링 웹 서비스의 논리 데이터 모델을 고정하였다.

핵심 결론은 다음과 같다.

1. 데이터는 Raw → Event → Projection 의 3단 핵심 구조로 관리한다.
2. 현재 상태 조회는 projection 모델이 담당하고, 복구와 분석은 event 계층이 담당한다.
3. Session, Task, ToolExecution, Agent, Team, Collector, Alert 를 핵심 운영 엔터티로 정의한다.
4. 상태값과 관계를 표준화하여 API 및 UI 의 일관성을 확보한다.
5. MVP 는 최소 projection 세트를 우선 구현하고, 통계/리플레이/타임라인은 후속 확장으로 둔다.

본 문서는 이후 API 문서와 UI 문서의 공통 데이터 기준으로 사용한다.

---

## 35. 다음 작성 대상

다음 문서:

- `05_API_SPEC.md`

---

버전 정보: GPT-5.4 Thinking

