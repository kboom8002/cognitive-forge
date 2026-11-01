import Link from "next/link";
import React from "react";

const HERO_METRICS = [
  { value: "36종", label: "공인 도메인 에이전트 카탈로그", sub: "6대 납품 산출물 카테고리 완비" },
  { value: "12종", label: "즉시 실행 파일럿 케이스팩", sub: "3종 벤치마크(정상·누락·상충) 통과" },
  { value: "8-블록", label: "TASKFLOW-CX 2.0 실행 계약", sub: "역할·범위·산출물·근거·실패방지 명문화" },
  { value: "100%", label: "원문 출처 고정 및 인간 검수", sub: "무근거 추론 차단 및 버전별 해시 감사" },
];

const FEATURED_SUITES = [
  {
    badge: "7단계 멀티노드 그래프",
    title: "기업 PR 턴키 스위트",
    subtitle: "기업 핵심 사실 입력 한 번으로 보도자료·브로슈어·Q&A까지 일괄 생성",
    desc: "기업 기본 정보 수집부터 브랜드 포지셔닝, 핵심 질문 답변 카드, 보도자료, 기업 소개서, 웹 브로슈어, 메시지 일관성 감사까지 7개의 검증된 케이스팩이 순차 실행됩니다.",
    href: "/a/corporate-pr-suite",
    demoHref: "/demo/apps/corporate-pr-suite",
    accent: "from-indigo-500/20 to-violet-500/5 border-indigo-500/30 hover:border-indigo-400",
    pillClass: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    steps: ["기업 정보 수집", "브랜드 포지셔닝", "핵심 답변 카드", "보도자료", "기업 소개서", "웹 브로슈어", "일관성 감사"],
  },
  {
    badge: "5단계 지식 구조화 그래프",
    title: "도서·문서 에이전트 전환 스위트",
    subtitle: "방대한 도서·매뉴얼 원고를 실행 가능한 코칭 에이전트로 자산화",
    desc: "비정형 원고에서 핵심 지식 프레임워크를 추출하고, 실무 인사이트 질의응답, 실행 액션 플랜 코치, 성찰 질문 가이드까지 5단계 지식 패키지로 변환합니다.",
    href: "/a/book-to-agent",
    demoHref: "/demo/apps/book-to-agent",
    accent: "from-emerald-500/20 to-teal-500/5 border-emerald-500/30 hover:border-emerald-400",
    pillClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    steps: ["원고 수집", "지식 구조화", "인사이트 Q&A", "실천 액션 코치", "성찰 가이드"],
  },
  {
    badge: "3단계 루브릭 코칭 그래프",
    title: "AI 프롬프트 역량 훈련 스위트",
    subtitle: "실무 프롬프트 약점 진단·루브릭 채점·개선안 코칭 자동화",
    desc: "학습자가 작성한 프롬프트의 모호성과 누락 조건을 진단하고, 정량 루브릭 기준표로 채점한 뒤 즉시 활용 가능한 개선 프롬프트와 다음 실습 과제를 제시합니다.",
    href: "/a/ai-training-practice-suite",
    demoHref: "/demo/apps/ai-training-practice-suite",
    accent: "from-rose-500/20 to-amber-500/5 border-rose-500/30 hover:border-rose-400",
    pillClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    steps: ["프롬프트 약점 진단", "루브릭 정량 평가", "맞춤형 개선 피드백"],
  },
];

const CORE_CAPABILITIES = [
  {
    step: "01",
    title: "페르소나 에이전트 갤러리 (36종)",
    desc: "정보 구조화·진단·설계·제작·검수·지속 수행 6대 도메인별로 검증된 에이전트 사양과 공인 벤치마크 샘플을 탐색하고 즉시 실행합니다.",
    href: "/gallery",
    cta: "갤러리 탐색하기 →",
  },
  {
    step: "02",
    title: "Side-by-Side 벤치마크 비교 실험실",
    desc: "동일한 표준 과업에 대해 2~3개 에이전트 릴리스를 병렬 실행하고, 모델·온도 설정 차이와 산출물 품질을 투명하게 비교합니다.",
    href: "/compare/cmp_1",
    cta: "A/B 비교 실험실 열기 →",
  },
  {
    step: "03",
    title: "2단계 적격 필터링 프로젝트 매칭",
    desc: "희망 산출물·문서 포맷·언어·전문가 검수 여부를 제출하면 1단계 하드 적격성 필터와 2단계 적합도 평가를 거쳐 최적 오퍼링을 추천합니다.",
    href: "/projects/new",
    cta: "프로젝트 매칭 의뢰하기 →",
  },
  {
    step: "04",
    title: "크리에이터 스튜디오 & 인간 검수 센터",
    desc: "8-블록 실행 계약을 설계·포크하고, 원문 근거 인용과 해시 무결성이 보장된 인간 검수 대기열에서 산출물을 최종 승인합니다.",
    href: "/studio/apps",
    cta: "크리에이터 스튜디오 이동 →",
  },
];

export default function HomePage() {
  return (
    <main className="relative overflow-hidden pb-24">
      {/* 상단 배경 오로라 글로우 */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[960px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-600/20 via-violet-500/15 to-cyan-400/10 blur-[130px]" />

      {/* 히어로 섹션 */}
      <section className="relative mx-auto max-w-7xl px-6 pt-16 pb-14 text-center md:pt-24">
        <div className="mx-auto mb-6 inline-flex items-center gap-2.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-bold text-indigo-300 backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          코그니티브 포지 OS 2.0 · 상용 릴리스 게이트 100% 검증 완료
        </div>

        <h1 className="mx-auto max-w-4xl text-4xl font-black tracking-tight text-white sm:text-6xl md:leading-[1.15]">
          비정형 도메인 지식을{" "}
          <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
            근거 고정형 AI 에이전트 앱
          </span>
          으로 전환하세요
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
          블랙박스 프롬프트가 아닌 <strong>8-블록 실행 계약</strong>, <strong>원문 출처 고정</strong>,{" "}
          <strong>인간 전문가 검수</strong>가 내장된 엔터프라이즈 AI 운영체제입니다.
          지금 바로 36종 에이전트 갤러리와 3대 도메인 스위트를 경험해 보세요.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-400 hover:to-violet-500 hover:scale-[1.01]"
          >
            36종 에이전트 갤러리 탐색 →
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-7 py-3.5 text-sm font-semibold text-slate-100 backdrop-blur-md transition-all hover:border-indigo-400/50 hover:bg-white/[0.1]"
          >
            3대 도메인 스위트 데모 실행
          </Link>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-3.5 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-500/20"
          >
            맞춤 프로젝트 매칭 의뢰
          </Link>
        </div>

        {/* 핵심 지표 그리드 */}
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HERO_METRICS.map((m) => (
            <div
              key={m.label}
              className="rounded-2xl border border-white/[0.08] bg-[#0f1420]/85 p-5 text-left shadow-xl backdrop-blur-md"
            >
              <div className="text-2xl font-black text-white">{m.value}</div>
              <div className="mt-1 text-sm font-bold text-slate-200">{m.label}</div>
              <div className="mt-1 text-xs text-slate-400">{m.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 3대 도메인 스위트 쇼케이스 */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              멀티노드 순차 파이프라인 스위트
            </span>
            <h2 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
              즉시 실행 가능한 3대 대표 도메인 스위트
            </h2>
          </div>
          <Link
            href="/demo"
            className="text-sm font-semibold text-indigo-300 hover:text-indigo-200"
          >
            전체 파이프라인 아키텍처 보기 →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {FEATURED_SUITES.map((suite) => (
            <div
              key={suite.title}
              className={`flex flex-col justify-between rounded-2xl border bg-gradient-to-b ${suite.accent} bg-[#0f1420]/90 p-6 shadow-xl transition-all`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${suite.pillClass}`}
                  >
                    {suite.badge}
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">● 상용 가동 중</span>
                </div>
                <h3 className="mt-4 text-xl font-extrabold text-white">{suite.title}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-300">{suite.subtitle}</p>
                <p className="mt-3 text-xs leading-relaxed text-slate-400">{suite.desc}</p>

                <div className="mt-5 flex flex-wrap gap-1.5">
                  {suite.steps.map((step, i) => (
                    <span
                      key={step}
                      className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-slate-300"
                    >
                      {i + 1}. {step}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3 border-t border-white/[0.08] pt-4">
                <Link
                  href={suite.href}
                  className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-center text-xs font-bold text-white transition hover:bg-indigo-500"
                >
                  앱 직접 실행하기 →
                </Link>
                <Link
                  href={suite.demoHref}
                  className="rounded-xl border border-white/10 px-3.5 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-white/25 hover:text-white"
                >
                  단계별 시연
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4대 핵심 플랫폼 워크플로 */}
      <section className="mx-auto max-w-7xl px-6 pt-12">
        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            엔드투엔드 에이전트 거버넌스
          </span>
          <h2 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
            탐색·비교·매칭부터 스튜디오 제작과 인간 검수까지
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {CORE_CAPABILITIES.map((cap) => (
            <Link
              key={cap.step}
              href={cap.href}
              className="group flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0f1420]/80 p-6 transition-all hover:-translate-y-1 hover:border-indigo-500/50 hover:bg-[#141b2d]"
            >
              <div>
                <span className="font-mono text-xs font-bold text-indigo-400">
                  핵심 모듈 {cap.step}
                </span>
                <h3 className="mt-2 text-base font-extrabold text-white group-hover:text-indigo-300">
                  {cap.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{cap.desc}</p>
              </div>
              <div className="mt-5 text-xs font-bold text-indigo-300 group-hover:translate-x-1 transition-transform">
                {cap.cta}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
