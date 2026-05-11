import React from "react";
import type { PublicPackSummary } from "../../../../packages/domain-packs/src/public-pack-sanitizer";

// ── PackAppLauncher ───────────────────────────────────────────────────────────

export function PackAppLauncher({ slug }: { slug: string }) {
  return (
    <a
      href={`/a/${slug}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0.625rem 1.25rem",
        background: "linear-gradient(135deg, #6c63ff, #8b5cf6)",
        color: "#ffffff",
        fontWeight: 600,
        fontSize: "0.875rem",
        borderRadius: "0.5rem",
        textDecoration: "none",
        boxShadow: "0 4px 14px rgba(108, 99, 255, 0.3)",
        transition: "all 0.2s",
        border: "none",
        cursor: "pointer",
        marginTop: "1rem",
        width: "100%",
      }}
      aria-label={`Launch App ${slug}`}
    >
      Launch App <span aria-hidden style={{ marginLeft: "0.5rem" }}>→</span>
    </a>
  );
}

// ── PackCard ──────────────────────────────────────────────────────────────────

export function PackCard({ pack }: { pack: PublicPackSummary }) {
  const isProduction = pack.status === "production";

  return (
    <div
      style={{
        background: "var(--color-forge-700, #1e1e30)",
        border: "1px solid var(--color-forge-border, #2a2a42)",
        borderRadius: "1rem",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        transition: "transform 0.2s, box-shadow 0.2s",
        cursor: "default",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#6c63ff",
            background: "rgba(108, 99, 255, 0.1)",
            padding: "0.25rem 0.625rem",
            borderRadius: "9999px",
          }}
        >
          {pack.domain}
        </span>
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            textTransform: "uppercase",
            color: isProduction ? "#34d399" : "#fbbf24",
            background: isProduction ? "rgba(52, 211, 153, 0.1)" : "rgba(251, 191, 36, 0.1)",
            border: `1px solid ${isProduction ? "rgba(52, 211, 153, 0.3)" : "rgba(251, 191, 36, 0.3)"}`,
            padding: "0.125rem 0.5rem",
            borderRadius: "9999px",
          }}
          aria-label={`Status: ${pack.status}`}
        >
          {pack.status}
        </span>
      </div>
      
      <h3 style={{ margin: "0.5rem 0 0", fontSize: "1.25rem", color: "#e8e8f0", fontWeight: 700 }}>
        {pack.name}
      </h3>
      
      <p style={{ margin: 0, fontSize: "0.9375rem", color: "#9090a8", lineHeight: 1.5, flex: 1 }}>
        {pack.description}
      </p>

      <PackAppLauncher slug={pack.primary_app_slug} />
    </div>
  );
}

// ── PackGalleryLite ───────────────────────────────────────────────────────────

export interface PackGalleryLiteProps {
  packs: PublicPackSummary[];
}

export function PackGalleryLite({ packs }: PackGalleryLiteProps) {
  if (!packs || packs.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#9090a8" }}>
        No Domain Packs are currently available.
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: "1.5rem",
        width: "100%",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
      data-testid="pack-gallery-lite"
    >
      {packs.map((pack) => (
        <PackCard key={pack.primary_app_slug} pack={pack} />
      ))}
    </div>
  );
}
