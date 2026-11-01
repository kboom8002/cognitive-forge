import React from "react";
import Link from "next/link";
import { getV1Context } from "@/lib/api/v1-runtime";
import {
  AVAILABILITY_KO_MAP,
  CREDENTIAL_STATUS_KO_MAP,
  SAMPLE_ORIGIN_KO_MAP,
  getCategoryKo,
  getCreatorDisplayNameKo,
} from "@/lib/i18n/ko-labels";

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

  const runnableCount = listingsResult.items.filter(
    (i) => i.availability === "published_runnable"
  ).length;
  const previewCount = listingsResult.items.filter(
    (i) => i.availability === "preview_only"
  ).length;

  return (
    <main
      aria-label="Agent Gallery"
      className="mx-auto max-w-7xl px-6 py-10 space-y-10"
    >
      {/* 상단 히어로 헤더 */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-indigo-950/60 via-[#0f1420] to-[#0a0e17] p-8 md:p-10 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/15 px-3.5 py-1 text-xs font-bold text-indigo-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              코그니티브 포지 · 페르소나 에이전트 갤러리 2.0 (Agent Gallery)
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              검증형 페르소나 에이전트 갤러리
            </h1>
            <p className="text-sm leading-relaxed text-slate-300">
              주된 납품 산출물 계약으로 분류된 <strong>6대 분야 36종 전문 에이전트</strong>를 탐색하세요.
              3종 공인 벤치마크(정상·입력누락·사실상충)를 통과한 <strong>12종 즉시 실행 파일럿</strong>을 바로 실행하거나,
              포크 복제·A/B 비교·맞춤 프로젝트 매칭을 의뢰할 수 있습니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/projects/new"
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-3 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-400 hover:to-violet-500"
            >
              맞춤 프로젝트 매칭 의뢰 →
            </Link>
            <Link
              href="/compare/cmp_1"
              className="rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-xs font-bold text-slate-200 transition hover:bg-white/[0.1]"
            >
              A/B 벤치마크 비교실
            </Link>
            <Link
              href="/studio/apps"
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20"
            >
              크리에이터 스튜디오
            </Link>
          </div>
        </div>

        {/* 요약 카운터 바 */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/[0.08] pt-6 sm:grid-cols-4">
          <div className="rounded-xl bg-white/[0.03] px-4 py-3">
            <div className="text-xs text-slate-400">현재 표시 에이전트</div>
            <div className="mt-0.5 text-xl font-black text-white">
              {listingsResult.items.length}종
            </div>
          </div>
          <div className="rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20 px-4 py-3">
            <div className="text-xs text-emerald-300">즉시 실행 가능 (파일럿)</div>
            <div className="mt-0.5 text-xl font-black text-emerald-300">
              {runnableCount}종
            </div>
          </div>
          <div className="rounded-xl bg-amber-500/[0.07] border border-amber-500/20 px-4 py-3">
            <div className="text-xs text-amber-300">사양 미리보기 카탈로그</div>
            <div className="mt-0.5 text-xl font-black text-amber-300">
              {previewCount}종
            </div>
          </div>
          <div className="rounded-xl bg-indigo-500/[0.07] border border-indigo-500/20 px-4 py-3">
            <div className="text-xs text-indigo-300">복합 프로젝트 추천 번들</div>
            <div className="mt-0.5 text-xl font-black text-indigo-300">
              {galleryService.bundles.length}종
            </div>
          </div>
        </div>
      </section>

      {/* 카테고리 및 가용성 필터 바 */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/gallery"
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              !resolvedParams.category
                ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/25"
                : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            전체 분야 (36)
          </Link>
          {galleryService.taxonomy.categories.map((cat) => {
            const ko = getCategoryKo(cat.id);
            const active = resolvedParams.category === cat.id;
            return (
              <Link
                key={cat.id}
                href={`/gallery?category=${cat.id}${
                  resolvedParams.availability
                    ? `&availability=${resolvedParams.availability}`
                    : ""
                }`}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  active
                    ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/25"
                    : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {ko.shortLabel}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={
              resolvedParams.category
                ? `/gallery?category=${resolvedParams.category}`
                : "/gallery"
            }
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              !resolvedParams.availability
                ? "bg-white/15 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            전체 상태
          </Link>
          <Link
            href={`/gallery?availability=published_runnable${
              resolvedParams.category ? `&category=${resolvedParams.category}` : ""
            }`}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              resolvedParams.availability === "published_runnable"
                ? "bg-emerald-500/25 text-emerald-200 border border-emerald-500/40"
                : "text-slate-400 hover:text-emerald-300"
            }`}
          >
            ● 즉시 실행 가능만 보기 (12)
          </Link>
          <Link
            href={`/gallery?availability=preview_only${
              resolvedParams.category ? `&category=${resolvedParams.category}` : ""
            }`}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              resolvedParams.availability === "preview_only"
                ? "bg-amber-500/25 text-amber-200 border border-amber-500/40"
                : "text-slate-400 hover:text-amber-300"
            }`}
          >
            사양 미리보기 (24)
          </Link>
        </div>
      </section>

      {/* 에이전트 카드 그리드 */}
      <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {listingsResult.items.map((listing) => {
          const entry = galleryService.catalogEntries.get(listing.agent_id);
          const creator = galleryService.creators.get(listing.creator_id);
          const isRunnable = listing.availability === "published_runnable";
          const catKo = getCategoryKo(listing.category);
          const availKo =
            AVAILABILITY_KO_MAP[listing.availability] ??
            AVAILABILITY_KO_MAP["preview_only"]!;
          const sampleKo =
            SAMPLE_ORIGIN_KO_MAP[listing.sample_origin] ??
            SAMPLE_ORIGIN_KO_MAP["synthetic_fixture"]!;
          const credKo = creator
            ? CREDENTIAL_STATUS_KO_MAP[creator.credential_status]?.label ?? "검증 완료"
            : "";

          return (
            <div
              key={listing.listing_id}
              className={`group flex flex-col justify-between rounded-2xl border p-6 shadow-xl transition-all hover:-translate-y-1 ${
                isRunnable
                  ? "border-emerald-500/25 bg-gradient-to-b from-[#11192a] to-[#0c111d] hover:border-emerald-400/60"
                  : "border-white/[0.08] bg-[#0f1420]/90 hover:border-indigo-500/40"
              }`}
            >
              <div className="space-y-4">
                {/* 상단 코드 및 상태 배지 */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-white/[0.07] px-2 py-0.5 font-mono font-bold text-indigo-300">
                      {listing.agent_id}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${catKo.badgeClass}`}
                    >
                      {catKo.shortLabel}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${availKo.badgeClass}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${availKo.dotClass}`} />
                    {availKo.label}
                  </span>
                </div>

                {/* 에이전트 명칭 및 입출력 계약 */}
                <div>
                  <h2 className="text-lg font-extrabold text-white group-hover:text-indigo-200">
                    {entry?.name ?? listing.listing_id}
                  </h2>
                  <div className="mt-2.5 space-y-1.5 rounded-xl border border-white/[0.06] bg-[#090d16]/80 p-3 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 font-bold text-slate-400">입력 자료:</span>
                      <span className="text-slate-200">
                        {entry?.input_description ?? "업무 문서 및 텍스트"}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 font-bold text-indigo-300">납품 산출물:</span>
                      <span className="font-semibold text-white">
                        {entry?.deliverable ?? "검증된 구조화 리포트"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 샘플 출처 및 크리에이터 정보 */}
                <div className="space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>샘플 출처:</span>
                    <span className="font-semibold text-slate-300">{sampleKo.label}</span>
                  </div>
                  {creator && (
                    <div className="flex items-center justify-between">
                      <span>제작 스튜디오:</span>
                      <Link
                        href={`/creators/${creator.creator_id}`}
                        className="font-bold text-indigo-300 hover:text-indigo-200 hover:underline"
                      >
                        {getCreatorDisplayNameKo(creator.display_name)} ({credKo})
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* 하단 액션 버튼 */}
              <div className="mt-5 flex items-center justify-between gap-2 border-t border-white/[0.08] pt-4 text-xs">
                <Link
                  href={`/gallery/${listing.listing_id}`}
                  className="font-bold text-slate-300 hover:text-white"
                >
                  상세 계약 · 벤치마크 보기 →
                </Link>
                {isRunnable ? (
                  <Link
                    href={`/gallery/${listing.listing_id}`}
                    className="rounded-xl bg-emerald-500 px-3.5 py-2 font-extrabold text-slate-950 shadow-md shadow-emerald-500/20 transition hover:bg-emerald-400"
                  >
                    즉시 실행 · 포크
                  </Link>
                ) : (
                  <Link
                    href={`/gallery/${listing.listing_id}`}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 font-semibold text-slate-400 hover:text-slate-200"
                  >
                    사양 열람 전용
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* 6종 복합 프로젝트 멀티에이전트 번들 */}
      <section className="space-y-5 border-t border-white/[0.08] pt-10">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            추천 멀티에이전트 조합
          </span>
          <h2 className="mt-1 text-2xl font-extrabold text-white">
            복합 프로젝트용 추천 에이전트 번들 ({galleryService.bundles.length}종)
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            복합 과제는 중복 에이전트를 새로 만드는 대신, 검증된 카탈로그 에이전트들의 표준 파이프라인 조합으로 수행합니다.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {galleryService.bundles.map((bundle) => (
            <div
              key={bundle.bundle_id}
              className="rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-indigo-500/15 px-2.5 py-0.5 font-mono text-xs font-bold text-indigo-300">
                  번들 · {bundle.bundle_id}
                </span>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                  전문가 검수 납품 포함
                </span>
              </div>
              <h3 className="text-base font-extrabold text-white">{bundle.name}</h3>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {bundle.agent_ids.map((aid, idx) => (
                  <React.Fragment key={aid}>
                    <Link
                      href={`/gallery/lst_${aid.toLowerCase()}`}
                      className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 font-mono text-xs font-bold text-indigo-200 hover:bg-indigo-500/25"
                    >
                      {aid}
                    </Link>
                    {idx < bundle.agent_ids.length - 1 && (
                      <span className="text-xs text-slate-500">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
