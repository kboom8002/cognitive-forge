/**
 * v2-gallery.ts — Gallery Edition v2.0 Zod schemas (D20~D27).
 *
 * Strictly mirrors docs/Cognitive_Forge_OS_Gallery_Repo_Docs_v2_0/gallery/schemas/*.schema.json
 * and contracts/gallery-openapi.json, including conditional allOf/if/then rules and uniqueItems.
 */

import { z } from "zod";

const NonEmptyString = z.string().min(1);
const PlainObject = z.record(z.unknown());

export const GalleryCategoryEnum = z.enum([
  "information",
  "diagnosis",
  "design",
  "production",
  "verification",
  "continuous_work",
]);
export type GalleryCategory = z.infer<typeof GalleryCategoryEnum>;

export const GalleryAvailabilityEnum = z.enum([
  "preview_only",
  "test_ready",
  "published_runnable",
  "paused",
]);
export type GalleryAvailability = z.infer<typeof GalleryAvailabilityEnum>;

export const DataScopeEnum = z.enum(["synthetic_public", "owner_private"]);
export type DataScope = z.infer<typeof DataScopeEnum>;

export const OfferingModeEnum = z.enum([
  "self_run",
  "reviewed_delivery",
  "custom_build",
  "managed_operation",
]);
export type OfferingMode = z.infer<typeof OfferingModeEnum>;

export const ForkPolicyEnum = z.enum([
  "prohibited",
  "private_only",
  "attribution_required",
]);
export type ForkPolicy = z.infer<typeof ForkPolicyEnum>;

// ── 1. BenchmarkTask ──────────────────────────────────────────────────────────

export const BenchmarkTaskSchema = z
  .object({
    task_id:           NonEmptyString,
    version:           NonEmptyString,
    agent_id:          NonEmptyString,
    input:             PlainObject,
    expected_checks:   z.array(NonEmptyString),
    forbidden_outputs: z.array(NonEmptyString),
    data_scope:        DataScopeEnum,
  })
  .strict();

export type BenchmarkTask = z.infer<typeof BenchmarkTaskSchema>;

// ── 2. CatalogEntry ───────────────────────────────────────────────────────────

export const CatalogEntrySchema = z
  .object({
    agent_id:              NonEmptyString,
    name:                  NonEmptyString,
    primary_category:      NonEmptyString,
    persona:               NonEmptyString,
    input_description:     NonEmptyString,
    deliverable:           NonEmptyString,
    critical_rule:         NonEmptyString,
    release_wave:          NonEmptyString,
    maturity:              NonEmptyString,
    availability:          NonEmptyString,
    origin:                NonEmptyString,
    expert_verified:       z.boolean(),
    capabilities_required: z.array(NonEmptyString),
    offering_modes:        z.array(NonEmptyString),
    fork_policy:           NonEmptyString,
    runtime_release_id:    NonEmptyString.nullable(),
  })
  .strict();

export type CatalogEntry = z.infer<typeof CatalogEntrySchema>;

// ── 3. ComparisonSession ──────────────────────────────────────────────────────

export const ComparisonStatusEnum = z.enum(["queued", "running", "completed", "failed"]);
export type ComparisonStatus = z.infer<typeof ComparisonStatusEnum>;

export const UniqueReleaseIdsSchema = z
  .array(NonEmptyString)
  .min(2)
  .max(3)
  .refine((items) => new Set(items).size === items.length, {
    message: "release_ids must contain unique items",
  });

export const ComparisonSessionSchema = z
  .object({
    comparison_id: NonEmptyString,
    workspace_id:  NonEmptyString,
    task_id:       NonEmptyString,
    release_ids:   UniqueReleaseIdsSchema,
    status:        ComparisonStatusEnum,
    data_scope:    DataScopeEnum,
    run_ids:       z.array(NonEmptyString),
  })
  .strict();

export type ComparisonSession = z.infer<typeof ComparisonSessionSchema>;

// ── 4. CreatorProfile ─────────────────────────────────────────────────────────

export const CredentialStatusEnum = z.enum(["self_declared", "checked"]);
export type CredentialStatus = z.infer<typeof CredentialStatusEnum>;

export const CreatorProfileSchema = z
  .object({
    creator_id:        NonEmptyString,
    display_name:      NonEmptyString,
    bio:               NonEmptyString,
    credential_status: CredentialStatusEnum,
    contributions:     z.array(NonEmptyString),
    visibility:        z.enum(["private", "public"]),
  })
  .strict();

export type CreatorProfile = z.infer<typeof CreatorProfileSchema>;

// ── 5. ForkLineage ────────────────────────────────────────────────────────────

export const ForkLineageSchema = z
  .object({
    fork_id:                  NonEmptyString,
    parent_release_id:        NonEmptyString,
    child_pack_id:            NonEmptyString,
    owner_workspace_id:       NonEmptyString,
    license_version:          NonEmptyString,
    attribution:              NonEmptyString,
    copied_customer_data:     z.literal(false),
    inherited_verified_badge: z.literal(false),
  })
  .strict();

export type ForkLineage = z.infer<typeof ForkLineageSchema>;

// ── 6. GalleryListing ─────────────────────────────────────────────────────────

export const GalleryListingStatusEnum = z.enum(["draft", "public", "hidden", "archived"]);
export type GalleryListingStatus = z.infer<typeof GalleryListingStatusEnum>;

export const SampleOriginEnum = z.enum(["synthetic_fixture", "real_run_with_permission"]);
export type SampleOrigin = z.infer<typeof SampleOriginEnum>;

export const GalleryListingSchema = z
  .object({
    listing_id:    NonEmptyString,
    agent_id:      NonEmptyString,
    creator_id:    NonEmptyString,
    release_id:    NonEmptyString.nullable(),
    category:      GalleryCategoryEnum,
    status:        GalleryListingStatusEnum,
    availability:  GalleryAvailabilityEnum,
    sample_origin: SampleOriginEnum,
    offering_ids:  z.array(NonEmptyString),
  })
  .strict()
  .refine(
    (val) => val.availability !== "published_runnable" || (typeof val.release_id === "string" && val.release_id.length > 0),
    {
      message: "published_runnable listing requires a non-empty release_id",
      path: ["release_id"],
    }
  );

export type GalleryListing = z.infer<typeof GalleryListingSchema>;

// ── 7. MatchCandidate ─────────────────────────────────────────────────────────

export const MatchCandidateSchema = z
  .object({
    brief_id:           NonEmptyString,
    offering_id:        NonEmptyString,
    eligible:           z.boolean(),
    reasons:            z.array(NonEmptyString),
    unmet_conditions:   z.array(NonEmptyString),
    needs_confirmation: z.array(NonEmptyString),
  })
  .strict()
  .refine((val) => !val.eligible || val.unmet_conditions.length === 0, {
    message: "eligible=true candidate must have empty unmet_conditions",
    path: ["unmet_conditions"],
  });

export type MatchCandidate = z.infer<typeof MatchCandidateSchema>;

// ── 8. PersonaProfile ─────────────────────────────────────────────────────────

export const PersonaProfileSchema = z
  .object({
    persona_id:                NonEmptyString,
    role:                      NonEmptyString,
    audience:                  NonEmptyString,
    behavior_rules:            z.array(NonEmptyString),
    prohibited_claims:         z.array(NonEmptyString),
    real_person_impersonation: z.literal(false),
  })
  .strict();

export type PersonaProfile = z.infer<typeof PersonaProfileSchema>;

// ── 9. PilotPack ──────────────────────────────────────────────────────────────

export const Taskflow8BlockSchema = z
  .object({
    A: NonEmptyString,
    S: NonEmptyString,
    T: NonEmptyString,
    K: NonEmptyString,
    W: NonEmptyString,
    F: NonEmptyString,
    L: NonEmptyString,
    O: NonEmptyString,
  })
  .strict();

export type Taskflow8Block = z.infer<typeof Taskflow8BlockSchema>;

export const PilotPackSchema = z
  .object({
    pack_id:               NonEmptyString,
    schema_version:        z.literal("2.0-draft"),
    agent_id:              NonEmptyString,
    status:                z.literal("specified"),
    taskflow:              Taskflow8BlockSchema,
    input_schema:          PlainObject,
    output_schema:         PlainObject,
    required_capabilities: z.array(NonEmptyString),
    benchmark_ids:         z.array(NonEmptyString),
    release_gate:          z.literal("actual_runtime_and_evaluation_required"),
  })
  .strict();

export type PilotPack = z.infer<typeof PilotPackSchema>;

// ── 10. ProjectBrief ──────────────────────────────────────────────────────────

export const ProjectBriefStatusEnum = z.enum([
  "draft",
  "submitted",
  "matched",
  "accepted",
  "cancelled",
]);
export type ProjectBriefStatus = z.infer<typeof ProjectBriefStatusEnum>;

export const ProjectBriefSchema = z
  .object({
    brief_id:         NonEmptyString,
    workspace_id:     NonEmptyString,
    deliverable_type: NonEmptyString,
    input_formats:    z.array(NonEmptyString),
    language:         NonEmptyString,
    review_required:  z.boolean(),
    requirements:     z.array(NonEmptyString),
    status:           ProjectBriefStatusEnum,
  })
  .strict();

export type ProjectBrief = z.infer<typeof ProjectBriefSchema>;

// ── 11. ServiceOffering ───────────────────────────────────────────────────────

export const PriceStatusEnum = z.enum(["quote_required", "fixed"]);
export type PriceStatus = z.infer<typeof PriceStatusEnum>;

export const ServiceOfferingSchema = z
  .object({
    offering_id:     NonEmptyString,
    listing_id:      NonEmptyString,
    creator_id:      NonEmptyString,
    mode:            OfferingModeEnum,
    deliverables:    z.array(NonEmptyString),
    exclusions:      z.array(NonEmptyString),
    required_inputs: z.array(NonEmptyString),
    human_review:    z.boolean(),
    price_status:    PriceStatusEnum,
  })
  .strict();

export type ServiceOffering = z.infer<typeof ServiceOfferingSchema>;

// ── 12. Gallery OpenAPI Request Schemas ───────────────────────────────────────

export const ForkCreateSchema = z
  .object({
    parent_release_id: NonEmptyString,
    display_name:      NonEmptyString,
    license_version:   NonEmptyString,
  })
  .strict();

export type ForkCreate = z.infer<typeof ForkCreateSchema>;

export const ComparisonCreateSchema = z
  .object({
    task_id:     NonEmptyString,
    release_ids: UniqueReleaseIdsSchema,
    data_scope:  DataScopeEnum,
  })
  .strict();

export type ComparisonCreate = z.infer<typeof ComparisonCreateSchema>;

export const ProjectCreateSchema = z
  .object({
    deliverable_type: NonEmptyString,
    input_formats:    z.array(NonEmptyString),
    language:         NonEmptyString,
    review_required:  z.boolean(),
    requirements:     z.array(NonEmptyString),
  })
  .strict();

export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;

export const V2_GALLERY_SCHEMAS = {
  BenchmarkTask: BenchmarkTaskSchema,
  CatalogEntry: CatalogEntrySchema,
  ComparisonSession: ComparisonSessionSchema,
  CreatorProfile: CreatorProfileSchema,
  ForkLineage: ForkLineageSchema,
  GalleryListing: GalleryListingSchema,
  MatchCandidate: MatchCandidateSchema,
  PersonaProfile: PersonaProfileSchema,
  PilotPack: PilotPackSchema,
  ProjectBrief: ProjectBriefSchema,
  ServiceOffering: ServiceOfferingSchema,
} as const;

