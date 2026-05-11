-- =============================================================================
-- Migration: 20260502000007_domain_packs.sql
-- Domain Pack catalogue, versioned bodies, asset registry, and installs.
--
-- DESIGN NOTE — Three-table split mirrors the casepacks pattern:
--   domain_packs          : public-safe metadata
--   domain_pack_versions  : full manifest body (FORBIDDEN: manifest_json)
--   domain_pack_assets    : flat asset registry for each pack
--   domain_pack_installs  : workspace installation records
--
-- FORBIDDEN columns:
--   domain_pack_versions.manifest_json — must never appear in public API.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- domain_packs — catalogue metadata (safe to expose)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS domain_packs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULL means platform-level pack (available to all workspaces).
  workspace_id      uuid
    REFERENCES workspaces(id) ON DELETE SET NULL,

  -- Unique machine key. Format: pack.<name>.v<version>
  -- e.g. "pack.corporate_pr.v1"
  key               text        NOT NULL UNIQUE,

  status            text        NOT NULL DEFAULT 'draft',

  -- Controls discoverability in the pack catalogue.
  visibility        text        NOT NULL DEFAULT 'workspace',

  -- The slug of the default app to open after installation.
  -- Must resolve to an entry in domain_pack_assets for this pack.
  primary_app_slug  text        NOT NULL,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT domain_packs_key_format
    CHECK (key ~ '^pack\.[a-z0-9_]+\.v[0-9]+$'),

  CONSTRAINT domain_packs_status_values
    CHECK (status IN ('draft', 'published', 'deprecated', 'archived')),

  CONSTRAINT domain_packs_visibility_values
    CHECK (visibility IN ('public', 'workspace', 'private')),

  CONSTRAINT domain_packs_primary_app_slug_format
    CHECK (primary_app_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

COMMENT ON TABLE domain_packs IS
  'Domain Pack catalogue entry. Contains only public-safe metadata. '
  'Full manifest (including all CasePack keys and asset lists) lives in '
  'domain_pack_versions.manifest_json (FORBIDDEN public key).';

COMMENT ON COLUMN domain_packs.primary_app_slug IS
  'Slug of the default app to open after pack installation. '
  'Must resolve to an app asset in domain_pack_assets for this pack.';

CREATE TRIGGER trg_domain_packs_updated_at
  BEFORE UPDATE ON domain_packs
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- domain_pack_versions — versioned manifest body (FORBIDDEN columns)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS domain_pack_versions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  domain_pack_id  uuid        NOT NULL
    REFERENCES domain_packs(id) ON DELETE CASCADE,

  -- Semantic version string. e.g. "1.0.0"
  version         text        NOT NULL,

  -- FORBIDDEN PUBLIC KEY.
  -- Full DomainPackManifestSchema JSON: primary_app_slug, assets (apps,
  -- casepacks, bridges, graphs), metadata.
  -- Must NEVER be returned in a public API response.
  manifest_json   jsonb       NOT NULL,

  -- Only one version per domain_pack should be current.
  is_current      boolean     NOT NULL DEFAULT false,

  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT domain_pack_versions_unique_version
    UNIQUE (domain_pack_id, version)
);

COMMENT ON TABLE domain_pack_versions IS
  'Versioned Domain Pack manifest body. '
  'WARNING: manifest_json is a FORBIDDEN public key. '
  'Access restricted to service role only via RLS.';

-- ---------------------------------------------------------------------------
-- domain_pack_assets — flat asset registry per pack version
-- ---------------------------------------------------------------------------
-- Denormalised from manifest_json for efficient asset lookups
-- without loading the full manifest body.
CREATE TABLE IF NOT EXISTS domain_pack_assets (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  domain_pack_id  uuid        NOT NULL
    REFERENCES domain_packs(id) ON DELETE CASCADE,

  -- Asset type: what kind of object is this?
  asset_type      text        NOT NULL,

  -- The machine key of the asset.
  -- Format depends on asset_type:
  --   app      → slug (e.g. "corporate-pr-suite")
  --   casepack → casepack.<name>.v<n>
  --   bridge   → bridge.<name>.v<n>
  --   graph    → graph.<name>.v<n>
  asset_key       text        NOT NULL,

  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT domain_pack_assets_asset_type_values
    CHECK (asset_type IN ('app', 'casepack', 'bridge', 'graph')),

  -- Each asset key appears at most once per pack per type.
  CONSTRAINT domain_pack_assets_unique_asset
    UNIQUE (domain_pack_id, asset_type, asset_key)
);

COMMENT ON TABLE domain_pack_assets IS
  'Denormalised flat asset registry for a Domain Pack. '
  'Populated from manifest_json at install time to enable efficient '
  'asset lookups without loading the full manifest body.';

-- ---------------------------------------------------------------------------
-- domain_pack_installs — workspace installation records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS domain_pack_installs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  domain_pack_id      uuid        NOT NULL
    REFERENCES domain_packs(id) ON DELETE CASCADE,

  workspace_id        uuid        NOT NULL
    REFERENCES workspaces(id) ON DELETE CASCADE,

  -- The specific manifest version that was installed.
  installed_version   text        NOT NULL,

  installed_at        timestamptz NOT NULL DEFAULT now(),

  -- A workspace can only have one install record per pack.
  -- Re-installation updates installed_version via upsert.
  CONSTRAINT domain_pack_installs_unique_install
    UNIQUE (domain_pack_id, workspace_id)
);

COMMENT ON TABLE domain_pack_installs IS
  'Records which workspaces have installed which Domain Packs and at which version. '
  'Used for licence gating, upgrade prompts, and onboarding status.';

-- ---------------------------------------------------------------------------
-- Indexes — domain packs
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_domain_packs_key
  ON domain_packs (key);

CREATE INDEX IF NOT EXISTS idx_domain_packs_workspace_status
  ON domain_packs (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_domain_packs_visibility_public
  ON domain_packs (visibility)
  WHERE visibility = 'public';

CREATE INDEX IF NOT EXISTS idx_domain_pack_versions_pack_id
  ON domain_pack_versions (domain_pack_id);

CREATE INDEX IF NOT EXISTS idx_domain_pack_versions_current
  ON domain_pack_versions (domain_pack_id)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_domain_pack_assets_pack_id
  ON domain_pack_assets (domain_pack_id);

CREATE INDEX IF NOT EXISTS idx_domain_pack_assets_type_key
  ON domain_pack_assets (asset_type, asset_key);

CREATE INDEX IF NOT EXISTS idx_domain_pack_installs_workspace_id
  ON domain_pack_installs (workspace_id);

CREATE INDEX IF NOT EXISTS idx_domain_pack_installs_pack_id
  ON domain_pack_installs (domain_pack_id);
