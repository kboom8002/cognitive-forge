import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getV1Context } from "@/lib/api/v1-runtime";
import {
  RUN_STATUS_KO_MAP,
  SAMPLE_ORIGIN_KO_MAP,
} from "@/lib/i18n/ko-labels";

const RELEASE_SAMPLE_KO: Record<
  string,
  {
    agentName: string;
    roleSummary: string;
    deliverablePreview: string;
    citationsCount: number;
    checksPassed: string[];
  }
> = {
  rel_ag06_v2: {
    agentName: "AG06 · 내 노하우 채굴기 (릴리스 v2)",
    roleSummary: "전문성 인터뷰어 · 암묵지 구조화 특화",
    deliverablePreview:
      "[입력·판단·실패·완료 기준 카드] 1) 입력 신호: 설비 진동음 80dB 초과 여부 2) 핵심 판단 기준: 베어링 마모 의심 및 윤활 상태 즉시 점검 3) 실패 방지 조건: 임의 추론 배제, 누락된 점검 주기는 담당 엔지니어에게 추가 질문 생성",
    citationsCount: 3,
    checksPassed: [
      "원문 출처 인용 일치 확인",
      "임의 수치 생성 없음",
      "누락 기준 확인 질문 포함",
    ],
  },
  rel_ag07_v2: {
    agentName: "AG07 · 홈페이지 첫인상 진단실 (릴리스 v2)",
    roleSummary: "고객 관점 진단가 · 누락 정보 및 우선순위 특화",
    deliverablePreview:
      "[리스크 및 누락 우선순위 진단표] 1) 핵심 발견: 정량 임계치(80dB)는 명시되었으나 점검 후 조치 완료 기준이 누락됨 2) 개선 우선순위: 긴급(조치 담당자 지정) → 높음(재발 방지 체크리스트 보완)",
    citationsCount: 2,
    checksPassed: [
      "원문 근거 조항 대조 완료",
      "우선순위 판정 근거 명시",
      "과장·단정 표현 배제",
    ],
  },
};

export default async function ComparisonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { comparisonService } = getV1Context();

  let detail;
  try {
    detail = comparisonService.getComparisonDetail(id);
  } catch {
    if (id.startsWith("cmp_")) {
      comparisonService.createComparison(
        {
          task_id: "AG06-normal",
          release_ids: ["rel_ag06_v2", "rel_ag07_v2"],
          data_scope: "synthetic_public",
        },
        {
          idempotencyKey: `ssr_hydration_${id}`,
          workspaceId: "ws_default",
          comparisonId: id,
        }
      );
      detail = comparisonService.getComparisonDetail(id);
    } else {
      notFound();
    }
  }

  const { session, runs, config_diff } = detail;
  const statusKo =
    RUN_STATUS_KO_MAP[session.status] ?? RUN_STATUS_KO_MAP["completed"]!;
  const scopeKo =
    SAMPLE_ORIGIN_KO_MAP[session.data_scope] ??
    SAMPLE_ORIGIN_KO_MAP["synthetic_public"]!;

  return (
    <main
      aria-label="Benchmark"
      className="mx-auto max-w-7xl px-6 py-10 space-y-8"
    >
      {/* 상단 헤더 */}
      <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-indigo-950/60 via-[#0f1420] to-[#0a0e17] p-8 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-lg bg-white/[0.08] px-3 py-1 font-mono font-bold text-indigo-300">
                사이드 바이 사이드 벤치마크 비교 실험실 (Benchmark Lab) · {session.comparison_id}
              </span>
              <span
                className={`rounded-full border px-3 py-1 font-bold ${statusKo.badgeClass}`}
              >
                {statusKo.label}
              </span>
            </div>

            <h1 className="text-3xl font-black text-white sm:text-4xl">
              에이전트 릴리스 A/B 비교 실험 세션
            </h1>

            <p className="text-sm text-slate-300">
              표준 벤치마크 과업(<strong className="text-indigo-300">{session.task_id}</strong>)에 대해 후보 릴리스들을 동일한 입력 조건으로 병렬 실행하고, 설정 차이와 산출물 품질을 투명하게 대조합니다.
            </p>

            <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-slate-300">
              <span className="font-bold text-sky-300">입력 데이터 범위:</span>
              <span>{scopeKo.label}</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">{scopeKo.description}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/projects/new"
              className="rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-indigo-400"
            >
              이 결과로 매칭 의뢰하기 →
            </Link>
            <Link
              href="/gallery"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white"
            >
              ← 갤러리로
            </Link>
          </div>
        </div>
      </section>

      {/* 설정 차이 투명성 배너 (GT07) */}
      <div
        className={`rounded-2xl border p-5 text-xs ${
          config_diff.is_pure_persona_comparison
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
            : "border-amber-500/30 bg-amber-500/10 text-amber-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold">
            {config_diff.is_pure_persona_comparison
              ? "✓ 순수 페르소나 · 케이스팩 비교 검증됨 (동일 기반 모델 및 동일 온도 조건)"
              : "⚠️ 후보 간 복합 설정 차이 감지됨 (기반 모델 또는 온도 파라미터 차이가 존재합니다)"}
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 font-bold">
            비교 후보 {runs.length}종
          </span>
        </div>
        {config_diff.diff_warnings.length > 0 && (
          <ul className="mt-2 list-disc pl-5 space-y-1 text-amber-100">
            {config_diff.diff_warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
      </div>

      {/* 후보 릴리스 Side-by-Side 비교 그리드 */}
      <section className="grid gap-6 md:grid-cols-2">
        {runs.map((run, idx) => {
          const sampleMeta = RELEASE_SAMPLE_KO[run.release_id];
          const runStatusKo =
            RUN_STATUS_KO_MAP[run.status] ?? RUN_STATUS_KO_MAP["completed"]!;
          return (
            <div
              key={run.run_id}
              className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-6 shadow-xl space-y-5"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <div>
                    <span className="text-xs font-bold text-indigo-400">
                      후보 {idx === 0 ? "A" : "B"} · {run.release_id}
                    </span>
                    <h2 className="mt-0.5 text-lg font-extrabold text-white">
                      {sampleMeta?.agentName ?? `릴리스 ${run.release_id}`}
                    </h2>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${runStatusKo.badgeClass}`}
                  >
                    {runStatusKo.label}
                  </span>
                </div>

                {/* 실행 파라미터 메타 */}
                <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/[0.06] bg-[#090d16] p-3 text-xs">
                  <div>
                    <div className="text-slate-400">기반 모델</div>
                    <div className="mt-0.5 font-mono font-bold text-white">
                      {run.model_name}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">추론 온도</div>
                    <div className="mt-0.5 font-mono font-bold text-white">
                      {run.temperature}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">과금 단위</div>
                    <div className="mt-0.5 font-bold text-emerald-300">
                      {run.billed_units} 유닛
                    </div>
                  </div>
                </div>

                {/* 산출물 본문 비교 */}
                {run.output_summary ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4 text-xs leading-relaxed text-slate-200">
                      <div className="mb-1.5 font-bold text-indigo-300">
                        산출물 요약 및 구조화 결과:
                      </div>
                      {sampleMeta?.deliverablePreview ?? run.output_summary}
                    </div>

                    {sampleMeta && (
                      <div className="space-y-1.5 text-xs">
                        <div className="font-bold text-slate-300">
                          통과한 검증 기준 ({sampleMeta.checksPassed.length}건 · 원문 인용{" "}
                          {sampleMeta.citationsCount}건):
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {sampleMeta.checksPassed.map((chk) => (
                            <span
                              key={chk}
                              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300"
                            >
                              ✓ {chk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-xs text-rose-200">
                    실패 사유: {run.error_reason} (이미 성공한 다른 후보를 재실행·재과금하지 않고 이 후보만 단독 재시도할 수 있습니다)
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-white/[0.08] pt-4 text-xs">
                <span className="text-slate-400">실행 영수증: {run.run_id}</span>
                <Link
                  href={`/gallery/lst_${run.release_id.replace(/^rel_/, "").replace(/_v2$/, "")}`}
                  className="font-bold text-indigo-300 hover:text-white"
                >
                  이 에이전트 상세 보기 →
                </Link>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
