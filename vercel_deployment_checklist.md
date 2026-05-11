# Vercel 배포 완전 체크리스트

## 현재 상태 요약

| 구분 | 현황 |
|---|---|
| Next.js 앱 | ✅ 빌드 성공, 14 페이지 정적 생성 |
| Demo 페이지 (`/demo`, `/demo/apps`) | ✅ DB 없이 완전 동작 (Static) |
| 런타임 API (`/a/[slug]`, `/api/public/*`) | ⚠️ Supabase + AI 프로바이더 필요 |
| AI 어댑터 | ⚠️ 현재 `MockAIProvider` — 실제 OpenAI 교체 필요 |
| DB 마이그레이션 | ✅ 11개 SQL 파일 작성 완료, 미실행 상태 |
| 시드 데이터 | ✅ `pnpm seed:demo` 스크립트 작성 완료, 미실행 상태 |

---

## PHASE 1 — Supabase 프로젝트 설정

### 1-1. Supabase 프로젝트 생성
1. [supabase.com](https://supabase.com) → New Project
2. 리전: `ap-northeast-1` (Seoul, 권장) 또는 `ap-northeast-2`
3. DB 비밀번호 안전하게 보관

### 1-2. DB 마이그레이션 실행 (순서대로)

프로젝트의 `supabase/migrations/` 에 11개 SQL 파일이 있음.
**Supabase Dashboard → SQL Editor**에서 순서대로 실행:

```
20260502000001_extensions.sql       ← pg_crypto, uuid-ossp 등 익스텐션
20260502000002_workspaces.sql       ← workspace, workspace_members 테이블
20260502000003_casepacks.sql        ← casepacks, casepack_versions 테이블
20260502000004_apps_graphs.sql      ← apps, casepack_graphs, graph_versions 테이블
20260502000005_updated_at_trigger.sql ← 자동 updated_at 트리거
20260502000006_indexes.sql          ← 성능 인덱스
20260502000007_domain_packs.sql     ← domain_packs, domain_pack_assets 테이블
20260502000008_runtime_tables.sql   ← casepack_runs, graph_runs, node_runs, handoff_events 테이블
20260502000009_validation_tables.sql ← validation_results, runtime_trace_events, usage_events 테이블
20260502000010_rls.sql              ← Row Level Security 정책 (반드시 마지막)
```

> **중요**: `20260502000010_rls.sql`은 반드시 마지막에 실행해야 함.
> 앞의 테이블들이 모두 존재해야 RLS 정책이 적용됨.

### 1-3. Supabase CLI 사용 시 (선택 사항)
```bash
# Supabase CLI 설치
npm install -g supabase

# 로그인 및 프로젝트 연결
supabase login
supabase link --project-ref <your-project-ref>

# 마이그레이션 일괄 실행
supabase db push
```

---

## PHASE 2 — 환경변수 설정

### 2-1. `.env.local` (로컬 개발용)
```env
# ── Supabase ─────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# ── AI Provider ───────────────────────────────────────────────────────────
AI_PROVIDER=openai
AI_API_KEY=sk-...
AI_DEFAULT_MODEL=gpt-4o

# ── App ───────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Runtime (선택) ────────────────────────────────────────────────────────
SYSTEM_WORKSPACE_ID=<demo-workspace-uuid>   # seed:demo 실행 후 확인
```

### 2-2. Vercel 환경변수 설정
Vercel Dashboard → Project → Settings → **Environment Variables** 에 아래 값들을 입력:

| 키 | 값 위치 | 노출 범위 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | Public (브라우저 노출 가능) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon/public | Public (브라우저 노출 가능) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role | **Server-only (절대 공개 금지)** |
| `AI_PROVIDER` | `openai` | Server-only |
| `AI_API_KEY` | OpenAI Dashboard → API Keys | **Server-only (절대 공개 금지)** |
| `AI_DEFAULT_MODEL` | `gpt-4o` | Server-only |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` | Public |
| `SYSTEM_WORKSPACE_ID` | seed 실행 후 생성된 workspace UUID | Server-only |

> **주의**: `SUPABASE_SERVICE_ROLE_KEY`와 `AI_API_KEY`는 `NEXT_PUBLIC_` 접두사를 절대 붙이지 말 것.
> 붙이면 클라이언트 번들에 노출됨.

### 2-3. 키 조회 방법
```
Supabase → Project Settings → API:
  - Project URL      → NEXT_PUBLIC_SUPABASE_URL
  - anon (public)    → NEXT_PUBLIC_SUPABASE_ANON_KEY
  - service_role     → SUPABASE_SERVICE_ROLE_KEY (⚠️ 극비)
```

---

## PHASE 3 — 시드 데이터 투입

### 3-1. 데모 데이터 시드 실행
DB 마이그레이션 완료 후 로컬에서 실행:
```bash
# .env.local에 Supabase 환경변수 설정 후
pnpm seed:demo
```

이 스크립트가 수행하는 작업:
- Demo Workspace 생성 (`cognitive-forge-demo`)
- 3개 Domain Pack 삽입 (Corporate PR, Book-to-Agent, AI Training)
- 15개 CasePack + 버전 삽입
- 3개 Graph + 버전 삽입
- 4개 App 삽입 (public visibility)

### 3-2. SYSTEM_WORKSPACE_ID 확인
```sql
-- Supabase SQL Editor에서 실행
SELECT id, slug FROM workspaces WHERE slug = 'cognitive-forge-demo';
```
반환된 UUID를 `SYSTEM_WORKSPACE_ID` 환경변수에 설정.

---

## PHASE 4 — AI 어댑터 실제 연동 (중요)

### 현재 상태
`apps/web/lib/api/runtime-factory.ts` 의 `createRuntimeComponents()` 함수가
**MockAIProvider**를 사용 중 → 실제 AI 호출이 없어 `mock-output-map.json`의 고정 응답만 반환.

### 실제 OpenAI 연동 방법
`apps/web/lib/api/runtime-factory.ts`를 수정:

```typescript
// 현재 (Mock):
const adapter = new MockAIProvider(MOCK_OUTPUT_MAP, 0);

// 변경 후 (Live OpenAI):
import { OpenAIAdapter } from "@cognitive-forge/runtime";

const adapter = process.env.AI_PROVIDER === "openai"
  ? new OpenAIAdapter({
      apiKey: process.env.AI_API_KEY!,
      defaultModel: process.env.AI_DEFAULT_MODEL ?? "gpt-4o",
    })
  : new MockAIProvider(MOCK_OUTPUT_MAP, 0);
```

> **참고**: `OpenAIAdapter`가 `@cognitive-forge/runtime` 패키지에 아직 구현되지 않은 경우
> Sprint 08 작업으로 별도 구현 필요.

---

## PHASE 5 — Vercel 배포 설정

### 5-1. `vercel.json` 생성 (필요 시)
```json
{
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "outputDirectory": "apps/web/.next"
}
```

### 5-2. Vercel 프로젝트 설정
```
Framework Preset: Next.js
Root Directory: apps/web
Build Command: cd ../.. && pnpm build (또는 turbo build)
Output Directory: .next
Install Command: pnpm install
Node.js Version: 20.x (권장)
```

> **Monorepo 주의**: Vercel은 `apps/web`을 Root Directory로 설정하거나,
> root의 `vercel.json`에서 빌드 커맨드를 오버라이드해야 함.

### 5-3. Vercel Monorepo 지원 방법 (권장)

**옵션 A: Root Directory 방식**
- Vercel 프로젝트 설정 → Root Directory → `apps/web`
- Build Command: `cd ../.. && pnpm build --filter=@cognitive-forge/web`

**옵션 B: `vercel.json` in root**
```json
{
  "buildCommand": "pnpm --filter @cognitive-forge/web build",
  "installCommand": "pnpm install",
  "outputDirectory": "apps/web/.next"
}
```

### 5-4. Supabase CORS 설정
Supabase Dashboard → Authentication → URL Configuration:
```
Site URL: https://your-domain.vercel.app
Redirect URLs:
  https://your-domain.vercel.app/**
  http://localhost:3000/**
```

---

## PHASE 6 — 배포 후 검증

### 6-1. 필수 동작 체크
```
□ /demo          → 정상 렌더링 (DB 불필요)
□ /demo/apps     → 정상 렌더링 (DB 불필요)
□ /demo/apps/corporate-pr-suite → 데모 실행 가능
□ /a/corporate-pr-suite → 앱 페이지 표시 (DB 필요)
□ /api/health    → { status: "ok" } 응답
□ POST /api/public/apps/corporate-pr-suite/run → 실제 AI 응답 반환
□ POST /api/public/apps/ai-training-practice-suite/graph-run → 3-node 실행
```

### 6-2. 헬스체크 엔드포인트 확인
```bash
curl https://your-domain.vercel.app/api/health
```

---

## PHASE 7 — 향후 추가 작업 (선택)

| 항목 | 설명 | 우선순위 |
|---|---|---|
| **OpenAI Adapter 구현** | `@cognitive-forge/runtime`에 실제 OpenAI API 어댑터 추가 | ★★★ |
| **Rate Limiting** | Vercel Edge Config 또는 Upstash Redis로 API 요청 제한 | ★★★ |
| **인증 연동** | Supabase Auth로 workspace 로그인 구현 | ★★☆ |
| **Custom Domain** | Vercel → Settings → Domains | ★★☆ |
| **Error Monitoring** | Sentry 연동 (`NEXT_PUBLIC_SENTRY_DSN`) | ★★☆ |
| **Usage 대시보드** | `usage_events` 테이블 기반 관리자 대시보드 | ★☆☆ |
| **AI 비용 모니터링** | OpenAI Usage API + Vercel Analytics | ★☆☆ |

---

## 빠른 시작 요약 (순서)

```
1. Supabase 프로젝트 생성
2. SQL Editor에서 migrations/001~010 순서대로 실행
3. Supabase API 키 3개 복사
4. OpenAI API 키 발급
5. .env.local 작성 → pnpm seed:demo 실행
6. SYSTEM_WORKSPACE_ID 확인 후 .env.local에 추가
7. runtime-factory.ts에서 OpenAIAdapter로 교체 (Sprint 08)
8. Vercel에 환경변수 6개 설정
9. Vercel 배포 (GitHub 연동 또는 `vercel deploy`)
10. /api/health, /a/corporate-pr-suite 동작 확인
```
