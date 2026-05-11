-- =============================================================================
-- Migration: 20260502000005_updated_at_trigger.sql
-- Shared trigger function that keeps updated_at current on every UPDATE.
-- Applied to all tables that declare an updated_at column.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Trigger function (shared — defined once, referenced by many triggers)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_updated_at() IS
  'Sets updated_at = now() on every row update. '
  'Attached as a BEFORE UPDATE trigger to all tables with an updated_at column.';

-- ---------------------------------------------------------------------------
-- Apply trigger to workspace tables
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- workspace_members has joined_at, not updated_at — no trigger needed

-- ---------------------------------------------------------------------------
-- Apply trigger to pack tables
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_casepacks_updated_at
  BEFORE UPDATE ON casepacks
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- casepack_versions is append-only (no updates) — no trigger needed

-- ---------------------------------------------------------------------------
-- Apply trigger to graph tables
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_casepack_graphs_updated_at
  BEFORE UPDATE ON casepack_graphs
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- graph_versions is append-only — no trigger needed

-- ---------------------------------------------------------------------------
-- Apply trigger to app table
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_apps_updated_at
  BEFORE UPDATE ON apps
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
