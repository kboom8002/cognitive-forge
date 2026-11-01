import React from "react";
import Link from "next/link";
import { getV1Context } from "@/lib/api/v1-runtime";

export default function StudioReviewsPage() {
  const { coreStore } = getV1Context();
  const runs = Array.from(coreStore.runs.values());
  const reviewRuns = runs.filter(
    (r) => r.receipt.status === "waiting_review" || r.receipt.review_status !== "not_required"
  );

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-center justify-between border-b pb-4">
        <div>
          <p className="text-xs font-semibold uppercase text-indigo-600">
            Human Review & Approval Queue (D12)
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            인간 전문가 검수 대기열 (Review Decisions)
          </h1>
          <p className="text-sm text-slate-600">
            산출물 버전(ArtifactVersion), 출처 인용(Citations), 팩트 충돌 보류(Fact Conflict)를 검수하고 승인·수정요청·반려를 기록합니다.
          </p>
        </div>
        <Link href="/studio/apps" className="text-sm text-slate-600 hover:text-slate-900">
          ← 스튜디오 홈
        </Link>
      </header>

      {reviewRuns.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          현재 검수 대기 중인 실행(waiting_review)이 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {reviewRuns.map((rec) => (
            <div
              key={rec.receipt.run_id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono font-bold text-indigo-700">{rec.receipt.run_id}</span>
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">
                    status: {rec.receipt.status} · review: {rec.receipt.review_status}
                  </span>
                  <span className="text-slate-500">rev #{rec.receipt.revision}</span>
                </div>
                <p className="text-sm font-medium text-slate-800">
                  Release: {rec.receipt.release_id} · Latest Artifact v{rec.latest_artifact_version ?? 1}
                </p>
                {rec.has_unresolved_fact_conflict && (
                  <p className="text-xs font-semibold text-rose-700">
                    ⚠️ 출처 간 수치/사실 충돌 감지됨: {rec.fact_conflict_details.join("; ")}
                  </p>
                )}
              </div>
              <Link
                href={`/studio/runs/${rec.receipt.run_id}`}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
              >
                산출물 및 인용 검수 →
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
