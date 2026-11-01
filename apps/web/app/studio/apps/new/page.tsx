"use client";

import React, { useState } from "react";
import Link from "next/link";

const STEPS = [
  {
    id: 1,
    badge: "제1단계",
    title: "전문 역할 및 납품 산출물 정의",
    desc: "에이전트의 전문 역할(A), 수행 범위(S), 핵심 납품 산출물(T) 계약을 정의합니다.",
  },
  {
    id: 2,
    badge: "제2단계",
    title: "실패 방지 규칙 및 윤리 가드레일",
    desc: "임의 추론 금지 규칙(W), 실행 중단 조건(F), 실존 인물 비사칭 윤리 기준을 설정합니다.",
  },
  {
    id: 3,
    badge: "제3단계",
    title: "공인 벤치마크 및 4단계 평가 게이트",
    desc: "정상·입력누락·사실상충 3종 시나리오와 원문 인용 정합성 검증 기준을 연결합니다.",
  },
  {
    id: 4,
    badge: "제4단계",
    title: "불변 릴리스 매니페스트 및 게시 자격 확인",
    desc: "모든 평가 게이트를 통과한 경우에만 즉시 실행 가능(published_runnable) 상태로 승격됩니다.",
  },
];

export default function StudioNewAppPage() {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("기업 계약 조항 리스크 진단 에이전트");
  const [actor, setActor] = useState("기업 법무 · 계약 리스크 검토 전문 에이전트");
  const [task, setTask] = useState(
    "계약서 원문에서 독소 조항과 누락된 보호 조항을 식별하고, 조항 번호 인용과 대체 문안을 제시한다."
  );
  const [watchouts, setWatchouts] = useState(
    "원문에 없는 조항 번호 임의 생성 금지; 확정적 법률 자문 표현 금지; 필수 계약 기간 누락 시 추가 질문 생성"
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      {/* 상단 헤더 */}
      <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-indigo-950/60 via-[#0f1420] to-[#0a0e17] p-8 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="rounded-full border border-indigo-500/30 bg-indigo-500/15 px-3 py-1 text-xs font-bold text-indigo-300">
              크리에이터 스튜디오 · 4단계 가이드 빌더
            </span>
            <h1 className="text-2xl font-black text-white sm:text-3xl">
              새 에이전트 케이스팩 설계 마법사
            </h1>
          </div>
          <Link
            href="/studio/apps"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white"
          >
            ← 스튜디오 목록으로
          </Link>
        </div>
      </section>

      {/* 4단계 스텝 네비게이션 */}
      <nav className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        {STEPS.map((s) => {
          const active = step === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={`rounded-2xl border p-4 text-left text-xs transition ${
                active
                  ? "border-indigo-400 bg-indigo-500/20 text-white shadow-lg shadow-indigo-500/10"
                  : "border-white/[0.08] bg-[#0f1420]/80 text-slate-400 hover:border-white/20 hover:text-slate-200"
              }`}
            >
              <div className="font-bold text-indigo-300">{s.badge}</div>
              <div className="mt-1 font-extrabold text-sm text-white">
                {s.title}
              </div>
            </button>
          );
        })}
      </nav>

      {/* 단계별 입력 카드 */}
      <section className="rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-6 md:p-8 shadow-xl space-y-6">
        <div className="border-b border-white/[0.08] pb-4">
          <span className="text-xs font-bold text-indigo-400">
            {STEPS[step - 1]?.badge}
          </span>
          <h2 className="mt-1 text-xl font-extrabold text-white">
            {STEPS[step - 1]?.title}
          </h2>
          <p className="mt-1 text-xs text-slate-400">{STEPS[step - 1]?.desc}</p>
        </div>

        {step === 1 && (
          <div className="space-y-5 text-sm">
            <label className="block space-y-2">
              <span className="text-xs font-bold text-slate-200">
                에이전트 공개 표시 이름
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#090d16] px-4 py-3 text-sm font-medium text-white focus:border-indigo-400 focus:outline-none"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold text-slate-200">
                제1블록 (역할 정의 · 전문 페르소나 정체성)
              </span>
              <input
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#090d16] px-4 py-3 text-sm font-medium text-white focus:border-indigo-400 focus:outline-none"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold text-slate-200">
                제3블록 (핵심 납품 산출물 및 과업 목표)
              </span>
              <textarea
                rows={3}
                value={task}
                onChange={(e) => setTask(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#090d16] px-4 py-3 text-sm font-medium text-white focus:border-indigo-400 focus:outline-none"
              />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 text-sm">
            <label className="block space-y-2">
              <span className="text-xs font-bold text-slate-200">
                제5블록 (실패 방지 및 임의 추론 금지 규칙)
              </span>
              <textarea
                rows={3}
                value={watchouts}
                onChange={(e) => setWatchouts(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#090d16] px-4 py-3 text-sm font-medium text-white focus:border-indigo-400 focus:outline-none"
              />
            </label>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200">
              ✓ <strong>실존 인물 사칭 금지 가드레일 자동 활성화됨</strong>: 특정 실존 전문가의 성명·초상을 무단 도용하지 않으며 직무 역할 기반 페르소나로만 등록됩니다.
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-white/10 bg-[#090d16] p-5 space-y-3">
              <div className="text-sm font-extrabold text-white">
                4단계 자동 자격 검증 게이트
              </div>
              <ul className="list-disc pl-5 text-slate-300 space-y-1.5">
                <li>
                  <strong>1단계 (출력 스키마 검증):</strong> 필수 결과 필드, 근거 배열, 검증 상태 누락 여부 확인
                </li>
                <li>
                  <strong>2단계 (결정론적 규칙 검사):</strong> 원문 근거 없는 주장 0건, 수치·날짜 왜곡 0건 확인
                </li>
                <li>
                  <strong>3단계 (루브릭 정량 채점):</strong> 정확성·완결성·출처 정합성 기준 점수 80점 이상 통과
                </li>
                <li>
                  <strong>4단계 (인간 전문가 검수 연동):</strong> 고위험 판단 항목의 검수 대기열 라우팅 동작 확인
                </li>
              </ul>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-5 text-indigo-100 space-y-2">
              <div className="text-sm font-extrabold text-white">
                릴리스 매니페스트 생성 및 게시 정책 확인
              </div>
              <p>
                <strong>에이전트 명칭:</strong> {title}
              </p>
              <p>
                <strong>전문 역할:</strong> {actor}
              </p>
              <p className="text-indigo-200">
                <strong>승격 보안 원칙:</strong> 벤치마크 평가가 미실행이거나 미통과 상태인 초안은{" "}
                <strong>사양 미리보기</strong> 상태로만 저장되며, 실시간 실행 승격이 원천 차단됩니다.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-white/[0.08] pt-5">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="rounded-xl border border-white/15 bg-white/[0.05] px-5 py-2.5 text-xs font-bold text-slate-200 disabled:opacity-40"
          >
            ← 이전 단계
          </button>
          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(4, s + 1))}
              className="rounded-xl bg-indigo-500 px-6 py-2.5 text-xs font-extrabold text-white hover:bg-indigo-400"
            >
              다음 단계 →
            </button>
          ) : (
            <Link
              href="/studio/apps"
              className="rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
            >
              ✓ 케이스팩 초안 저장 완료
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
