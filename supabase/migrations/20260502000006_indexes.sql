-- =============================================================================
-- Migration: 20260502000006_indexes.sql
-- Performance indexes for workspaces, casepacks, graphs, and apps tables.
--
-- All indexes use IF NOT EXISTS to allow safe re-application.
-- Partial indexes are used where the predicate eliminates the majority of rows
-- (e.g. is_current = true, visibility = 'public').
-- =============================================================================

-- ---------------------------------------------------------------------------
-- workspaces
-- ---------------------------------------------------------------------------

-- Primary lookup by slug (used in routing and API path resolution)
CREATE INDEX IF NOT EXISTS idx_workspaces_slug
  ON workspaces (slug);

-- ---------------------------------------------------------------------------
-- workspace_members
-- ---------------------------------------------------------------------------

-- Membership check by workspace (most common RLS query pattern)
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id
  ON workspace_members (workspace_id);

-- Lookup all workspaces for a given user (e.g. workspace switcher)
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id
  ON workspace_members (user_id);

-- Composite for is_workspace_member() / has_workspace_role() SECURITY DEFINER functions
CREATE INDEX IF NOT EXISTS idx_workspace_members_ws_user
  ON workspace_members (workspace_id, user_id);

-- ---------------------------------------------------------------------------
-- casepacks
-- ---------------------------------------------------------------------------

-- Key lookup (most frequent — resolves a casepack from its string key)
CREATE INDEX IF NOT EXISTS idx_casepacks_key
  ON casepacks (key);

-- Workspace-scoped pack listing with status filter (admin UI, pack catalogue)
CREATE INDEX IF NOT EXISTS idx_casepacks_workspace_status
  ON casepacks (workspace_id, status);

-- Public pack discovery (anonymous / unauthenticated app browsing)
CREATE INDEX IF NOT EXISTS idx_casepacks_visibility
  ON casepacks (visibility)
  WHERE visibility = 'public';

-- ---------------------------------------------------------------------------
-- casepack_versions
-- ---------------------------------------------------------------------------

-- All versions for a given pack (version history listing)
CREATE INDEX IF NOT EXISTS idx_casepack_versions_casepack_id
  ON casepack_versions (casepack_id);

-- Partial index: fetch the current version of a pack efficiently
-- Used by the runtime engine on every CasePack execution
CREATE INDEX IF NOT EXISTS idx_casepack_versions_current
  ON casepack_versions (casepack_id)
  WHERE is_current = true;

-- ---------------------------------------------------------------------------
-- casepack_graphs
-- ---------------------------------------------------------------------------

-- Key lookup
CREATE INDEX IF NOT EXISTS idx_casepack_graphs_key
  ON casepack_graphs (key);

-- Workspace-scoped graph listing
CREATE INDEX IF NOT EXISTS idx_casepack_graphs_workspace_status
  ON casepack_graphs (workspace_id, status);

-- ---------------------------------------------------------------------------
-- graph_versions
-- ---------------------------------------------------------------------------

-- All versions for a given graph
CREATE INDEX IF NOT EXISTS idx_graph_versions_graph_id
  ON graph_versions (graph_id);

-- Partial index: current graph version fetch (used by SequentialGraphRunner)
CREATE INDEX IF NOT EXISTS idx_graph_versions_current
  ON graph_versions (graph_id)
  WHERE is_current = true;

-- ---------------------------------------------------------------------------
-- apps
-- ---------------------------------------------------------------------------

-- Slug lookup — the primary routing key for /a/<slug>
CREATE INDEX IF NOT EXISTS idx_apps_slug
  ON apps (slug);

-- Workspace-scoped app listing (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_apps_workspace_visibility
  ON apps (workspace_id, visibility);

-- Public app discovery (anonymous browsing, app catalogue)
CREATE INDEX IF NOT EXISTS idx_apps_visibility_public
  ON apps (visibility)
  WHERE visibility = 'public';

-- Type-based filtering (e.g. list all graph apps in a workspace)
CREATE INDEX IF NOT EXISTS idx_apps_type
  ON apps (type);

-- Pack membership (find all apps belonging to a domain pack)
CREATE INDEX IF NOT EXISTS idx_apps_pack_key
  ON apps (pack_key)
  WHERE pack_key IS NOT NULL;
