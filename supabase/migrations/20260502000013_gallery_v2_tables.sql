-- =============================================================================
-- Migration 013: Gallery Edition v2.0 — Gallery, Fork, Comparison & Matching Tables
--
-- Implements D20~D27 & MIGRATION_GALLERY_V2.md objects:
--   - creator_profiles
--   - catalog_entries (36-agent taxonomy catalog)
--   - persona_profiles
--   - gallery_listings
--   - fork_lineage
--   - benchmark_tasks
--   - comparison_sessions
--   - service_offerings
--   - project_briefs
--   - match_candidates
--   - gallery_events & moderation_reports
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.creator_profiles (
  creator_id        text        PRIMARY KEY,
  workspace_id      uuid        REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id           uuid,
  display_name      text        NOT NULL,
  bio               text        NOT NULL,
  credential_status text        NOT NULL DEFAULT 'self_declared',
  verified_by       text,
  verified_at       timestamptz,
  contributions     text[]      NOT NULL DEFAULT '{}',
  visibility        text        NOT NULL DEFAULT 'private',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT creator_profiles_credential_check CHECK (credential_status IN ('self_declared', 'checked')),
  CONSTRAINT creator_profiles_visibility_check CHECK (visibility IN ('private', 'public'))
);

CREATE TABLE IF NOT EXISTS public.catalog_entries (
  agent_id              text        PRIMARY KEY,
  name                  text        NOT NULL,
  primary_category      text        NOT NULL,
  persona               text        NOT NULL,
  input_description     text        NOT NULL,
  deliverable           text        NOT NULL,
  critical_rule         text        NOT NULL,
  release_wave          text        NOT NULL DEFAULT 'later',
  maturity              text        NOT NULL DEFAULT 'specified',
  availability          text        NOT NULL DEFAULT 'preview_only',
  origin                text        NOT NULL DEFAULT 'platform_seed',
  expert_verified       boolean     NOT NULL DEFAULT false,
  capabilities_required text[]      NOT NULL DEFAULT '{}',
  offering_modes        text[]      NOT NULL DEFAULT '{}',
  fork_policy           text        NOT NULL DEFAULT 'attribution_required',
  runtime_release_id    text         REFERENCES public.release_manifests(release_id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT catalog_entries_category_check CHECK (
    primary_category IN ('information', 'diagnosis', 'design', 'production', 'verification', 'continuous_work')
  ),
  CONSTRAINT catalog_entries_availability_check CHECK (
    availability IN ('preview_only', 'test_ready', 'published_runnable', 'paused')
  ),
  CONSTRAINT catalog_entries_fork_policy_check CHECK (
    fork_policy IN ('prohibited', 'private_only', 'attribution_required')
  )
);

CREATE TABLE IF NOT EXISTS public.persona_profiles (
  persona_id                text        PRIMARY KEY,
  workspace_id              uuid        REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role                      text        NOT NULL,
  audience                  text        NOT NULL,
  behavior_rules            text[]      NOT NULL DEFAULT '{}',
  prohibited_claims         text[]      NOT NULL DEFAULT '{}',
  real_person_impersonation boolean     NOT NULL DEFAULT false,
  created_at                timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT persona_profiles_no_impersonation CHECK (real_person_impersonation = false)
);

CREATE TABLE IF NOT EXISTS public.gallery_listings (
  listing_id         text        PRIMARY KEY,
  workspace_id       uuid        REFERENCES public.workspaces(id) ON DELETE CASCADE,
  agent_id           text        NOT NULL REFERENCES public.catalog_entries(agent_id) ON DELETE RESTRICT,
  creator_id         text        NOT NULL REFERENCES public.creator_profiles(creator_id) ON DELETE RESTRICT,
  release_id         text        REFERENCES public.release_manifests(release_id) ON DELETE SET NULL,
  slug               text        UNIQUE,
  category           text        NOT NULL,
  language           text        NOT NULL DEFAULT 'ko',
  status             text        NOT NULL DEFAULT 'draft',
  availability       text        NOT NULL DEFAULT 'preview_only',
  sample_origin      text        NOT NULL DEFAULT 'synthetic_fixture',
  sample_input_json  jsonb       NOT NULL DEFAULT '{}'::jsonb,
  sample_output_json jsonb       NOT NULL DEFAULT '{}'::jsonb,
  offering_ids       text[]      NOT NULL DEFAULT '{}',
  sponsored          boolean     NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT gallery_listings_category_check CHECK (
    category IN ('information', 'diagnosis', 'design', 'production', 'verification', 'continuous_work')
  ),
  CONSTRAINT gallery_listings_status_check CHECK (
    status IN ('draft', 'public', 'hidden', 'archived')
  ),
  CONSTRAINT gallery_listings_availability_check CHECK (
    availability IN ('preview_only', 'test_ready', 'published_runnable', 'paused')
  ),
  CONSTRAINT gallery_listings_sample_origin_check CHECK (
    sample_origin IN ('synthetic_fixture', 'real_run_with_permission')
  ),
  CONSTRAINT gallery_listings_runnable_requires_release CHECK (
    availability != 'published_runnable' OR (release_id IS NOT NULL AND length(release_id) > 0)
  )
);

CREATE TABLE IF NOT EXISTS public.fork_lineage (
  fork_id                  text        PRIMARY KEY,
  parent_release_id        text        NOT NULL,
  child_pack_id            text        NOT NULL,
  owner_workspace_id       text        NOT NULL,
  license_version          text        NOT NULL,
  attribution              text        NOT NULL,
  diff_summary_json        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  copied_customer_data     boolean     NOT NULL DEFAULT false,
  inherited_verified_badge boolean     NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fork_lineage_no_customer_data CHECK (copied_customer_data = false),
  CONSTRAINT fork_lineage_no_inherited_badge CHECK (inherited_verified_badge = false)
);

CREATE TABLE IF NOT EXISTS public.benchmark_tasks (
  task_id           text        PRIMARY KEY,
  version           text        NOT NULL,
  agent_id          text        NOT NULL REFERENCES public.catalog_entries(agent_id) ON DELETE CASCADE,
  input             jsonb       NOT NULL DEFAULT '{}'::jsonb,
  expected_checks   text[]      NOT NULL DEFAULT '{}',
  forbidden_outputs text[]      NOT NULL DEFAULT '{}',
  data_scope        text        NOT NULL DEFAULT 'synthetic_public',
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT benchmark_tasks_data_scope_check CHECK (data_scope IN ('synthetic_public', 'owner_private'))
);

CREATE TABLE IF NOT EXISTS public.comparison_sessions (
  comparison_id text        PRIMARY KEY,
  workspace_id  text        NOT NULL,
  task_id       text        NOT NULL,
  release_ids   text[]      NOT NULL,
  status        text        NOT NULL DEFAULT 'queued',
  data_scope    text        NOT NULL DEFAULT 'synthetic_public',
  run_ids       text[]      NOT NULL DEFAULT '{}',
  results_json  jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT comparison_sessions_release_count CHECK (
    cardinality(release_ids) BETWEEN 2 AND 3
  ),
  CONSTRAINT comparison_sessions_status_check CHECK (
    status IN ('queued', 'running', 'completed', 'failed')
  ),
  CONSTRAINT comparison_sessions_data_scope_check CHECK (
    data_scope IN ('synthetic_public', 'owner_private')
  )
);

CREATE TABLE IF NOT EXISTS public.service_offerings (
  offering_id     text        PRIMARY KEY,
  workspace_id    uuid        REFERENCES public.workspaces(id) ON DELETE CASCADE,
  listing_id      text        NOT NULL REFERENCES public.gallery_listings(listing_id) ON DELETE CASCADE,
  creator_id      text        NOT NULL REFERENCES public.creator_profiles(creator_id) ON DELETE CASCADE,
  mode            text        NOT NULL,
  deliverables    text[]      NOT NULL DEFAULT '{}',
  exclusions      text[]      NOT NULL DEFAULT '{}',
  required_inputs text[]      NOT NULL DEFAULT '{}',
  languages       text[]      NOT NULL DEFAULT '{ko}',
  human_review    boolean     NOT NULL DEFAULT false,
  price_status    text        NOT NULL DEFAULT 'quote_required',
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT service_offerings_mode_check CHECK (
    mode IN ('self_run', 'reviewed_delivery', 'custom_build', 'managed_operation')
  ),
  CONSTRAINT service_offerings_price_status_check CHECK (
    price_status IN ('quote_required', 'fixed')
  )
);

CREATE TABLE IF NOT EXISTS public.project_briefs (
  brief_id           text        PRIMARY KEY,
  workspace_id       text        NOT NULL,
  deliverable_type   text        NOT NULL,
  input_formats      text[]      NOT NULL DEFAULT '{}',
  language           text        NOT NULL,
  review_required    boolean     NOT NULL DEFAULT false,
  requirements       text[]      NOT NULL DEFAULT '{}',
  status             text        NOT NULL DEFAULT 'submitted',
  external_order_ref text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT project_briefs_status_check CHECK (
    status IN (
      'draft',
      'submitted',
      'matched',
      'proposal',
      'accepted',
      'in_progress',
      'review',
      'delivered',
      'accepted_by_customer',
      'cancelled'
    )
  )
);

CREATE TABLE IF NOT EXISTS public.match_candidates (
  brief_id           text        NOT NULL REFERENCES public.project_briefs(brief_id) ON DELETE CASCADE,
  offering_id        text        NOT NULL REFERENCES public.service_offerings(offering_id) ON DELETE CASCADE,
  eligible           boolean     NOT NULL,
  reasons            text[]      NOT NULL DEFAULT '{}',
  unmet_conditions   text[]      NOT NULL DEFAULT '{}',
  needs_confirmation text[]      NOT NULL DEFAULT '{}',
  created_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT match_candidates_pkey PRIMARY KEY (brief_id, offering_id),
  CONSTRAINT match_candidates_eligible_check CHECK (
    NOT eligible OR cardinality(unmet_conditions) = 0
  )
);

CREATE TABLE IF NOT EXISTS public.gallery_events (
  event_id     text        PRIMARY KEY,
  event_name   text        NOT NULL,
  listing_id   text,
  agent_id     text,
  version      text,
  session_type text        NOT NULL DEFAULT 'visitor',
  occurred_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT gallery_events_name_check CHECK (
    event_name IN (
      'view_listing',
      'demo_open',
      'demo_run',
      'fork_started',
      'fork_saved',
      'test_completed',
      'listing_published',
      'brief_submitted',
      'delivery_accepted'
    )
  )
);

CREATE TABLE IF NOT EXISTS public.moderation_reports (
  report_id    text        PRIMARY KEY,
  listing_id   text        NOT NULL REFERENCES public.gallery_listings(listing_id) ON DELETE CASCADE,
  reason       text        NOT NULL,
  status       text        NOT NULL DEFAULT 'hidden_pending_review',
  resolved_by  text,
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT moderation_reports_status_check CHECK (
    status IN ('hidden_pending_review', 'confirmed_archived', 'restored')
  )
);

-- Enable RLS
ALTER TABLE public.creator_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persona_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_listings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fork_lineage        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_tasks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparison_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_offerings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_briefs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_candidates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_reports  ENABLE ROW LEVEL SECURITY;

-- Public read policies for public gallery projections
DROP POLICY IF EXISTS "catalog_entries_public_read" ON public.catalog_entries;
CREATE POLICY "catalog_entries_public_read"
  ON public.catalog_entries
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "creator_profiles_public_read" ON public.creator_profiles;
CREATE POLICY "creator_profiles_public_read"
  ON public.creator_profiles
  FOR SELECT
  USING (visibility = 'public');

DROP POLICY IF EXISTS "gallery_listings_public_read" ON public.gallery_listings;
CREATE POLICY "gallery_listings_public_read"
  ON public.gallery_listings
  FOR SELECT
  USING (status = 'public');
