import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getV1Context } from "@/lib/api/v1-runtime";

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { galleryService } = getV1Context();
  const detail = galleryService.findPublicListingBySlug(slug);

  if (!detail) {
    notFound();
  }

  const { listing, catalogEntry, creator, pilotPack, persona, offerings, benchmarks } = detail;
  const isRunnable = listing.availability === "published_runnable";

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono font-bold text-indigo-600">
              {listing.listing_id} · {listing.agent_id}
            </span>
            {isRunnable ? (
              <span className="rounded-full bg-emerald-100 px-3 py-0.5 font-semibold text-emerald-800">
                published_runnable (Release: {listing.release_id})
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-3 py-0.5 font-semibold text-amber-800">
                preview_only (사양 공개 · 실시간 실행 비활성)
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            {catalogEntry?.name ?? listing.listing_id}
          </h1>
          <p className="text-sm text-slate-600">
            샘플 출처 투명성 배지: <code>{listing.sample_origin}</code> (합성 픽스처와 실사용 허가 산출물을 엄격히 구분합니다 · GT16)
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isRunnable ? (
            <span className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
              실행 활성 (Release {listing.release_id})
            </span>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="cursor-not-allowed rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500"
            >
              실행 비활성 (preview_only · GT01)
            </button>
          )}
          <Link href="/gallery" className="text-sm text-slate-600 hover:text-slate-900">
            ← 갤러리 목록
          </Link>
        </div>
      </header>

      {/* Creator & Persona Attribution */}
      <section className="grid gap-4 md:grid-cols-2">
        {creator && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
            <div className="text-xs font-semibold uppercase text-slate-500">
              Creator Profile & Attribution (D21)
            </div>
            <div className="flex items-center justify-between">
              <Link
                href={`/creators/${creator.creator_id}`}
                className="text-base font-bold text-indigo-700 hover:underline"
              >
                {creator.display_name}
              </Link>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                이력 검증 상태: {creator.credential_status}
              </span>
            </div>
            <p className="text-xs text-slate-600">{creator.bio}</p>
            <div className="text-xs text-slate-500">
              기여 범위: {creator.contributions.join(", ")}
            </div>
          </div>
        )}

        {persona && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
            <div className="text-xs font-semibold uppercase text-slate-500">
              Persona Profile ({persona.persona_id})
            </div>
            <div className="text-sm font-bold text-slate-900">{persona.role}</div>
            <p className="text-xs text-slate-600">대상 청중: {persona.audience}</p>
            <p className="text-xs font-medium text-emerald-700">
              실존 인물 사칭 금지(real_person_impersonation): {String(persona.real_person_impersonation)}
            </p>
          </div>
        )}
      </section>

      {/* PilotPack TASKFLOW-CX 2.0 */}
      {pilotPack && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">
            TASKFLOW-CX 2.0 8-Block 실행 계약 ({pilotPack.pack_id})
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(pilotPack.taskflow).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                <span className="font-bold text-indigo-700">{k}: </span>
                <span className="text-slate-800">{v}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Service Offerings */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">
          제공 오퍼링 모드 ({offerings.length})
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {offerings.map((off) => (
            <div
              key={off.offering_id}
              className="rounded-xl border border-slate-200 bg-white p-4 text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-indigo-700">{off.offering_id}</span>
                <span className="rounded bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-800">
                  {off.mode} · {off.price_status}
                </span>
              </div>
              <p className="text-slate-700">산출물 유형: {off.deliverables.join(", ")}</p>
              <p className="text-slate-600">
                필수 입력: {off.required_inputs.join(", ")} · 인간 검수 포함:{" "}
                {off.human_review ? "예" : "아니오"}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Benchmarks */}
      {benchmarks.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">
            공인 벤치마크 시나리오 ({benchmarks.length}종)
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            {benchmarks.map((bm) => (
              <div
                key={bm.task_id}
                className="rounded-xl border border-slate-200 bg-white p-4 text-xs space-y-2"
              >
                <div className="font-mono font-bold text-slate-900">{bm.task_id}</div>
                <div className="text-slate-600">
                  검증 항목: {bm.expected_checks.join(", ")}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
