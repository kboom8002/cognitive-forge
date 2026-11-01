/**
 * Live Production E2E Golden Test Runner (`https://cognitive-forge-two.vercel.app`)
 *
 * Executes live HTTP E2E golden path requests against the deployed Vercel production URL
 * covering:
 * - Health & v1 Public Suite APIs
 * - Core v2.0 OpenAPI (`/api/v1/capabilities`, `/api/v1/runs`, `/api/v1/artifacts/...`)
 * - Gallery v2.0 OpenAPI (`/api/v1/gallery/listings`, `/creators/...`, `/gallery/forks`, `/gallery/comparisons`, `/projects`)
 * - Public UI Pages (`/demo`, `/gallery`, `/gallery/[slug]`, `/creators/[id]`, `/compare/[id]`, `/projects/new`, `/studio/*`)
 * - Zero internal IP leakage check across all public responses
 */

import { FORBIDDEN_PUBLIC_KEYS } from "@cognitive-forge/validation";

const BASE_URL = process.env["LIVE_BASE_URL"] ?? "https://cognitive-forge-two.vercel.app";

interface StepResult {
  id: string;
  name: string;
  method: string;
  path: string;
  status: number;
  passed: boolean;
  detail: string;
}

function hasForbiddenKey(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const hit = hasForbiddenKey(item);
      if (hit) return hit;
    }
    return null;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if ((FORBIDDEN_PUBLIC_KEYS as readonly string[]).includes(k)) {
      return k;
    }
    const nested = hasForbiddenKey(v);
    if (nested) return nested;
  }
  return null;
}

async function main(): Promise<void> {
  const results: StepResult[] = [];
  const idemSuffix = Date.now().toString(36);

  async function checkJson(
    id: string,
    name: string,
    method: string,
    path: string,
    init: RequestInit,
    validate: (status: number, body: Record<string, unknown>) => { ok: boolean; detail: string }
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`${BASE_URL}${path}`, init);
    const body = (await res.json()) as Record<string, unknown>;
    const v = validate(res.status, body);
    results.push({
      id,
      name,
      method,
      path,
      status: res.status,
      passed: v.ok,
      detail: v.detail,
    });
    return body;
  }

  async function checkHtml(
    id: string,
    name: string,
    path: string,
    expectedText: string
  ): Promise<void> {
    const res = await fetch(`${BASE_URL}${path}`);
    const text = await res.text();
    const ok = res.status === 200 && text.includes(expectedText);
    results.push({
      id,
      name,
      method: "GET",
      path,
      status: res.status,
      passed: ok,
      detail: ok ? `Rendered 200 OK (matched "${expectedText}")` : `Status ${res.status}`,
    });
  }

  // 1. GET /api/health
  await checkJson("E2E-01", "System Health Check", "GET", "/api/health", {}, (status, body) => ({
    ok: status === 200 && body["status"] === "ok",
    detail: `status=${body["status"]}`,
  }));

  // 2. GET /api/v1/capabilities
  await checkJson(
    "E2E-02",
    "Core v2.0 Capabilities Discovery",
    "GET",
    "/api/v1/capabilities",
    {},
    (status, body) => {
      const versions = body["schema_versions"] as string[] | undefined;
      return {
        ok: status === 200 && Array.isArray(versions) && versions.includes("2.0"),
        detail: `schema_versions=${JSON.stringify(versions)}`,
      };
    }
  );

  // 3. GET /api/v1/gallery/listings?limit=50
  await checkJson(
    "E2E-03",
    "Gallery v2.0 Public Catalog (36 Listings + Sanitization)",
    "GET",
    "/api/v1/gallery/listings?limit=50",
    {},
    (status, body) => {
      const items = (body["items"] as Array<Record<string, unknown>>) ?? [];
      const runnable = items.filter((i) => i["availability"] === "published_runnable").length;
      const preview = items.filter((i) => i["availability"] === "preview_only").length;
      const leaked = hasForbiddenKey(body);
      return {
        ok: status === 200 && items.length === 36 && runnable === 12 && preview === 24 && !leaked,
        detail: `total=${items.length}, runnable=${runnable}, preview=${preview}, leaked=${leaked ?? "none"}`,
      };
    }
  );

  // 4. GET /api/v1/gallery/listings/lst_ag06
  await checkJson(
    "E2E-04",
    "Gallery v2.0 Single Listing Detail (AG06)",
    "GET",
    "/api/v1/gallery/listings/lst_ag06",
    {},
    (status, body) => ({
      ok: status === 200 && body["listing_id"] === "lst_ag06" && body["availability"] === "published_runnable",
      detail: `listing_id=${body["listing_id"]}, slug=${body["slug"]}`,
    })
  );

  // 5. GET /api/v1/creators/cr_information
  await checkJson(
    "E2E-05",
    "Gallery v2.0 Public Creator Profile (cr_information)",
    "GET",
    "/api/v1/creators/cr_information",
    {},
    (status, body) => ({
      ok: status === 200 && body["creator_id"] === "cr_information" && body["visibility"] === "public",
      detail: `creator_id=${body["creator_id"]}, display_name=${body["display_name"]}`,
    })
  );

  // 6. POST /api/v1/runs (Execute Pilot Pack AG06)
  const runBody = await checkJson(
    "E2E-06",
    "Core v2.0 Create & Execute Run (AG06)",
    "POST",
    "/api/v1/runs",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": `live_run_${idemSuffix}`,
        "X-Workspace-Id": "ws_live_e2e",
      },
      body: JSON.stringify({
        app_id: "app_ag06",
        release_id: "rel_ag06_v2",
        input: {
          source_text: "사내 베테랑 엔지니어 인터뷰 녹취록: 설비 진동음이 80dB 이상이면 베어링 마모를 의심해야 한다.",
          goal: "암묵지 판단 기준 카드 추출",
        },
        review_authority: "native",
      }),
    },
    (status, body) => ({
      ok: status === 202 && body["status"] === "waiting_review" && body["evaluation_status"] === "pass",
      detail: `run_id=${body["run_id"]}, status=${body["status"]}, eval=${body["evaluation_status"]}`,
    })
  );

  // 7. POST /api/v1/gallery/forks
  await checkJson(
    "E2E-07",
    "Gallery v2.0 Create Private Draft Fork (No Data/Badge Inheritance)",
    "POST",
    "/api/v1/gallery/forks",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer ws_live_e2e",
        "X-Workspace-Id": "ws_live_e2e",
        "Idempotency-Key": `live_fork_${idemSuffix}`,
      },
      body: JSON.stringify({
        parent_release_id: "rel_ag06_v2",
        display_name: "Live Production Fork AG06",
        license_version: "2.0",
      }),
    },
    (status, body) => ({
      ok:
        status === 201 &&
        body["copied_customer_data"] === false &&
        body["inherited_verified_badge"] === false,
      detail: `fork_id=${body["fork_id"]}, child_release_id=${body["child_release_id"]}`,
    })
  );

  // 8. POST /api/v1/gallery/comparisons
  const cmpBody = await checkJson(
    "E2E-08",
    "Gallery v2.0 Side-by-Side A/B Benchmark Comparison",
    "POST",
    "/api/v1/gallery/comparisons",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer ws_live_e2e",
        "X-Workspace-Id": "ws_live_e2e",
        "Idempotency-Key": `live_cmp_${idemSuffix}`,
      },
      body: JSON.stringify({
        task_id: "AG06-normal",
        release_ids: ["rel_ag06_v2", "rel_ag07_v2"],
        data_scope: "synthetic_public",
      }),
    },
    (status, body) => ({
      ok: status === 202 && body["status"] === "completed" && Array.isArray(body["run_ids"]),
      detail: `comparison_id=${body["comparison_id"]}, status=${body["status"]}`,
    })
  );

  // 9. POST /api/v1/projects & GET /api/v1/projects/{brief_id}/matches
  const briefBody = await checkJson(
    "E2E-09",
    "Gallery v2.0 Submit ProjectBrief",
    "POST",
    "/api/v1/projects",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer ws_live_e2e",
        "X-Workspace-Id": "ws_live_e2e",
        "Idempotency-Key": `live_brief_${idemSuffix}`,
      },
      body: JSON.stringify({
        deliverable_type: "입력·판단·실패·완료 기준 카드",
        input_formats: ["pdf", "docx"],
        language: "ko",
        review_required: true,
        requirements: ["사내 암묵지 구조화", "전문가 검수"],
      }),
    },
    (status, body) => ({
      ok: status === 201 && body["status"] === "submitted",
      detail: `brief_id=${body["brief_id"]}, workspace_id=${body["workspace_id"]}`,
    })
  );

  // 10. GET /api/v1/projects/{brief_id}/matches
  await checkJson(
    "E2E-10",
    "Gallery v2.0 2-Stage Project Matching",
    "GET",
    `/api/v1/projects/${String(briefBody["brief_id"] ?? "brief_1")}/matches`,
    {
      headers: {
        Authorization: "Bearer ws_live_e2e",
        "X-Workspace-Id": "ws_live_e2e",
      },
    },
    (status, body) => {
      const items = (body["items"] as Array<Record<string, unknown>>) ?? [];
      const leaked = hasForbiddenKey(body);
      return {
        ok: status === 200 && items.length > 0 && items[0]?.["eligible"] === true && !leaked,
        detail: `matches=${items.length}, top_score=${items[0]?.["score"]}, leaked=${leaked ?? "none"}`,
      };
    }
  );

  // 11. Live UI Pages
  await checkHtml("E2E-11", "Public Demo Hub (/demo)", "/demo", "Cognitive Forge");
  await checkHtml("E2E-12", "Gallery v2.0 Explorer (/gallery)", "/gallery", "Agent Gallery");
  await checkHtml(
    "E2E-13",
    "Gallery v2.0 Listing Detail (/gallery/lst_ag06)",
    "/gallery/lst_ag06",
    "lst_ag06"
  );
  await checkHtml(
    "E2E-14",
    "Creator Profile Page (/creators/cr_information)",
    "/creators/cr_information",
    "Forge Knowledge Studio"
  );
  await checkHtml(
    "E2E-15",
    `Benchmark A/B Compare Page (/compare/${String(cmpBody["comparison_id"] ?? "cmp_1")})`,
    `/compare/${String(cmpBody["comparison_id"] ?? "cmp_1")}`,
    "Benchmark"
  );
  await checkHtml(
    "E2E-16",
    "Project Brief & Matching Page (/projects/new)",
    "/projects/new",
    "Project"
  );
  await checkHtml("E2E-17", "Studio Apps Console (/studio/apps)", "/studio/apps", "Studio");
  await checkHtml("E2E-18", "Studio Review Queue (/studio/reviews)", "/studio/reviews", "Review");
  await checkHtml("E2E-19", "Studio Fork Lineage (/studio/forks)", "/studio/forks", "Fork");

  const failed = results.filter((r) => !r.passed);
  console.log(
    JSON.stringify(
      {
        target_url: BASE_URL,
        total_checks: results.length,
        passed_checks: results.length - failed.length,
        failed_checks: failed.length,
        sample_run_id: runBody["run_id"],
        results,
      },
      null,
      2
    )
  );

  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
