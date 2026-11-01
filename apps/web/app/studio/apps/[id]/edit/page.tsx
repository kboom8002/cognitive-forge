import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getV1Context } from "@/lib/api/v1-runtime";

export default async function StudioEditAppPage({
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

  const entry = galleryService.catalogEntries.get(pack.agent_id);
  const persona = galleryService.personas.get(`persona_${pack.agent_id.toLowerCase()}`);

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-center justify-between border-b pb-4">
        <div>
          <span className="text-xs font-mono font-semibold text-indigo-600">
            {pack.agent_id} · {pack.pack_id} ({pack.schema_version})
          </span>
          <h1 className="text-2xl font-bold text-slate-900">
            {entry?.name ?? pack.pack_id} — TASKFLOW-CX 2.0 편집기
          </h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={`/studio/apps/${pack.agent_id}/test`}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white"
          >
            벤치마크 검증 실행 →
          </Link>
          <Link href="/studio/apps" className="text-slate-600 hover:text-slate-900">
            목록으로
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {Object.entries(pack.taskflow).map(([blockKey, blockValue]) => (
          <div
            key={blockKey}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="text-xs font-bold uppercase text-indigo-700">
              Block {blockKey}
            </div>
            <p className="mt-1 text-sm text-slate-800">{blockValue}</p>
          </div>
        ))}
      </section>

      {persona && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-2">
          <h2 className="text-base font-bold text-slate-900">
            페르소나 프로필 ({persona.persona_id})
          </h2>
          <p className="text-xs text-slate-700">역할: {persona.role}</p>
          <p className="text-xs text-slate-700">대상 독자: {persona.audience}</p>
          <p className="text-xs text-emerald-700 font-medium">
            실존 인물 사칭 여부 (real_person_impersonation): {String(persona.real_person_impersonation)}
          </p>
        </section>
      )}
    </main>
  );
}
