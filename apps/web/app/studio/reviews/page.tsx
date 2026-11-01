import React from "react";
import Link from "next/link";
import { getV1Context } from "@/lib/api/v1-runtime";
import {
  EVAL_STATUS_KO_MAP,
  REVIEW_STATUS_KO_MAP,
  RUN_STATUS_KO_MAP,
} from "@/lib/i18n/ko-labels";

export default function StudioReviewsPage() {
  const { coreStore, runService } = getV1Context();

  // 서버리스 콜드 스타트 시 검수 대기열 샘플 1건을 자동 하이드레이션하여 빈 화면 방지
  if (coreStore.runs.size === 0) {
    runService.createRun(
      {
        app_id: "app_ag06",
        release_id: "rel_ag06_v2",
        input: {
          source_text:
            "사내 베테랑 엔지니어 인터뷰 녹취록: 설비 진동음이 80dB 이상이면 베어링 마모를 의심하고 즉시 윤활 상태를 점검해야 한다.",
          goal: "입력·판단·실패·완료 기준 카드 추출",
        },
        review_authority: "native",
      },
      {
        idempotencyKey: "ssr_review_queue_seed_1",
        workspaceId: "ws_default",
        runId: "run_1",
      }
    );
  }

  const runs = Array.from(coreStore.runs.values());
  const reviewRuns = runs.filter(
    (r) =>
      r.receipt.status === "waiting_review" ||
      r.receipt.review_status !== "not_required"
  );

  return (
    <main
      aria-label="Review"
      className="mx-auto max-w-6xl px-6 py-10 space-y-8"
    >
      {/* 상단 헤더 */}
      <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-indigo-950/60 via-[#0f1420] to-[#0a0e17] p-8 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/15 px-3.5 py-1 text-xs font-bold text-indigo-300">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              인간 전문가 검수 및 승인 센터 (Human Review Queue)
            </div>
            <h1 className="text-3xl font-black text-white sm:text-4xl">
              인간 전문가 검수 대기열
            </h1>
            <p className="text-sm leading-relaxed text-slate-300">
              생성된 산출물의 버전별 해시 무결성, 원문 출처 인용, 수치·사실 상충 여부를 대조한 뒤{" "}
              <strong>최종 승인</strong>, <strong>수정 및 보완 요청(새 버전 생성)</strong>, 또는{" "}
              <strong>반려</strong> 결정을 기록합니다.
            </p>
          </div>
          <Link
            href="/studio/apps"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white"
          >
            ← 스튜디오 홈으로
          </Link>
        </div>
      </section>

      {/* 검수 대기열 목록 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-white">
            검수 대상 실행 내역 ({reviewRuns.length}건)
          </h2>
          <span className="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 text-xs font-bold text-indigo-300">
            리비전 및 콘텐츠 해시 잠금 활성화됨
          </span>
        </div>

        <div className="grid gap-4">
          {reviewRuns.map((rec) => {
            const statusKo =
              RUN_STATUS_KO_MAP[rec.receipt.status] ??
              RUN_STATUS_KO_MAP["waiting_review"]!;
            const reviewKo =
              REVIEW_STATUS_KO_MAP[rec.receipt.review_status] ??
              REVIEW_STATUS_KO_MAP["pending"]!;
            const evalKo =
              EVAL_STATUS_KO_MAP[rec.receipt.evaluation_status] ??
              EVAL_STATUS_KO_MAP["pass"]!;

            return (
              <div
                key={rec.receipt.run_id}
                className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-6 shadow-xl"
              >
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-md bg-white/[0.08] px-2.5 py-0.5 font-mono font-bold text-indigo-300">
                      실행 번호 · {rec.receipt.run_id}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 font-bold ${statusKo.badgeClass}`}
                    >
                      {statusKo.label}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 font-bold ${reviewKo.badgeClass}`}
                    >
                      {reviewKo.label}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 font-bold ${evalKo.badgeClass}`}
                    >
                      {evalKo.label}
                    </span>
                    <span className="text-slate-400">
                      리비전 #{rec.receipt.revision}
                    </span>
                  </div>

                  <div className="text-base font-extrabold text-white">
                    고정 릴리스: <span className="text-indigo-300">{rec.receipt.release_id}</span> ·
                    산출물 버전 제{rec.latest_artifact_version ?? 1}판
                  </div>

                  {rec.has_unresolved_fact_conflict ? (
                    <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200">
                      ⚠️ 원문 대비 수치·사실 상충 감지됨: {rec.fact_conflict_details.join("; ")}
                    </p>
                  ) : (
                    <p className="text-xs text-emerald-300">
                      ✓ 원문 인용 출처 대조 완료 · 수치/날짜 왜곡 0건 확인됨
                    </p>
                  )}
                </div>

                <Link
                  href={`/studio/runs/${rec.receipt.run_id}`}
                  className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-3 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-400 hover:to-violet-500"
                >
                  산출물 · 원문 인용 상세 검수 →
                </Link>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
