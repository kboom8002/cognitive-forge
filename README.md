# Cognitive Forge / Cognitive OS

**Knowledge-to-AI-App platform.** Converts domain knowledge into contract-driven AI micro-apps.

```
Domain Pack → App → CasePack or Graph → Runtime → Validated Output → Trace / Usage
```

## Monorepo Structure

```
apps/
  web/                   # Next.js 15 App Router — public UI
packages/
  core/                  # Shared types, schemas, and Zod validators
  casepack/              # CasePack-MAO definition and versioning logic
  domain-packs/          # Domain Pack manifests and asset registry
  runtime/               # CasePackRunner, AIProviderAdapter, trace/usage
  bridge/                # BridgeRunner, SequentialGraphRunner
  ui-forge/              # DynamicForm, OutputCard, CompositeAppRenderer
  validation/            # Input/output contract validators, sanitizers
supabase/
  migrations/            # Database schema migrations (Sprint 02)
  seed/                  # Demo seed fixtures (Sprint 04)
tests/                   # Integration and smoke tests
scripts/                 # CLI tools: fixtures:validate, seed:demo, etc.
docs/                    # Platform documentation (read-only)
```

## Dependency Direction

```
core ← packages/* ← apps/web
```

## Setup

```bash
# Prerequisites: Node >= 20, pnpm >= 9
cp .env.example .env.local
# Fill in SUPABASE_* and AI_API_KEY

pnpm install
pnpm dev          # Start Next.js dev server on localhost:3000
```

## Scripts

```bash
pnpm build        # Build all packages and apps
pnpm typecheck    # TypeScript check across all workspaces
pnpm test         # Run Vitest test suite
pnpm dev          # Start Next.js dev server
```

## Sprint Sequence

| Sprint | Name |
|--------|------|
| 00 | Repo Bootstrap ← **current** |
| 01 | Core Types & Object Schemas |
| 02 | Database / RLS |
| 03 | CasePack + Domain Pack Registry |
| 04 | Seed Fixtures |
| 05 | UI Forge MVP |
| 06 | Runtime MVP |
| 07 | Bridge / Graph MVP |
| 08 | Corporate PR Pack |
| 09 | Book-to-Agent Pack |
| 10 | AI Training Practice Pack |
| 11 | E2E / Security / Release |

## Documentation

See `/docs/README_INDEX.md` for the full documentation index.
