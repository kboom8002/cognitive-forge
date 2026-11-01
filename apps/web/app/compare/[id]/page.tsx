import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getV1Context } from "@/lib/api/v1-runtime";

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
    notFound();
  }

  const { session, runs, config_diff } = detail;

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="flex items-center justify-between border-b pb-4">
        <div>
          <span className="font-mono text-xs font-bold text-indigo-600">
            Side-by-Side Benchmark Lab (D24) · {session.comparison_id}
          </span>
          <h1 className="text-2xl font-bold text-slate-900">
            에이전트 릴리스 A/B 비교 세션 (Task: {session.task_id})
          </h1>
          <p className="text-xs text-slate-600">
            Status: <strong>{session.status}</strong> · Data Scope: <code>{session.data_scope}</code>
          </p>
        </div>
        <Link href="/gallery" className="text-sm text-slate-600">
          ← 갤러리로
        </Link>
      </header>

      {/* Configuration Diff Notice (GT07) */}
      <div
        className={`rounded-xl border p-4 text-xs ${
          config_diff.is_pure_persona_comparison
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        <div className="font-bold">
          {config_diff.is_pure_persona_comparison
            ? "✓ 순수 페르소나/케이스팩 비교 (동일 모델·온도 조건)"
            : "⚠️ 복합 설정 차이 감지됨 (모델 또는 온도 파라미터 차이 노출 · GT07)"}
        </div>
        {config_diff.diff_warnings.length > 0 && (
          <ul className="mt-1 list-disc pl-4">
            {config_diff.diff_warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Candidate Runs Grid */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {runs.map((run) => (
          <div
            key={run.run_id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-indigo-700">{run.release_id}</span>
              <span
                className={`rounded px-2 py-0.5 font-semibold ${
                  run.status === "completed"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {run.status}
              </span>
            </div>
            <div className="text-slate-600">
              Model: <code>{run.model_name}</code> · Temp: <code>{run.temperature}</code> · Billed:{" "}
              {run.billed_units} unit
            </div>
            {run.output_summary ? (
              <div className="rounded bg-slate-50 p-3 text-slate-800">{run.output_summary}</div>
            ) : (
              <div className="rounded bg-rose-50 p-3 text-rose-800">
                실패 사유: {run.error_reason} (완료된 다른 후보 재과금 없이 이 후보만 선택 재시도 가능 · GT13)
              </div>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
