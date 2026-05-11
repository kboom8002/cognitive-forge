/**
 * /demo/apps/[slug] — Individual Suite Demo Page (Server Component)
 *
 * Resolves the demo suite from the static registry and delegates
 * interactive rendering to SuiteDemoClient ("use client").
 *
 * No Supabase, no API calls, no AI provider required.
 */

import type { Metadata } from "next";
import { notFound }       from "next/navigation";
import React              from "react";
import { SuiteDemoClient } from "../../../../components/demo/SuiteDemoClient";
import { getDemoSuite, DEMO_SUITES } from "../../_lib/demo-registry";

type Params = Promise<{ slug: string }>;

// ── Static params for build-time generation ───────────────────────────────────

export function generateStaticParams(): Array<{ slug: string }> {
  return DEMO_SUITES.map((suite) => ({ slug: suite.slug }));
}

// ── SEO Metadata ──────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const suite = getDemoSuite(slug);
  if (!suite) return { title: "Demo Not Found" };
  return {
    title:       `${suite.title} — Demo`,
    description: suite.description,
    robots:      { index: true, follow: true },
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DemoSuitePage({ params }: { params: Params }): Promise<React.ReactElement> {
  const { slug } = await params;
  const suite    = getDemoSuite(slug);

  if (!suite) {
    notFound();
  }

  return <SuiteDemoClient suite={suite} />;
}
