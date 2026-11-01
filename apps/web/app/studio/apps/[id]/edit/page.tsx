import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getV1Context } from "@/lib/api/v1-runtime";
import {
  TASKFLOW_BLOCK_KO_MAP,
  getCategoryKo,
} from "@/lib/i18n/ko-labels";

export default async function StudioEditAppPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { galleryService } = getV1Context();
  const agentKey = id.replace(/^app_/i, "").toUpperCase();
  const pack =
    galleryService.pilotPacks.get(agentKey) ??
    Array.from(galleryService.pilotPacks.values()).find((p) => p.pack_id === id);

  if (!pack) {
    notFound();
  }

  const entry = galleryService.catalogEntries.get(pack.agent_id);
  const persona = galleryService.personas.get(
    `persona_${pack.agent_id.toLowerCase()}`
  );
  const catKo = entry ? getCategoryKo(entry.primary_category) : null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
      {/* 상단 헤더 */}
      <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-indigo-950/60 via-[#0f1420] to-[#0a0e17] p-8 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-lg bg-white/[0.08] px-3 py-1 font-mono font-bold text-indigo-300">
                {pack.agent_id} · {pack.pack_id} (스키마 {pack.schema_version})
              </span>
              {catKo && (
                <span
                  className={`rounded-full border px-3 py-1 font-bold ${catKo.badgeClass}`}
                >
                  {catKo.label}
                </span>
              )}
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 font-bold text-emerald-300">
                8-블록 컴파일 검증 완료
              </span>
            </div>

            <h1 className="text-3xl font-black text-white">
              {entry?.name ?? pack.pack_id} — 8-블록 실행 계약 편집기
            </h1>
            <p className="text-sm text-slate-300">
              각 블록은 컴파일 시점에 정적 규칙 검사를 거치며, 실패 방지 규칙(제5블록)이나 중단 조건(제6블록)이 누락되면 릴리스 생성이 차단됩니다.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Link
              href={`/studio/apps/${pack.agent_id}/test`}
              className="rounded-xl bg-indigo-500 px-5 py-3 font-extrabold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400"
            >
              벤치마크 자격 검증 실행 →
            </Link>
            <Link
              href="/studio/apps"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 font-semibold text-slate-300 hover:text-white"
            >
              ← 목록으로
            </Link>
          </div>
        </div>
      </section>

      {/* 8-블록 그리드 */}
      <section className="grid gap-4 md:grid-cols-2">
        {Object.entries(pack.taskflow).map(([blockKey, blockValue]) => {
          const meta = TASKFLOW_BLOCK_KO_MAP[blockKey] ?? {
            step: `블록 ${blockKey}`,
            title: blockKey,
            subtitle: "표준 실행 계약 블록",
          };
          return (
            <div
              key={blockKey}
              className="rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-5 shadow-lg space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-indigo-300">
                  {meta.step} · {meta.title}
                </span>
                <span className="rounded bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] text-slate-400">
                  블록 [{blockKey}]
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{meta.subtitle}</p>
              <div className="rounded-xl border border-white/[0.06] bg-[#090d16] p-3.5 text-sm font-semibold text-slate-100">
                {blockValue}
              </div>
            </div>
          );
        })}
      </section>

      {/* 페르소나 프로필 */}
      {persona && (
        <section className="rounded-2xl border border-emerald-500/30 bg-[#0f1420]/90 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-white">
              연결된 직무 페르소나 프로필 ({persona.persona_id})
            </h2>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
              ✓ 실존 인물 사칭 없음 검증 완료
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 text-xs text-slate-300">
            <div className="rounded-xl bg-[#090d16] p-4">
              <div className="text-slate-400">전문 역할 정의</div>
              <div className="mt-1 text-sm font-bold text-white">{persona.role}</div>
            </div>
            <div className="rounded-xl bg-[#090d16] p-4">
              <div className="text-slate-400">수행 범위 및 원칙</div>
              <div className="mt-1 text-sm font-bold text-white">{persona.audience}</div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
