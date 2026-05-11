/**
 * SuiteSelector — Cards grid for selecting a demo suite.
 * Renders one card per DemoSuite with title, description, stepCount, and CTA link.
 * Pure display — no state.
 */

import React from "react";

import type { DemoSuite } from "../../app/demo/_lib/demo-registry";

interface SuiteSelectorProps {
  suites:      DemoSuite[];
  activeSuite?: string;
}

const S = {
  grid: {
    display:   "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(18rem, 1fr))",
    gap:       "1.25rem",
    width:     "100%",
  },
  card: (isActive: boolean) => ({
    background:   isActive ? "rgba(108, 99, 255, 0.07)" : "#13131f",
    border:       isActive ? "1px solid rgba(108, 99, 255, 0.4)" : "1px solid #2a2a42",
    borderRadius: "0.875rem",
    padding:      "1.5rem",
    display:      "flex",
    flexDirection: "column" as const,
    gap:          "1rem",
    textDecoration: "none",
    color:        "inherit",
    transition:   "border-color 0.2s, background 0.2s, transform 0.15s",
    cursor:       "pointer",
    position:     "relative" as const,
    overflow:     "hidden" as const,
  }),
  cardGlow: (color: string) => ({
    position:   "absolute" as const,
    top:        "-2rem",
    right:      "-2rem",
    width:      "8rem",
    height:     "8rem",
    borderRadius: "50%",
    background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
    pointerEvents: "none" as const,
  }),
  icon: {
    fontSize:     "2rem",
    lineHeight:   1,
  },
  header: {
    display:       "flex",
    flexDirection: "column" as const,
    gap:           "0.375rem",
  },
  title: {
    fontSize:   "1.0625rem",
    fontWeight: 700,
    color:      "#e8e8f0",
    margin:     0,
    lineHeight: 1.3,
  },
  description: {
    fontSize:   "0.875rem",
    color:      "#9090a8",
    lineHeight: 1.55,
    margin:     0,
    display:    "-webkit-box" as const,
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical" as const,
    overflow:   "hidden",
  },
  meta: {
    display:    "flex",
    alignItems: "center",
    gap:        "0.625rem",
    flexWrap:   "wrap" as const,
    marginTop:  "auto",
    paddingTop: "0.5rem",
  },
  badge: (color: string) => ({
    padding:      "0.1875rem 0.625rem",
    borderRadius: "9999px",
    fontSize:     "0.7rem",
    fontWeight:   600,
    letterSpacing:"0.05em",
    textTransform: "uppercase" as const,
    background:   `${color}18`,
    color,
    border:       `1px solid ${color}35`,
  }),
  stepBadge: {
    padding:      "0.1875rem 0.625rem",
    borderRadius: "9999px",
    fontSize:     "0.7rem",
    fontWeight:   600,
    background:   "rgba(144, 144, 168, 0.1)",
    color:        "#9090a8",
    border:       "1px solid #2a2a42",
  },
  cta: {
    marginTop:    "auto",
    display:      "inline-flex",
    alignItems:   "center",
    gap:          "0.375rem",
    fontSize:     "0.8125rem",
    fontWeight:   600,
    color:        "#6c63ff",
  },
} as const;

export function SuiteSelector({ suites, activeSuite }: SuiteSelectorProps) {
  return (
    <div style={S.grid}>
      {suites.map((suite) => {
        const isActive = activeSuite === suite.slug;
        return (
          <a
            key={suite.slug}
            href={`/demo/apps/${suite.slug}`}
            style={S.card(isActive)}
            id={`suite-card-${suite.slug}`}
            aria-current={isActive ? "page" : undefined}
          >
            <div style={S.cardGlow(suite.accentColor)} aria-hidden />
            <div style={S.icon} aria-hidden>{suite.icon}</div>
            <div style={S.header}>
              <h3 style={S.title}>{suite.title}</h3>
              <p style={S.description}>{suite.description}</p>
            </div>
            <div style={S.meta}>
              <span style={S.badge(suite.accentColor)}>{suite.category}</span>
              <span style={S.stepBadge}>{suite.stepCount} step{suite.stepCount !== 1 ? "s" : ""}</span>
            </div>
            <div style={S.cta}>
              Try demo →
            </div>
          </a>
        );
      })}
    </div>
  );
}
