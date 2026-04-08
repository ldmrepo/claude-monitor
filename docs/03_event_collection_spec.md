# 03_EVENT_COLLECTION_SPEC

**문서 ID**: CC-MON-003  
**버전**: v1.0  
**작성일**: 2026-04-08  
**상태**: Draft Fixed Baseline

---

## 1. 문서 목적

본 문서는 **Claude Code 모니터링 웹 서비스**에서 이벤트를 어떻게 수집하고, 정규화하며, 전달하고, 저장 계층으로 넘길지를 정의한다.

본 문서의 목적은 다음과 같다.

1. Claude Code 실행 상태 관찰에 필요한 이벤트 수집 경로를 정의한다.
2. Hook 기반 수집 구조와 collector 프로세스의 책임을 명확히 한다.
3. 원본 이벤트(raw)와 표준 이벤트(normalized)의 변환 기준을 고정한다.
4. 이후 데이터 모델, API, UI 문서가 공통으로 참조할 이벤트 계약을 제공한다.

본 문서는 **수집 계층 표준 문서**이며, 구현 세부 코드보다 **관찰 가능한 상태의 표준화**에 초점을 둔다.

---

## 2. 범위

본 문서의 범위는 다음을 포함한다.

- Claude Code Hook 이벤트 수집
- 보조 상태 수집(heartbeat, collector state)
- raw event 저장 전 구조
- normalized event 표준 구조
- 전송 채널 및 재시도 정책
- 중복 방지 및 순서 처리 기준
- 수집 실패와 복구 전략

본 문서는 다음을 직접 상세 설계하지 않는다.

- 데이터베이스 실제 테이블 구조
- API 응답 포맷 상세
- UI 표시 방식 상세
- 인증/인가 프로토콜 상세

해당 내용은 후속 문서에서 정의한다.

---

## 3. 수집 설계 원칙

### P-01 비침습성

수집 시스템은 Claude Code 기존 작업 흐름을 가능한 변경하지 않아야 한다.

### P-02 관찰 가능 정보 우선

공식적으로 관찰 가능한 Hook/로그/환경 정보만 수집 대상으로 삼는다.

### P-03 원본 보존

정규화 전에 원본 이벤트를 보존해야 한다.

### P-04 정규화 일관성

동일 의미의 이벤트는 동일한 normalized schema 로 변환해야 한다.

### P-05 재처리 가능성

수집된 이벤트는 재정렬, 재정규화, projection 재생성에 사용할 수 있어야 한다.

### P-06 중복 허용 입력, 중복 없는 결과

네트워크/재시도로 인해 같은 이벤트가 여러 번 들어와도 최종 상태는 중복 없이 처리되어야 한다.

### P-07 실시간성 우선, 완전성 보완

초기 반영은 빠르게, 누락 보정은 재처리와 복구 절차로 보완한다.

---

## 4. 수집 아키텍처 개요

이벤트 수집 흐름은 다음 계층으로 구성한다.

1. **Claude Code Runtime**
2. **Hook Script Layer**
3. **Local Collector**
4. **Ingest API**
5. **Normalizer / Event Processor**
6. **Projection Updater**
7. **Realtime Broadcaster**

### 4.1 계층별 책임

#### 4.1.1 Claude Code Runtime
- Hook 이벤트 발생 주체
- 세션, tool, task, subagent, team 상태 변화의 원천

#### 4.1.2 Hook Script Layer
- Claude Code hook input 수신
- 최소 전처리 수행
- collector 로 이벤트 전달
- 민감정보 마스킹 1차 적용 가능

#### 4.1.3 Local Collector
- 이벤트 수신 엔드포인트 제공
- 이벤트 envelope 생성
- 로컬 큐 적재
- 전송 재시도
- heartbeat 생성
- collector self-state 관리

#### 4.1.4 Ingest API
- collector 로부터 이벤트 수신
- 기본 검증
- raw event 저장 또는 ingest queue 적재

#### 4.1.5 Normalizer
- raw event 를 표준 normalized event 로 변환
- event type 분류
- entity linkage(session/task/agent/team) 보강

#### 4.1.6 Projection Updater
- normalized event 를 기준으로 current state projection 갱신

#### 4.1.7 Realtime Broadcaster
- projection 변화 또는 중요 event 를 웹 UI 로 push

---

## 5. 이벤트 소스

## 5.1 1차 이벤트 소스

MVP 에서 기본 이벤트 소스는 **Claude Code Hooks** 이다.

우선 수집 대상 이벤트:

- SessionStart
- SessionEnd
- UserPromptSubmit
- PreToolUse
- PostToolUse
- PostToolUseFailure
- PermissionRequest
- PermissionDenied
- SubagentStart
- SubagentStop
- TaskCreated
- TaskCompleted
- Stop
- StopFailure
- TeammateIdle
- PreCompact
- PostCompact
- WorktreeCreate
- WorktreeRemove
- Elicitation
- ElicitationResult
- Notification
- ConfigChange
- InstructionsLoaded
- CwdChanged
- FileChanged

## 5.2 2차 이벤트 소스

보조 이벤트 소스:

- collector generated heartbeat
- collector health state
- delivery retry status
- ingest acknowledgment events

## 5.3 선택적 이벤트 소스

향후 확장 가능:

- Claude Code debug log parser
- session transcript parser
- external orchestrator metadata
- OS process observer

MVP 에서는 선택적 소스는 기본 비활성으로 둔다.

---

## 6. Hook 기반 수집 방식

## 6.1 기본 전략

각 Hook 이벤트에 대해 command hook 을 사용하여 JSON payload 를 collector 로 전달한다.

권장 기본 방식:

- command hook
- stdin JSON 수신
- collector HTTP localhost endpoint POST
- collector 비가용 시 local spool fallback

## 6.2 Hook handler 책임 범위

Hook handler 는 다음까지만 수행한다.

1. stdin JSON 읽기
2. event source metadata 부착
3. 필요 최소 마스킹 적용
4. collector 로 전달
5. 실패 시 fallback 저장

Hook handler 는 다음을 수행하지 않는다.

- 복잡한 projection 계산
- 장기 보관 로직
- UI broadcast 직접 처리
- heavy parsing

## 6.3 Hook 처리 정책

### H-01 가능한 한 non-blocking

모니터링 목적 hook 은 Claude Code 본작업을 방해하지 않도록 설계한다.

### H-02 정책형 hook 과 분리

차단용 보안 hook 과 모니터링 hook 은 논리적으로 분리한다.

### H-03 관찰 우선

모니터링 hook 은 action control 보다는 event capture 에 집중한다.

---

## 7. Collector 설계

## 7.1 Collector 역할

collector 는 로컬 수집 게이트웨이 역할을 수행한다.

주요 책임:

- hook event 수신
- source metadata enrich
- event envelope 발급
- local queue/spool 저장
- ingest API 로 전송
- retry 수행
- heartbeat 발행
- collector 상태 보고

## 7.2 Collector 배치 위치

기본 배치 위치:

- Claude Code 실행 호스트와 동일 머신

운영 옵션:

- localhost service
- background daemon
- container sidecar

MVP 권장:

- 로컬 프로세스 또는 Docker sidecar

## 7.3 Collector 입력 채널

지원 입력 채널:

1. HTTP local POST endpoint
2. file drop spool directory

MVP 기본 채널:

- HTTP local POST endpoint

## 7.4 Collector 출력 채널

지원 출력 채널:

1. remote ingest HTTP API
2. local raw event file sink (fallback)

---

## 8. Event Envelope 정의

collector 는 모든 입력 이벤트를 공통 envelope 로 감싼다.

### 8.1 Envelope 목적

- 원본 출처 추적
- 중복 방지 key 생성
- ingest 안정성 확보
- transport metadata 분리

### 8.2 Envelope 필드

최소 필드:

- envelope_id
- source_instance_id
- source_host
- source_type
- collected_at
- observed_at
- raw_event_type
- raw_payload
- schema_version
- transport_attempt
- idempotency_key

### 8.3 필드 설명

#### envelope_id
collector 가 발급하는 고유 식별자

#### source_instance_id
collector 인스턴스 식별자

#### source_host
이벤트 발생 호스트 식별자

#### source_type
예: `claude_code_hook`, `collector_heartbeat`

#### collected_at
collector 가 수집한 시각

#### observed_at
hook payload 기준 원 이벤트 발생 시각. 없으면 collected_at 사용

#### raw_event_type
원본 이벤트 이름

#### raw_payload
hook 에서 받은 원본 JSON

#### schema_version
collector envelope 스키마 버전

#### transport_attempt
전송 시도 횟수

#### idempotency_key
중복 제거용 결정 키

---

## 9. Raw Event 저장 기준

## 9.1 Raw Event 목적

raw event 는 원본 보존과 재처리의 기준이 된다.

## 9.2 Raw Event 저장 원칙

- 최대한 원본 유지
- envelope metadata 와 raw_payload 분리 저장
- 파싱 실패 이벤트도 저장
- 정규화 실패 시에도 보존

## 9.3 Raw Event 최소 필드

- raw_event_id
- envelope_id
- source_instance_id
- raw_event_type
- raw_payload_json
- observed_at
- collected_at
- received_at
- normalization_status
- parse_error

## 9.4 normalization_status 값

- pending
- normalized
- failed
- skipped

---

## 10. Normalized Event 정의

## 10.1 목적

normalized event 는 시스템 전체가 공유하는 표준 이벤트 모델이다.

## 10.2 설계 원칙

- Hook 원본 형식에 종속되지 않는다.
- domain event 중심으로 정의한다.
- UI/API/Projection 이 동일 이벤트 계약을 참조한다.

## 10.3 표준 상위 필드

모든 normalized event 는 최소 다음을 포함한다.

- event_id
- event_type
- event_category
- event_version
- source_event_ref
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
- payload

## 10.4 event_category 분류

- session
- prompt
- tool
- task
- agent
- team
- permission
- hook
- compact
- collector
- alert
- worktree
- notification
- elicitation
- config
- file_watch

## 10.5 severity 분류

- info
- warning
- error
- critical

---

## 11. 표준 이벤트 타입 목록

## 11.1 Session 계열

- session.started
- session.resumed
- session.cleared
- session.compacted
- session.stopped
- session.stop_failed
- session.heartbeat
- session.stale

## 11.2 Prompt 계열

- prompt.submitted
- prompt.blocked

## 11.3 Tool 계열

- tool.requested
- tool.running
- tool.succeeded
- tool.failed
- tool.denied
- tool.deferred
- tool.interrupted
- tool.permission_requested
- tool.permission_allowed
- tool.permission_denied

## 11.4 Task 계열

- task.created
- task.started
- task.blocked
- task.completed
- task.failed
- task.cancelled

## 11.5 Agent 계열

- agent.started
- agent.stopped
- agent.idle
- agent.message_sent
- agent.message_received

## 11.6 Team 계열

- team.started
- team.updated
- team.member_started
- team.member_stopped
- team.cleaned_up

## 11.7 Hook 계열

- hook.pre_tool_observed
- hook.post_tool_observed
- hook.block_applied
- hook.config_changed
- hook.instructions_loaded

## 11.8 Compact 계열

- compact.started
- compact.completed

## 11.9 Collector 계열

- collector.started
- collector.heartbeat
- collector.delivery_failed
- collector.delivery_retried
- collector.stale
- collector.recovered

## 11.10 Alert 계열

- alert.raised
- alert.acknowledged
- alert.cleared

---

## 12. 원본 Hook → 표준 이벤트 매핑

## 12.1 SessionStart

입력 Hook:
- SessionStart

출력 normalized event:
- session.started
- session.resumed
- session.cleared
- session.compacted

source 값에 따라 세분화한다.

## 12.2 UserPromptSubmit

출력:
- prompt.submitted

차단 시:
- prompt.blocked

## 12.3 PreToolUse

출력:
- tool.requested

옵션:
- hook.pre_tool_observed

permissionDecision 가 allow/deny/ask/defer 이면 이를 payload 에 반영한다.

## 12.4 PostToolUse

출력:
- tool.succeeded

## 12.5 PostToolUseFailure

출력:
- tool.failed

## 12.6 PermissionRequest

출력:
- tool.permission_requested

## 12.7 PermissionDenied

출력:
- tool.permission_denied

## 12.8 SubagentStart

출력:
- agent.started

## 12.9 SubagentStop

출력:
- agent.stopped

## 12.10 TaskCreated

출력:
- task.created

## 12.11 TaskCompleted

출력:
- task.completed

## 12.12 TeammateIdle

출력:
- agent.idle

## 12.13 Stop

출력:
- session.stopped

## 12.14 StopFailure

출력:
- session.stop_failed

## 12.15 PreCompact / PostCompact

출력:
- compact.started
- compact.completed

## 12.16 WorktreeCreate / WorktreeRemove

출력:
- worktree.created
- worktree.removed

## 12.17 Elicitation / ElicitationResult

출력:
- elicitation.requested
- elicitation.responded
- elicitation.declined

---

## 13. 식별자 연계 규칙

## 13.1 session_id 추출 규칙

session_id 는 hook payload 에 존재하면 그대로 사용한다.

없으면 다음 순서로 보강한다.

1. transcript_path 기반 세션 식별
2. collector local session mapping
3. unknown_session 으로 임시 수용 후 후속 보강

## 13.2 task_id 추출 규칙

task event 에 task_id 가 존재하면 그대로 사용한다.

그 외 이벤트는 context linkage 규칙으로 연결한다.

## 13.3 tool_use_id 추출 규칙

tool event 에서 제공되는 tool_use_id 를 우선 사용한다.

없으면 session_id + observed_at + tool_name + hash(input) 로 보조키를 생성할 수 있다.

## 13.4 agent_id 규칙

subagent 관련 이벤트의 agent_id 는 원본 기준 우선 사용한다.

## 13.5 team linkage 규칙

team_name / teammate_name 이 없으면 agent/team config 해석 또는 runtime correlation 으로 보강한다.

---

## 14. Idempotency / 중복 제거 규칙

## 14.1 기본 원칙

동일 이벤트 재수신은 허용하되 projection 결과는 중복 없이 유지한다.

## 14.2 idempotency key 구성 권장

권장 구성:

- source_instance_id
- raw_event_type
- session_id
- observed_at
- 주요 entity id
- raw payload stable hash

## 14.3 처리 규칙

- raw event 는 중복 저장 허용 가능
- normalized event 는 logical duplicate 판정 가능
- projection update 는 idempotent 해야 함

## 14.4 duplicate 상태 분류

- new
- duplicate_exact
- duplicate_semantic
- replayed

---

## 15. 순서 처리 규칙

## 15.1 기본 정책

이벤트는 수신 순서와 발생 순서가 다를 수 있다.

## 15.2 기준 시간

정렬의 1차 기준은 observed_at 이다.

없거나 불명확하면 collected_at 을 사용한다.

## 15.3 out-of-order 허용

projection updater 는 약간의 out-of-order 이벤트를 허용해야 한다.

## 15.4 state regression 방지

이전 상태보다 과거 이벤트가 늦게 도착해도 부적절한 regression 이 발생하지 않도록 상태 전이 규칙을 둔다.

예:
- task.completed 이후 동일 task.started 가 늦게 와도 current state 는 completed 유지

---

## 16. Heartbeat 설계

## 16.1 목적

- collector 생존 확인
- session stale 판정 보조
- 모바일/원격에서 마지막 활동 확인

## 16.2 heartbeat 주체

- collector heartbeat
- 필요 시 session heartbeat

## 16.3 최소 필드

- source_instance_id
- collector_status
- active_session_count
- timestamp
- queue_depth
- last_delivery_success_at

## 16.4 stale 판정 기준

설정된 timeout 내 heartbeat 가 없으면 stale 판정한다.

MVP 에서는 단순 timeout 기반으로 처리한다.

---

## 17. 전달 및 전송 정책

## 17.1 Collector → Ingest 전송 방식

기본 방식:

- HTTP POST JSON

선택 가능:

- batch POST
- NDJSON stream

MVP 권장:

- 단건 또는 소규모 batch POST

## 17.2 전송 보장 수준

초기 목표:

- at-least-once delivery

즉, 중복은 가능하나 유실을 최소화한다.

## 17.3 재시도 정책

전송 실패 시 exponential backoff 재시도를 수행한다.

기본 조건:

- network failure
- 5xx
- timeout

기본적으로 4xx 는 재시도하지 않되, 설정으로 예외 가능하게 한다.

## 17.4 spool fallback

Ingest API 불가용 시 이벤트를 로컬 spool 에 저장하고 이후 재전송한다.

---

## 18. 마스킹 및 민감정보 처리

## 18.1 마스킹 지점

마스킹은 최소 다음 지점에서 가능해야 한다.

1. hook script 단계
2. collector normalization 단계
3. API response 단계

## 18.2 마스킹 대상 예시

- 프롬프트 원문
- bash command 중 credential
- file path 중 민감 경로
- tool input/output 중 secret
- header / token / cookie

## 18.3 저장 전략

정책에 따라 다음 중 하나를 선택 가능해야 한다.

- raw 저장
- masked raw 저장
- raw 비저장 + normalized only

MVP 권장 기본:

- raw 저장 허용
- secret pattern 마스킹 옵션 제공

---

## 19. 실패 처리 및 복구

## 19.1 Hook 전송 실패

대응:
- collector 로 전달 실패 시 local spool write
- Claude Code 본작업은 가능하면 계속 진행

## 19.2 Collector 다운

대응:
- hook script file spool fallback
- collector 복구 후 재수집 가능

## 19.3 Ingest API 다운

대응:
- collector local queue 보존
- retry worker 재전송

## 19.4 Normalization 실패

대응:
- raw event 유지
- parse_error 기록
- dead letter 또는 failed normalization queue 로 분리

## 19.5 Projection 갱신 실패

대응:
- normalized event 는 보존
- projection rebuild job 으로 복구

---

## 20. 상태 전이 기본 규칙

## 20.1 Session 상태

예시 전이:
- initializing → running
- running → stopped
- running → failed
- running → stale
- stale → running

## 20.2 Task 상태

- pending → in_progress
- in_progress → completed
- in_progress → failed
- pending/in_progress → blocked
- blocked → in_progress

## 20.3 Tool 상태

- requested → running
- requested/running → succeeded
- requested/running → failed
- requested → denied
- requested → deferred

## 20.4 Agent 상태

- started → running
- running → idle
- running → stopped
- idle → running

세부 전이 규칙은 projection 문서에서 상세화한다.

---

## 21. 이벤트 보존 및 재처리

## 21.1 보존 목적

- 장애 복구
- 버그 분석
- projection 재생성
- 향후 분석 리포트

## 21.2 재처리 조건

다음 상황에서 재처리 가능해야 한다.

- normalization 로직 변경
- projection 버그 수정
- 데이터 손상 복구
- backfill

## 21.3 재처리 단위

- session 단위
- 시간 구간 단위
- source_instance 단위
- 전체 단위

---

## 22. MVP 구현 기준

## 22.1 필수 구현

MVP 에서 필수 구현 항목:

1. Hook → collector HTTP 수집
2. local spool fallback
3. raw event 저장
4. normalized event 생성
5. session/task/tool/subagent/team 핵심 이벤트 매핑
6. heartbeat 생성
7. idempotent ingest 처리
8. projection updater 로 이벤트 전달

## 22.2 후순위 구현

- transcript parser 기반 보강
- debug log parser
- batch compression transport
- advanced correlation engine
- cross-host reconciliation

---

## 23. 오픈 이슈

### OI-01

Claude Code 이벤트 중 일부는 원본 payload 만으로 entity linkage 가 불완전할 수 있다. correlation 보강 로직이 필요하다.

### OI-02

team 관련 이벤트는 환경에 따라 관찰 가능성 차이가 있을 수 있으므로 fallback correlation 설계가 필요하다.

### OI-03

민감정보 비수집 정책의 기본값은 운영 환경에 따라 달라질 수 있다.

---

## 24. 결론

본 문서는 Claude Code 실행 상태를 안정적으로 외부 모니터링하기 위한 이벤트 수집 기준을 정의하였다.

핵심 결론은 다음과 같다.

1. 이벤트 수집의 기본 경로는 Hook → Local Collector → Ingest API 이다.
2. 모든 이벤트는 envelope 로 감싸 raw 와 normalized 로 분리 관리한다.
3. 전송 보장은 at-least-once 를 기본으로 하며, 중복 제거는 idempotency 규칙으로 해결한다.
4. projection 과 UI 는 normalized event 를 기준으로 동작한다.
5. heartbeat, stale 판정, retry, spool fallback 을 통해 장시간 실행 환경에서도 관찰 가능성을 유지한다.

본 문서는 이후 데이터 모델 문서의 입력 기준으로 고정한다.

---

## 25. 다음 작성 대상

다음 문서:

- `04_DATA_MODEL_SPEC.md`

---

버전 정보: GPT-5.4 Thinking

