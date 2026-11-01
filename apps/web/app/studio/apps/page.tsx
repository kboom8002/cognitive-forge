import React from "react";
import Link from "next/link";
import { getV1Context } from "@/lib/api/v1-runtime";

export default function StudioAppsPage() {
  const { galleryService, forkService } = getV1Context();
  const pilots = Array.from(galleryService.pilotPacks.values());
  const forks = Array.from(forkService.childDraftPacks.values());

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            Cognitive Forge OS v2.0 · Creator Studio
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            에이전트 팩 스튜디오 (Creator Studio)
          </h1>
          <p className="text-sm text-slate-600">
            4단계 가이드 빌더로 에이전트 팩과 페르소나를 설계하고, 4단계 평가 게이트 통과 후 갤러리에 게시합니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/studio/reviews"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            검수 대기열 (Reviews)
          </Link>
          <Link
            href="/studio/forks"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            포크 계보 (Forks)
          </Link>
          <Link
            href="/studio/apps/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + 새 에이전트 팩 만들기
          </Link>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">
          공인 파일럿 케이스팩 ({pilots.length}종)
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pilots.map((pack) => {
            const entry = galleryService.catalogEntries.get(pack.agent_id);
            const relId = `rel_${pack.agent_id.toLowerCase()}_v2`;
            const meta = galleryService.releaseMeta.get(relId);
            return (
              <div
                key={pack.pack_id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="rounded bg-indigo-50 px-2 py-0.5 font-mono font-semibold text-indigo-700">
                      {pack.agent_id} · {pack.pack_id}
                    </span>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                      eval: {meta?.evaluation_status ?? "pass"}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {entry?.name ?? pack.pack_id}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {pack.taskflow.T}
                  </p>
                  <div className="text-xs text-slate-500">
                    벤치마크: {pack.benchmark_ids.join(", ")}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 border-t pt-3 text-xs font-medium">
                  <Link
                    href={`/studio/apps/${pack.agent_id}/edit`}
                    className="rounded border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                  >
                    편집 (Edit)
                  </Link>
                  <Link
                    href={`/studio/apps/${pack.agent_id}/test`}
                    className="rounded border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-indigo-700 hover:bg-indigo-100"
                  >
                    벤치마크 검증 (Test)
                  </Link>
                  <Link
                    href={`/gallery/${pack.agent_id.toLowerCase()}`}
                    className="ml-auto text-slate-500 hover:text-slate-800"
                  >
                    갤러리 보기 →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {forks.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">
            내 비공개 포크 초안 ({forks.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {forks.map((draft) => (
              <div
                key={draft.child_pack_id}
                className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{draft.display_name}</span>
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                    private · {draft.status} · eval: {draft.evaluation_status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Child Pack: {draft.child_pack_id} (Parent: {draft.parent_release_id})
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
