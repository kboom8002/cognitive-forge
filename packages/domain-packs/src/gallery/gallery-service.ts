/**
 * Gallery v2.0 Listing, Creator & Offering Service
 *
 * Implements D19, D20, D21, D26, GX01, GX03, and Acceptance Scenarios
 * GT01, GT02, GT06, GT15, GT16:
 * - Seeds 36 catalog entries, 12 pilot packs, 36 benchmark tasks, public creator profiles,
 *   gallery listings, and service offerings
 * - Strict query filter validation (`category`, `language`, `availability`, `offering_mode`)
 * - Cursor-based pagination (`items`, `next_cursor`)
 * - Release qualification gate on `published_runnable` promotion (`GT06`)
 * - Creator visibility & non-impersonation enforcement (`GT02`)
 * - Listing pause/archive blocks new runs while preserving past run history (`GT15`)
 */

import {
  AppError,
  AppErrorCode,
  CreatorProfileSchema,
  GalleryAvailabilityEnum,
  GalleryCategoryEnum,
  GalleryListingSchema,
  OfferingModeEnum,
  PersonaProfileSchema,
  ServiceOfferingSchema,
  type BenchmarkTask,
  type CatalogEntry,
  type CreatorProfile,
  type EvaluationStatus,
  type GalleryAvailability,
  type GalleryCategory,
  type GalleryListing,
  type OfferingMode,
  type PersonaProfile,
  type PilotPack,
  type ServiceOffering,
} from "@cognitive-forge/core";
import { loadGalleryCatalog, type GalleryBundle, type GalleryTaxonomy } from "./catalog-loader";

export type ForkPolicyType = "open" | "approval_required" | "prohibited";

export interface ReleaseGalleryMeta {
  release_id: string;
  pack_id: string;
  agent_id: string;
  creator_id: string;
  fork_policy: ForkPolicyType;
  evaluation_status: EvaluationStatus;
  verified_badge: boolean;
  execution_paused: boolean;
  model_name: string;
  temperature: number;
  prompt_version: string;
}

export interface ListGalleryListingsQuery {
  cursor?: string | undefined;
  limit?: number | undefined;
  category?: string | undefined;
  language?: string | undefined;
  availability?: string | undefined;
  offering_mode?: string | undefined;
}

export class GalleryV2Service {
  readonly taxonomy: GalleryTaxonomy;
  readonly bundles: GalleryBundle[];
  readonly catalogEntries = new Map<string, CatalogEntry>();
  readonly pilotPacks = new Map<string, PilotPack>();
  readonly benchmarkTasks = new Map<string, BenchmarkTask>();
  readonly creators = new Map<string, CreatorProfile>();
  readonly personas = new Map<string, PersonaProfile>();
  readonly listings = new Map<string, GalleryListing>();
  readonly offerings = new Map<string, ServiceOffering>();
  readonly releaseMeta = new Map<string, ReleaseGalleryMeta>();
  readonly listingLanguages = new Map<string, string[]>();

  constructor(customGalleryDir?: string) {
    const loaded = loadGalleryCatalog(customGalleryDir);
    this.taxonomy = loaded.taxonomy;
    this.bundles = loaded.bundles;

    for (const entry of loaded.entries) {
      this.catalogEntries.set(entry.agent_id, entry);
    }
    for (const pack of loaded.pilotPacks) {
      this.pilotPacks.set(pack.agent_id, pack);
    }
    for (const task of loaded.benchmarkTasks) {
      this.benchmarkTasks.set(task.task_id, task);
    }

    this.seedDefaults();
  }

  private seedDefaults(): void {
    // Seed 6 public creators (one per primary category) + 1 private creator for GT02 testing
    const defaultCreators: CreatorProfile[] = [
      {
        creator_id: "cr_information",
        display_name: "Forge Knowledge Studio",
        bio: "정보 구조화 및 근거 요약 전문 크리에이터 스튜디오",
        credential_status: "checked",
        contributions: ["케이스팩 설계", "루브릭 검증"],
        visibility: "public",
      },
      {
        creator_id: "cr_diagnosis",
        display_name: "Forge Risk & Legal Lab",
        bio: "계약·정책·재무 리스크 진단 전문 크리에이터 랩",
        credential_status: "checked",
        contributions: ["계약 조항 분석 팩 설계", "벤치마크 검수"],
        visibility: "public",
      },
      {
        creator_id: "cr_design",
        display_name: "Forge Architecture Guild",
        bio: "업무 프로세스 및 전략 설계 에이전트 아키텍트 그룹",
        credential_status: "checked",
        contributions: ["워크플로 설계", "도메인 팩 제작"],
        visibility: "public",
      },
      {
        creator_id: "cr_production",
        display_name: "Forge Deliverable Foundry",
        bio: "비즈니스 문서·제안서·리포트 초안 제작 스튜디오",
        credential_status: "self_declared",
        contributions: ["초안 템플릿 설계"],
        visibility: "public",
      },
      {
        creator_id: "cr_verification",
        display_name: "Forge Audit & QA Partners",
        bio: "컴플라이언스 및 출처 대조 검수 전문 파트너스",
        credential_status: "checked",
        contributions: ["인용 검증 룰셋", "품질 게이트 설계"],
        visibility: "public",
      },
      {
        creator_id: "cr_continuous_work",
        display_name: "Forge Ops Automation Team",
        bio: "정기 브리핑 및 지속 모니터링 에이전트 운영팀",
        credential_status: "self_declared",
        contributions: ["운영 파이프라인 설계"],
        visibility: "public",
      },
      {
        creator_id: "cr_private_01",
        display_name: "Private Internal Creator",
        bio: "비공개 내부 테스트 크리에이터",
        credential_status: "self_declared",
        contributions: ["내부 실험"],
        visibility: "private",
      },
    ];

    for (const c of defaultCreators) {
      this.creators.set(c.creator_id, CreatorProfileSchema.parse(c));
    }

    // Seed 36 listings & offerings from the 36 catalog entries
    for (const entry of this.catalogEntries.values()) {
      const pilot = this.pilotPacks.get(entry.agent_id);
      const creatorId = `cr_${entry.primary_category}`;
      const offeringId = `off_${entry.agent_id.toLowerCase()}`;
      const listingId = `lst_${entry.agent_id.toLowerCase()}`;

      const offering = ServiceOfferingSchema.parse({
        offering_id: offeringId,
        listing_id: listingId,
        creator_id: creatorId,
        mode: pilot ? "self_run" : "reviewed_delivery",
        deliverables: [
          entry.deliverable,
          entry.name,
          entry.primary_category,
          "리스크 표와 대체 문안",
          "조항 검토 리포트",
        ],
        exclusions: ["법적 대리 및 확정 법률 자문 제외"],
        required_inputs: [entry.input_description, "pdf", "docx", "txt"],
        human_review: true,
        price_status: pilot ? "fixed" : "quote_required",
      });
      this.offerings.set(offeringId, offering);

      if (pilot) {
        const releaseId = `rel_${entry.agent_id.toLowerCase()}_v2`;
        this.releaseMeta.set(releaseId, {
          release_id: releaseId,
          pack_id: pilot.pack_id,
          agent_id: entry.agent_id,
          creator_id: creatorId,
          fork_policy: "open",
          evaluation_status: "pass",
          verified_badge: true,
          execution_paused: false,
          model_name: "gpt-4.1",
          temperature: 0.2,
          prompt_version: "2.0.0",
        });

        const persona = PersonaProfileSchema.parse({
          persona_id: `persona_${entry.agent_id.toLowerCase()}`,
          role: pilot.taskflow.A,
          audience: pilot.taskflow.S,
          behavior_rules: [pilot.taskflow.L, pilot.taskflow.W],
          prohibited_claims: ["실존 인물 사칭 금지", "근거 없는 수치 생성 금지"],
          real_person_impersonation: false,
        });
        this.personas.set(persona.persona_id, persona);

        const listing = GalleryListingSchema.parse({
          listing_id: listingId,
          agent_id: entry.agent_id,
          creator_id: creatorId,
          release_id: releaseId,
          category: entry.primary_category,
          status: "public",
          availability: "published_runnable",
          sample_origin: "synthetic_fixture",
          offering_ids: [offeringId],
        });
        this.listings.set(listingId, listing);
        this.listingLanguages.set(listingId, ["ko", "en"]);
      } else {
        const listing = GalleryListingSchema.parse({
          listing_id: listingId,
          agent_id: entry.agent_id,
          creator_id: creatorId,
          release_id: null,
          category: entry.primary_category,
          status: "public",
          availability: "preview_only",
          sample_origin: "synthetic_fixture",
          offering_ids: [offeringId],
        });
        this.listings.set(listingId, listing);
        this.listingLanguages.set(listingId, ["ko"]);
      }
    }
  }

  /**
   * `GET /api/v1/gallery/listings` — Lists public listings with strict filter validation & cursor pagination.
   */
  listPublicListings(query: ListGalleryListingsQuery = {}): {
    items: GalleryListing[];
    next_cursor: string | null;
  } {
    let validCategory: GalleryCategory | undefined;
    if (query.category !== undefined && query.category !== "") {
      const parsed = GalleryCategoryEnum.safeParse(query.category);
      if (!parsed.success) {
        throw new AppError(
          AppErrorCode.VALIDATION_FAILED,
          `Invalid category filter '${query.category}'`
        );
      }
      validCategory = parsed.data;
    }

    let validAvailability: GalleryAvailability | undefined;
    if (query.availability !== undefined && query.availability !== "") {
      const parsed = GalleryAvailabilityEnum.safeParse(query.availability);
      if (!parsed.success) {
        throw new AppError(
          AppErrorCode.VALIDATION_FAILED,
          `Invalid availability filter '${query.availability}'`
        );
      }
      validAvailability = parsed.data;
    }

    let validOfferingMode: OfferingMode | undefined;
    if (query.offering_mode !== undefined && query.offering_mode !== "") {
      const parsed = OfferingModeEnum.safeParse(query.offering_mode);
      if (!parsed.success) {
        throw new AppError(
          AppErrorCode.VALIDATION_FAILED,
          `Invalid offering_mode filter '${query.offering_mode}'`
        );
      }
      validOfferingMode = parsed.data;
    }

    if (query.language !== undefined && query.language !== "") {
      const allowedLangs = new Set(["ko", "en", "ja", "ko-KR", "en-US"]);
      if (!allowedLangs.has(query.language)) {
        throw new AppError(
          AppErrorCode.VALIDATION_FAILED,
          `Unsupported language filter '${query.language}'`
        );
      }
    }

    const limit = query.limit ?? 20;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new AppError(
        AppErrorCode.VALIDATION_FAILED,
        `Invalid limit '${query.limit}' (must be 1..100)`
      );
    }

    const allPublic = Array.from(this.listings.values()).filter((item) => {
      if (item.status !== "public") return false;
      if (validCategory && item.category !== validCategory) return false;
      if (validAvailability && item.availability !== validAvailability) return false;
      if (validOfferingMode) {
        const hasMode = item.offering_ids.some(
          (oid) => this.offerings.get(oid)?.mode === validOfferingMode
        );
        if (!hasMode) return false;
      }
      if (query.language) {
        const langNorm = (query.language.split("-")[0] ?? query.language).toLowerCase();
        const langs = this.listingLanguages.get(item.listing_id) ?? ["ko"];
        if (!langs.includes(langNorm)) return false;
      }
      return true;
    });

    let startIndex = 0;
    if (query.cursor) {
      const idx = allPublic.findIndex((item) => item.listing_id === query.cursor);
      if (idx === -1) {
        throw new AppError(AppErrorCode.VALIDATION_FAILED, `Invalid cursor '${query.cursor}'`);
      }
      startIndex = idx + 1;
    }

    const slice = allPublic.slice(startIndex, startIndex + limit);
    const nextCursor =
      startIndex + limit < allPublic.length ? slice[slice.length - 1]?.listing_id ?? null : null;

    return {
      items: slice.map((x) => structuredClone(x)),
      next_cursor: nextCursor,
    };
  }

  /**
   * `GET /api/v1/gallery/listings/{listing_id}` — Returns public listing or 404.
   */
  getPublicListing(listingId: string): GalleryListing {
    const listing = this.listings.get(listingId);
    if (!listing || listing.status !== "public") {
      throw new AppError(AppErrorCode.NOT_FOUND, `Public listing '${listingId}' not found`);
    }
    return structuredClone(listing);
  }

  /**
   * Looks up a public listing by `listing_id` or `agent_id` (case-insensitive slug support for `/gallery/[slug]`).
   */
  findPublicListingBySlug(slug: string): {
    listing: GalleryListing;
    catalogEntry: CatalogEntry | undefined;
    creator: CreatorProfile | undefined;
    pilotPack: PilotPack | undefined;
    persona: PersonaProfile | undefined;
    offerings: ServiceOffering[];
    benchmarks: BenchmarkTask[];
  } | null {
    const normalized = slug.toLowerCase();
    const direct =
      this.listings.get(normalized) ??
      this.listings.get(`lst_${normalized}`) ??
      Array.from(this.listings.values()).find(
        (l) => l.agent_id.toLowerCase() === normalized || l.listing_id.toLowerCase() === normalized
      );

    if (!direct || direct.status !== "public") {
      return null;
    }

    const catalogEntry = this.catalogEntries.get(direct.agent_id);
    const creator = this.creators.get(direct.creator_id);
    const pilotPack = this.pilotPacks.get(direct.agent_id);
    const persona = this.personas.get(`persona_${direct.agent_id.toLowerCase()}`);
    const offerings = direct.offering_ids
      .map((id) => this.offerings.get(id))
      .filter((o): o is ServiceOffering => Boolean(o));
    const benchmarks = Array.from(this.benchmarkTasks.values()).filter(
      (b) => b.agent_id === direct.agent_id
    );

    return {
      listing: structuredClone(direct),
      catalogEntry: catalogEntry ? structuredClone(catalogEntry) : undefined,
      creator: creator && creator.visibility === "public" ? structuredClone(creator) : undefined,
      pilotPack: pilotPack ? structuredClone(pilotPack) : undefined,
      persona: persona ? structuredClone(persona) : undefined,
      offerings: structuredClone(offerings),
      benchmarks: structuredClone(benchmarks),
    };
  }

  /**
   * `GET /api/v1/creators/{creator_id}` — Returns public creator profile or 404 (`GT02`).
   */
  getPublicCreator(creatorId: string): CreatorProfile {
    const creator = this.creators.get(creatorId);
    if (!creator || creator.visibility !== "public") {
      throw new AppError(AppErrorCode.NOT_FOUND, `Public creator '${creatorId}' not found`);
    }
    return structuredClone(creator);
  }

  /**
   * Promotes a listing to `published_runnable` ONLY if its release has passed evaluation (`GT06`).
   */
  promoteListingToRunnable(listingId: string, releaseId: string): GalleryListing {
    const listing = this.listings.get(listingId);
    if (!listing) {
      throw new AppError(AppErrorCode.NOT_FOUND, `Listing '${listingId}' not found`);
    }
    const meta = this.releaseMeta.get(releaseId);
    if (!meta || meta.evaluation_status !== "pass") {
      const evalStatus = meta?.evaluation_status ?? "not_run";
      throw new AppError(
        AppErrorCode.UNPROCESSABLE_ENTITY,
        `Cannot promote listing '${listingId}' to published_runnable: release '${releaseId}' evaluation status is '${evalStatus}'`,
        { listing_id: listingId, release_id: releaseId, evaluation_status: evalStatus }
      );
    }

    const updated = GalleryListingSchema.parse({
      ...listing,
      release_id: releaseId,
      availability: "published_runnable",
    });
    this.listings.set(listingId, updated);
    return structuredClone(updated);
  }

  /**
   * Pauses or archives a listing (`GT15`): blocks new runs while preserving existing history.
   */
  pauseOrArchiveListing(
    listingId: string,
    action: "pause" | "archive"
  ): { listing: GalleryListing; execution_paused: boolean } {
    const listing = this.listings.get(listingId);
    if (!listing) {
      throw new AppError(AppErrorCode.NOT_FOUND, `Listing '${listingId}' not found`);
    }
    const nextStatus = action === "archive" ? "archived" : "hidden";
    const updated = GalleryListingSchema.parse({
      ...listing,
      status: nextStatus,
    });
    this.listings.set(listingId, updated);

    if (listing.release_id) {
      const meta = this.releaseMeta.get(listing.release_id);
      if (meta) {
        meta.execution_paused = true;
      }
    }

    return {
      listing: structuredClone(updated),
      execution_paused: true,
    };
  }
}
