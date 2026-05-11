-- =============================================================================
-- Migration: 20260502000003_casepacks.sql
-- CasePack catalogue entries and versioned bodies.
--
-- DESIGN NOTE — Two-table split:
--   casepacks          : public-safe metadata (key, status, visibility)
--   casepack_versions  : full pack body including FORBIDDEN columns
--
-- FORBIDDEN columns in casepack_versions (must never appear in public API):
--   casepack_json, manifest_json
-- These are blocked by RLS in migration 09.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- casepacks — catalogue metadata (safe to expose)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS casepacks (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULL means platform-level pack (not owned by any workspace).
  workspace_id uuid
    REFERENCES workspaces(id) ON DELETE SET NULL,

  -- Unique machine key. Format: casepack.<name>.v<version>
  -- e.g. "casepack.pr_statement.v1"
  key          text        NOT NULL UNIQUE,

  status       text        NOT NULL DEFAULT 'draft',

  -- visibility controls public discoverability.
  -- "public"    : any authenticated or anonymous user can see metadata
  -- "workspace" : only workspace members can see
  -- "private"   : only service role / owner can see
  visibility   text        NOT NULL DEFAULT 'workspace',

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT casepacks_key_format
    CHECK (key ~ '^casepack\.[a-z0-9_]+\.v[0-9]+$'),

  CONSTRAINT casepacks_status_values
    CHECK (status IN ('draft', 'published', 'deprecated', 'archived')),

  CONSTRAINT casepacks_visibility_values
    CHECK (visibility IN ('public', 'workspace', 'private'))
);

COMMENT ON TABLE casepacks IS
  'CasePack catalogue entry. Contains only public-safe metadata. '
  'The full pack body (including taskflow_cx, K_REF, runtime_contract) '
  'lives in casepack_versions.casepack_json and is FORBIDDEN from public exposure.';

COMMENT ON COLUMN casepacks.key IS
  'Stable, immutable pack identifier. Format: casepack.<name>.v<version>. '
  'Once published, the key must not change.';

-- ---------------------------------------------------------------------------
-- casepack_versions — versioned pack body (contains FORBIDDEN columns)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS casepack_versions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  casepack_id  uuid        NOT NULL
    REFERENCES casepacks(id) ON DELETE CASCADE,

  -- Semantic version string. e.g. "1.0.0"
  version      text        NOT NULL,

  -- FORBIDDEN PUBLIC KEY.
  -- Full CasePack-MAO object: taskflow_cx, input_contract, output_contract,
  -- runtime_contract, ui_schema, policy_pack, evals.
  -- Must NEVER be returned in a public API response.
  casepack_json jsonb      NOT NULL,

  -- FORBIDDEN PUBLIC KEY.
  -- Associated Domain Pack manifest snapshot at time of pack version creation.
  manifest_json jsonb,

  -- Only one version should be current per casepack.
  -- Enforced at application layer — no DB-level constraint to allow
  -- safe version rotation (set new current, then unset old).
  is_current   boolean     NOT NULL DEFAULT false,

  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT casepack_versions_unique_version
    UNIQUE (casepack_id, version)
);

COMMENT ON TABLE casepack_versions IS
  'Versioned CasePack body. '
  'WARNING: casepack_json and manifest_json are FORBIDDEN public keys. '
  'RLS blocks direct SELECT on this table for non-service-role callers.';

COMMENT ON COLUMN casepack_versions.casepack_json IS
  'FORBIDDEN PUBLIC KEY. Full CasePack-MAO JSON. '
  'Contains taskflow_cx (including K_REF), runtime_contract, model_policy. '
  'Access restricted to service role only via RLS.';
