/**
 * SuiteSelector — 대표 도메인 스위트 선택 카드 그리드
 */

import React from "react";

import type { DemoSuite } from "../../app/demo/_lib/demo-registry";

interface SuiteSelectorProps {
  suites: DemoSuite[];
  activeSuite?: string;
}

const SUITE_KO_MAP: Record<
  string,
  {
    koTitle: string;
    koDesc: string;
    koCategory: string;
  }
> = {
  "corporate-pr-suite": {
    koTitle: "기업 PR 턴키 스위트",
    koDesc:
      "기업 핵심 정보를 입력하면 7단계 파이프라인을 거쳐 브랜드 포지셔닝, 핵심 메시지 하우스, 보도자료, Q&A 카드, 웹 브로슈어, 메시지 일관성 감사를 일괄 생성합니다.",
    koCategory: "기업 홍보 · 커뮤니케이션",
  },
  "book-to-agent": {
    koTitle: "도서 지식 에이전트 전환 스위트",
    koDesc:
      "단행본·전문 매뉴얼·사내 지침서를 5단계 체인으로 분석하여 핵심 지식 프레임워크, 실무 질의응답, 액션 플랜, 성찰 코치 에이전트로 전환합니다.",
    koCategory: "지식 자산화 · 북테크",
  },
  "ai-training-practice-suite": {
    koTitle: "AI 프롬프트 실습 · 코칭 스위트",
    koDesc:
      "실습생이 작성한 프롬프트의 구조적 약점을 진단하고, 루브릭 기반 정량 채점과 개선된 모범 프롬프트 및 후속 심화 과제를 생성합니다.",
    koCategory: "AI 역량 교육 · 코칭",
  },
};

const S = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(20rem, 1fr))",
    gap: "1.25rem",
    width: "100%",
  },
  card: (isActive: boolean) => ({
    background: isActive ? "rgba(99, 102, 241, 0.1)" : "#0f1420",
    border: isActive
      ? "1px solid rgba(99, 102, 241, 0.45)"
      : "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "1rem",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column" as const,
    gap: "1rem",
    textDecoration: "none",
    color: "inherit",
    transition: "border-color 0.2s, background 0.2s, transform 0.15s",
    cursor: "pointer",
    position: "relative" as const,
    overflow: "hidden" as const,
  }),
  cardGlow: (color: string) => ({
    position: "absolute" as const,
    top: "-2rem",
    right: "-2rem",
    width: "8rem",
    height: "8rem",
    borderRadius: "50%",
    background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
    pointerEvents: "none" as const,
  }),
  icon: {
    fontSize: "2rem",
    lineHeight: 1,
  },
  header: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.375rem",
  },
  title: {
    fontSize: "1.125rem",
    fontWeight: 800,
    color: "#f8fafc",
    margin: 0,
    lineHeight: 1.35,
  },
  subTitle: {
    fontSize: "0.7rem",
    fontWeight: 600,
    color: "#64748b",
    margin: 0,
  },
  description: {
    fontSize: "0.85rem",
    color: "#94a3b8",
    lineHeight: 1.6,
    margin: 0,
  },
  meta: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flexWrap: "wrap" as const,
    marginTop: "auto",
    paddingTop: "0.5rem",
  },
  badge: (color: string) => ({
    padding: "0.2rem 0.625rem",
    borderRadius: "9999px",
    fontSize: "0.7rem",
    fontWeight: 700,
    background: `${color}18`,
    color,
    border: `1px solid ${color}35`,
  }),
  stepBadge: {
    padding: "0.2rem 0.625rem",
    borderRadius: "9999px",
    fontSize: "0.7rem",
    fontWeight: 700,
    background: "rgba(148, 163, 184, 0.1)",
    color: "#cbd5e1",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  cta: {
    marginTop: "0.25rem",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    fontSize: "0.8125rem",
    fontWeight: 700,
    color: "#818cf8",
  },
} as const;

export function SuiteSelector({ suites, activeSuite }: SuiteSelectorProps) {
  return (
    <div style={S.grid}>
      {suites.map((suite) => {
        const isActive = activeSuite === suite.slug;
        const ko = SUITE_KO_MAP[suite.slug];
        return (
          <a
            key={suite.slug}
            href={`/demo/apps/${suite.slug}`}
            style={S.card(isActive)}
            id={`suite-card-${suite.slug}`}
            aria-current={isActive ? "page" : undefined}
          >
            <div style={S.cardGlow(suite.accentColor)} aria-hidden />
            <div style={S.icon} aria-hidden>
              {suite.icon}
            </div>
            <div style={S.header}>
              {ko ? (
                <>
                  <div style={S.title}>{ko.koTitle}</div>
                  <h3 style={S.subTitle}>{suite.title}</h3>
                </>
              ) : (
                <h3 style={S.title}>{suite.title}</h3>
              )}
              <p style={S.description}>{ko ? ko.koDesc : suite.description}</p>
            </div>
            <div style={S.meta}>
              <span style={S.badge(suite.accentColor)}>
                {ko ? ko.koCategory : suite.category}
              </span>
              <span style={S.stepBadge}>{suite.stepCount}단계 파이프라인</span>
            </div>
            <div style={S.cta}>스위트 시연 실행하기 →</div>
          </a>
        );
      })}
    </div>
  );
}
