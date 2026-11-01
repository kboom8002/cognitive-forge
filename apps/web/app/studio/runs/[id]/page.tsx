import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getV1Context } from "@/lib/api/v1-runtime";
import {
  EVAL_STATUS_KO_MAP,
  REVIEW_STATUS_KO_MAP,
  RUN_STATUS_KO_MAP,
} from "@/lib/i18n/ko-labels";

const STEP_NAME_KO: Record<string, string> = {
  step_1: "1. 입력 점검",
  step_2: "2. 누락 확인",
  step_3: "3. 과업 수행",
  step_4: "4. 규칙 검사",
  step_5: "5. 산출물 생성",
  input_validation: "1. 입력 계약 검증",
  evidence_extraction: "2. 원문 출처 인용 추출",
  deliverable_synthesis: "3. 정형 산출물 합성",
  fact_conflict_check: "4. 수치·사실 상충 검사",
  evaluation_gate: "5. 벤치마크 루브릭 평가",
};

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
          source_text:
            "사내 베테랑 엔지니어 인터뷰 녹취록: 설비 진동음이 80dB 이상이면 베어링 마모를 의심하고 즉시 윤활 상태를 점검해야 한다.",
          goal: "암묵지 판단 기준 카드 추출",
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

  const statusKo =
    RUN_STATUS_KO_MAP[record.receipt.status] ??
    RUN_STATUS_KO_MAP["waiting_review"]!;
  const reviewKo =
    REVIEW_STATUS_KO_MAP[record.receipt.review_status] ??
    REVIEW_STATUS_KO_MAP["pending"]!;
  const evalKo =
    EVAL_STATUS_KO_MAP[record.receipt.evaluation_status] ??
    EVAL_STATUS_KO_MAP["pass"]!;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
      {/* 상단 헤더 */}
      <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-indigo-950/60 via-[#0f1420] to-[#0a0e17] p-8 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-lg bg-white/[0.08] px-3 py-1 font-mono font-bold text-indigo-300">
                실행 영수증 · {record.receipt.run_id}
              </span>
              <span
                className={`rounded-full border px-3 py-1 font-bold ${statusKo.badgeClass}`}
              >
                {statusKo.label}
              </span>
              <span
                className={`rounded-full border px-3 py-1 font-bold ${reviewKo.badgeClass}`}
              >
                {reviewKo.label}
              </span>
            </div>
            <h1 className="text-3xl font-black text-white">
              실행 영수증 및 산출물 버전 · 원문 인용 감사
            </h1>
            <p className="text-sm text-slate-300">
              실행 시작 시점에 고정된 불변 릴리스 스냅샷과 산출물의 원문 인용 출처를 검증합니다.
            </p>
          </div>
          <Link
            href="/studio/reviews"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white"
          >
            ← 검수 대기열로 돌아가기
          </Link>
        </div>
      </section>

      {/* 핵심 메타 3단 카드 */}
      <section className="grid gap-4 md:grid-cols-3 text-xs">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-5 space-y-1.5">
          <div className="text-slate-400 font-bold">고정 릴리스 스냅샷</div>
          <div className="font-mono text-base font-extrabold text-white">
            {record.pinned_release.release_id}
          </div>
          <div className="font-mono text-[11px] text-indigo-300 truncate">
            무결성 해시: {record.pinned_release.content_hash}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-5 space-y-1.5">
          <div className="text-slate-400 font-bold">리비전 및 평가 상태</div>
          <div className="text-base font-extrabold text-white">
            리비전 #{record.receipt.revision} · {evalKo.label}
          </div>
          <div className="text-emerald-300">
            동시성 잠금(CAS) 보호 적용 중
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-5 space-y-1.5">
          <div className="text-slate-400 font-bold">체크포인트 완료 공정</div>
          <div className="text-base font-extrabold text-white">
            총 {record.checkpoint_step_index}단계 완료
          </div>
          <div className="text-slate-300">
            {record.completed_steps
              .map((s) => STEP_NAME_KO[s] ?? s)
              .join(" → ") || "대기 중"}
          </div>
        </div>
      </section>

      {/* 산출물 버전 이력 */}
      <section className="space-y-4">
        <h2 className="text-xl font-extrabold text-white">
          생성된 산출물 버전 및 원문 인용 내역 ({artifacts.length}건)
        </h2>
        {artifacts.map((art) => {
          const revStatus =
            coreStore.getArtifactVersionReviewStatus(
              art.artifact_id,
              art.version
            ) ?? "pending";
          const artRevKo =
            REVIEW_STATUS_KO_MAP[revStatus] ?? REVIEW_STATUS_KO_MAP["pending"]!;
          return (
            <div
              key={`${art.artifact_id}_v${art.version}`}
              className="rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-6 shadow-xl space-y-4 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-extrabold text-indigo-300">
                    산출물 {art.artifact_id} · 제{art.version}판
                  </span>
                  <span className="rounded bg-white/[0.06] px-2.5 py-0.5 font-mono text-[11px] text-slate-300">
                    콘텐츠 해시: {art.content_hash}
                  </span>
                </div>
                <span
                  className={`rounded-full border px-3 py-0.5 font-bold ${artRevKo.badgeClass}`}
                >
                  {artRevKo.label}
                </span>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 space-y-2">
                <div className="font-extrabold text-emerald-300">
                  ✓ 고정된 원문 인용 출처 ({art.evidence.length}건)
                </div>
                <div className="flex flex-wrap gap-2">
                  {art.evidence.map((c, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-emerald-200"
                    >
                      출처 ID: {String(c.source_id)} · 위치: {String(c.locator)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {decisions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-extrabold text-white">
            검수 의사결정 감사 로그 ({decisions.length}건)
          </h2>
          {decisions.map((d) => (
            <div
              key={d.decision_id}
              className="rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-4 text-xs text-slate-200"
            >
              결정 ID: <strong>{d.decision_id}</strong> · 검수자: {d.actor_id} · 대상 산출물 제
              {d.artifact_version}판 · 판정: <strong className="text-emerald-300">{d.decision}</strong>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
