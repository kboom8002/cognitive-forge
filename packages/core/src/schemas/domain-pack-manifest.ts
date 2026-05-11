/**
 * DomainPackManifestSchema — the top-level manifest for a Domain Pack.
 *
 * A Domain Pack bundles a set of CasePacks, BridgeCasePacks, and App Objects
 * into a single installable unit. The manifest declares:
 * - All assets included in the pack
 * - The primary app that users are taken to after install
 *
 * CROSS-REFERENCE RULE (doc 05):
 *   primary_app_slug must resolve to an entry in assets.apps.
 *   Enforced via superRefine.
 *
 * ISOLATION: manifest_json is a FORBIDDEN public key.
 */

import { z } from "zod";
import {
  PackKeySchema,
  CasePackKeySchema,
  BridgeKeySchema,
  GraphKeySchema,
  SlugSchema,
  SemVerSchema,
  PackStatusSchema,
  ISODateTimeSchema,
} from "./primitives";

// ── App asset reference ───────────────────────────────────────────────────────

/**
 * A lightweight reference to an App Object included in the pack.
 * The full AppObject definition is stored in the database — this is
 * the manifest declaration that the pack includes it.
 */
const PackAppRefSchema = z.object({
  /** URL-safe app slug — must be unique within the platform. */
  slug: SlugSchema,

  /** The CasePack this app executes (if type: "casepack"). */
  casepack_key: CasePackKeySchema.optional(),

  /** The Graph this app executes (if type: "graph"). */
  graph_key: GraphKeySchema.optional(),

  /** Human-readable title for display in the pack catalogue. */
  title: z.string().min(1).optional(),
});

// ── Schema ────────────────────────────────────────────────────────────────────

export const DomainPackManifestSchema = z
  .object({
    /** Unique pack key. Format: pack.<name>.v<version> */
    key: PackKeySchema,

    /** Semantic version of this manifest. */
    version: SemVerSchema,

    /** Lifecycle status. */
    status: PackStatusSchema,

    /**
     * The slug of the app to open by default after pack installation.
     * REQUIRED. Must resolve to an entry in assets.apps.
     */
    primary_app_slug: SlugSchema,

    assets: z.object({
      /**
       * All App Objects included in this pack.
       * Must be non-empty — a pack with no apps is meaningless.
       */
      apps: z.array(PackAppRefSchema).min(1, {
        message: "DomainPackManifest must include at least one app in assets.apps",
      }),

      /** All CasePacks included in this pack. */
      casepacks: z.array(CasePackKeySchema),

      /** All BridgeCasePacks included in this pack (optional). */
      bridges: z.array(BridgeKeySchema).optional(),

      /** All Graphs included in this pack (optional). */
      graphs: z.array(GraphKeySchema).optional(),
    }),

    metadata: z
      .object({
        title: z.string().min(1),
        description: z.string().optional(),
        author: z.string().optional(),
        tags: z.array(z.string()).optional(),
        created_at: ISODateTimeSchema.optional(),
        updated_at: ISODateTimeSchema.optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    // RULE: primary_app_slug must exist in assets.apps
    const appSlugs = new Set(data.assets.apps.map((a) => a.slug));
    if (!appSlugs.has(data.primary_app_slug)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `primary_app_slug "${data.primary_app_slug}" does not match any entry in assets.apps (found: ${[...appSlugs].join(", ")})`,
        path: ["primary_app_slug"],
      });
    }
  });

export type DomainPackManifest = z.infer<typeof DomainPackManifestSchema>;
