import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getV1Context } from "@/lib/api/v1-runtime";

export default async function StudioRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { coreStore, runService } = getV1Context();
  let record = coreStore.runs.get(id);

  if (!record && id.startsWith("run_")) {
    runService.createRun(
      {
        app_id: "app_ag06",
        release_id: "rel_ag06_v2",
        input: {
          source_text: "사내 인터뷰 텍스트 샘플",
          goal: "암묵지 판단 기준 추출",
        },
        review_authority: "native",
      },
      {
        idempotencyKey: `ssr_hydration_${id}`,
        workspaceId: "ws_default",
        runId: id,
      }
    );
    record = coreStore.runs.get(id);
  }

  if (!record) {
    notFound();
  }

  const versionsMap = record.latest_artifact_id
    ? coreStore.artifactVersions.get(record.latest_artifact_id)
    : undefined;
  const artifacts = versionsMap ? Array.from(versionsMap.values()) : [];
  const decisions = coreStore.getReviewDecisions(id);

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-center justify-between border-b pb-4">
        <div>
          <span className="font-mono text-xs font-semibold text-indigo-600">
            Run Receipt · {record.receipt.run_id}
          </span>
          <h1 className="text-2xl font-bold text-slate-900">
            실행 상태 및 산출물 버전 이력 ({record.receipt.status})
          </h1>
        </div>
        <Link href="/studio/reviews" className="text-sm text-slate-600">
          ← 검수 대기열로
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-3 text-xs">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-slate-500">고정 릴리스 스냅샷 (Pinned Release)</div>
          <div className="mt-1 font-mono font-bold text-slate-900">
            {record.pinned_release.release_id}
          </div>
          <div className="text-slate-500 mt-1">
            Hash: {record.pinned_release.content_hash}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-slate-500">상태 및 리비전</div>
          <div className="mt-1 font-bold text-slate-900">
            {record.receipt.status} / review: {record.receipt.review_status}
          </div>
          <div className="text-slate-500 mt-1">
            Revision #{record.receipt.revision} · Eval: {record.receipt.evaluation_status}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-slate-500">체크포인트 진행 단계</div>
          <div className="mt-1 font-bold text-slate-900">
            Step {record.checkpoint_step_index} ({record.completed_steps.join(" → ") || "대기"})
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">
          산출물 버전 이력 ({artifacts.length})
        </h2>
        {artifacts.map((art) => {
          const revStatus = coreStore.getArtifactVersionReviewStatus(art.artifact_id, art.version);
          return (
            <div
              key={`${art.artifact_id}_v${art.version}`}
              className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900">
                  {art.artifact_id} · v{art.version} ({art.content_hash})
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                  review_status: {revStatus}
                </span>
              </div>
              <div className="text-slate-600">
                인용 출처(Evidence):{" "}
                {art.evidence.map((c) => `${String(c.source_id)} (${String(c.locator)})`).join(", ")}
              </div>
            </div>
          );
        })}
      </section>

      {decisions.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">
            검수 의사결정 감사 로그 ({decisions.length})
          </h2>
          {decisions.map((d) => (
            <div
              key={d.decision_id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs"
            >
              {d.decision_id} · Actor: {d.actor_id} · v{d.artifact_version} · Decision:{" "}
              <strong>{d.decision}</strong>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
