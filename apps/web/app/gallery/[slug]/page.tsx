import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getV1Context } from "@/lib/api/v1-runtime";
import {
  AVAILABILITY_KO_MAP,
  CREDENTIAL_STATUS_KO_MAP,
  OFFERING_MODE_KO_MAP,
  PRICE_STATUS_KO_MAP,
  SAMPLE_ORIGIN_KO_MAP,
  TASKFLOW_BLOCK_KO_MAP,
  getCategoryKo,
  getCreatorDisplayNameKo,
} from "@/lib/i18n/ko-labels";
import { GalleryQuickActionPanel } from "@/components/gallery/GalleryQuickActionPanel";

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
  const catKo = getCategoryKo(listing.category);
  const availKo =
    AVAILABILITY_KO_MAP[listing.availability] ?? AVAILABILITY_KO_MAP["preview_only"]!;
  const sampleKo =
    SAMPLE_ORIGIN_KO_MAP[listing.sample_origin] ?? SAMPLE_ORIGIN_KO_MAP["synthetic_fixture"]!;
  const credKo = creator
    ? CREDENTIAL_STATUS_KO_MAP[creator.credential_status] ??
      CREDENTIAL_STATUS_KO_MAP["checked"]!
    : null;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 space-y-10">
      {/* 상단 헤더 배너 */}
      <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-indigo-950/60 via-[#0f1420] to-[#0a0e17] p-8 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-lg bg-white/[0.08] px-3 py-1 font-mono font-bold text-indigo-300">
                {listing.listing_id} · {listing.agent_id}
              </span>
              <span
                className={`rounded-full border px-3 py-1 font-bold ${catKo.badgeClass}`}
              >
                {catKo.label}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-bold ${availKo.badgeClass}`}
              >
                <span className={`h-2 w-2 rounded-full ${availKo.dotClass}`} />
                {availKo.label} ({availKo.subLabel})
              </span>
            </div>

            <h1 className="text-3xl font-black text-white sm:text-4xl">
              {catalogEntry?.name ?? listing.listing_id}
            </h1>

            <p className="text-sm text-slate-300">
              입력 자료: <strong>{catalogEntry?.input_description ?? "업무 문서"}</strong> → 핵심 납품물:{" "}
              <strong className="text-indigo-300">{catalogEntry?.deliverable ?? "구조화 리포트"}</strong>
            </p>

            <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-slate-300">
              <span className="font-bold text-emerald-300">✓ 샘플 출처 투명성 배지:</span>
              <span>{sampleKo.label}</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">{sampleKo.description}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/compare/cmp_1"
              className="rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-4 py-2.5 text-xs font-bold text-indigo-200 hover:bg-indigo-500/25"
            >
              A/B 비교 실험실에서 비교
            </Link>
            <Link
              href="/gallery"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white"
            >
              ← 갤러리 목록으로
            </Link>
          </div>
        </div>
      </section>

      {/* 메인 2단 레이아웃: 좌측 상세 계약 / 우측 실시간 실행 및 포크 */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-7">
          {/* 크리에이터 및 페르소나 정보 */}
          <section className="grid gap-4 sm:grid-cols-2">
            {creator && (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400">
                    제작 크리에이터 아트리뷰션
                  </span>
                  {credKo && (
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${credKo.badgeClass}`}
                    >
                      {credKo.label}
                    </span>
                  )}
                </div>
                <div>
                  <Link
                    href={`/creators/${creator.creator_id}`}
                    className="text-base font-extrabold text-white hover:text-indigo-300 hover:underline"
                  >
                    {getCreatorDisplayNameKo(creator.display_name)}
                  </Link>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{creator.bio}</p>
                </div>
                <div className="border-t border-white/[0.06] pt-2 text-xs text-slate-400">
                  기여 범위:{" "}
                  <span className="font-semibold text-slate-200">
                    {creator.contributions.join(" · ")}
                  </span>
                </div>
              </div>
            )}

            {persona && (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400">
                    에이전트 페르소나 명세
                  </span>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                    윤리 기준 검증됨
                  </span>
                </div>
                <div>
                  <div className="text-base font-extrabold text-white">{persona.role}</div>
                  <p className="mt-1 text-xs text-slate-400">
                    수행 원칙: {persona.audience}
                  </p>
                </div>
                <div className="border-t border-white/[0.06] pt-2 text-xs font-semibold text-emerald-300">
                  ✓ 실존 인물 사칭 없음 (고유 직무 역할형 페르소나)
                </div>
              </div>
            )}
          </section>

          {/* TASKFLOW-CX 2.0 8-블록 실행 계약 */}
          {pilotPack && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    TASKFLOW-CX 2.0 정본 실행 계약
                  </span>
                  <h2 className="mt-0.5 text-xl font-extrabold text-white">
                    8-블록 작업 흐름 및 실패 방지 계약 ({pilotPack.pack_id})
                  </h2>
                </div>
                <Link
                  href={`/studio/apps/${pilotPack.agent_id}/edit`}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-indigo-300 hover:bg-white/[0.08]"
                >
                  스튜디오에서 블록 보기 →
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(pilotPack.taskflow).map(([k, v]) => {
                  const blockMeta = TASKFLOW_BLOCK_KO_MAP[k] ?? {
                    step: `블록 ${k}`,
                    title: k,
                    subtitle: "",
                  };
                  return (
                    <div
                      key={k}
                      className="rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-4 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-indigo-300">
                          {blockMeta.step} · {blockMeta.title}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">[{k}]</span>
                      </div>
                      <p className="text-xs font-medium leading-relaxed text-slate-200">{v}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 서비스 오퍼링 모드 */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-white">
              제공 서비스 오퍼링 ({offerings.length}종)
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {offerings.map((off) => {
                const modeKo = OFFERING_MODE_KO_MAP[off.mode] ?? {
                  label: off.mode,
                  description: "표준 에이전트 제공 방식",
                  badgeClass: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
                };
                const priceKo = PRICE_STATUS_KO_MAP[off.price_status] ?? off.price_status;
                return (
                  <div
                    key={off.offering_id}
                    className="rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-5 space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded-full border px-3 py-0.5 font-bold ${modeKo.badgeClass}`}
                      >
                        {modeKo.label}
                      </span>
                      <span className="font-bold text-slate-300">{priceKo}</span>
                    </div>
                    <p className="text-slate-400">{modeKo.description}</p>
                    <div className="border-t border-white/[0.06] pt-2 space-y-1 text-slate-300">
                      <div>
                        <strong>납품 산출물:</strong>{" "}
                        {off.deliverables
                          .map((d) => getCategoryKo(d).shortLabel !== d ? getCategoryKo(d).shortLabel : d)
                          .join(", ")}
                      </div>
                      <div>
                        <strong>필수 입력 포맷:</strong> {off.required_inputs.join(", ")} ·{" "}
                        <strong>전문가 검수:</strong> {off.human_review ? "기본 포함" : "선택 가능"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 공인 벤치마크 3종 */}
          {benchmarks.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl font-extrabold text-white">
                공인 벤치마크 검증 시나리오 ({benchmarks.length}종 통과)
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {benchmarks.map((bm) => (
                  <div
                    key={bm.task_id}
                    className="rounded-2xl border border-emerald-500/25 bg-[#0f1420]/90 p-4 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-emerald-300">{bm.task_id}</span>
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                        통과
                      </span>
                    </div>
                    <div className="text-slate-300">
                      <strong className="text-slate-200">필수 검증 기준:</strong>{" "}
                      {bm.expected_checks.join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* 우측 스티키 실행 & 포크 패널 */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 space-y-4">
            <GalleryQuickActionPanel
              agentId={listing.agent_id}
              releaseId={listing.release_id ?? `rel_${listing.agent_id.toLowerCase()}_v2`}
              isRunnable={isRunnable}
              defaultSourceText="사내 베테랑 엔지니어 인터뷰 녹취록: 설비 진동음이 80dB 이상이면 베어링 마모를 의심하고 즉시 윤활 상태를 점검해야 한다."
              defaultGoal={`${catalogEntry?.deliverable ?? "핵심 기준 카드"} 도출 및 원문 출처 인용`}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
