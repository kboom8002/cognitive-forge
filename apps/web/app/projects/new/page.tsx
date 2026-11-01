"use client";

import React, { useState } from "react";
import Link from "next/link";

const BRIEF_PRESETS = [
  {
    label: "사내 암묵지 인터뷰 구조화",
    deliverableType: "입력·판단·실패·완료 기준 카드",
    language: "ko",
    inputFormats: "pdf,docx",
    reviewRequired: true,
    requirements: "사내 숙련자 인터뷰 녹취록 구조화; 원문 출처 인용 필수; 전문가 검수 포함",
  },
  {
    label: "제안서 · 입찰 요구사항 빈틈 진단",
    deliverableType: "누락·근거 부족·수정 우선순위",
    language: "ko",
    inputFormats: "pdf,docx",
    reviewRequired: true,
    requirements: "제안요청서 대비 누락 항목 점검; 근거 없는 주장 식별",
  },
  {
    label: "기업 소개서 · 보도자료 패키지 제작",
    deliverableType: "기업 소개·제품 설명·PR 초안",
    language: "ko",
    inputFormats: "pdf,docx,txt",
    reviewRequired: true,
    requirements: "팩트시트 기반 보도자료 초안 작성; 과장 표현 배제",
  },
];

export default function NewProjectBriefPage() {
  const [deliverableType, setDeliverableType] = useState(
    BRIEF_PRESETS[0]!.deliverableType
  );
  const [language, setLanguage] = useState(BRIEF_PRESETS[0]!.language);
  const [inputFormats, setInputFormats] = useState(
    BRIEF_PRESETS[0]!.inputFormats
  );
  const [reviewRequired, setReviewRequired] = useState(
    BRIEF_PRESETS[0]!.reviewRequired
  );
  const [requirements, setRequirements] = useState(
    BRIEF_PRESETS[0]!.requirements
  );
  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<{
    brief_id: string;
    matches: Array<{
      offering_id: string;
      eligible: boolean;
      reasons: string[];
      unmet_conditions: string[];
      needs_confirmation: string[];
    }>;
  } | null>(null);

  function applyPreset(preset: (typeof BRIEF_PRESETS)[number]) {
    setDeliverableType(preset.deliverableType);
    setLanguage(preset.language);
    setInputFormats(preset.inputFormats);
    setReviewRequired(preset.reviewRequired);
    setRequirements(preset.requirements);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const idemKey = `ui_brief_${Date.now()}`;
      const createRes = await fetch("/api/v1/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer ws_customer_ui",
          "X-Workspace-Id": "ws_customer_ui",
          "Idempotency-Key": idemKey,
        },
        body: JSON.stringify({
          deliverable_type: deliverableType,
          input_formats: inputFormats
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          language,
          review_required: reviewRequired,
          requirements: requirements
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });

      if (!createRes.ok) return;
      const brief = await createRes.json();

      const matchesRes = await fetch(
        `/api/v1/projects/${brief.brief_id}/matches`,
        {
          headers: {
            Authorization: "Bearer ws_customer_ui",
            "X-Workspace-Id": "ws_customer_ui",
          },
        }
      );
      if (!matchesRes.ok) return;
      const matchData = await matchesRes.json();
      setSubmittedResult({
        brief_id: brief.brief_id,
        matches: matchData.items ?? [],
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      aria-label="Project"
      className="mx-auto max-w-5xl px-6 py-10 space-y-8"
    >
      {/* 상단 히어로 배너 */}
      <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-indigo-950/60 via-[#0f1420] to-[#0a0e17] p-8 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/15 px-3.5 py-1 text-xs font-bold text-indigo-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              2단계 적격성 검증 프로젝트 매칭 엔진 (Project Matching)
            </div>
            <h1 className="text-3xl font-black text-white sm:text-4xl">
              맞춤 프로젝트 브리프 작성 및 적격 오퍼링 매칭
            </h1>
            <p className="text-sm leading-relaxed text-slate-300">
              <strong>제1단계 하드 자격 필터</strong>(희망 산출물·언어·입력 문서 포맷·인간 전문가 검수 포함 여부)를 통과한 후보만 추천하며, 양측의 명시적 수락 전에는 어떠한 자동 계약도 체결되지 않습니다.
            </p>
          </div>
          <Link
            href="/gallery"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white"
          >
            ← 갤러리로 돌아가기
          </Link>
        </div>
      </section>

      {/* 1-클릭 업종별 프리셋 선택 바 */}
      <section className="rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-5 space-y-3">
        <div className="text-xs font-bold text-indigo-300">
          ✨ 자주 의뢰하는 기업 과제 프리셋 (클릭 시 자동 입력)
        </div>
        <div className="flex flex-wrap gap-2">
          {BRIEF_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                deliverableType === preset.deliverableType
                  ? "border-indigo-400 bg-indigo-500/20 text-white"
                  : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      {/* 브리프 작성 폼 */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-6 md:p-8 shadow-xl space-y-6 text-sm"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-xs font-bold text-slate-200">
              희망 납품 산출물 유형
            </span>
            <input
              value={deliverableType}
              onChange={(e) => setDeliverableType(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-[#090d16] px-4 py-3 text-sm font-medium text-white focus:border-indigo-400 focus:outline-none"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-bold text-slate-200">
              수행 및 납품 언어
            </span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-[#090d16] px-4 py-3 text-sm font-medium text-white focus:border-indigo-400 focus:outline-none"
            >
              <option value="ko">한국어 (ko)</option>
              <option value="en">영어 (en)</option>
              <option value="ja">일본어 (ja)</option>
            </select>
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-xs font-bold text-slate-200">
              제공 가능한 입력 문서 포맷 (쉼표로 구분)
            </span>
            <input
              value={inputFormats}
              onChange={(e) => setInputFormats(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-[#090d16] px-4 py-3 text-sm font-medium text-white focus:border-indigo-400 focus:outline-none"
            />
          </label>

          <div className="flex items-center pt-6">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-200">
              <input
                type="checkbox"
                checked={reviewRequired}
                onChange={(e) => setReviewRequired(e.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
              <span>도메인 인간 전문가 최종 검수 포함 필수</span>
            </label>
          </div>
        </div>

        <label className="block space-y-2">
          <span className="text-xs font-bold text-slate-200">
            세부 과업 요구사항 및 검수 조건 (세미콜론 ; 으로 구분)
          </span>
          <textarea
            rows={3}
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-[#090d16] px-4 py-3 text-sm font-medium text-white focus:border-indigo-400 focus:outline-none"
          />
        </label>

        <div className="flex items-center justify-between border-t border-white/[0.08] pt-5">
          <span className="text-xs text-slate-400">
            제출 즉시 36종 카탈로그 오퍼링을 대상으로 1단계 자격 필터와 2단계 적합도 매칭을 수행합니다.
          </span>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-3 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-400 hover:to-violet-500"
          >
            {submitting
              ? "적격 오퍼링 분석 중..."
              : "🚀 브리프 제출 및 2단계 적격 매칭 실행"}
          </button>
        </div>
      </form>

      {/* 매칭 결과 표시 */}
      {submittedResult && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-white">
              브리프({submittedResult.brief_id}) 적격 추천 오퍼링 ({submittedResult.matches.length}건)
            </h2>
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-300">
              1단계 하드 자격 필터 통과 완료
            </span>
          </div>

          <div className="grid gap-4">
            {submittedResult.matches.map((m) => (
              <div
                key={m.offering_id}
                className="rounded-2xl border border-emerald-500/30 bg-[#0f1420]/95 p-6 shadow-xl space-y-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm font-extrabold text-indigo-300">
                    추천 오퍼링 · {m.offering_id}
                  </span>
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 font-bold text-emerald-300">
                    ✓ 적격 판정 완료 (추천 상태 · 자동 계약 미체결)
                  </span>
                </div>

                <div className="rounded-xl bg-white/[0.04] p-3.5 text-slate-200">
                  <strong className="text-indigo-300">추천 근거:</strong>{" "}
                  {m.reasons.join(" · ")}
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-200">
                  <strong>계약 전 양측 확인 필요 사항:</strong>{" "}
                  {m.needs_confirmation.join(" · ")}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
