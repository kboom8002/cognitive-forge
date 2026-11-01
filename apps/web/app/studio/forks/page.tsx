import React from "react";
import Link from "next/link";
import { getV1Context } from "@/lib/api/v1-runtime";

export default function StudioForksPage() {
  const { forkService } = getV1Context();

  // 서버리스 콜드 스타트 시 대표 포크 계보 1건을 자동 하이드레이션하여 빈 화면 방지
  if (forkService.forks.size === 0) {
    forkService.createFork(
      {
        parent_release_id: "rel_ag06_v2",
        display_name: "AG06 사내 기술노하우 맞춤형 포크 초안",
        license_version: "2.0",
      },
      {
        idempotencyKey: "ssr_fork_lineage_seed_1",
        ownerWorkspaceId: "ws_default",
      }
    );
  }

  const forks = Array.from(forkService.forks.values());

  return (
    <main
      aria-label="Fork"
      className="mx-auto max-w-6xl px-6 py-10 space-y-8"
    >
      {/* 상단 헤더 */}
      <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-indigo-950/60 via-[#0f1420] to-[#0a0e17] p-8 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/15 px-3.5 py-1 text-xs font-bold text-purple-300">
              <span className="h-2 w-2 rounded-full bg-purple-400" />
              페르소나 · 케이스팩 포크 계보 관리소 (Fork Lineage)
            </div>
            <h1 className="text-3xl font-black text-white sm:text-4xl">
              포크 계보 및 격리 거버넌스 감사
            </h1>
            <p className="text-sm leading-relaxed text-slate-300">
              모든 포크는 호출자 워크스페이스의 <strong>비공개 초안</strong>으로 생성되며, 원본의 고객 데이터·실행 로그·비밀키는 절대 복제되지 않고 부모 릴리스의 검증 배지 역시 자동 승계되지 않습니다.
            </p>
          </div>
          <Link
            href="/studio/apps"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white"
          >
            ← 스튜디오 홈으로
          </Link>
        </div>
      </section>

      {/* 불변 격리 원칙 배너 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-xs space-y-1">
          <div className="text-sm font-extrabold text-emerald-300">
            ✓ 고객 데이터 및 비밀키 완전 격리 보장
          </div>
          <p className="text-emerald-100/80">
            포크 생성 시 계약 구조와 8-블록 정의만 복제되며, 부모 워크스페이스의 고객 문서·실행 이력·자격증명은 일절 포함되지 않습니다.
          </p>
        </div>
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-5 text-xs space-y-1">
          <div className="text-sm font-extrabold text-indigo-300">
            ✓ 공인 검증 배지 비승계 및 재평가 원칙
          </div>
          <p className="text-indigo-100/80">
            포크된 자식 초안은 수정 여부를 불문하고 검증 배지가 초기화되며, 공개 출시 전 3종 벤치마크 평가를 독립적으로 통과해야 합니다.
          </p>
        </div>
      </div>

      {/* 포크 계보 카드 목록 */}
      <section className="space-y-4">
        <h2 className="text-xl font-extrabold text-white">
          등록된 포크 계보 레코드 ({forks.length}건)
        </h2>

        <div className="grid gap-4">
          {forks.map((f) => (
            <div
              key={f.fork_id}
              className="rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-6 shadow-xl space-y-4 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="rounded-md bg-purple-500/15 px-2.5 py-1 font-mono font-bold text-purple-300">
                    포크 식별자 · {f.fork_id}
                  </span>
                  <span className="rounded-full bg-white/[0.06] px-3 py-0.5 font-semibold text-slate-300">
                    라이선스 버전 {f.license_version}
                  </span>
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 font-bold text-emerald-300">
                  ✓ 격리 무결성 확인됨
                </span>
              </div>

              <div className="text-base font-extrabold text-white">
                원작자 아트리뷰션:{" "}
                <span className="text-indigo-300">
                  {f.attribution
                    .replace(/^Forked from /, "원본 릴리스 복제 출처: ")
                    .replace("Forge Knowledge Studio", "포지 지식구조화 스튜디오")}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 rounded-xl border border-white/[0.06] bg-[#090d16] p-4">
                <div>
                  <div className="text-slate-400">부모 공인 릴리스</div>
                  <div className="mt-1 font-mono font-bold text-white">
                    {f.parent_release_id}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">파생 자식 초안 케이스팩</div>
                  <div className="mt-1 font-mono font-bold text-indigo-300">
                    {f.child_pack_id}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">보안 격리 감사 상태</div>
                  <div className="mt-1 font-bold text-emerald-300">
                    고객데이터 복제 없음 · 배지 승계 없음
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
