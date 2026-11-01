import React from "react";
import Link from "next/link";
import { getV1Context } from "@/lib/api/v1-runtime";
import {
  EVAL_STATUS_KO_MAP,
  getCategoryKo,
} from "@/lib/i18n/ko-labels";

export default function StudioAppsPage() {
  const { galleryService, forkService } = getV1Context();
  const pilots = Array.from(galleryService.pilotPacks.values());
  const forks = Array.from(forkService.childDraftPacks.values());

  return (
    <main
      aria-label="Studio"
      className="mx-auto max-w-7xl px-6 py-10 space-y-10"
    >
      {/* 스튜디오 상단 히어로 배너 */}
      <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-indigo-950/60 via-[#0f1420] to-[#0a0e17] p-8 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/15 px-3.5 py-1 text-xs font-bold text-indigo-300">
              <span className="h-2 w-2 rounded-full bg-indigo-400" />
              코그니티브 포지 2.0 · 크리에이터 스튜디오 (Creator Studio)
            </div>
            <h1 className="text-3xl font-black text-white sm:text-4xl">
              에이전트 케이스팩 스튜디오
            </h1>
            <p className="text-sm leading-relaxed text-slate-300">
              <strong>TASKFLOW-CX 2.0 8-블록 계약</strong>으로 에이전트와 직무 페르소나를 설계하고,
              3종 공인 벤치마크(정상·입력누락·사실상충) 검증 게이트를 통과한 릴리스를 갤러리에 게시합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/studio/reviews"
              className="rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-white/[0.1]"
            >
              인간 검수 대기열
            </Link>
            <Link
              href="/studio/forks"
              className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2.5 text-xs font-bold text-purple-200 transition hover:bg-purple-500/20"
            >
              포크 계보 관리소
            </Link>
            <Link
              href="/studio/apps/new"
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-400 hover:to-violet-500"
            >
              + 새 에이전트 팩 만들기
            </Link>
          </div>
        </div>
      </section>

      {/* 공인 파일럿 케이스팩 12종 그리드 */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              공인 릴리스 관리
            </span>
            <h2 className="mt-0.5 text-2xl font-extrabold text-white">
              즉시 실행 공인 파일럿 케이스팩 ({pilots.length}종)
            </h2>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {pilots.map((pack) => {
            const entry = galleryService.catalogEntries.get(pack.agent_id);
            const relId = `rel_${pack.agent_id.toLowerCase()}_v2`;
            const meta = galleryService.releaseMeta.get(relId);
            const evalStatus = meta?.evaluation_status ?? "pass";
            const evalKo =
              EVAL_STATUS_KO_MAP[evalStatus] ?? EVAL_STATUS_KO_MAP["pass"]!;
            const catKo = entry ? getCategoryKo(entry.primary_category) : null;

            return (
              <div
                key={pack.pack_id}
                className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-6 shadow-xl transition hover:border-indigo-500/40"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-indigo-500/15 px-2.5 py-0.5 font-mono font-bold text-indigo-300">
                        {pack.agent_id}
                      </span>
                      {catKo && (
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${catKo.badgeClass}`}
                        >
                          {catKo.shortLabel}
                        </span>
                      )}
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${evalKo.badgeClass}`}
                    >
                      ✓ {evalKo.label}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-extrabold text-white">
                      {entry?.name ?? pack.pack_id}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-indigo-300">
                      납품 산출물: {pack.taskflow.T}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-[#090d16] p-3 text-xs space-y-1 text-slate-300">
                    <div>
                      <span className="text-slate-400">전문 역할:</span> {pack.taskflow.A}
                    </div>
                    <div>
                      <span className="text-slate-400">연결 벤치마크:</span>{" "}
                      <span className="font-mono text-[11px] text-emerald-300">
                        {pack.benchmark_ids.join(", ")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 border-t border-white/[0.08] pt-4 text-xs font-bold">
                  <Link
                    href={`/studio/apps/${pack.agent_id}/edit`}
                    className="rounded-xl border border-white/15 bg-white/[0.05] px-3.5 py-2 text-slate-200 transition hover:bg-white/[0.12] hover:text-white"
                  >
                    8-블록 편집
                  </Link>
                  <Link
                    href={`/studio/apps/${pack.agent_id}/test`}
                    className="rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-3.5 py-2 text-indigo-200 transition hover:bg-indigo-500/25"
                  >
                    벤치마크 검증
                  </Link>
                  <Link
                    href={`/gallery/lst_${pack.agent_id.toLowerCase()}`}
                    className="ml-auto text-slate-400 hover:text-white"
                  >
                    갤러리 상세 →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 비공개 포크 초안 섹션 */}
      {forks.length > 0 && (
        <section className="space-y-4 border-t border-white/[0.08] pt-8">
          <h2 className="text-xl font-extrabold text-white">
            내 워크스페이스 비공개 포크 초안 ({forks.length}건)
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {forks.map((draft) => (
              <div
                key={draft.child_pack_id}
                className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-white">
                    {draft.display_name}
                  </span>
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 font-bold text-amber-200">
                    비공개 초안 · 재검증 필요
                  </span>
                </div>
                <p className="text-slate-300">
                  자식 케이스팩: <code>{draft.child_pack_id}</code> (원본 릴리스:{" "}
                  <code>{draft.parent_release_id}</code>)
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
