# Claude Monitor

Claude Code 세션 모니터링 대시보드. Next.js 15 + better-sqlite3 + Drizzle ORM.

## Commands

```bash
npm run dev          # Dev server (default port 3000, PORT=3777 권장)
npm run build        # Production build
npm test             # Vitest 단위 테스트
npm run test:watch   # Vitest watch mode
npx tsx scripts/test-ingest.ts   # 테스트 데이터 주입
npx tsx scripts/generate-hooks-config.ts  # Claude Code hook 설정 생성
```

## Architecture

```
Claude Code Hooks → API Routes (/api/hooks/*) → Pipeline → SQLite (WAL) → SSE → Dashboard
```

- **src/server/pipeline.ts** — 메인 이벤트 수집 파이프라인 (raw → normalized → projection)
- **src/db/index.ts** — Lazy DB singleton (Proxy 패턴, Next.js build worker 충돌 방지)
- **src/db/schema.ts** — 8개 Drizzle 테이블 정의
- **src/server/hook-handler.ts** — 10개 hook 라우트 공유 핸들러
- **src/lib/types.ts** — Drizzle 스키마 기반 공유 타입
- **src/components/shared/nav.tsx** — 메인 네비게이션
- **src/app/globals.css** — 다크 테마 컬러 (.dark 블록)

## Key Patterns

- **DB는 Proxy로 lazy init** — `import { db } from '@/db'` 시 빌드 타임에 DB 연결 안됨
- **모든 페이지는 client-side fetch** — SSR DB 접근 대신 API 라우트 사용 (dev 모드 모듈 격리 이슈)
- **SSE로 실시간 업데이트** — WebSocket 아님, `/api/sse` 엔드포인트
- **tool_use_id는 hook에 없음** — `session_id:tool_name:timestamp_ms`로 생성
- **Pre→Post 도구 매칭** — 같은 session+tool_name+agentId의 가장 최근 running 도구
- **better-sqlite3 동기 API** — 이벤트당 <10ms

## UI

- 다크 모드 전용 (soft neutral gray)
- 폰트: IBM Plex Sans (본문) + JetBrains Mono (코드)
- 6개 화면: Dashboard, Tools, Tasks, Alerts, Events, Session Detail
- shadcn/ui + Tailwind CSS

## Testing

- Vitest, `src/__tests__/` 디렉토리
- `npx tsx scripts/test-ingest.ts`로 샘플 데이터 생성 후 UI 확인
