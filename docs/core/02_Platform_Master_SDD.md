# 02. Platform Master SDD

## Architecture
```text
apps/web
packages/core
packages/casepack
packages/domain-packs
packages/runtime
packages/bridge
packages/ui-forge
packages/validation
supabase/migrations
tests
scripts
```

## Core Object Model
TASKFLOW-CX, CasePack-MAO, Bridge CasePack, Handoff Contract, CasePack Graph, Domain Pack, App Object.

## Runtime Flow
Resolve versioned object -> validate input -> build execution plan -> call provider -> validate output -> repair/fallback -> persist trace/usage -> sanitize public response.

Public endpoints must not expose raw internal objects.
