import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getV1Context } from "@/lib/api/v1-runtime";
import {
  AVAILABILITY_KO_MAP,
  CREDENTIAL_STATUS_KO_MAP,
  getCategoryKo,
  getCreatorDisplayNameKo,
} from "@/lib/i18n/ko-labels";

export default async function CreatorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { galleryService } = getV1Context();

  let creator;
  try {
    creator = galleryService.getPublicCreator(id);
  } catch {
    notFound();
  }

  const authoredListings = Array.from(galleryService.listings.values()).filter(
    (l) => l.creator_id === creator.creator_id && l.status === "public"
  );

  const credKo =
    CREDENTIAL_STATUS_KO_MAP[creator.credential_status] ??
    CREDENTIAL_STATUS_KO_MAP["checked"]!;
  const koDisplayName = getCreatorDisplayNameKo(creator.display_name);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-10">
      {/* 크리에이터 프로필 헤더 카드 */}
      <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-indigo-950/60 via-[#0f1420] to-[#0a0e17] p-8 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-lg bg-white/[0.08] px-3 py-1 font-mono font-bold text-indigo-300">
                크리에이터 식별자 · {creator.creator_id}
              </span>
              <span
                className={`rounded-full border px-3 py-1 font-bold ${credKo.badgeClass}`}
              >
                ✓ {credKo.label}
              </span>
            </div>

            <h1 className="text-3xl font-black text-white sm:text-4xl">
              {koDisplayName}{" "}
              <span className="text-lg font-semibold text-slate-400">
                ({creator.display_name})
              </span>
            </h1>

            <p className="text-sm leading-relaxed text-slate-300">{creator.bio}</p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-bold text-slate-400">전문 기여 영역:</span>
              {creator.contributions.map((c) => (
                <span
                  key={c}
                  className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-200"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          <Link
            href="/gallery"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white"
          >
            ← 갤러리로 돌아가기
          </Link>
        </div>
      </section>

      {/* 공개 등록 에이전트 목록 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              크리에이터 포트폴리오
            </span>
            <h2 className="mt-0.5 text-2xl font-extrabold text-white">
              공개 등록 에이전트 ({authoredListings.length}종)
            </h2>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {authoredListings.map((l) => {
            const entry = galleryService.catalogEntries.get(l.agent_id);
            const catKo = getCategoryKo(l.category);
            const availKo =
              AVAILABILITY_KO_MAP[l.availability] ?? AVAILABILITY_KO_MAP["preview_only"]!;
            return (
              <div
                key={l.listing_id}
                className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-5 shadow-lg space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="rounded bg-white/[0.07] px-2 py-0.5 font-mono font-bold text-indigo-300">
                      {l.agent_id}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${availKo.badgeClass}`}
                    >
                      {availKo.label}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-white">
                    {entry?.name ?? l.listing_id}
                  </h3>
                  <p className="text-xs text-slate-400">
                    납품 산출물: <strong className="text-slate-200">{entry?.deliverable}</strong>
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs">
                  <span className="text-slate-400">{catKo.shortLabel}</span>
                  <Link
                    href={`/gallery/${l.listing_id}`}
                    className="rounded-lg bg-indigo-500/20 border border-indigo-500/40 px-3 py-1.5 font-bold text-indigo-200 hover:bg-indigo-500/30"
                  >
                    상세 계약 보기 →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
