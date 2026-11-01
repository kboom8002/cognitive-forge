"use client";

import React, { useState } from "react";
import Link from "next/link";

const STEPS = [
  { id: 1, title: "1단계: 역할 및 납품 산출물 정의", desc: "에이전트 역할(A), 상황(S), 최종 산출물(O) 계약을 정의합니다." },
  { id: 2, title: "2단계: 입력 계약 및 판단 규칙 (TASKFLOW-CX 2.0)", desc: "필수 입력 스키마와 금기사항(W), 하드스톱, 실존 인물 비사칭 규칙을 설정합니다." },
  { id: 3, title: "3단계: 벤치마크 및 4단계 평가 게이트", desc: "결정론적 검증 규칙과 인용 정합성 기준을 실행합니다." },
  { id: 4, title: "4단계: 불변 릴리스 매니페스트 및 갤러리 게시", desc: "평가 통과(pass) 시에만 published_runnable 상태로 승격됩니다." },
];

export default function StudioNewAppPage() {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("계약 조항 리스크 진단 에이전트");
  const [actor, setActor] = useState("기업 법무·계약 리스크 검토 전문 에이전트");
  const [task, setTask] = useState("계약서 원문에서 독소 조항과 누락 보호 조항을 식별하고 근거 인용과 대체 문안을 제시한다.");
  const [watchouts, setWatchouts] = useState("출처 없는 조항 번호 생성 금지; 확정적 법률 자문 표현 금지");
  const [impersonationGuard] = useState(false);

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <p className="text-xs font-semibold uppercase text-indigo-600">Guided Creator Studio (D06)</p>
          <h1 className="text-2xl font-bold text-slate-900">새 에이전트 팩 4단계 가이드 빌더</h1>
        </div>
        <Link href="/studio/apps" className="text-sm text-slate-600 hover:text-slate-900">
          ← 목록으로 돌아가기
        </Link>
      </div>

      <nav className="grid grid-cols-4 gap-2">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(s.id)}
            className={`rounded-lg border p-3 text-left text-xs transition ${
              step === s.id
                ? "border-indigo-600 bg-indigo-50 font-semibold text-indigo-900"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            <div>Step {s.id}</div>
            <div className="mt-1 truncate">{s.title.replace(/^[0-9]단계:\s*/, "")}</div>
          </button>
        ))}
      </nav>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">{STEPS[step - 1]?.title}</h2>
        <p className="text-sm text-slate-600">{STEPS[step - 1]?.desc}</p>

        {step === 1 && (
          <div className="space-y-4">
            <label className="block text-sm">
              <span className="font-medium text-slate-800">에이전트 표시 이름</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-800">A (Actor / 역할 정의)</span>
              <input
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-800">T (Primary Task / 핵심 과업)</span>
              <textarea
                rows={3}
                value={task}
                onChange={(e) => setTask(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <label className="block text-sm">
              <span className="font-medium text-slate-800">W (Watchouts & Hard Stops)</span>
              <textarea
                rows={3}
                value={watchouts}
                onChange={(e) => setWatchouts(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              ✓ 실존 인물 사칭 금지 가드 적용됨 (<code>real_person_impersonation: {String(impersonationGuard)}</code>)
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="font-semibold text-slate-900">자동 자격 검증 게이트 (4-Stage Evaluation)</div>
              <ul className="mt-2 list-disc pl-5 text-xs text-slate-600 space-y-1">
                <li>Stage 1: 출력 JSON 스키마 및 필수 섹션 검증</li>
                <li>Stage 2: 결정론적 규칙 (근거 없는 주장 0건, 인용 커버리지 ≥ 90%)</li>
                <li>Stage 3: 모델 루브릭 채점 (정확성·완결성·근거성 평균 ≥ 0.80)</li>
                <li>Stage 4: 인간 전문가 검수 체크포인트 동작 확인</li>
              </ul>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-xs text-indigo-950 space-y-1">
              <div className="font-bold">릴리스 자격 상태 확인</div>
              <p>패키지: {title}</p>
              <p>역할(A): {actor}</p>
              <p>게이트 정책: 평가 미통과(not_run / fail) 시 <code>preview_only</code>로만 저장되며 <code>published_runnable</code> 승격이 차단됩니다 (GT06).</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 disabled:opacity-40"
          >
            이전 단계
          </button>
          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(4, s + 1))}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
            >
              다음 단계 →
            </button>
          ) : (
            <Link
              href="/studio/apps"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
            >
              초안 저장 완료
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
