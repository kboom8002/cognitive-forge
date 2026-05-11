-- =============================================================================
-- Migration: 20260502000002_workspaces.sql
-- Top-level tenant table and membership/RBAC table.
-- All workspace-scoped data foreign-keys to workspaces(id).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- workspaces
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workspaces (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- URL-safe identifier, unique platform-wide.
  -- Format: lowercase alphanumeric segments joined by hyphens.
  slug         text        NOT NULL UNIQUE,

  display_name text        NOT NULL,

  -- Billing plan. Drives feature gating in application layer.
  plan         text        NOT NULL DEFAULT 'free',

  -- Arbitrary workspace configuration (themes, feature flags, etc.)
  settings     jsonb       NOT NULL DEFAULT '{}',

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  -- Slug format: lowercase alphanumeric with hyphens, no leading/trailing hyphens
  CONSTRAINT workspaces_slug_format
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),

  CONSTRAINT workspaces_plan_values
    CHECK (plan IN ('free', 'pro', 'enterprise'))
);

COMMENT ON TABLE workspaces IS
  'Top-level tenant boundary. All workspace-scoped tables foreign-key here. '
  'Row-level security enforced: members can only access their own workspace.';

COMMENT ON COLUMN workspaces.slug IS
  'URL-safe slug used in routing and API paths. Immutable after creation.';

COMMENT ON COLUMN workspaces.settings IS
  'Workspace-level configuration (theme, feature flags, etc.). '
  'Safe to expose to workspace members.';

-- ---------------------------------------------------------------------------
-- workspace_members
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workspace_members (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id uuid        NOT NULL
    REFERENCES workspaces(id) ON DELETE CASCADE,

  -- References auth.users provided by Supabase Auth.
  user_id      uuid        NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role hierarchy: owner > admin > member
  -- Enforced in RLS helper has_workspace_role().
  role         text        NOT NULL DEFAULT 'member',

  joined_at    timestamptz NOT NULL DEFAULT now(),

  -- A user can only be a member of a workspace once.
  CONSTRAINT workspace_members_unique_pair
    UNIQUE (workspace_id, user_id),

  CONSTRAINT workspace_members_role_values
    CHECK (role IN ('member', 'admin', 'owner'))
);

COMMENT ON TABLE workspace_members IS
  'Membership and RBAC for workspace access. '
  'RLS helper is_workspace_member() queries this table via SECURITY DEFINER.';

COMMENT ON COLUMN workspace_members.role IS
  'owner: full control including member management and deletion. '
  'admin: can manage packs, apps, and non-owner members. '
  'member: read/run access only.';
