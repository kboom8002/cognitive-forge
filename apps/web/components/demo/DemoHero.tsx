/**
 * DemoHero — Hero section for /demo and /demo/apps pages.
 * Server or Client compatible — no state, no effects.
 */

import React from "react";

interface DemoHeroProps {
  title:       string;
  subtitle:    string;
  badge?:      string;
  actions?:    React.ReactNode;
}

const S = {
  hero: {
    display:       "flex",
    flexDirection: "column" as const,
    alignItems:    "center",
    textAlign:     "center" as const,
    gap:           "1.5rem",
    padding:       "4rem 1rem 2rem",
  },
  badge: {
    display:       "inline-flex",
    alignItems:    "center",
    gap:           "0.5rem",
    padding:       "0.3125rem 1rem",
    borderRadius:  "9999px",
    fontSize:      "0.75rem",
    fontWeight:    600,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    background:    "rgba(108, 99, 255, 0.12)",
    color:         "#6c63ff",
    border:        "1px solid rgba(108, 99, 255, 0.25)",
  },
  dot: {
    width:        "0.4rem",
    height:       "0.4rem",
    borderRadius: "50%",
    background:   "#6c63ff",
    display:      "inline-block",
  },
  title: {
    fontSize:      "clamp(2rem, 5vw, 3.25rem)",
    fontWeight:    800,
    lineHeight:    1.15,
    letterSpacing: "-0.02em",
    color:         "#e8e8f0",
    margin:        0,
    maxWidth:      "44rem",
    background:    "linear-gradient(135deg, #e8e8f0 30%, #9090a8 100%)",
    WebkitBackgroundClip: "text" as const,
    WebkitTextFillColor:  "transparent" as const,
    backgroundClip:       "text" as const,
  },
  subtitle: {
    fontSize:   "1.125rem",
    lineHeight: 1.65,
    color:      "#9090a8",
    margin:     0,
    maxWidth:   "38rem",
  },
  actions: {
    display:    "flex",
    gap:        "0.75rem",
    flexWrap:   "wrap" as const,
    justifyContent: "center" as const,
    marginTop:  "0.5rem",
  },
} as const;

export function DemoHero({ title, subtitle, badge, actions }: DemoHeroProps) {
  return (
    <div style={S.hero}>
      {badge && (
        <div style={S.badge}>
          <span style={S.dot} aria-hidden />
          {badge}
        </div>
      )}
      <h1 style={S.title}>{title}</h1>
      <p style={S.subtitle}>{subtitle}</p>
      {actions && <div style={S.actions}>{actions}</div>}
    </div>
  );
}
