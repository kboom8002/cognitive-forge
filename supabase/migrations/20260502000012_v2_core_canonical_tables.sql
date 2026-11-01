-- =============================================================================
-- Migration 012: Gallery Edition v2.0 — Core Canonical Tables & RLS
--
-- Implements D06, D08, D09, D10, D11, D12, D13 canonical objects:
--   - casepack_definitions
--   - release_manifests
--   - agent_applications
--   - work_requests
--   - v2_runs
--   - artifact_versions
--   - review_decisions
--   - evaluation_reports
--   - knowledge_sources
--   - idempotency_keys
--   - webhook_endpoints & webhook_deliveries
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.casepack_definitions (
  pack_id          text        NOT NULL,
  version          text        NOT NULL,
  workspace_id     uuid        REFERENCES public.workspaces(id) ON DELETE CASCADE,
  task             text        NOT NULL,
  input_schema     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  output_schema    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  steps            jsonb       NOT NULL DEFAULT '[]'::jsonb,
  evaluation_rules jsonb       NOT NULL DEFAULT '[]'::jsonb,
  source_map       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  compiler_version text        NOT NULL DEFAULT '2.0.0',
  source_hash      text,
  warnings         jsonb       NOT NULL DEFAULT '[]'::jsonb,
  status           text        NOT NULL DEFAULT 'draft',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT casepack_definitions_pkey PRIMARY KEY (pack_id, version),
  CONSTRAINT casepack_definitions_status_check CHECK (status IN ('draft', 'specified', 'published', 'archived'))
);

CREATE TABLE IF NOT EXISTS public.release_manifests (
  release_id               text        PRIMARY KEY,
  workspace_id             uuid        REFERENCES public.workspaces(id) ON DELETE CASCADE,
  pack_id                  text        NOT NULL,
  pack_version             text        NOT NULL,
  compiler_version         text        NOT NULL,
  evaluation_suite_version text        NOT NULL,
  content_hash             text        NOT NULL,
  mao_snapshot_json        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  capabilities_required    text[]      NOT NULL DEFAULT '{}',
  fork_policy              text        NOT NULL DEFAULT 'attribution_required',
  created_by               uuid,
  created_at               timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT release_manifests_fork_policy_check CHECK (fork_policy IN ('prohibited', 'private_only', 'attribution_required'))
);

CREATE TABLE IF NOT EXISTS public.agent_applications (
  app_id           text        PRIMARY KEY,
  workspace_id     uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  release_id       text        NOT NULL REFERENCES public.release_manifests(release_id) ON DELETE RESTRICT,
  slug             text        NOT NULL UNIQUE,
  settings         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  review_authority text        NOT NULL DEFAULT 'native',
  retention_policy jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT agent_applications_review_authority_check CHECK (review_authority IN ('native', 'delegated'))
);

CREATE TABLE IF NOT EXISTS public.work_requests (
  request_id         text        PRIMARY KEY,
  workspace_id       uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  app_id             text        NOT NULL,
  input              jsonb       NOT NULL DEFAULT '{}'::jsonb,
  external_reference text        NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.v2_runs (
  run_id                 text        PRIMARY KEY,
  workspace_id           uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  app_id                 text,
  release_id             text        NOT NULL REFERENCES public.release_manifests(release_id) ON DELETE RESTRICT,
  request_id             text        REFERENCES public.work_requests(request_id) ON DELETE SET NULL,
  revision               integer     NOT NULL DEFAULT 1 CHECK (revision >= 1),
  status                 text        NOT NULL DEFAULT 'queued',
  artifact_ids           text[]      NOT NULL DEFAULT '{}',
  evaluation_status      text        NOT NULL DEFAULT 'not_run',
  review_status          text        NOT NULL DEFAULT 'not_required',
  review_authority       text        NOT NULL DEFAULT 'native',
  input_json             jsonb       NOT NULL DEFAULT '{}'::jsonb,
  pending_questions_json jsonb       NOT NULL DEFAULT '[]'::jsonb,
  checkpoint_json        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  error_code             text,
  error_message          text,
  budget_limit_tokens    integer     NOT NULL DEFAULT 50000,
  tokens_used            integer     NOT NULL DEFAULT 0,
  lease_owner            text,
  lease_expires_at       timestamptz,
  zero_retention         boolean     NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT v2_runs_status_check CHECK (
    status IN ('queued', 'running', 'waiting_input', 'waiting_review', 'completed', 'failed', 'cancelled')
  ),
  CONSTRAINT v2_runs_eval_status_check CHECK (
    evaluation_status IN ('not_run', 'pass', 'fail', 'error')
  ),
  CONSTRAINT v2_runs_review_status_check CHECK (
    review_status IN ('not_required', 'pending', 'approved', 'changes_requested')
  ),
  CONSTRAINT v2_runs_review_authority_check CHECK (
    review_authority IN ('native', 'delegated')
  )
);

CREATE TABLE IF NOT EXISTS public.artifact_versions (
  artifact_id   text        NOT NULL,
  version       integer     NOT NULL CHECK (version >= 1),
  workspace_id  uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  run_id        text        NOT NULL REFERENCES public.v2_runs(run_id) ON DELETE CASCADE,
  content_hash  text        NOT NULL,
  content       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  evidence      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  review_status text        NOT NULL DEFAULT 'pending',
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT artifact_versions_pkey PRIMARY KEY (artifact_id, version),
  CONSTRAINT artifact_versions_review_status_check CHECK (
    review_status IN ('not_required', 'pending', 'approved', 'changes_requested')
  )
);

CREATE TABLE IF NOT EXISTS public.review_decisions (
  decision_id       text        PRIMARY KEY,
  workspace_id      uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  run_id            text        NOT NULL REFERENCES public.v2_runs(run_id) ON DELETE CASCADE,
  actor_id          text        NOT NULL,
  authority         text        NOT NULL DEFAULT 'native',
  artifact_id       text        NOT NULL,
  artifact_version  integer     NOT NULL CHECK (artifact_version >= 1),
  content_hash      text        NOT NULL,
  decision          text        NOT NULL,
  reason            text,
  expected_revision integer     NOT NULL CHECK (expected_revision >= 1),
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT review_decisions_decision_check CHECK (
    decision IN ('approve', 'request_changes', 'reject')
  )
);

CREATE TABLE IF NOT EXISTS public.evaluation_reports (
  report_id     text        PRIMARY KEY,
  workspace_id  uuid        REFERENCES public.workspaces(id) ON DELETE CASCADE,
  run_id        text        NOT NULL REFERENCES public.v2_runs(run_id) ON DELETE CASCADE,
  suite_version text        NOT NULL,
  status        text        NOT NULL,
  checks        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT evaluation_reports_status_check CHECK (
    status IN ('not_run', 'pass', 'fail', 'error')
  )
);

CREATE TABLE IF NOT EXISTS public.knowledge_sources (
  source_id    text        NOT NULL,
  version      text        NOT NULL DEFAULT '1.0.0',
  workspace_id uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  content_hash text        NOT NULL,
  title        text        NOT NULL,
  locator      text        NOT NULL,
  permission   text        NOT NULL DEFAULT 'workspace_private',
  content_text text,
  collected_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT knowledge_sources_pkey PRIMARY KEY (workspace_id, source_id, version),
  CONSTRAINT knowledge_sources_permission_check CHECK (
    permission IN ('workspace_private', 'synthetic_public', 'customer_run_only')
  )
);

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  workspace_id    text        NOT NULL,
  route_key       text        NOT NULL,
  idempotency_key text        NOT NULL,
  request_hash    text        NOT NULL,
  status_code     integer     NOT NULL,
  response_json   jsonb       NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),

  CONSTRAINT idempotency_keys_pkey PRIMARY KEY (workspace_id, route_key, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  endpoint_id  text        PRIMARY KEY,
  workspace_id uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  callback_url text        NOT NULL CHECK (callback_url LIKE 'https://%'),
  secret_hash  text        NOT NULL,
  allowed_apps text[]      NOT NULL DEFAULT '{}',
  events       text[]      NOT NULL DEFAULT '{}',
  active       boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  event_id       text        PRIMARY KEY,
  endpoint_id    text        REFERENCES public.webhook_endpoints(endpoint_id) ON DELETE CASCADE,
  workspace_id   uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  run_id         text        NOT NULL,
  event_type     text        NOT NULL,
  envelope_json  jsonb       NOT NULL,
  attempt_count  integer     NOT NULL DEFAULT 0,
  status         text        NOT NULL DEFAULT 'pending',
  next_retry_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT webhook_deliveries_status_check CHECK (
    status IN ('pending', 'delivered', 'failed_permanent')
  )
);

-- Enable RLS (default deny for direct client access; service role bypasses)
ALTER TABLE public.casepack_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_manifests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_applications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_runs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_versions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_decisions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_reports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_sources    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries   ENABLE ROW LEVEL SECURITY;
