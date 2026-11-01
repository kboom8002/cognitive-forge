import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getV1Context } from "@/lib/api/v1-runtime";

export default async function StudioTestAppPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { galleryService } = getV1Context();
  const agentKey = id.toUpperCase();
  const pack =
    galleryService.pilotPacks.get(agentKey) ??
    Array.from(galleryService.pilotPacks.values()).find((p) => p.pack_id === id);

  if (!pack) {
    notFound();
  }

  const tasks = pack.benchmark_ids
    .map((tid) => galleryService.benchmarkTasks.get(tid))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-center justify-between border-b pb-4">
        <div>
          <span className="text-xs font-mono font-semibold text-indigo-600">
            Benchmark Qualification Gate · {pack.agent_id}
          </span>
          <h1 className="text-2xl font-bold text-slate-900">
            벤치마크 검증 및 릴리스 자격 게이트 ({pack.pack_id})
          </h1>
        </div>
        <Link href={`/studio/apps/${pack.agent_id}/edit`} className="text-sm text-slate-600">
          ← 편집기로 돌아가기
        </Link>
      </header>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        릴리스 게이트 정책: <code>{pack.release_gate}</code> — 연결된 벤치마크 과업 {tasks.length}종이 모두 통과해야{" "}
        <code>published_runnable</code>로 게시됩니다.
      </div>

      <section className="space-y-4">
        {tasks.map((task) => (
          <div
            key={task.task_id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-indigo-700">
                {task.task_id}
              </span>
              <span className="rounded bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                Schema & Rule Check Ready
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 text-xs">
              <div className="rounded bg-slate-50 p-3">
                <div className="font-semibold text-slate-700">필수 검증 항목 (expected_checks)</div>
                <ul className="mt-1 list-disc pl-4 text-slate-600">
                  {task.expected_checks.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded bg-rose-50/60 p-3">
                <div className="font-semibold text-rose-800">금지 출력 (forbidden_outputs)</div>
                <ul className="mt-1 list-disc pl-4 text-rose-700">
                  {task.forbidden_outputs.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
