# 02_REQUIREMENTS_SPEC

**문서 ID**: CC-MON-002  
**버전**: v1.0  
**작성일**: 2026-04-08  
**상태**: Draft Fixed Baseline

---

## 1. 문서 목적

본 문서는 **Claude Code 모니터링 웹 서비스**의 요구사항을 체계적으로 정의한다.

본 문서의 목적은 다음과 같다.

1. 시스템이 반드시 제공해야 하는 기능 요구사항을 고정한다.
2. 성능, 보안, 운영, 확장성 관점의 비기능 요구사항을 정의한다.
3. 이후 작성될 API, 데이터 모델, UI, 배포 문서의 기준선을 제공한다.
4. MVP 범위와 확장 범위를 명확히 구분한다.

본 문서는 구현 우선순위와 범위 통제를 위한 상위 요구사항 기준 문서이다.

---

## 2. 시스템 범위

본 시스템은 **Claude Code 실행 상태를 외부에서 모니터링하기 위한 웹 기반 관찰 시스템**이다.

시스템은 다음을 포함한다.

- Claude Code 세션 상태 수집
- task / tool / subagent / team 상태 수집
- 현재 상태 및 이력 저장
- 웹/모바일 상태 조회
- 실시간 상태 반영
- 이상 상태 탐지 및 표시

시스템은 기본적으로 **관찰 및 가시화**를 목적에 둔다.

본 시스템은 초기 범위에서 다음을 직접 수행하지 않는다.

- Claude Code 자체 실행 제어
- Claude Code 내부 추론 내용 해석
- Claude Code 세션의 전체 원문 자동 공개
- Claude Code 공식 Remote Control 대체 구현

---

## 3. 이해관계자

## 3.1 1차 사용자

- 개인 개발자
- 로컬 PC 또는 서버에서 Claude Code 를 실행하는 사용자
- 외부 웹/모바일에서 현재 진행상황을 보고 싶은 사용자

## 3.2 2차 사용자

- 팀 리더
- 협업 환경에서 여러 Claude Code 실행 인스턴스를 관찰하려는 운영자
- 연구/자동화 환경에서 장시간 실행 세션 상태를 보고 싶은 사용자

## 3.3 운영자

- 모니터링 시스템 배포 및 운영 담당자
- 수집 정책, 접근 권한, 보안 정책을 관리하는 관리자

---

## 4. 요구사항 분류 체계

요구사항은 다음 범주로 분류한다.

- FR: Functional Requirement
- NFR: Non-Functional Requirement
- OR: Operational Requirement
- SR: Security Requirement
- DR: Data Requirement
- UXR: User Experience Requirement

---

## 5. 상위 목표 요구사항

### R-01

사용자는 Claude Code 가 현재 **무슨 작업을 수행 중인지** 외부 웹 화면에서 확인할 수 있어야 한다.

### R-02

사용자는 Claude Code 세션의 **현재 상태와 최근 이력**을 모두 확인할 수 있어야 한다.

### R-03

사용자는 모바일 환경에서 최소한의 핵심 진행상황을 빠르게 확인할 수 있어야 한다.

### R-04

시스템은 Claude Code 가 제공하는 관찰 가능한 정보만을 이용하여 상태를 수집해야 하며, 기존 작업 흐름에 대한 침습을 최소화해야 한다.

### R-05

시스템은 실시간 반영과 이력 저장을 동시에 만족해야 한다.

---

## 6. 기능 요구사항

## 6.1 세션 관리 기능

### FR-001 세션 시작 감지

시스템은 Claude Code 세션 시작 이벤트를 감지하고 저장해야 한다.

#### 입력
- SessionStart hook
- collector startup session report

#### 출력
- session record 생성
- current session status = running 또는 initializing

### FR-002 세션 종료 감지

시스템은 Claude Code 세션 종료 이벤트를 감지하고 저장해야 한다.

#### 출력
- session status = stopped / failed / interrupted 중 하나로 갱신
- 종료 시각 기록

### FR-003 활성 세션 목록 조회

사용자는 현재 활성 상태의 세션 목록을 조회할 수 있어야 한다.

### FR-004 세션 상세 조회

사용자는 특정 세션의 상세 정보를 조회할 수 있어야 한다.

상세 정보에는 최소 다음이 포함되어야 한다.

- session id
- 시작 시각
- 최근 업데이트 시각
- 현재 상태
- 최근 user prompt
- 최근 tool activity
- 최근 error/alert
- subagent/team activity summary

### FR-005 세션 이력 조회

사용자는 특정 세션의 이벤트 타임라인을 시간순으로 조회할 수 있어야 한다.

---

## 6.2 프롬프트 및 사용자 상호작용 추적 기능

### FR-006 사용자 프롬프트 제출 감지

시스템은 user prompt submit 이벤트를 감지하고 저장해야 한다.

### FR-007 최근 프롬프트 요약 표시

사용자는 세션별 최근 프롬프트 또는 최근 작업 지시 요약을 볼 수 있어야 한다.

### FR-008 민감 정보 비노출 옵션

운영 설정에 따라 프롬프트 원문을 비수집 또는 마스킹할 수 있어야 한다.

---

## 6.3 Tool 실행 추적 기능

### FR-009 Tool 실행 시작 감지

시스템은 Claude Code 의 tool 실행 시작 시점을 감지해야 한다.

대상 예시:
- Bash
- Read
- Edit
- Write
- WebFetch
- WebSearch
- Agent
- Skill
- MCP tool

### FR-010 Tool 실행 성공 감지

시스템은 tool 실행 성공 이벤트를 감지하고 저장해야 한다.

### FR-011 Tool 실행 실패 감지

시스템은 tool 실행 실패 이벤트를 감지하고 저장해야 한다.

### FR-012 현재 실행 중 Tool 표시

사용자는 현재 세션에서 실행 중인 tool 을 확인할 수 있어야 한다.

### FR-013 최근 Tool 실행 이력 조회

사용자는 세션별 최근 tool 실행 이력을 조회할 수 있어야 한다.

### FR-014 Tool 상태 분류

시스템은 각 tool 실행 상태를 최소 다음으로 분류해야 한다.

- requested
- running
- succeeded
- failed
- denied
- deferred
- interrupted

---

## 6.4 Task 추적 기능

### FR-015 Task 생성 감지

시스템은 task 생성 이벤트를 감지하고 저장해야 한다.

### FR-016 Task 완료 감지

시스템은 task 완료 이벤트를 감지하고 저장해야 한다.

### FR-017 Task 현재 상태 조회

사용자는 각 task 의 현재 상태를 조회할 수 있어야 한다.

### FR-018 Task 진행 상태 표시

시스템은 task 상태를 다음 범주 중 하나로 표시해야 한다.

- pending
- in_progress
- blocked
- completed
- failed
- cancelled

### FR-019 Task 기준 정렬/필터

사용자는 task 목록을 상태, 시작 시각, 최근 업데이트 시각 기준으로 필터링할 수 있어야 한다.

---

## 6.5 Subagent 추적 기능

### FR-020 Subagent 시작 감지

시스템은 subagent 시작 이벤트를 감지하고 저장해야 한다.

### FR-021 Subagent 종료 감지

시스템은 subagent 종료 이벤트를 감지하고 저장해야 한다.

### FR-022 Subagent 상태 조회

사용자는 세션 내 subagent 상태를 조회할 수 있어야 한다.

### FR-023 Subagent 요약 정보 표시

최소 다음 정보를 보여야 한다.

- agent id
- agent type
- 상태
- 시작 시각
- 종료 시각
- 최근 메시지 요약 또는 마지막 결과 요약

### FR-024 Subagent 계층 연결

시스템은 subagent 가 어느 session / task 와 관련되는지 연결 관계를 보여야 한다.

---

## 6.6 Agent Team 추적 기능

### FR-025 Team 생성 상태 추적

시스템은 agent team 실행 구조를 식별하고 저장해야 한다.

### FR-026 Teammate 상태 추적

각 teammate 의 현재 상태를 추적해야 한다.

### FR-027 Team Overview 조회

사용자는 team 단위 overview 를 조회할 수 있어야 한다.

최소 포함 항목:
- team name
- teammate count
- running teammate count
- idle teammate count
- blocked teammate count
- recent team messages count
- recent team task summary

### FR-028 Teammate 상세 조회

사용자는 특정 teammate 의 현재 상태와 최근 활동을 볼 수 있어야 한다.

---

## 6.7 Permission / Hook 관련 상태 추적 기능

### FR-029 Permission Request 감지

시스템은 permission request 이벤트를 감지해야 한다.

### FR-030 Permission Denied 감지

시스템은 permission denied 또는 auto classifier deny 상태를 감지해야 한다.

### FR-031 Hook 영향 상태 추적

시스템은 hook 에 의해 tool 이 차단되거나 변경된 경우 이를 이벤트로 저장해야 한다.

---

## 6.8 Heartbeat 및 생존성 추적 기능

### FR-032 Heartbeat 생성

Collector 는 주기적으로 heartbeat 이벤트를 생성해야 한다.

### FR-033 마지막 heartbeat 표시

사용자는 세션 또는 collector 의 마지막 heartbeat 시각을 볼 수 있어야 한다.

### FR-034 stale 상태 판정

일정 시간 heartbeat 가 없으면 stale 상태로 판정해야 한다.

### FR-035 collector 연결 상태 표시

UI 에서 collector online/offline/stale 상태를 구분해 표시해야 한다.

---

## 6.9 알림 및 이상 상태 기능

### FR-036 이상 상태 감지

시스템은 최소 다음 이상 상태를 감지해야 한다.

- heartbeat timeout
- tool failure
- repeated failure
- session abnormal stop
- task blocked too long
- permission wait too long

### FR-037 Alert 목록 조회

사용자는 활성 alert 및 최근 alert 이력을 조회할 수 있어야 한다.

### FR-038 Alert 상태 관리

alert 는 최소 다음 상태를 가져야 한다.

- raised
- acknowledged
- cleared

### FR-039 UI 경고 표시

활성 alert 는 dashboard 및 세션 상세 화면에서 즉시 보이도록 표시해야 한다.

---

## 6.10 실시간 전달 기능

### FR-040 실시간 상태 반영

세션, task, tool, subagent, team 상태 변경은 실시간 또는 준실시간으로 UI 에 반영되어야 한다.

### FR-041 실시간 채널 제공

시스템은 최소 1개 이상의 실시간 push 채널을 제공해야 한다.

MVP 기준 기본 채널은 SSE 로 한다.

### FR-042 연결 재수립 지원

브라우저가 재연결할 경우 최근 상태를 복구할 수 있어야 한다.

---

## 6.11 Dashboard 기능

### FR-043 전체 Dashboard 제공

시스템은 현재 모니터링 중인 실행 상태를 한 화면에서 보여주는 dashboard 를 제공해야 한다.

### FR-044 Dashboard 요약 카드

최소 다음 카드가 있어야 한다.

- active sessions
- running tasks
- running tools
- active alerts
- stale collectors
- active teams

### FR-045 상태별 색상 구분

상태는 색상/아이콘으로 명확히 구분되어야 한다.

---

## 6.12 모바일 기능

### FR-046 모바일 요약 화면 제공

모바일 환경에서 현재 진행 중 상태를 요약해 보여주는 화면을 제공해야 한다.

### FR-047 모바일 우선 정보

모바일 화면에는 최소 다음이 우선 노출되어야 한다.

- 현재 session 상태
- 현재 작업 요약
- 마지막 업데이트 시간
- 최근 실패/경고 여부
- active alert 개수

### FR-048 모바일 반응형 UI

UI 는 모바일 브라우저에서 깨지지 않고 사용 가능해야 한다.

---

## 6.13 검색 및 필터 기능

### FR-049 상태 기반 필터

세션/태스크/에이전트 목록은 상태 기반 필터를 지원해야 한다.

### FR-050 기간 기반 필터

이벤트 타임라인 조회는 시간 구간 필터를 지원해야 한다.

### FR-051 이름/ID 검색

session id, task id, agent id, team name 등으로 검색할 수 있어야 한다.

---

## 7. 데이터 요구사항

## 7.1 이벤트 저장 요구

### DR-001 Raw Event 저장

수집된 원본 이벤트는 raw form 으로 저장되어야 한다.

### DR-002 Normalized Event 저장

정규화된 표준 이벤트를 별도 저장해야 한다.

### DR-003 Projection 저장

현재 상태 projection 을 별도 저장해야 한다.

---

## 7.2 식별자 요구

### DR-004 주요 식별자 저장

최소 다음 식별자를 다뤄야 한다.

- session_id
- task_id
- tool_use_id
- agent_id
- team_name
- teammate_name
- source_instance_id

### DR-005 이벤트 고유성

각 이벤트는 중복 삽입 방지를 위한 고유 키 또는 idempotency key 를 가져야 한다.

---

## 7.3 시간 정보 요구

### DR-006 이벤트 시간 저장

모든 이벤트는 발생 시각과 수집 시각을 구분 저장할 수 있어야 한다.

### DR-007 최근 업데이트 시간 유지

projection 엔티티에는 최근 업데이트 시각이 유지되어야 한다.

---

## 7.4 데이터 보존 요구

### DR-008 이벤트 보존 기간 설정

raw/normalized event 보존 기간은 설정 가능해야 한다.

### DR-009 projection 재생성 가능성

projection 은 event 재처리로 복구 가능해야 한다.

---

## 8. 비기능 요구사항

## 8.1 성능 요구사항

### NFR-001 Dashboard 응답 성능

일반적인 active dashboard 조회는 사용자 체감상 빠르게 응답해야 한다.

### NFR-002 세션 상세 응답 성능

세션 상세 및 최근 이벤트 조회는 실무 사용에 충분한 응답성을 제공해야 한다.

### NFR-003 실시간 반영 지연

상태 변경부터 UI 반영까지의 지연은 가능한 짧아야 한다.

MVP 에서는 수 초 이내 수준을 목표로 한다.

### NFR-004 burst event 처리

짧은 시간에 다수 이벤트가 몰려도 ingest 계층이 안정적으로 처리되어야 한다.

---

## 8.2 신뢰성 요구사항

### NFR-005 일시적 네트워크 장애 허용

Collector 와 중앙 서버 사이 일시적 연결 장애 시 이벤트 유실을 최소화해야 한다.

### NFR-006 중복 수신 허용

시스템은 동일 이벤트가 재전송되어도 중복 처리가 가능해야 한다.

### NFR-007 projection 복구성

projection 손상 또는 누락 시 재처리로 복구할 수 있어야 한다.

---

## 8.3 확장성 요구사항

### NFR-008 단일 사용자에서 시작 가능

시스템은 단일 사용자의 로컬 환경에서도 배포 가능해야 한다.

### NFR-009 다중 호스트 확장 가능

향후 여러 Claude Code 실행 호스트에서 이벤트를 수집할 수 있어야 한다.

### NFR-010 다중 세션 확장 가능

동시 다수 세션을 처리할 수 있도록 구조적으로 확장 가능해야 한다.

---

## 8.4 유지보수성 요구사항

### NFR-011 컴포넌트 분리

Collector, Ingest, Projection, API, UI 는 논리적으로 분리되어야 한다.

### NFR-012 스키마 명시성

이벤트 및 projection 스키마는 명확히 정의되어야 한다.

### NFR-013 설정 가능성

heartbeat timeout, retention, masking, alert rule 등은 설정 가능해야 한다.

---

## 8.5 이식성 요구사항

### NFR-014 로컬/서버 배포 가능

시스템은 로컬 PC, VPS, 일반 Linux 서버에 배포 가능해야 한다.

### NFR-015 컨테이너 배포 지원

Docker 기반 배포를 지원해야 한다.

---

## 9. 운영 요구사항

## 9.1 배포 요구사항

### OR-001 Docker Compose 기반 초기 배포

MVP 는 Docker Compose 기반 배포를 우선 지원해야 한다.

### OR-002 환경변수 기반 설정

운영 설정은 환경변수 또는 설정파일로 주입 가능해야 한다.

---

## 9.2 운영 관찰성 요구사항

### OR-003 서버 health check 제공

API 서버와 collector 는 health check endpoint 또는 equivalent 상태 점검 수단을 제공해야 한다.

### OR-004 internal metrics 확장 여지

향후 metrics/exporter 연계가 가능하도록 구조를 열어두어야 한다.

---

## 9.3 장애 대응 요구사항

### OR-005 collector 장애 감지

collector 중단 또는 stale 상태를 운영자가 인지할 수 있어야 한다.

### OR-006 재시작 내구성

collector 또는 API 재시작 후 상태 복구가 가능해야 한다.

---

## 10. 보안 요구사항

## 10.1 인증/인가

### SR-001 접근 통제

웹 UI 및 API 는 인증된 사용자만 접근할 수 있어야 한다.

### SR-002 최소 권한 원칙

수집 시스템과 조회 시스템은 최소 권한으로 동작해야 한다.

---

## 10.2 데이터 보호

### SR-003 민감 정보 비수집 옵션

prompt, command, file path, tool input/output 의 민감 정보는 비수집 또는 마스킹 옵션을 제공해야 한다.

### SR-004 전송 구간 보호

원격 배포 시 collector 와 서버 간 통신은 보호되어야 한다.

### SR-005 비밀값 분리

토큰/비밀값은 코드에 하드코딩하지 않고 외부 설정으로 주입해야 한다.

---

## 10.3 감사 및 추적

### SR-006 주요 이벤트 감사 가능

누가 언제 어떤 세션 상태를 보았는지까지는 초기 범위에서 필수는 아니나, 핵심 이벤트 이력은 보존되어야 한다.

### SR-007 관리자 설정 감사 가능성

향후 운영 설정 변경 이력을 남길 수 있도록 확장 가능해야 한다.

---

## 11. 사용자 경험 요구사항

## 11.1 가독성

### UXR-001 한눈에 상태 파악 가능

사용자는 상세 클릭 없이도 현재 진행 여부를 빠르게 파악할 수 있어야 한다.

### UXR-002 상태 시각 구분

진행중/대기/차단/실패/종료는 명확히 구분되어야 한다.

---

## 11.2 탐색성

### UXR-003 drill-down 지원

dashboard → session → task/tool/subagent timeline 으로 내려갈 수 있어야 한다.

### UXR-004 최근 이벤트 우선 노출

사용자에게는 가장 최근 상태 변화가 우선적으로 보여야 한다.

---

## 11.3 모바일 사용성

### UXR-005 한 화면 요약

모바일에서는 첫 화면에서 핵심 상태를 모두 볼 수 있어야 한다.

### UXR-006 터치 기반 사용성

모바일에서 버튼, 필터, 카드 요소는 터치 사용성을 고려해야 한다.

---

## 12. MVP 범위

## 12.1 MVP 포함 범위

다음 항목은 MVP 에 포함한다.

1. Claude Code hook 기반 이벤트 수집
2. session / task / tool / subagent / team 기본 추적
3. raw + normalized event 저장
4. current projection 생성
5. dashboard 제공
6. session detail 제공
7. timeline 제공
8. active alert 표시
9. SSE 기반 실시간 반영
10. 모바일 responsive summary

## 12.2 MVP 제외 범위

다음 항목은 초기 MVP 에서는 제외한다.

1. 정교한 멀티테넌시
2. 고급 권한 체계(RBAC 상세화)
3. push notification 다채널 연동
4. 외부 SSO 통합
5. Claude Code 실행 제어 기능
6. AI 기반 이상탐지 모델링
7. 고급 분석 리포트

---

## 13. 우선순위

## 13.1 Must Have

- session monitoring
- task/tool/subagent/team basic monitoring
- dashboard
- session detail
- realtime update
- mobile summary
- alert basic detection
- event persistence

## 13.2 Should Have

- advanced filters
- alert acknowledgement
- collector stale detection 고도화
- masking policy settings

## 13.3 Could Have

- external notifications
- usage analytics
- custom dashboards
- historical trend charts

---

## 14. 수용 기준

## 14.1 기능 수용 기준

다음이 가능하면 기능 요구 수용으로 본다.

1. Claude Code 세션 시작 후 dashboard 에 active session 이 표시된다.
2. tool 실행이 시작/성공/실패로 반영된다.
3. task 및 subagent 상태가 세션 상세에서 보인다.
4. 최근 이벤트 타임라인이 시간순으로 조회된다.
5. 모바일 브라우저에서 현재 진행상황 요약이 보인다.
6. heartbeat 중단 시 stale 또는 alert 가 표시된다.

## 14.2 비기능 수용 기준

1. 일반적인 단일 사용자 환경에서 실용적인 응답성을 보인다.
2. 일시적 collector 연결 장애 후 재연결 시 복구된다.
3. 동일 이벤트 재전송 시 중복 누적 없이 처리된다.
4. 설정을 통해 민감 정보 노출 정책을 조정할 수 있다.

---

## 15. 향후 상세화 대상

본 문서 이후 다음 문서에서 상세화한다.

- `03_EVENT_COLLECTION_SPEC.md`
- `04_DATA_MODEL_SPEC.md`
- `05_API_SPEC.md`
- `06_UI_WEB_MOBILE_SPEC.md`
- `07_ALERTING_AND_HEARTBEAT_SPEC.md`
- `08_DEPLOYMENT_ARCHITECTURE.md`

---

## 16. 결론

본 시스템의 요구사항은 **Claude Code 실행 상태를 외부에서 안전하고 실용적으로 관찰하기 위한 웹 모니터링 시스템**으로 정의된다.

핵심 요구는 다음 네 가지로 요약된다.

1. 현재 상태를 빠르게 볼 수 있어야 한다.
2. 세부 이력을 내려가며 볼 수 있어야 한다.
3. 모바일에서도 최소 핵심 상태를 확인할 수 있어야 한다.
4. 이벤트 기반으로 안정적으로 수집/저장/복구할 수 있어야 한다.

본 문서는 이후 세부 설계 문서의 상위 기준선으로 고정한다.

---

## 17. 다음 작성 대상

다음 문서:

- `03_EVENT_COLLECTION_SPEC.md`

---

버전 정보: GPT-5.4 Thinking

