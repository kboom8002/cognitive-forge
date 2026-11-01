"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function NewProjectBriefPage() {
  const [deliverableType, setDeliverableType] = useState("리스크 표와 대체 문안");
  const [language, setLanguage] = useState("ko");
  const [inputFormats, setInputFormats] = useState("pdf,docx");
  const [reviewRequired, setReviewRequired] = useState(true);
  const [requirements, setRequirements] = useState("독소 조항 식별; 원문 조항 번호 인용 필수");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

    const matchesRes = await fetch(`/api/v1/projects/${brief.brief_id}/matches`, {
      headers: {
        Authorization: "Bearer ws_customer_ui",
        "X-Workspace-Id": "ws_customer_ui",
      },
    });
    if (!matchesRes.ok) return;
    const matchData = await matchesRes.json();
    setSubmittedResult({
      brief_id: brief.brief_id,
      matches: matchData.items ?? [],
    });
  }

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <header className="flex items-center justify-between border-b pb-4">
        <div>
          <p className="text-xs font-semibold uppercase text-indigo-600">
            2-Stage Project Matching Engine (D25 · GX05)
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            프로젝트 브리프 작성 및 적격 오퍼링 매칭
          </h1>
          <p className="text-sm text-slate-600">
            1단계 하드 적격성 필터(산출물·언어·포맷·검수 포함 여부)를 통과한 후보만 추천하며, 양측 명시 수락 전까지 자동 계약되지 않습니다 (GT09, GT10).
          </p>
        </div>
        <Link href="/gallery" className="text-sm text-slate-600">
          ← 갤러리로
        </Link>
      </header>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 text-sm"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="font-semibold text-slate-800">희망 납품 산출물 유형 (deliverable_type)</span>
            <input
              value={deliverableType}
              onChange={(e) => setDeliverableType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="font-semibold text-slate-800">작업 언어 (language)</span>
            <input
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="font-semibold text-slate-800">입력 문서 포맷 (쉼표 구분)</span>
            <input
              value={inputFormats}
              onChange={(e) => setInputFormats(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              checked={reviewRequired}
              onChange={(e) => setReviewRequired(e.target.checked)}
            />
            <span className="font-semibold text-slate-800">인간 전문가 검수 필수 (review_required)</span>
          </label>
        </div>

        <label className="block">
          <span className="font-semibold text-slate-800">세부 요구사항 (세미콜론 구분)</span>
          <textarea
            rows={2}
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          브리프 제출 및 2단계 적격 매칭 실행
        </button>
      </form>

      {submittedResult && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">
            브리프 ({submittedResult.brief_id}) 적격 추천 후보 ({submittedResult.matches.length})
          </h2>
          {submittedResult.matches.map((m) => (
            <div
              key={m.offering_id}
              className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-indigo-700">{m.offering_id}</span>
                <span className="rounded bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                  eligible: {String(m.eligible)} (추천 상태 · 미체결)
                </span>
              </div>
              <div className="text-slate-700">추천 근거: {m.reasons.join(" · ")}</div>
              <div className="text-amber-800">
                확인 필요 사항: {m.needs_confirmation.join(" · ")}
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
