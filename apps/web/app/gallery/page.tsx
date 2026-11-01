import React from "react";
import Link from "next/link";
import { getV1Context } from "@/lib/api/v1-runtime";

export default async function GalleryPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string; availability?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const { galleryService } = getV1Context();

  const listingsResult = galleryService.listPublicListings({
    limit: 100,
    category: resolvedParams.category,
    availability: resolvedParams.availability,
  });

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            Cognitive Forge OS · Persona Agent Gallery v2.0
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            검증형 페르소나 에이전트 갤러리 (36 카탈로그 · 12 실행 파일럿)
          </h1>
          <p className="text-sm text-slate-600">
            산출물 계약으로 분류된 6대 대분류 36종 에이전트를 탐색하고, 벤치마크를 통과한{" "}
            <code>published_runnable</code> 팩을 즉시 실행하거나 비교·포크·프로젝트 의뢰하세요.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/projects/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            프로젝트 브리프 매칭 의뢰 →
          </Link>
          <Link
            href="/studio/apps"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Creator Studio
          </Link>
        </div>
      </header>

      {/* 6 Primary Categories Filter */}
      <section className="flex flex-wrap items-center gap-2">
        <Link
          href="/gallery"
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
            !resolvedParams.category
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          전체 (36)
        </Link>
        {galleryService.taxonomy.categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/gallery?category=${cat.id}`}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              resolvedParams.category === cat.id
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {cat.label} ({cat.id})
          </Link>
        ))}
      </section>

      {/* Listings Grid */}
      <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {listingsResult.items.map((listing) => {
          const entry = galleryService.catalogEntries.get(listing.agent_id);
          const creator = galleryService.creators.get(listing.creator_id);
          const isRunnable = listing.availability === "published_runnable";

          return (
            <div
              key={listing.listing_id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono font-bold text-slate-700">
                    {listing.agent_id} · {listing.category}
                  </span>
                  {isRunnable ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-semibold text-emerald-800">
                      published_runnable (즉시 실행 가능)
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-semibold text-amber-800">
                      preview_only (사양 미리보기 전용)
                    </span>
                  )}
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {entry?.name ?? listing.listing_id}
                  </h2>
                  <p className="mt-1 text-xs text-slate-600">
                    입력: {entry?.input_description ?? "문서"} → 산출물: {entry?.deliverable ?? "리포트"}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 space-y-1">
                  <div>
                    샘플 출처(Sample Origin): <code>{listing.sample_origin}</code>
                  </div>
                  {creator && (
                    <div>
                      크리에이터:{" "}
                      <Link
                        href={`/creators/${creator.creator_id}`}
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        {creator.display_name}
                      </Link>{" "}
                      ({creator.credential_status})
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs">
                <Link
                  href={`/gallery/${listing.agent_id.toLowerCase()}`}
                  className="font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  상세 계약 및 샘플 보기 →
                </Link>
                {isRunnable ? (
                  <Link
                    href={`/gallery/${listing.agent_id.toLowerCase()}`}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700"
                  >
                    실행 / 포크 가능
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="cursor-not-allowed rounded-lg bg-slate-200 px-3 py-1.5 font-medium text-slate-500"
                  >
                    실행 비활성 (preview_only)
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* 6 Multi-Agent Bundles */}
      <section className="space-y-4 border-t pt-8">
        <h2 className="text-xl font-bold text-slate-900">
          복합 프로젝트 멀티-에이전트 번들 ({galleryService.bundles.length}종)
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {galleryService.bundles.map((bundle) => (
            <div
              key={bundle.bundle_id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2"
            >
              <div className="text-xs font-mono font-bold text-indigo-700">
                {bundle.bundle_id}
              </div>
              <h3 className="text-sm font-bold text-slate-900">{bundle.name}</h3>
              <p className="text-xs text-slate-600">{bundle.goal}</p>
              <div className="text-xs font-medium text-slate-700">
                구성 에이전트: {bundle.agent_ids.join(" → ")}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
