# 04. Repository Architecture Spec

## Structure
```text
/apps/web
/packages/core
/packages/casepack
/packages/domain-packs
/packages/runtime
/packages/bridge
/packages/ui-forge
/packages/validation
/supabase/migrations
/supabase/seed
/docs
/tests
/scripts
```

## Rules
Shared types/schemas in /packages/core. Runtime in /packages/runtime. UI rendering in /packages/ui-forge. Domain Pack logic in /packages/domain-packs. Next.js routes in /apps/web/app/api. Supabase migrations only in /supabase/migrations.

Dependency direction: core <- packages <- apps/web.
