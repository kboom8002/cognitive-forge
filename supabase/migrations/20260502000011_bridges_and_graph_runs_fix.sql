-- =============================================================================
-- Migration: 20260502000011_bridges_and_graph_runs_fix.sql
--
-- 1. Creates bridge_versions table for BridgeCasePack definitions (bridge.*).
--    Resolves the runtime lookup in POST /api/public/apps/:slug/graph-run
--    and allows scripts/seed-demo.ts to persist all 12 P0 bridge fixtures.
-- 2. Adds missing columns (input_json, final_output_json, node_count) and
--    'partial' status value to graph_runs to match SupabaseGraphRunStore and
--    GET /api/public/graph-runs/:id.
-- 3. Expands apps_visibility_values CHECK constraint to include 'unlisted' to
--    match public route visibility checks.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. bridge_versions — versioned BridgeCasePack bodies (FORBIDDEN public key)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bridge_versions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULL means platform-level bridge (not owned by any workspace).
  workspace_id uuid
    REFERENCES workspaces(id) ON DELETE SET NULL,

  -- Bridge identifier. Format: bridge.<name>.v<version>
  bridge_key   text        NOT NULL,

  -- Semantic version string. e.g. "1.0.0"
  version      text        NOT NULL,

  status       text        NOT NULL DEFAULT 'published',

  -- FORBIDDEN PUBLIC KEY.
  -- Full BridgeCasePack JSON: source_casepack_key, target_casepack_key,
  -- handoff_contract, context_checkpoint, validation_policy.
  bridge_json  jsonb       NOT NULL,

  is_current   boolean     NOT NULL DEFAULT false,

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT bridge_versions_key_format
    CHECK (bridge_key ~ '^bridge\.[a-z0-9_]+\.v[0-9]+$'),

  CONSTRAINT bridge_versions_status_values
    CHECK (status IN ('draft', 'published', 'deprecated', 'archived')),

  CONSTRAINT bridge_versions_unique
    UNIQUE (bridge_key, version)
);

COMMENT ON TABLE bridge_versions IS
  'Versioned BridgeCasePack definitions. '
  'WARNING: bridge_json contains internal handoff mappings and checkpoint rules '
  '(FORBIDDEN from public exposure). Access restricted to service role only via RLS.';

COMMENT ON COLUMN bridge_versions.bridge_json IS
  'FORBIDDEN PUBLIC KEY. Full BridgeCasePack JSON.';

CREATE INDEX IF NOT EXISTS idx_bridge_versions_key_current
  ON bridge_versions (bridge_key, is_current);

CREATE TRIGGER trg_bridge_versions_updated_at
  BEFORE UPDATE ON bridge_versions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Enable RLS with NO SELECT policy -> default-deny for non-service-role callers.
ALTER TABLE bridge_versions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. graph_runs — add missing columns and 'partial' status constraint
-- ---------------------------------------------------------------------------
ALTER TABLE graph_runs
  ADD COLUMN IF NOT EXISTS input_json        jsonb   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS final_output_json jsonb,
  ADD COLUMN IF NOT EXISTS node_count        integer;

ALTER TABLE graph_runs
  DROP CONSTRAINT IF EXISTS graph_runs_status;

ALTER TABLE graph_runs
  ADD CONSTRAINT graph_runs_status
    CHECK (status IN ('pending', 'running', 'success', 'failed', 'repaired', 'timeout', 'partial'));

-- ---------------------------------------------------------------------------
-- 3. apps — allow 'unlisted' visibility in DB constraint
-- ---------------------------------------------------------------------------
ALTER TABLE apps
  DROP CONSTRAINT IF EXISTS apps_visibility_values;

ALTER TABLE apps
  ADD CONSTRAINT apps_visibility_values
    CHECK (visibility IN ('public', 'unlisted', 'workspace', 'private'));
