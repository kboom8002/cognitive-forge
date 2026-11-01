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
pnpm build             # Build all packages and apps
pnpm typecheck         # TypeScript check across all workspaces
pnpm test              # Run Vitest test suite
pnpm fixtures:validate # Validate all 37 fixture JSONs against Zod schemas
pnpm smoke:runtime     # Run in-memory SingleCasePack + SequentialGraph smoke check
pnpm smoke:api         # Run API health & management auth guard smoke check
pnpm smoke:security    # Run public no-leak sanitizer smoke check
pnpm release:check     # Run all commercial release gates
pnpm dev               # Start Next.js dev server
```

## Sprint Sequence

| Sprint | Name | Status |
|--------|------|--------|
| 00 | Repo Bootstrap | ✅ Complete |
| 01 | Core Types & Object Schemas | ✅ Complete |
| 02 | Database / RLS | ✅ Complete |
| 03 | CasePack + Domain Pack Registry | ✅ Complete |
| 04 | Seed Fixtures | ✅ Complete |
| 05 | UI Forge MVP | ✅ Complete |
| 06 | Runtime MVP | ✅ Complete |
| 07 | Bridge / Graph MVP | ✅ Complete |
| 08 | Corporate PR Pack | ✅ Complete |
| 09 | Book-to-Agent Pack | ✅ Complete |
| 10 | AI Training Practice Pack | ✅ Complete |
| 11 | E2E / Security / Release | ✅ Complete ← **current** |

## Documentation

See `/docs/README_INDEX.md` for the full documentation index.
