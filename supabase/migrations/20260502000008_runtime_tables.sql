-- =============================================================================
-- Migration: 20260502000008_runtime_tables.sql
-- Runtime execution tables: runs, traces, usage.
--
-- FORBIDDEN columns (doc 06):
--   casepack_runs: execution_plan, repair_attempts
--   graph_runs: execution_plan
--   handoff_events: source_output_json, target_input_json,
--                   context_checkpoint_json, bridge_output_json
--   runtime_trace_events: trace_payload
--   usage_events: repair_attempts
-- =============================================================================

-- ---------------------------------------------------------------------------
-- casepack_runs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS casepack_runs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  casepack_key     text        NOT NULL,
  user_id          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  status           text        NOT NULL DEFAULT 'pending',
  input_json       jsonb       NOT NULL DEFAULT '{}',
  output_json      jsonb,
  execution_plan   jsonb,   -- FORBIDDEN
  repair_attempts  integer  NOT NULL DEFAULT 0, -- FORBIDDEN
  started_at       timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT casepack_runs_status CHECK (status IN ('pending','running','success','failed','repaired','timeout')),
  CONSTRAINT casepack_runs_repair_nonneg CHECK (repair_attempts >= 0)
);

COMMENT ON COLUMN casepack_runs.execution_plan IS 'FORBIDDEN PUBLIC KEY.';
COMMENT ON COLUMN casepack_runs.repair_attempts IS 'FORBIDDEN PUBLIC KEY.';

CREATE TRIGGER trg_casepack_runs_updated_at
  BEFORE UPDATE ON casepack_runs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- graph_runs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS graph_runs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  graph_key        text        NOT NULL,
  user_id          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  status           text        NOT NULL DEFAULT 'pending',
  execution_plan   jsonb,   -- FORBIDDEN
  started_at       timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT graph_runs_status CHECK (status IN ('pending','running','success','failed','repaired','timeout'))
);

COMMENT ON COLUMN graph_runs.execution_plan IS 'FORBIDDEN PUBLIC KEY.';

CREATE TRIGGER trg_graph_runs_updated_at
  BEFORE UPDATE ON graph_runs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- node_runs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS node_runs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_run_id     uuid        NOT NULL REFERENCES graph_runs(id) ON DELETE CASCADE,
  node_id          text        NOT NULL,
  casepack_key     text        NOT NULL,
  status           text        NOT NULL DEFAULT 'pending',
  input_json       jsonb       NOT NULL DEFAULT '{}',
  output_json      jsonb,
  started_at       timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT node_runs_status CHECK (status IN ('pending','running','success','failed','repaired','timeout'))
);

-- ---------------------------------------------------------------------------
-- handoff_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS handoff_events (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_run_id             uuid NOT NULL REFERENCES graph_runs(id) ON DELETE CASCADE,
  source_node_id           text NOT NULL,
  target_node_id           text NOT NULL,
  bridge_key               text,
  source_output_json       jsonb, -- FORBIDDEN
  target_input_json        jsonb, -- FORBIDDEN
  context_checkpoint_json  jsonb, -- FORBIDDEN
  bridge_output_json       jsonb, -- FORBIDDEN
  created_at               timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN handoff_events.source_output_json      IS 'FORBIDDEN PUBLIC KEY.';
COMMENT ON COLUMN handoff_events.target_input_json       IS 'FORBIDDEN PUBLIC KEY.';
COMMENT ON COLUMN handoff_events.context_checkpoint_json IS 'FORBIDDEN PUBLIC KEY.';
COMMENT ON COLUMN handoff_events.bridge_output_json      IS 'FORBIDDEN PUBLIC KEY.';

-- ---------------------------------------------------------------------------
-- runtime_trace_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS runtime_trace_events (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Polymorphic: references casepack_runs.id OR graph_runs.id
  run_id        uuid        NOT NULL,
  run_type      text        NOT NULL,
  event_type    text        NOT NULL,
  casepack_key  text,
  node_id       text,
  trace_payload jsonb       NOT NULL DEFAULT '{}', -- FORBIDDEN
  sequence      integer,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT runtime_trace_events_run_type  CHECK (run_type  IN ('casepack','graph')),
  CONSTRAINT runtime_trace_events_event_type CHECK (event_type IN ('start','step','output','repair','fallback','complete','error'))
);

COMMENT ON COLUMN runtime_trace_events.trace_payload IS 'FORBIDDEN PUBLIC KEY.';

-- ---------------------------------------------------------------------------
-- usage_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usage_events (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          uuid          NOT NULL,
  workspace_id    uuid          NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  casepack_key    text,
  graph_key       text,
  provider        text          NOT NULL,
  model           text          NOT NULL,
  tokens_in       integer       NOT NULL DEFAULT 0,
  tokens_out      integer       NOT NULL DEFAULT 0,
  cost_usd        numeric(10,6),
  repair_attempts integer       NOT NULL DEFAULT 0, -- FORBIDDEN
  created_at      timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT usage_events_tokens_in_nonneg   CHECK (tokens_in >= 0),
  CONSTRAINT usage_events_tokens_out_nonneg  CHECK (tokens_out >= 0),
  CONSTRAINT usage_events_cost_nonneg        CHECK (cost_usd IS NULL OR cost_usd >= 0),
  CONSTRAINT usage_events_repair_nonneg      CHECK (repair_attempts >= 0)
);

COMMENT ON COLUMN usage_events.repair_attempts IS 'FORBIDDEN PUBLIC KEY.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_casepack_runs_workspace_status ON casepack_runs (workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_casepack_runs_user_id          ON casepack_runs (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_casepack_runs_casepack_key     ON casepack_runs (casepack_key);
CREATE INDEX IF NOT EXISTS idx_casepack_runs_created_at       ON casepack_runs (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_graph_runs_workspace_status    ON graph_runs (workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_graph_runs_user_id             ON graph_runs (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_graph_runs_graph_key           ON graph_runs (graph_key);
CREATE INDEX IF NOT EXISTS idx_graph_runs_created_at          ON graph_runs (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_node_runs_graph_run_id         ON node_runs (graph_run_id);
CREATE INDEX IF NOT EXISTS idx_node_runs_casepack_key         ON node_runs (casepack_key);

CREATE INDEX IF NOT EXISTS idx_handoff_events_graph_run_id    ON handoff_events (graph_run_id);

CREATE INDEX IF NOT EXISTS idx_runtime_trace_events_run_id    ON runtime_trace_events (run_id);
CREATE INDEX IF NOT EXISTS idx_runtime_trace_events_sequence  ON runtime_trace_events (run_id, sequence);

CREATE INDEX IF NOT EXISTS idx_usage_events_run_id            ON usage_events (run_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_workspace_created ON usage_events (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_workspace_provider ON usage_events (workspace_id, provider);
