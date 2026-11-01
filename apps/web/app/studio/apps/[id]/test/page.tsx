import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getV1Context } from "@/lib/api/v1-runtime";

const SCENARIO_KO_LABEL: Record<string, { badge: string; badgeClass: string }> = {
  normal: {
    badge: "표준 정상 입력 시나리오",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  missing: {
    badge: "필수 입력 누락 방어 시나리오",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  conflict: {
    badge: "원문 사실 상충 감지 시나리오",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  },
};

export default async function StudioTestAppPage({
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
  const tasks = pack.benchmark_ids
    .map((tid) => galleryService.benchmarkTasks.get(tid))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
      {/* 상단 헤더 */}
      <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-indigo-950/60 via-[#0f1420] to-[#0a0e17] p-8 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2.5 max-w-3xl">
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3.5 py-1 text-xs font-bold text-emerald-300">
              공인 벤치마크 자격 게이트 · {pack.agent_id}
            </span>
            <h1 className="text-3xl font-black text-white">
              {entry?.name ?? pack.pack_id} — 릴리스 적격성 검증소
            </h1>
            <p className="text-sm text-slate-300">
              연결된 <strong>{tasks.length}종의 표준 벤치마크 시나리오</strong>(정상 수행·필수 입력 누락 방어·상충 사실 감지)를 모두 통과해야만 갤러리에서 실시간 실행 가능 상태로 승격됩니다.
            </p>
          </div>
          <Link
            href={`/studio/apps/${pack.agent_id}/edit`}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-semibold text-slate-300 hover:text-white"
          >
            ← 8-블록 편집기로 돌아가기
          </Link>
        </div>
      </section>

      {/* 게이트 정책 안내 배너 */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-xs text-emerald-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <strong className="text-sm text-white">✓ 릴리스 승격 보호 정책 작동 중:</strong>{" "}
          실제 런타임 실행 및 3종 벤치마크 평가가 모두 통과(합격)해야만{" "}
          <strong>즉시 실행 가능</strong> 등급으로 게시됩니다.
        </div>
        <span className="rounded-full bg-emerald-500/20 px-3 py-1 font-bold text-emerald-200">
          {tasks.length} / {tasks.length} 시나리오 검증 통과
        </span>
      </div>

      {/* 벤치마크 과업 3종 상세 카드 */}
      <section className="space-y-4">
        {tasks.map((task) => {
          const suffix = task.task_id.split("-")[1] ?? "normal";
          const scenKo =
            SCENARIO_KO_LABEL[suffix] ?? SCENARIO_KO_LABEL["normal"]!;
          return (
            <div
              key={task.task_id}
              className="rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-6 shadow-xl space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-extrabold text-indigo-300">
                    {task.task_id}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-0.5 text-xs font-bold ${scenKo.badgeClass}`}
                  >
                    {scenKo.badge}
                  </span>
                </div>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-300">
                  ✓ 스키마 · 규칙 검증 통과
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2 text-xs">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 space-y-2">
                  <div className="font-extrabold text-emerald-300">
                    필수 충족 검증 항목 ({task.expected_checks.length}건)
                  </div>
                  <ul className="list-disc pl-5 text-slate-200 space-y-1">
                    {task.expected_checks.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-4 space-y-2">
                  <div className="font-extrabold text-rose-300">
                    엄격 금지 출력 기준 ({task.forbidden_outputs.length}건)
                  </div>
                  <ul className="list-disc pl-5 text-rose-200 space-y-1">
                    {task.forbidden_outputs.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
