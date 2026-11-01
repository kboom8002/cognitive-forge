import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getV1Context } from "@/lib/api/v1-runtime";

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

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-start justify-between border-b pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono font-bold text-indigo-600">{creator.creator_id}</span>
            <span className="rounded bg-emerald-100 px-2.5 py-0.5 font-semibold text-emerald-800">
              credential_status: {creator.credential_status}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">{creator.display_name}</h1>
          <p className="text-sm text-slate-600">{creator.bio}</p>
          <p className="text-xs text-slate-500">
            기여 영역(Contributions): {creator.contributions.join(", ")}
          </p>
        </div>
        <Link href="/gallery" className="text-sm text-slate-600 hover:text-slate-900">
          ← 갤러리로
        </Link>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">
          공개 등록 에이전트 ({authoredListings.length})
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {authoredListings.map((l) => {
            const entry = galleryService.catalogEntries.get(l.agent_id);
            return (
              <div
                key={l.listing_id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-mono text-indigo-700 font-bold">{l.agent_id}</div>
                  <div className="text-sm font-bold text-slate-900">
                    {entry?.name ?? l.listing_id}
                  </div>
                  <div className="text-slate-500">availability: {l.availability}</div>
                </div>
                <Link
                  href={`/gallery/${l.agent_id.toLowerCase()}`}
                  className="rounded bg-slate-100 px-3 py-1.5 font-semibold text-slate-800 hover:bg-slate-200"
                >
                  보기 →
                </Link>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
