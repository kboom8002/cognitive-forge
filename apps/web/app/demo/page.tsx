/**
 * /demo — Product Walkthrough Landing Page
 *
 * Explains what Cognitive Forge is, shows the 3 suites,
 * and links to /demo/apps for the interactive demo.
 */

import type { Metadata } from "next";
import Link from "next/link";
import React from "react";
import { DemoHero }       from "../../components/demo/DemoHero";
import { SuiteSelector }  from "../../components/demo/SuiteSelector";
import { DEMO_SUITES }    from "./_lib/demo-registry";

export const metadata: Metadata = {
  title:       "Demo — Product Walkthrough",
  description: "See Cognitive Forge in action. Explore the Corporate PR Suite, Book-to-Agent Suite, and AI Training Practice Suite with a fully interactive static demo.",
};

// ── Styles ────────────────────────────────────────────────────────────────────

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
  section: {
    padding: "3rem 0 0",
  },
  sectionHeader: {
    marginBottom: "2rem",
    display:      "flex",
    flexDirection:"column" as const,
    gap:          "0.5rem",
  },
  sectionLabel: {
    fontSize:     "0.75rem",
    fontWeight:   600,
    letterSpacing:"0.07em",
    textTransform:"uppercase" as const,
    color:        "#6c63ff",
  },
  sectionTitle: {
    fontSize:   "1.625rem",
    fontWeight: 800,
    color:      "#e8e8f0",
    margin:     0,
    lineHeight: 1.25,
  },
  sectionDesc: {
    fontSize:   "1rem",
    color:      "#9090a8",
    lineHeight: 1.65,
    margin:     0,
    maxWidth:   "42rem",
  },
  howItWorksGrid: {
    display:             "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(16rem, 1fr))",
    gap:                 "1.25rem",
  },
  stepCard: {
    padding:      "1.5rem",
    background:   "#13131f",
    border:       "1px solid #2a2a42",
    borderRadius: "0.875rem",
    display:      "flex",
    flexDirection:"column" as const,
    gap:          "0.75rem",
  },
  stepNumber: {
    fontSize:     "0.7rem",
    fontWeight:   700,
    letterSpacing:"0.1em",
    textTransform:"uppercase" as const,
    color:        "#6c63ff",
  },
  stepIcon: {
    fontSize: "1.75rem",
    lineHeight:1,
  },
  stepTitle: {
    fontSize:   "1rem",
    fontWeight: 700,
    color:      "#e8e8f0",
    margin:     0,
  },
  stepDesc: {
    fontSize:   "0.875rem",
    color:      "#9090a8",
    lineHeight: 1.6,
    margin:     0,
  },
  ctaRow: {
    display:        "flex",
    gap:            "1rem",
    flexWrap:       "wrap" as const,
    justifyContent: "center" as const,
  },
  ctaPrimary: {
    display:      "inline-flex",
    alignItems:   "center",
    gap:          "0.5rem",
    padding:      "0.8125rem 2rem",
    borderRadius: "0.625rem",
    fontSize:     "1rem",
    fontWeight:   700,
    textDecoration:"none",
    background:   "linear-gradient(135deg, #6c63ff, #4f49c4)",
    color:        "#fff",
    boxShadow:    "0 4px 20px rgba(108, 99, 255, 0.35)",
    transition:   "transform 0.15s, box-shadow 0.15s",
  },
  ctaSecondary: {
    display:      "inline-flex",
    alignItems:   "center",
    gap:          "0.5rem",
    padding:      "0.8125rem 2rem",
    borderRadius: "0.625rem",
    fontSize:     "1rem",
    fontWeight:   600,
    textDecoration:"none",
    background:   "transparent",
    color:        "#9090a8",
    border:       "1px solid #2a2a42",
    transition:   "border-color 0.15s, color 0.15s",
  },
  divider: {
    height:     "1px",
    background: "linear-gradient(90deg, transparent, #2a2a42, transparent)",
    margin:     "3rem 0 0",
  },
  archRow: {
    display:     "flex",
    alignItems:  "center",
    gap:         "0.5rem",
    flexWrap:    "wrap" as const,
    padding:     "1.25rem 1.5rem",
    background:  "#13131f",
    border:      "1px solid #2a2a42",
    borderRadius:"0.875rem",
  },
  archNode: (color: string) => ({
    padding:      "0.4375rem 0.875rem",
    borderRadius: "0.5rem",
    fontSize:     "0.8125rem",
    fontWeight:   600,
    background:   `${color}14`,
    color,
    border:       `1px solid ${color}30`,
  }),
  archArrow: {
    color:     "#2a2a42",
    flexShrink:0,
    fontSize:  "0.875rem",
  },
} as const;

const HOW_IT_WORKS = [
  { step: "01", icon: "📋", title: "Define Your Knowledge",  desc: "Provide your company details, book, or prompt. The system structures your input through a validated contract." },
  { step: "02", icon: "⟐",  title: "Run the Graph",          desc: "Each CasePack node processes a specific task. Bridges carry the right context between steps." },
  { step: "03", icon: "✦",  title: "Get Structured Output",  desc: "Receive a complete, audited output suite — no raw AI dumps, only schema-validated, human-readable results." },
];

const ARCH_NODES = [
  { label: "User Input",    color: "#6c63ff" },
  { label: "CasePack",     color: "#34d399" },
  { label: "Bridge",       color: "#60a5fa" },
  { label: "CasePack",     color: "#34d399" },
  { label: "Bridge",       color: "#60a5fa" },
  { label: "Final Output", color: "#fb923c" },
];

export default function DemoPage() {
  return (
    <div style={S.page}>
      <div style={S.container}>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <DemoHero
          badge="Interactive Demo"
          title="Cognitive Forge in Action"
          subtitle="Explore three production-ready AI suites — Corporate PR, Book-to-Agent, and AI Training Practice — all running on a contract-driven graph architecture."
          actions={
            <>
              <Link href="/demo/apps" style={S.ctaPrimary}>Explore Demo Apps →</Link>
              <Link href="/" style={S.ctaSecondary}>← Back to Platform</Link>
            </>
          }
        />

        {/* ── How It Works ─────────────────────────────────────────────── */}
        <div style={S.section}>
          <div style={S.sectionHeader}>
            <span style={S.sectionLabel}>How It Works</span>
            <h2 style={S.sectionTitle}>Three steps from knowledge to output</h2>
            <p style={S.sectionDesc}>Every Cognitive Forge app follows the same contract-driven pipeline. No hardcoded UI, no prompt spaghetti.</p>
          </div>
          <div style={S.howItWorksGrid}>
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} style={S.stepCard}>
                <span style={S.stepNumber}>Step {item.step}</span>
                <span style={S.stepIcon} aria-hidden>{item.icon}</span>
                <h3 style={S.stepTitle}>{item.title}</h3>
                <p style={S.stepDesc}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Architecture overview ─────────────────────────────────────── */}
        <div style={S.section}>
          <div style={S.sectionHeader}>
            <span style={S.sectionLabel}>Architecture</span>
            <h2 style={S.sectionTitle}>CasePack → Bridge → Graph</h2>
            <p style={S.sectionDesc}>Each step in a graph is a validated CasePack. Bridges carry only the fields defined in the handoff contract.</p>
          </div>
          <div style={S.archRow} role="img" aria-label="Architecture pipeline">
            {ARCH_NODES.map((node, i) => (
              <React.Fragment key={i}>
                <span style={S.archNode(node.color)}>{node.label}</span>
                {i < ARCH_NODES.length - 1 && (
                  <span style={S.archArrow} aria-hidden>→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── Suite Gallery ─────────────────────────────────────────────── */}
        <div style={{ ...S.section, ...{ paddingBottom: "2rem" } }}>
          <div style={S.sectionHeader}>
            <span style={S.sectionLabel}>Demo Suites</span>
            <h2 style={S.sectionTitle}>Choose a suite to explore</h2>
            <p style={S.sectionDesc}>Three production-ready AI suites, each with a full graph pipeline, static demo mode, and a live app launcher.</p>
          </div>
          <SuiteSelector suites={DEMO_SUITES} />
        </div>

        <div style={S.divider} aria-hidden />
      </div>
    </div>
  );
}
