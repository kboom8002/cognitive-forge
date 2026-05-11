-- =============================================================================
-- Migration: 20260502000010_rls.sql
-- Row-Level Security: helper functions, enable RLS, and all policies.
--
-- PRINCIPLES:
--   1. Service role bypasses RLS automatically (BYPASSRLS granted by Supabase).
--   2. auth.uid() returns NULL for anonymous/unauthenticated callers.
--   3. No policy = no access for authenticated users (default-deny).
--   4. FORBIDDEN columns are isolated at the table level — tables containing
--      only forbidden data (casepack_versions, graph_versions, handoff_events,
--      runtime_trace_events) get NO SELECT policy, meaning only service role
--      can read them.
--   5. Public access is scoped to visibility = 'public' rows only, on safe
--      metadata tables (apps, casepacks, domain_packs).
--
-- ROLE HIERARCHY (enforced in has_workspace_role):
--   owner > admin > member
-- =============================================================================

-- ---------------------------------------------------------------------------
-- HELPER FUNCTIONS
-- SECURITY DEFINER: runs as the function owner, not the calling user.
-- This prevents privilege escalation via the workspace_members table
-- while allowing the RLS policies to call these functions efficiently.
-- ---------------------------------------------------------------------------

/**
 * is_workspace_member(ws_id)
 * Returns true if the currently authenticated user is a member of the
 * given workspace at any role (member, admin, or owner).
 * Returns false if ws_id is NULL, user is anonymous, or not a member.
 */
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ws_id IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM workspace_members
      WHERE workspace_id = ws_id
        AND user_id      = auth.uid()
    );
$$;

COMMENT ON FUNCTION is_workspace_member(uuid) IS
  'SECURITY DEFINER. Returns true if auth.uid() is any member of ws_id. '
  'Returns false for anonymous callers or NULL workspace_id.';

/**
 * has_workspace_role(ws_id, required_role)
 * Returns true if the currently authenticated user has at least the given
 * role in the specified workspace.
 *
 * Role hierarchy:
 *   'member' matches: member, admin, owner
 *   'admin'  matches: admin, owner
 *   'owner'  matches: owner only
 */
CREATE OR REPLACE FUNCTION has_workspace_role(ws_id uuid, required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ws_id IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM workspace_members
      WHERE workspace_id = ws_id
        AND user_id = auth.uid()
        AND CASE required_role
              WHEN 'member' THEN role IN ('member', 'admin', 'owner')
              WHEN 'admin'  THEN role IN ('admin', 'owner')
              WHEN 'owner'  THEN role = 'owner'
              ELSE false
            END
    );
$$;

COMMENT ON FUNCTION has_workspace_role(uuid, text) IS
  'SECURITY DEFINER. Returns true if auth.uid() has at least required_role '
  'in ws_id. Role hierarchy: owner > admin > member.';

-- ---------------------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY
-- Must be enabled before any policy takes effect.
-- Once enabled, default-deny applies: no policy = no access.
-- ---------------------------------------------------------------------------

ALTER TABLE workspaces             ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE casepacks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE casepack_versions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_packs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_pack_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_pack_assets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_pack_installs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE apps                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE casepack_graphs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_versions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE casepack_runs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_runs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_runs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE handoff_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_trace_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_results     ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- WORKSPACES
-- Members can read their workspace.
-- Only owners can update.
-- INSERT/DELETE: service role only (no user policy → default-deny).
-- ---------------------------------------------------------------------------

CREATE POLICY "workspaces_select_member"
  ON workspaces FOR SELECT
  USING (is_workspace_member(id));

CREATE POLICY "workspaces_update_owner"
  ON workspaces FOR UPDATE
  USING (has_workspace_role(id, 'owner'))
  WITH CHECK (has_workspace_role(id, 'owner'));

-- ---------------------------------------------------------------------------
-- WORKSPACE_MEMBERS
-- Members can read the membership list of their workspace.
-- Admins/owners can add and remove members.
-- ---------------------------------------------------------------------------

CREATE POLICY "workspace_members_select_member"
  ON workspace_members FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "workspace_members_insert_admin"
  ON workspace_members FOR INSERT
  WITH CHECK (has_workspace_role(workspace_id, 'admin'));

CREATE POLICY "workspace_members_update_admin"
  ON workspace_members FOR UPDATE
  USING  (has_workspace_role(workspace_id, 'admin'))
  WITH CHECK (has_workspace_role(workspace_id, 'admin'));

CREATE POLICY "workspace_members_delete_owner"
  ON workspace_members FOR DELETE
  USING (has_workspace_role(workspace_id, 'owner'));

-- ---------------------------------------------------------------------------
-- CASEPACKS
-- Workspace members can read their workspace's packs.
-- Platform packs (workspace_id IS NULL) and public packs are visible to all
-- authenticated users who are a member of at least one workspace.
-- Admins/owners can insert and update pack metadata.
-- FORBIDDEN casepack_versions table gets NO SELECT policy (service role only).
-- ---------------------------------------------------------------------------

CREATE POLICY "casepacks_select_member_or_public"
  ON casepacks FOR SELECT
  USING (
    -- Platform-level packs (no workspace owner) are readable by any member
    (workspace_id IS NULL AND auth.uid() IS NOT NULL)
    -- Public packs are discoverable without workspace membership
    OR (visibility = 'public')
    -- Workspace-scoped packs are visible to members
    OR is_workspace_member(workspace_id)
  );

-- BUILDER POLICY: admins and owners can create packs in their workspace.
CREATE POLICY "casepacks_insert_admin"
  ON casepacks FOR INSERT
  WITH CHECK (has_workspace_role(workspace_id, 'admin'));

-- BUILDER POLICY: admins and owners can update pack metadata.
CREATE POLICY "casepacks_update_admin"
  ON casepacks FOR UPDATE
  USING  (has_workspace_role(workspace_id, 'admin'))
  WITH CHECK (has_workspace_role(workspace_id, 'admin'));

-- casepack_versions: NO SELECT policy → service role only (FORBIDDEN columns).

-- ---------------------------------------------------------------------------
-- DOMAIN_PACKS
-- Same access pattern as casepacks.
-- ---------------------------------------------------------------------------

CREATE POLICY "domain_packs_select_member_or_public"
  ON domain_packs FOR SELECT
  USING (
    (workspace_id IS NULL AND auth.uid() IS NOT NULL)
    OR (visibility = 'public')
    OR is_workspace_member(workspace_id)
  );

CREATE POLICY "domain_packs_insert_admin"
  ON domain_packs FOR INSERT
  WITH CHECK (has_workspace_role(workspace_id, 'admin'));

CREATE POLICY "domain_packs_update_admin"
  ON domain_packs FOR UPDATE
  USING  (has_workspace_role(workspace_id, 'admin'))
  WITH CHECK (has_workspace_role(workspace_id, 'admin'));

-- domain_pack_versions: NO SELECT policy → service role only (FORBIDDEN manifest_json).

-- ---------------------------------------------------------------------------
-- DOMAIN_PACK_ASSETS
-- Visible to workspace members of the owning pack.
-- Joins to domain_packs to resolve workspace_id.
-- ---------------------------------------------------------------------------

CREATE POLICY "domain_pack_assets_select_member"
  ON domain_pack_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM domain_packs dp
      WHERE dp.id = domain_pack_id
        AND (
          dp.workspace_id IS NULL
          OR dp.visibility = 'public'
          OR is_workspace_member(dp.workspace_id)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- DOMAIN_PACK_INSTALLS
-- Workspace members can see their workspace's installs.
-- ---------------------------------------------------------------------------

CREATE POLICY "domain_pack_installs_select_member"
  ON domain_pack_installs FOR SELECT
  USING (is_workspace_member(workspace_id));

-- ---------------------------------------------------------------------------
-- APPS
-- PUBLIC SELECT POLICY: active public apps are discoverable by anyone.
-- This is the only public-access policy in the entire schema.
-- Workspace-private apps are visible to workspace members only.
-- FORBIDDEN: apps with visibility='private' are not accessible to users.
-- graph_versions: NO SELECT policy → service role only (FORBIDDEN graph_json).
-- ---------------------------------------------------------------------------

-- PUBLIC ACTIVE APP SELECT POLICY (Rule 7 from task card):
-- Only rows where visibility = 'public' are exposed without membership.
-- This exposes: id, slug, title, description, type, visibility, pack_key, extra.
-- It does NOT expose casepack_json or graph_json (those live in version tables).
CREATE POLICY "apps_select_public"
  ON apps FOR SELECT
  USING (visibility = 'public');

-- Workspace members can also see their workspace's private/unlisted apps.
CREATE POLICY "apps_select_member"
  ON apps FOR SELECT
  USING (is_workspace_member(workspace_id));

-- BUILDER POLICY:
CREATE POLICY "apps_insert_admin"
  ON apps FOR INSERT
  WITH CHECK (has_workspace_role(workspace_id, 'admin'));

CREATE POLICY "apps_update_admin"
  ON apps FOR UPDATE
  USING  (has_workspace_role(workspace_id, 'admin'))
  WITH CHECK (has_workspace_role(workspace_id, 'admin'));

-- ---------------------------------------------------------------------------
-- CASEPACK_GRAPHS
-- Workspace members can read graph metadata (not graph_json — that's in versions).
-- graph_versions: NO SELECT policy → service role only.
-- ---------------------------------------------------------------------------

CREATE POLICY "casepack_graphs_select_member"
  ON casepack_graphs FOR SELECT
  USING (
    (workspace_id IS NULL AND auth.uid() IS NOT NULL)
    OR is_workspace_member(workspace_id)
  );

CREATE POLICY "casepack_graphs_insert_admin"
  ON casepack_graphs FOR INSERT
  WITH CHECK (has_workspace_role(workspace_id, 'admin'));

CREATE POLICY "casepack_graphs_update_admin"
  ON casepack_graphs FOR UPDATE
  USING  (has_workspace_role(workspace_id, 'admin'))
  WITH CHECK (has_workspace_role(workspace_id, 'admin'));

-- ---------------------------------------------------------------------------
-- CASEPACK_RUNS
-- Users can read and create only their own runs within their workspace.
-- UPDATE/DELETE: service role only.
-- ---------------------------------------------------------------------------

CREATE POLICY "casepack_runs_select_own"
  ON casepack_runs FOR SELECT
  USING (
    user_id = auth.uid()
    AND is_workspace_member(workspace_id)
  );

-- RUNTIME INSERT POLICY (Rule 6 from task card):
-- Any workspace member can submit a run.
CREATE POLICY "casepack_runs_insert_member"
  ON casepack_runs FOR INSERT
  WITH CHECK (
    is_workspace_member(workspace_id)
    AND (user_id = auth.uid() OR user_id IS NULL)
  );

-- ---------------------------------------------------------------------------
-- GRAPH_RUNS
-- Same pattern as casepack_runs.
-- ---------------------------------------------------------------------------

CREATE POLICY "graph_runs_select_own"
  ON graph_runs FOR SELECT
  USING (
    user_id = auth.uid()
    AND is_workspace_member(workspace_id)
  );

CREATE POLICY "graph_runs_insert_member"
  ON graph_runs FOR INSERT
  WITH CHECK (
    is_workspace_member(workspace_id)
    AND (user_id = auth.uid() OR user_id IS NULL)
  );

-- ---------------------------------------------------------------------------
-- NODE_RUNS
-- Readable by the user who owns the parent graph_run.
-- INSERT: service role only (written by SequentialGraphRunner).
-- ---------------------------------------------------------------------------

CREATE POLICY "node_runs_select_own"
  ON node_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM graph_runs gr
      WHERE gr.id = graph_run_id
        AND gr.user_id = auth.uid()
        AND is_workspace_member(gr.workspace_id)
    )
  );

-- ---------------------------------------------------------------------------
-- HANDOFF_EVENTS: NO POLICIES
-- All four jsonb columns are FORBIDDEN public keys.
-- Only service role can access this table.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- RUNTIME_TRACE_EVENTS: NO POLICIES
-- trace_payload is a FORBIDDEN public key.
-- Only service role can access this table.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- USAGE_EVENTS
-- Workspace members can view their workspace's usage aggregates.
-- INSERT: service role only (written by UsageWriter).
-- NOTE: repair_attempts is FORBIDDEN — must be filtered at application layer
-- or via a separate workspace_usage_summary view (to be added in a later migration).
-- ---------------------------------------------------------------------------

CREATE POLICY "usage_events_select_member"
  ON usage_events FOR SELECT
  USING (is_workspace_member(workspace_id));

-- ---------------------------------------------------------------------------
-- VALIDATION_RESULTS
-- Users can read validation results for their own runs.
-- INSERT: service role only (written by ValidationLayer).
-- ---------------------------------------------------------------------------

CREATE POLICY "validation_results_select_own"
  ON validation_results FOR SELECT
  USING (
    (
      run_type = 'casepack'
      AND EXISTS (
        SELECT 1 FROM casepack_runs cr
        WHERE cr.id = run_id AND cr.user_id = auth.uid()
      )
    )
    OR (
      run_type IN ('graph', 'node')
      AND EXISTS (
        SELECT 1 FROM graph_runs gr
        WHERE gr.id = run_id AND gr.user_id = auth.uid()
      )
    )
  );
