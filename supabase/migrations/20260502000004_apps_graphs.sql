-- =============================================================================
-- Migration: 20260502000004_apps_graphs.sql
-- CasePack Graphs, versioned graph bodies, and App Objects.
--
-- DESIGN NOTE — Three-table structure:
--   casepack_graphs  : DAG metadata (safe: entry_node, final_nodes, key)
--   graph_versions   : full graph body (FORBIDDEN: graph_json)
--   apps             : deployable AI application at /a/<slug>
--                      supports both casepack and graph types (XOR enforced)
--
-- FORBIDDEN columns:
--   graph_versions.graph_json  — FORBIDDEN public key
-- =============================================================================

-- ---------------------------------------------------------------------------
-- casepack_graphs — graph DAG metadata (safe to expose)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS casepack_graphs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULL means platform-level graph.
  workspace_id uuid
    REFERENCES workspaces(id) ON DELETE SET NULL,

  -- Unique machine key. Format: graph.<name>.v<version>
  -- e.g. "graph.corporate_pr_suite.v1"
  key          text        NOT NULL UNIQUE,

  status       text        NOT NULL DEFAULT 'draft',

  -- The node id of the first CasePack to execute in the graph.
  -- References a node id defined inside graph_versions.graph_json.
  -- Denormalised here for fast routing without loading the full graph body.
  entry_node   text        NOT NULL,

  -- Array of node ids that produce terminal output.
  -- Must be non-empty — a graph with no exit is invalid.
  final_nodes  text[]      NOT NULL DEFAULT '{}',

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT casepack_graphs_key_format
    CHECK (key ~ '^graph\.[a-z0-9_]+\.v[0-9]+$'),

  CONSTRAINT casepack_graphs_status_values
    CHECK (status IN ('draft', 'published', 'deprecated', 'archived')),

  -- Enforce non-empty final_nodes at DB level.
  CONSTRAINT casepack_graphs_final_nodes_not_empty
    CHECK (cardinality(final_nodes) > 0)
);

COMMENT ON TABLE casepack_graphs IS
  'CasePack Graph DAG metadata. entry_node and final_nodes are denormalised '
  'for fast routing. The full node/edge definition lives in graph_versions.graph_json '
  '(FORBIDDEN public key).';

COMMENT ON COLUMN casepack_graphs.entry_node IS
  'Node id of the first CasePack to execute. Must match a node id in graph_json.nodes[].id.';

COMMENT ON COLUMN casepack_graphs.final_nodes IS
  'Array of terminal node ids. Must match node ids in graph_json.nodes[].id.';

-- ---------------------------------------------------------------------------
-- graph_versions — versioned graph body (contains FORBIDDEN columns)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS graph_versions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  graph_id     uuid        NOT NULL
    REFERENCES casepack_graphs(id) ON DELETE CASCADE,

  version      text        NOT NULL,

  -- FORBIDDEN PUBLIC KEY.
  -- Full CasePackGraphSchema JSON: nodes[], edges[], entry_node, final_nodes, metadata.
  -- Must NEVER be returned in a public API response.
  graph_json   jsonb       NOT NULL,

  -- Only one version should be current per graph.
  is_current   boolean     NOT NULL DEFAULT false,

  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT graph_versions_unique_version
    UNIQUE (graph_id, version)
);

COMMENT ON TABLE graph_versions IS
  'Versioned Graph body. '
  'WARNING: graph_json is a FORBIDDEN public key. '
  'Contains node definitions, edge definitions, and bridge references. '
  'Access restricted to service role only via RLS.';

-- ---------------------------------------------------------------------------
-- apps — deployable AI application entries (/a/<slug>)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS apps (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULL means platform-level app (not workspace-specific).
  workspace_id uuid
    REFERENCES workspaces(id) ON DELETE SET NULL,

  -- URL-safe slug used for routing: /a/<slug>
  -- Must be unique platform-wide.
  slug         text        NOT NULL UNIQUE,

  title        text        NOT NULL,
  description  text,

  -- "casepack" → executes a single CasePack (casepack_key required)
  -- "graph"    → executes a CasePackGraph  (graph_key required)
  type         text        NOT NULL,

  -- Populated when type = 'casepack'. Format: casepack.<name>.v<version>
  -- Must be NULL when type = 'graph'.
  casepack_key text,

  -- Populated when type = 'graph'. Format: graph.<name>.v<version>
  -- Must be NULL when type = 'casepack'.
  graph_key    text,

  -- Visibility controls who can access the app runner.
  visibility   text        NOT NULL DEFAULT 'workspace',

  -- The Domain Pack this app belongs to (if any). Format: pack.<name>.v<version>
  pack_key     text,

  -- Arbitrary metadata (icon_url, category, featured, etc.)
  extra        jsonb       NOT NULL DEFAULT '{}',

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT apps_slug_format
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),

  CONSTRAINT apps_type_values
    CHECK (type IN ('casepack', 'graph')),

  CONSTRAINT apps_visibility_values
    CHECK (visibility IN ('public', 'workspace', 'private')),

  -- XOR constraint (rule 5 from task card):
  --   type = 'casepack'  →  casepack_key NOT NULL  AND  graph_key IS NULL
  --   type = 'graph'     →  graph_key    NOT NULL  AND  casepack_key IS NULL
  CONSTRAINT apps_casepack_graph_xor
    CHECK (
      (type = 'casepack' AND casepack_key IS NOT NULL AND graph_key IS NULL)
      OR
      (type = 'graph'    AND graph_key    IS NOT NULL AND casepack_key IS NULL)
    )
);

COMMENT ON TABLE apps IS
  'Deployable AI application at /a/<slug>. Binds a URL slug to either a '
  'single CasePack (type=casepack) or a Graph (type=graph). '
  'apps_casepack_graph_xor constraint enforces type integrity at DB level.';

COMMENT ON COLUMN apps.casepack_key IS
  'Required when type=''casepack''. References casepacks.key (not FK — '
  'cross-version lookups use the key directly). Must be NULL when type=''graph''.';

COMMENT ON COLUMN apps.graph_key IS
  'Required when type=''graph''. References casepack_graphs.key. '
  'Must be NULL when type=''casepack''.';
