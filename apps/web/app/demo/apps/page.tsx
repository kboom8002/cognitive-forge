/**
 * /demo/apps — Suite Demo Gallery
 *
 * Shows all available demo suites as a selectable grid.
 */

import type { Metadata } from "next";
import Link from "next/link";
import React from "react";
import { DemoHero }      from "../../../components/demo/DemoHero";
import { SuiteSelector } from "../../../components/demo/SuiteSelector";
import { DEMO_SUITES }   from "../_lib/demo-registry";

export const metadata: Metadata = {
  title:       "Demo Apps — Suite Gallery",
  description: "Choose a Cognitive Forge demo suite: Corporate PR, Book-to-Agent, or AI Training Practice. Interactive static demos — no API key required.",
};

const S = {
  page: {
    minHeight:  "100vh",
    background: "#0a0a0f",
    padding:    "0 1rem 5rem",
  },
  container: {
    maxWidth: "68rem",
    margin:   "0 auto",
  },
  topBar: {
    padding:    "1.5rem 0 0",
    display:    "flex",
    alignItems: "center",
    gap:        "0.5rem",
    fontSize:   "0.875rem",
    color:      "#9090a8",
  },
  breadcrumbLink: {
    color:          "#6c63ff",
    textDecoration: "none",
    fontWeight:     500,
  },
  breadcrumbSep: {
    color: "#2a2a42",
  },
  breadcrumbCurrent: {
    color:     "#e8e8f0",
    fontWeight:600,
  },
  gallery: {
    padding: "1rem 0 0",
  },
  statsRow: {
    display:    "flex",
    gap:        "2rem",
    padding:    "0.875rem 1.25rem",
    background: "#13131f",
    border:     "1px solid #2a2a42",
    borderRadius:"0.625rem",
    marginBottom:"1.5rem",
  },
  stat: {
    display:       "flex",
    flexDirection: "column" as const,
    gap:           "0.125rem",
  },
  statValue: {
    fontSize:   "1.125rem",
    fontWeight: 800,
    color:      "#e8e8f0",
  },
  statLabel: {
    fontSize:     "0.7rem",
    fontWeight:   600,
    letterSpacing:"0.06em",
    textTransform:"uppercase" as const,
    color:        "#9090a8",
  },
} as const;

const STATS = [
  { value: "3",   label: "Demo Suites"   },
  { value: "15",  label: "CasePacks"     },
  { value: "11",  label: "Bridge Edges"  },
  { value: "0",   label: "API Key Needed"},
];

export default function DemoAppsPage() {
  return (
    <div style={S.page}>
      <div style={S.container}>

        {/* ── Breadcrumb ───────────────────────────────────────────────── */}
        <nav style={S.topBar} aria-label="Breadcrumb">
          <Link href="/demo" style={S.breadcrumbLink}>Demo</Link>
          <span style={S.breadcrumbSep} aria-hidden>/</span>
          <span style={S.breadcrumbCurrent} aria-current="page">Apps</span>
        </nav>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <DemoHero
          badge="Suite Gallery"
          title="Choose a Demo Suite"
          subtitle="Three production-grade AI suites. Select one to explore its graph pipeline, try the input form, and preview the full output — no AI provider required."
        />

        {/* ── Stats ────────────────────────────────────────────────────── */}
        <div style={S.gallery}>
          <div style={S.statsRow} role="list" aria-label="Demo statistics">
            {STATS.map((stat) => (
              <div key={stat.label} style={S.stat} role="listitem">
                <span style={S.statValue}>{stat.value}</span>
                <span style={S.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>

          {/* ── Suite grid ───────────────────────────────────────────── */}
          <SuiteSelector suites={DEMO_SUITES} />
        </div>

      </div>
    </div>
  );
}
