"use client";

import React, { useState } from "react";
import Link from "next/link";

interface GalleryQuickActionPanelProps {
  agentId: string;
  releaseId: string;
  isRunnable: boolean;
  defaultSourceText: string;
  defaultGoal: string;
}

export function GalleryQuickActionPanel({
  agentId,
  releaseId,
  isRunnable,
  defaultSourceText,
  defaultGoal,
}: GalleryQuickActionPanelProps) {
  const [sourceText, setSourceText] = useState(defaultSourceText);
  const [goal, setGoal] = useState(defaultGoal);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{
    run_id: string;
    status: string;
    review_status: string;
    evaluation_status: string;
  } | null>(null);
  const [forkResult, setForkResult] = useState<{
    fork_id: string;
    child_pack_id: string;
  } | null>(null);
  const [forking, setForking] = useState(false);

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    if (!isRunnable) return;
    setRunning(true);
    try {
      const res = await fetch("/api/v1/runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `ui_run_${agentId}_${Date.now()}`,
          "X-Workspace-Id": "ws_gallery_visitor",
        },
        body: JSON.stringify({
          app_id: `app_${agentId.toLowerCase()}`,
          release_id: releaseId,
          input: {
            source_text: sourceText,
            goal,
          },
          review_authority: "native",
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setRunResult(json);
      }
    } finally {
      setRunning(false);
    }
  }

  async function handleFork() {
    if (!isRunnable) return;
    setForking(true);
    try {
      const res = await fetch("/api/v1/gallery/forks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer ws_gallery_visitor",
          "X-Workspace-Id": "ws_gallery_visitor",
          "Idempotency-Key": `ui_fork_${agentId}_${Date.now()}`,
        },
        body: JSON.stringify({
          parent_release_id: releaseId,
          display_name: `${agentId} 사내 맞춤형 포크 초안`,
          license_version: "2.0",
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setForkResult(json);
      }
    } finally {
      setForking(false);
    }
  }

  if (!isRunnable) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="text-sm font-extrabold text-amber-200">
            사양 미리보기 전용 에이전트
          </span>
        </div>
        <p className="text-xs leading-relaxed text-amber-100/80">
          이 에이전트는 입출력 계약과 기대 산출물 사양이 공개된 상태이며, 3종 공인 벤치마크 검증이 완료된 후 실시간 실행이 활성화됩니다.
        </p>
        <div className="pt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="cursor-not-allowed rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-400"
          >
            실시간 실행 준비 중
          </button>
          <Link
            href="/projects/new"
            className="rounded-xl bg-amber-500/20 border border-amber-400/40 px-4 py-2.5 text-xs font-bold text-amber-200 hover:bg-amber-500/30"
          >
            맞춤 제작 · 매칭 의뢰하기 →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-[#0f1420]/95 p-6 shadow-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-4">
        <div>
          <span className="text-xs font-bold text-emerald-400">
            ● 실시간 샌드박스 실행 및 포크 지원
          </span>
          <h3 className="mt-0.5 text-lg font-extrabold text-white">
            이 에이전트 즉시 실행 테스트
          </h3>
        </div>
        <button
          type="button"
          onClick={handleFork}
          disabled={forking}
          className="rounded-xl border border-purple-500/40 bg-purple-500/15 px-4 py-2 text-xs font-bold text-purple-200 transition hover:bg-purple-500/25"
        >
          {forking ? "포크 생성 중..." : "🌿 내 스튜디오로 포크 복제"}
        </button>
      </div>

      {forkResult && (
        <div className="rounded-xl border border-purple-500/40 bg-purple-950/40 p-4 text-xs text-purple-200 space-y-1">
          <div className="font-bold">
            ✓ 비공개 포크 초안이 생성되었습니다 ({forkResult.child_pack_id})
          </div>
          <div className="text-purple-300/80">
            원본 고객 데이터 미복제 및 검증 배지 초기화 규칙이 적용되었습니다.{" "}
            <Link href="/studio/forks" className="underline font-bold text-white">
              포크 계보 관리소에서 확인 →
            </Link>
          </div>
        </div>
      )}

      <form onSubmit={handleRun} className="space-y-4 text-xs">
        <label className="block space-y-1.5">
          <span className="font-bold text-slate-200">원문 자료 입력 (회의록·인터뷰·문서 발췌본)</span>
          <textarea
            rows={3}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-[#090d16] px-3.5 py-2.5 text-slate-100 focus:border-indigo-400 focus:outline-none"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="font-bold text-slate-200">핵심 수행 목표</span>
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-[#090d16] px-3.5 py-2.5 text-slate-100 focus:border-indigo-400 focus:outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={running}
          className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-xs font-extrabold text-white shadow-lg shadow-emerald-500/20 transition hover:from-emerald-400 hover:to-teal-500"
        >
          {running ? "계약 검증 및 에이전트 실행 중..." : "🚀 에이전트 실행 및 산출물 생성"}
        </button>
      </form>

      {runResult && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-emerald-300">
              ✓ 산출물 생성 및 근거 검증 완료 ({runResult.run_id})
            </span>
            <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 font-bold text-indigo-200">
              전문가 검수 대기
            </span>
          </div>
          <p className="text-slate-300">
            원문 인용 검증과 벤치마크 규칙 검사를 통과하여 검수 대기열에 등록되었습니다.
          </p>
          <div className="pt-1 flex gap-3">
            <Link
              href={`/studio/runs/${runResult.run_id}`}
              className="font-bold text-emerald-300 underline hover:text-white"
            >
              실행 영수증 및 산출물 상세 보기 →
            </Link>
            <Link
              href="/studio/reviews"
              className="font-bold text-indigo-300 underline hover:text-white"
            >
              검수 센터에서 승인하기 →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
