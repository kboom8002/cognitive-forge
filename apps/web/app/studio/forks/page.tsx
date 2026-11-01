import React from "react";
import Link from "next/link";
import { getV1Context } from "@/lib/api/v1-runtime";

export default function StudioForksPage() {
  const { forkService } = getV1Context();
  const forks = Array.from(forkService.forks.values());

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-center justify-between border-b pb-4">
        <div>
          <p className="text-xs font-semibold uppercase text-indigo-600">
            Fork & Lineage Engine (D22 · GX03)
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            페르소나·케이스팩 포크 및 계보 관리
          </h1>
          <p className="text-sm text-slate-600">
            모든 포크는 비공개 초안으로 시작하며, 원본 고객 데이터와 검증 배지는 절대 승계되지 않습니다 (GT04, GT05).
          </p>
        </div>
        <Link href="/studio/apps" className="text-sm text-slate-600">
          ← 스튜디오 홈
        </Link>
      </header>

      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs text-indigo-950 space-y-1">
        <div className="font-bold">불변 포크 보안 원칙</div>
        <p>• 고객 데이터 비복제: <code>copied_customer_data: false</code></p>
        <p>• 검증 배지 비승계: <code>inherited_verified_badge: false</code> (재검증 필수)</p>
      </div>

      {forks.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          아직 생성된 포크 계보가 없습니다. 갤러리 상세 페이지 또는 <code>POST /api/v1/gallery/forks</code>를 통해 포크를 생성할 수 있습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {forks.map((f) => (
            <div
              key={f.fork_id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-indigo-700">{f.fork_id}</span>
                <span className="text-slate-500">License: {f.license_version}</span>
              </div>
              <p className="text-sm font-semibold text-slate-900">{f.attribution}</p>
              <p className="text-slate-600">
                Parent: <code>{f.parent_release_id}</code> → Child Draft: <code>{f.child_pack_id}</code>
              </p>
              <p className="text-emerald-700 font-medium">
                copied_customer_data: {String(f.copied_customer_data)} · inherited_verified_badge:{" "}
                {String(f.inherited_verified_badge)}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
