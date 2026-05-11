/**
 * /a/[slug] — Public App Runner Page (Server Component)
 *
 * Resolves the app definition from the public API, generates SEO metadata,
 * and delegates interactive rendering to AppRunnerClient ("use client").
 *
 * RULES:
 * - Must NEVER contain hardcoded app-specific UI.
 * - Must NEVER expose raw CasePack JSON, Graph JSON, or internal fields.
 * - All contract data is resolved server-side via service-role DB access.
 * - The client component receives only sanitized public contract data.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceClient } from "../../../lib/supabase/client";
import { AppRunnerClient } from "../../../components/public-app/AppRunnerClient";

type Params = Promise<{ slug: string }>;

// ── Types for resolved data ──────────────────────────────────────────────────

interface ResolvedApp {
  slug: string;
  title: string;
  description: string | null;
  type: "casepack" | "graph";
  input_contract: unknown;
  output_contract: unknown;
  ui_schema: unknown;
  graph_nodes?: Array<{ id: string; label: string }>;
}

// ── Server-side resolver (bypasses HTTP — calls DB directly) ─────────────────

async function resolveApp(slug: string): Promise<ResolvedApp | null> {
  const db = createServiceClient();

  // 1. Fetch app row
  const { data: app } = await db
    .from("apps")
    .select("id, slug, title, description, type, casepack_key, graph_key, visibility, pack_key, extra")
    .eq("slug", slug)
    .maybeSingle();

  if (!app) return null;
  if (app.visibility !== "public" && app.visibility !== "unlisted") return null;

  // 2. Resolve contracts based on type
  if (app.type === "casepack" && app.casepack_key) {
    const mao = await resolveCurrentMao(db, app.casepack_key);
    if (!mao) return null;

    return {
      slug:            app.slug,
      title:           app.title,
      description:     app.description,
      type:            "casepack",
      input_contract:  mao["input_contract"] ?? null,
      output_contract: mao["output_contract"] ?? null,
      ui_schema:       mao["ui_schema"] ?? null,
    };
  }

  if (app.type === "graph" && app.graph_key) {
    const { data: graph } = await db
      .from("casepack_graphs")
      .select("id, entry_node, final_nodes")
      .eq("key", app.graph_key)
      .maybeSingle();

    if (!graph) return null;

    const { data: gv } = await db
      .from("graph_versions")
      .select("graph_json")
      .eq("graph_id", graph.id)
      .eq("is_current", true)
      .maybeSingle();

    if (!gv?.graph_json) return null;

    const graphJson = gv.graph_json as Record<string, unknown>;
    const nodes = (graphJson["nodes"] ?? []) as Array<{ id: string; label?: string; casepack_key: string }>;

    // Resolve entry node for input_contract
    const entryNode = nodes.find((n) => n.id === graph.entry_node);
    const entryMao = entryNode ? await resolveCurrentMao(db, entryNode.casepack_key) : null;

    // Resolve final node for output_contract
    const finalNodeId = (graph.final_nodes as string[])?.[0];
    const finalNode = finalNodeId ? nodes.find((n) => n.id === finalNodeId) : null;
    const finalMao = finalNode ? await resolveCurrentMao(db, finalNode.casepack_key) : null;

    return {
      slug:            app.slug,
      title:           app.title,
      description:     app.description,
      type:            "graph",
      input_contract:  entryMao?.["input_contract"] ?? null,
      output_contract: finalMao?.["output_contract"] ?? null,
      ui_schema:       entryMao?.["ui_schema"] ?? null,
      graph_nodes:     nodes.map((n) => ({ id: n.id, label: n.label ?? n.id })),
    };
  }

  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveCurrentMao(db: any, casepackKey: string): Promise<Record<string, unknown> | null> {
  const { data: cp } = await db
    .from("casepacks")
    .select("id")
    .eq("key", casepackKey)
    .maybeSingle();

  if (!cp) return null;

  const { data: version } = await db
    .from("casepack_versions")
    .select("casepack_json")
    .eq("casepack_id", cp.id)
    .eq("is_current", true)
    .maybeSingle();

  if (!version?.casepack_json) return null;
  return version.casepack_json as Record<string, unknown>;
}

// ── SEO Metadata ─────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;

  // Light fetch for metadata only — don't resolve full contracts
  const db = createServiceClient();
  const { data: app } = await db
    .from("apps")
    .select("title, description")
    .eq("slug", slug)
    .maybeSingle();

  if (!app) {
    return { title: "App Not Found" };
  }

  return {
    title: app.title,
    description: app.description ?? `Run the ${app.title} AI app on Cognitive Forge.`,
    robots: { index: true, follow: true },
  };
}

// ── Page Component ───────────────────────────────────────────────────────────

export default async function AppRunnerPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const resolved = await resolveApp(slug);

  if (!resolved) {
    notFound();
  }

  // Validate that contracts exist before rendering
  if (!resolved.input_contract || !resolved.output_contract) {
    return (
      <main style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        color: "var(--color-forge-text, #e8e8f0)",
        background: "var(--color-forge-900, #0a0a0f)",
      }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
          {resolved.title}
        </h1>
        <p style={{ color: "var(--color-forge-muted, #9090a8)", textAlign: "center" }}>
          This app is not yet fully configured. Contracts are being set up.
        </p>
      </main>
    );
  }

  return (
    <AppRunnerClient
      slug={resolved.slug}
      title={resolved.title}
      description={resolved.description}
      appType={resolved.type}
      inputContract={resolved.input_contract as Parameters<typeof AppRunnerClient>[0]["inputContract"]}
      outputContract={resolved.output_contract as Parameters<typeof AppRunnerClient>[0]["outputContract"]}
      {...(resolved.ui_schema ? { uiSchema: resolved.ui_schema as Parameters<typeof AppRunnerClient>[0]["uiSchema"] } : {})}
      {...(resolved.graph_nodes ? { graphNodes: resolved.graph_nodes } : {})}
    />
  );
}
