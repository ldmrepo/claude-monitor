# Claude Code 모니터링 웹 서비스 아키텍처

**문서 ID**: CC-MON-ARCH-001  
**버전**: v1.0  
**작성일**: 2026-04-08  
**상태**: 초안

---

## 0. 문서 목적

본 문서는 Claude Code의 공식 제공 기능을 활용하여, 로컬에서 실행 중인 Claude Code 세션의 작업 상태를 원격·모바일 환경에서 확인할 수 있는 웹 모니터링 서비스를 설계하기 위한 기준 문서이다.

본 문서는 다음 범위를 다룬다.

- Claude Code의 공식 관측 지점 기반 수집 범위 정의
- 작업 상태 모니터링용 시스템 아키텍처 정의
- 수집 이벤트, 저장 모델, API, UI 구조 정의
- 모바일 확인 중심의 운영 방식 정의
- 보안 경계 및 한계 정의

---

## 1. 목표와 비목표

### 1.1 목표

본 시스템의 목표는 다음과 같다.

1. Claude Code의 현재 실행 여부를 확인한다.
2. 현재 또는 직전 작업 상태를 웹에서 확인한다.
3. tool 실행 이력, 실패 이력, subagent/task 상태를 확인한다.
4. 모바일 브라우저에서 진행상황을 확인한다.
5. 비용, 컨텍스트 사용량, 세션 지속 시간 등의 운영 지표를 확인한다.
6. 공식 제공 기능을 우선 사용하여 안정적으로 구현한다.

### 1.2 비목표

본 시스템은 다음을 목표로 하지 않는다.

1. Claude Code 내부 UI를 그대로 복제하지 않는다.
2. 비공개 내부 추론 과정 전체를 재현하지 않는다.
3. Remote Control 기능을 대체하는 원격 제어 기능을 기본 범위에 포함하지 않는다.
4. Claude Code 자체를 수정하거나 비공식 프로토콜에 의존하지 않는다.

---

## 2. 구현 가능성 결론

Claude Code는 공식적으로 다음과 같은 관측 지점을 제공하므로, 별도 웹 서비스를 통한 작업 상태 모니터링 구현이 가능하다.

- Hooks 기반 이벤트 수집
- Status line 기반 상태 표시
- OpenTelemetry 기반 usage / costs / tool activity export
- Task 및 Subagent 관련 이벤트 수집

따라서 직접 구현 방식은 다음 원칙으로 정의한다.

- **원격 제어가 아닌 원격 모니터링 중심**으로 설계한다.
- **Claude Code 외부에 수집기와 대시보드**를 구축한다.
- **공식 이벤트와 상태 데이터만 사용**한다.

---

## 3. 공식 관측 지점

### 3.1 Hooks

Hooks는 Claude Code 수명주기 이벤트 발생 시 JSON 입력을 전달받아 외부 프로그램이나 HTTP 엔드포인트로 연동할 수 있는 핵심 관측 지점이다.

모니터링에 유용한 주요 이벤트는 다음과 같다.

- `SessionStart`
- `UserPromptSubmit`
- `PreToolUse`
- `PostToolUse`
- `PostToolUseFailure`
- `SubagentStart`
- `SubagentStop`
- `TaskCreated`
- `TaskCompleted`
- `Stop`
- `StopFailure`
- `Notification`
- `ConfigChange`
- `InstructionsLoaded`
- `PreCompact`
- `PostCompact`
- `SessionEnd`

### 3.2 Status line

Status line은 현재 세션의 핵심 상태를 표시하기 위한 메커니즘이다. 이를 통해 다음과 같은 상태성 정보를 보조적으로 수집할 수 있다.

- 모델명
- 현재 작업 디렉터리
- git branch
- context window 사용률
- 비용 관련 표시값
- 세션 상태 요약

### 3.3 OpenTelemetry

OpenTelemetry는 조직 단위 usage, cost, tool activity, metrics, events, traces 수집을 위한 공식 수단이다. 웹 서비스의 운영 대시보드 계층에서 사용하기 적합하다.

### 3.4 Task / Subagent 기능

Task 및 Subagent 관련 이벤트를 통해 다음 상태를 추적할 수 있다.

- 생성된 작업 목록
- 작업 진행 상태
- 실행 중 subagent 목록
- subagent 시작/종료 시각
- 최근 완료 결과 요약

---

## 4. 수집 대상 정보 범위

### 4.1 실시간 상태

- Claude Code 프로세스 실행 여부
- 최근 heartbeat 시각
- 현재 session ID
- 현재 permission mode
- 현재 working directory
- 현재 model
- 현재 branch
- 최근 응답 시각

### 4.2 작업 이벤트

- 사용자 프롬프트 제출 시각
- tool 실행 시작/완료/실패
- tool 이름 및 입력 요약
- subagent 시작/종료
- task 생성/완료
- compact 시작/종료
- session 종료/실패

### 4.3 운영 메트릭

- 세션 누적 실행 시간
- 최근 1시간 tool 호출 수
- 실패 비율
- 평균 tool 실행 시간
- context 사용률
- 비용 추정 또는 비용 표시값

### 4.4 알림 대상 이벤트

- PostToolUseFailure
- StopFailure
- 장시간 무응답
- heartbeat timeout
- 반복 실패
- context 임계치 초과

---

## 5. 상위 아키텍처

```text
Claude Code
  ├─ Hooks
  ├─ Status line
  └─ OpenTelemetry
        ↓
Local Collector API
        ↓
Event Store / Metrics Store / Cache
        ↓
Dashboard API
        ↓
Web / Mobile UI
```

### 5.1 구성 요소

#### A. Claude Code 실행 노드

로컬 PC 또는 개발 서버에서 Claude Code가 실행된다. 이 노드는 Hooks와 상태 정보를 외부 수집기로 전달한다.

#### B. Local Collector API

Claude Code의 HTTP hook 수신점이다. 주요 역할은 다음과 같다.

- hook 이벤트 수신
- 이벤트 정규화
- 세션 상태 갱신
- heartbeat 계산
- DB 저장
- WebSocket/SSE 브로드캐스트

#### C. Event Store

세션 이벤트 원본을 append-only 형태로 저장한다.

#### D. Metrics Store

집계형 메트릭을 저장한다.

#### E. Cache

현재 상태, 최근 세션, 최근 tool 실행 현황을 빠르게 조회하기 위한 캐시 계층이다.

#### F. Dashboard API

웹/모바일 UI에 최적화된 조회 API를 제공한다.

#### G. Web / Mobile UI

진행 상태를 확인하기 위한 반응형 웹 대시보드이다.

---

## 6. 권장 기술 스택

### 6.1 최소 구현안

- Backend: FastAPI
- DB: SQLite
- Cache: 없음 또는 in-memory
- Frontend: React 또는 Next.js
- Realtime: SSE
- Deployment: 로컬 단일 프로세스

### 6.2 운영형 구현안

- Backend: FastAPI
- DB: PostgreSQL
- Cache: Redis
- Frontend: Next.js
- Realtime: WebSocket
- Telemetry: OTel Collector + Grafana/Loki/Tempo/Prometheus
- Reverse Proxy: Nginx 또는 Caddy

---

## 7. 데이터 흐름

### 7.1 Hook 이벤트 흐름

1. Claude Code에서 hook 이벤트 발생
2. HTTP hook이 Collector API로 JSON POST 전송
3. Collector가 이벤트 타입별 정규화
4. Event Store 저장
5. SessionState projection 갱신
6. 실시간 채널로 브로드캐스트
7. 모바일/웹 UI 반영

### 7.2 상태 갱신 흐름

1. `SessionStart` 수신 시 세션 활성화
2. `PreToolUse` 수신 시 현재 작업 상태를 running으로 갱신
3. `PostToolUse` 수신 시 최근 작업 완료로 갱신
4. `PostToolUseFailure` 수신 시 오류 상태 반영
5. `Stop` 또는 `SessionEnd` 수신 시 idle/ended 상태 반영

### 7.3 메트릭 흐름

1. OTel exporter 활성화
2. metrics/logs/traces 외부 collector 전송
3. 집계 대시보드에서 비용/사용량/빈도 분석

---

## 8. 핵심 이벤트 모델

### 8.1 Event 공통 구조

```json
{
  "event_id": "uuid",
  "session_id": "string",
  "hook_event_name": "PostToolUse",
  "timestamp": "2026-04-08T12:34:56Z",
  "cwd": "/workspace/project",
  "agent_id": null,
  "agent_type": null,
  "payload": {}
}
```

### 8.2 SessionState 구조

```json
{
  "session_id": "string",
  "status": "running",
  "current_tool": "Bash",
  "last_event_at": "2026-04-08T12:34:56Z",
  "current_model": "claude-sonnet-4-6",
  "cwd": "/workspace/project",
  "branch": "feature/monitoring",
  "context_usage_pct": 42.3,
  "cost_estimate": 1.24,
  "last_error": null
}
```

### 8.3 ToolExecution 구조

```json
{
  "tool_use_id": "toolu_xxx",
  "session_id": "string",
  "tool_name": "Bash",
  "started_at": "2026-04-08T12:34:00Z",
  "ended_at": "2026-04-08T12:34:10Z",
  "duration_ms": 10000,
  "status": "success",
  "input_summary": "npm test",
  "error": null
}
```

### 8.4 Task 구조

```json
{
  "task_id": "task-001",
  "session_id": "string",
  "subject": "Implement auth",
  "description": "...",
  "status": "completed",
  "created_at": "...",
  "completed_at": "..."
}
```

### 8.5 Subagent 구조

```json
{
  "agent_id": "agent-123",
  "session_id": "string",
  "agent_type": "Explore",
  "status": "running",
  "started_at": "...",
  "stopped_at": null,
  "last_message": "..."
}
```

---

## 9. 최소 Hook 구성 권장안

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "http",
            "url": "http://127.0.0.1:8787/hooks/session-start"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "http",
            "url": "http://127.0.0.1:8787/hooks/pre-tool"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "http",
            "url": "http://127.0.0.1:8787/hooks/post-tool"
          }
        ]
      }
    ],
    "PostToolUseFailure": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "http",
            "url": "http://127.0.0.1:8787/hooks/post-tool-failure"
          }
        ]
      }
    ],
    "SubagentStart": [
      {
        "hooks": [
          {
            "type": "http",
            "url": "http://127.0.0.1:8787/hooks/subagent-start"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          {
            "type": "http",
            "url": "http://127.0.0.1:8787/hooks/subagent-stop"
          }
        ]
      }
    ],
    "TaskCreated": [
      {
        "hooks": [
          {
            "type": "http",
            "url": "http://127.0.0.1:8787/hooks/task-created"
          }
        ]
      }
    ],
    "TaskCompleted": [
      {
        "hooks": [
          {
            "type": "http",
            "url": "http://127.0.0.1:8787/hooks/task-completed"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "http",
            "url": "http://127.0.0.1:8787/hooks/stop"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "http",
            "url": "http://127.0.0.1:8787/hooks/session-end"
          }
        ]
      }
    ]
  }
}
```

---

## 10. Backend API 설계

### 10.1 내부 수집 API

- `POST /hooks/session-start`
- `POST /hooks/pre-tool`
- `POST /hooks/post-tool`
- `POST /hooks/post-tool-failure`
- `POST /hooks/subagent-start`
- `POST /hooks/subagent-stop`
- `POST /hooks/task-created`
- `POST /hooks/task-completed`
- `POST /hooks/stop`
- `POST /hooks/session-end`

### 10.2 조회 API

- `GET /api/sessions`
- `GET /api/sessions/{session_id}`
- `GET /api/sessions/{session_id}/events`
- `GET /api/sessions/{session_id}/tools`
- `GET /api/sessions/{session_id}/tasks`
- `GET /api/sessions/{session_id}/subagents`
- `GET /api/metrics/summary`
- `GET /api/metrics/timeline`
- `GET /api/health`

### 10.3 실시간 API

- `GET /api/stream` (SSE)
- `GET /api/ws` (WebSocket)

---

## 11. UI 화면 구성

### 11.1 홈 대시보드

표시 항목:

- 현재 실행 상태
- 활성 세션 수
- 마지막 활동 시각
- 최근 실패 수
- 평균 tool 실행 시간
- 최근 task 완료 수

### 11.2 세션 상세 화면

표시 항목:

- session ID
- 시작 시각 / 마지막 활동 시각
- 현재 상태
- model / cwd / branch
- 최근 assistant 메시지 요약
- 진행률 추정

### 11.3 Tool 타임라인 화면

표시 항목:

- tool 실행 순서
- duration
- success / failure
- 입력 요약
- 실패 원인

### 11.4 Task / Subagent 화면

표시 항목:

- 생성 task 목록
- 완료 여부
- subagent 상태
- 시작/종료 시각
- 최근 결과 요약

### 11.5 운영 메트릭 화면

표시 항목:

- context usage 추이
- 비용 추이
- tool 빈도
- 실패율
- 세션 길이 분포

### 11.6 모바일 최적화 화면

우선순위는 다음과 같다.

1. 현재 상태 배지
2. 마지막 작업 시각
3. 최근 실패 알림
4. 현재 또는 최근 tool 한 줄 요약
5. 활성 task / subagent 수

---

## 12. 상태 판정 규칙

### 12.1 상태 정의

- `starting`
- `running`
- `idle`
- `failed`
- `ended`
- `unknown`

### 12.2 상태 전이 규칙

- `SessionStart` 수신 시 `starting`
- 첫 `PreToolUse` 수신 시 `running`
- 최근 N초 동안 이벤트가 없고 종료 이벤트가 없으면 `idle`
- `PostToolUseFailure` 또는 `StopFailure` 발생 시 `failed`
- `SessionEnd` 수신 시 `ended`
- heartbeat timeout 시 `unknown`

### 12.3 진행률 추정

Claude Code는 일반적인 퍼센트 진행률을 직접 제공하지 않으므로, 진행률은 추정치로 계산한다.

예시:

- task 기반: completed / total
- tool 기반: 최근 activity density
- 상태 기반: running / idle / ended

따라서 UI에서는 **정확한 퍼센트**보다 **상태+최근 활동** 중심으로 표현한다.

---

## 13. 보안 설계

### 13.1 원칙

- 수집기 API는 localhost 또는 VPN 내부로 제한한다.
- 외부 공개 시 인증을 필수 적용한다.
- 원문 prompt/tool input 전체 저장은 기본 비활성화한다.
- 최소 필요 정보만 저장한다.

### 13.2 권장 보안 항목

- API key 또는 session token 인증
- TLS 적용
- 모바일 대시보드 로그인
- IP allowlist 또는 VPN
- 민감값 마스킹
- 로그 보존 기간 제한

### 13.3 민감 정보 처리

다음 항목은 마스킹 또는 비저장을 권장한다.

- 프롬프트 원문 전체
- 파일 경로 중 민감 경로
- secret 포함 가능 command 인자
- tool input 본문 전체

기본 저장 전략은 다음을 권장한다.

- `tool_input` 전체 저장 금지
- `input_summary`만 저장
- 오류 메시지는 패턴 마스킹 후 저장

---

## 14. 배포 방식

### 14.1 단일 개발자 로컬형

- Claude Code 실행 PC
- FastAPI collector 로컬 실행
- SQLite 저장
- Tailscale 또는 사설망으로 모바일 접속
- 반응형 웹 대시보드

### 14.2 팀 공용 서버형

- 각 개발 PC에서 중앙 collector로 hook 전송
- 중앙 PostgreSQL + Redis
- Grafana/Prometheus 연동
- 조직별 세션 뷰 제공

### 14.3 권장 1차 방식

팀장님 요구 기준에서는 먼저 **단일 개발자 로컬형**으로 시작하는 것이 가장 현실적이다.

이유는 다음과 같다.

- 설치가 단순하다.
- Remote Control 없이도 모바일 확인이 가능하다.
- 공식 hook/event 활용만으로 충분하다.
- 이후 중앙집중형으로 확장하기 쉽다.

---

## 15. 구현 단계 제안

### 15.1 1단계 MVP

구현 범위:

- SessionStart / Stop / SessionEnd
- PreToolUse / PostToolUse / PostToolUseFailure
- 세션 상태 대시보드
- 모바일 반응형 UI
- 최근 이벤트 목록

### 15.2 2단계 확장

구현 범위:

- SubagentStart / SubagentStop
- TaskCreated / TaskCompleted
- SSE 또는 WebSocket 실시간 반영
- 간단한 푸시 알림

### 15.3 3단계 운영형

구현 범위:

- OTel 연계
- 비용/사용량 그래프
- 사용자/세션 다중 지원
- 중앙집중형 저장소
- 권한 모델

---

## 16. 한계와 주의사항

1. Claude Code 내부 UI 전체를 재현하는 것은 공식 범위 밖이다.
2. 모든 내부 상태가 공식 이벤트로 제공되는 것은 아니다.
3. 진행률은 대부분 추정치이다.
4. Remote Control 없이 직접 구현 시 원격 제어보다 원격 관찰에 적합하다.
5. Hook 기반 설계는 이벤트 누락 방지와 재전송 전략이 중요하다.

---

## 17. 최종 결론

Claude Code는 공식적으로 Hooks, Status line, OpenTelemetry, Task/Subagent 관련 관측 지점을 제공하므로, 이를 수집하여 **원격/모바일에서 진행상황을 확인하는 웹 서비스 구축이 가능하다**.

가장 현실적인 구현 방향은 다음과 같다.

- Claude Code 외부에 collector 서버를 둔다.
- Hooks를 HTTP로 수집한다.
- 현재 상태 projection을 별도 저장한다.
- 웹/모바일 대시보드에서 session, tool, task, subagent, metrics를 표시한다.
- OTel을 연결해 운영 메트릭을 확장한다.

따라서 본 요구는 **직접 구현 가능한 범위**에 해당하며, 1차 목표는 **원격 모니터링용 웹 서비스**로 정의하는 것이 적절하다.

---

## 부록 A. 권장 폴더 구조

```text
claude-code-monitor/
├── apps/
│   ├── api/
│   │   ├── main.py
│   │   ├── routes/
│   │   │   ├── hooks.py
│   │   │   ├── sessions.py
│   │   │   ├── metrics.py
│   │   │   └── stream.py
│   │   └── schemas/
│   └── web/
│       ├── app/
│       ├── components/
│       └── lib/
├── core/
│   ├── ingest/
│   ├── normalize/
│   ├── projection/
│   ├── notifier/
│   └── security/
├── storage/
│   ├── models.py
│   ├── sqlite.py
│   └── postgres.py
├── observability/
│   ├── logging.py
│   └── telemetry.py
├── docs/
│   └── CC-MON-ARCH-001.md
└── README.md
```

## 부록 B. 차기 문서 후보

다음 문서를 이어서 작성하는 것을 권장한다.

1. `CC-MON-REQ-001 요구사항 명세`
2. `CC-MON-DATA-001 이벤트/상태 데이터 스키마`
3. `CC-MON-API-001 API 명세`
4. `CC-MON-UI-001 모바일/웹 화면 명세`
5. `CC-MON-SEC-001 보안 및 배포 정책`

