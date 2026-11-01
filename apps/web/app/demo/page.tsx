/**
 * /demo — 도메인 스위트 데모 허브 페이지
 *
 * 코그니티브 포지 (Cognitive Forge) 3대 대표 도메인 스위트와
 * 케이스팩 → 브릿지 → 그래프 아키텍처를 한국어 UI로 안내합니다.
 */

import type { Metadata } from "next";
import Link from "next/link";
import React from "react";
import { SuiteSelector } from "../../components/demo/SuiteSelector";
import { PackGalleryLite } from "../../components/public-app/PackGalleryLite";
import type { PublicPackSummary } from "@cognitive-forge/domain-packs";
import { DEMO_SUITES } from "./_lib/demo-registry";

const DEMO_PACKS: PublicPackSummary[] = [
  {
    name: "Corporate PR Turnkey Pack",
    description: "기업 핵심 정보를 바탕으로 브랜드 포지셔닝, 보도자료, Q&A 카드, 웹 브로슈어, 메시지 일관성 감사를 일괄 생성합니다.",
    domain: "기업 홍보 · 커뮤니케이션",
    primary_app_slug: "corporate-pr-suite",
    status: "production",
  },
  {
    name: "Book-to-Agent Pack",
    description: "단행본·매뉴얼·전문 문서를 핵심 지식 프레임워크, 실무 질의응답, 액션 플랜, 성찰 코치 에이전트로 전환합니다.",
    domain: "지식 자산화 · 북테크",
    primary_app_slug: "book-to-agent",
    status: "production",
  },
  {
    name: "AI Training Practice Pack",
    description: "작성한 프롬프트의 약점을 진단하고 루브릭 정량 채점과 개선된 프롬프트·후속 실습 과제를 코칭합니다.",
    domain: "AI 역량 교육 · 코칭",
    primary_app_slug: "ai-training-practice-suite",
    status: "production",
  },
];

export const metadata: Metadata = {
  title: "도메인 스위트 데모 허브 | 코그니티브 포지",
  description:
    "코그니티브 포지(Cognitive Forge)의 3대 대표 도메인 스위트(기업 PR, 도서 에이전트 전환, AI 프롬프트 훈련)를 체험하세요.",
};

const HOW_IT_WORKS = [
  {
    step: "제1단계",
    icon: "📋",
    title: "도메인 지식 및 원문 입력",
    desc: "기업 정보, 도서 원고, 또는 실습용 프롬프트를 입력합니다. 입력 계약(Input Contract)이 필수 항목과 형식을 즉시 검증합니다.",
  },
  {
    step: "제2단계",
    icon: "⟐",
    title: "케이스팩 · 브릿지 그래프 실행",
    desc: "각 단계의 케이스팩 노드가 전문 과업을 수행하고, 브릿지(Bridge)가 검증된 핵심 맥락만 다음 노드로 안전하게 전달합니다.",
  },
  {
    step: "제3단계",
    icon: "✦",
    title: "검증된 패키지 산출물 획득",
    desc: "스키마 검증, 품질 신뢰 신호(완결성 점수·위험 노트), 일관성 감사를 통과한 최종 산출물 패키지를 즉시 활용합니다.",
  },
];

const ARCH_NODES = [
  { label: "원문 · 지식 입력", color: "#818cf8" },
  { label: "케이스팩 노드 1", color: "#34d399" },
  { label: "컨텍스트 브릿지", color: "#38bdf8" },
  { label: "케이스팩 노드 2", color: "#34d399" },
  { label: "컨텍스트 브릿지", color: "#38bdf8" },
  { label: "최종 검증 산출물", color: "#fb923c" },
];

export default function DemoPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-12 space-y-16">
      {/* 히어로 배너 */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-indigo-950/60 via-[#0f1420] to-[#0a0e17] p-8 md:p-12 shadow-2xl">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/15 px-3.5 py-1 text-xs font-bold text-indigo-300">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            대화형 파이프라인 데모 허브 · Cognitive Forge
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
            계약 기반 멀티노드 AI 스위트 실전 체험
          </h1>
          <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
            단일 프롬프트 호출이 아닌, 여러 전문 케이스팩과 브릿지가 체인으로 연결되어 완성도 높은 복합 산출물을 만들어내는{" "}
            <strong>3대 도메인 스위트</strong>를 직접 실행해 보세요.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/demo/apps"
              className="rounded-xl bg-indigo-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400"
            >
              스위트 시연 런처 열기 →
            </Link>
            <Link
              href="/gallery"
              className="rounded-xl border border-white/15 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.1]"
            >
              36종 에이전트 갤러리 보기
            </Link>
          </div>
        </div>
      </section>

      {/* 작동 원리 3단계 */}
      <section className="space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            파이프라인 작동 원리
          </span>
          <h2 className="mt-1 text-2xl font-extrabold text-white">
            지식 입력부터 검증된 산출물까지 3단계 공정
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            모든 코그니티브 포지 앱은 하드코딩된 임시 프롬프트 없이 표준화된 입출력 계약 파이프라인으로 작동합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-6 shadow-lg space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-indigo-500/15 px-2.5 py-1 text-xs font-bold text-indigo-300">
                  {item.step}
                </span>
                <span className="text-2xl" aria-hidden>
                  {item.icon}
                </span>
              </div>
              <h3 className="text-base font-extrabold text-white">{item.title}</h3>
              <p className="text-xs leading-relaxed text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 아키텍처 흐름도 */}
      <section className="space-y-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            실행 아키텍처
          </span>
          <h2 className="mt-1 text-2xl font-extrabold text-white">
            케이스팩(CasePack) → 브릿지(Bridge) → 그래프(Graph)
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            각 노드는 독립적으로 검증된 케이스팩이며, 브릿지는 다음 단계에 필요한 검증 필드만 선택적으로 매핑·전달합니다.
          </p>
        </div>

        <div
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-6"
          role="img"
          aria-label="케이스팩 브릿지 그래프 아키텍처 파이프라인"
        >
          {ARCH_NODES.map((node, i) => (
            <React.Fragment key={i}>
              <span
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.625rem",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  background: `${node.color}18`,
                  color: node.color,
                  border: `1px solid ${node.color}40`,
                }}
              >
                {node.label}
              </span>
              {i < ARCH_NODES.length - 1 && (
                <span className="text-slate-500 font-bold" aria-hidden>
                  →
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* 3대 대표 스위트 선택기 */}
      <section className="space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            대표 스위트 시연
          </span>
          <h2 className="mt-1 text-2xl font-extrabold text-white">
            체험할 도메인 스위트를 선택하세요
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            정적 시연(Static Demo) 모드와 실시간 런타임(Live Runtime) 모드를 모두 지원합니다.
          </p>
        </div>
        <SuiteSelector suites={DEMO_SUITES} />
      </section>

      {/* 설치된 도메인 팩 런처 */}
      <section className="space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
            실시간 앱 실행기
          </span>
          <h2 className="mt-1 text-2xl font-extrabold text-white">
            도메인 팩 라이브 실행 런처
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            각 도메인 팩의 공개 실행 화면으로 바로 이동하여 직접 데이터를 입력하고 산출물을 생성할 수 있습니다.
          </p>
        </div>
        <PackGalleryLite packs={DEMO_PACKS} />
      </section>
    </main>
  );
}
