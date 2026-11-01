import React from "react";
import type { PublicPackSummary } from "@cognitive-forge/domain-packs";

const PACK_KO_TITLES: Record<string, string> = {
  "corporate-pr-suite": "기업 PR 턴키 도메인 팩",
  "book-to-agent": "도서 지식 에이전트 도메인 팩",
  "ai-training-practice-suite": "AI 프롬프트 실습 · 코칭 도메인 팩",
};

const PACK_KO_DOMAINS: Record<string, string> = {
  "Corporate Communications": "기업 홍보 · 커뮤니케이션",
  "Learning & Knowledge": "지식 자산화 · 북테크",
  "AI Training & Education": "AI 역량 교육 · 코칭",
};

// ── PackAppLauncher ───────────────────────────────────────────────────────────

export function PackAppLauncher({ slug }: { slug: string }) {
  return (
    <a
      href={`/a/${slug}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0.7rem 1.25rem",
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        color: "#ffffff",
        fontWeight: 700,
        fontSize: "0.85rem",
        borderRadius: "0.75rem",
        textDecoration: "none",
        boxShadow: "0 4px 14px rgba(99, 102, 241, 0.3)",
        transition: "all 0.2s",
        border: "none",
        cursor: "pointer",
        marginTop: "1rem",
        width: "100%",
      }}
      aria-label={`Launch App ${slug}`}
    >
      앱 실행 런처 열기 <span aria-hidden style={{ marginLeft: "0.5rem" }}>→</span>
    </a>
  );
}

// ── PackCard ──────────────────────────────────────────────────────────────────

export function PackCard({ pack }: { pack: PublicPackSummary }) {
  const isProduction = pack.status === "production";
  const koTitle = PACK_KO_TITLES[pack.primary_app_slug];
  const koDomain = PACK_KO_DOMAINS[pack.domain];

  return (
    <div
      style={{
        background: "#0f1420",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "1rem",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        transition: "transform 0.2s, box-shadow 0.2s",
        cursor: "default",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          {koDomain && (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#818cf8",
                background: "rgba(99, 102, 241, 0.12)",
                border: "1px solid rgba(99, 102, 241, 0.25)",
                padding: "0.2rem 0.625rem",
                borderRadius: "9999px",
              }}
            >
              {koDomain}
            </span>
          )}
          <span
            style={{
              fontSize: koDomain ? "0.65rem" : "0.75rem",
              fontWeight: 700,
              color: koDomain ? "#64748b" : "#818cf8",
              background: koDomain ? "transparent" : "rgba(99, 102, 241, 0.12)",
              padding: koDomain ? "0 0.25rem" : "0.25rem 0.625rem",
              borderRadius: "9999px",
            }}
          >
            {pack.domain}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              color: isProduction ? "#34d399" : "#fbbf24",
              background: isProduction ? "rgba(52, 211, 153, 0.12)" : "rgba(251, 191, 36, 0.12)",
              border: `1px solid ${isProduction ? "rgba(52, 211, 153, 0.3)" : "rgba(251, 191, 36, 0.3)"}`,
              padding: "0.15rem 0.55rem",
              borderRadius: "9999px",
            }}
          >
            {isProduction ? "운영 배포됨" : "사전 검증"}
          </span>
          <span
            style={{
              fontSize: "0.65rem",
              color: "#64748b",
            }}
            aria-label={`Status: ${pack.status}`}
          >
            {pack.status}
          </span>
        </div>
      </div>

      {koTitle ? (
        <div>
          <div style={{ margin: "0.35rem 0 0", fontSize: "1.15rem", color: "#f8fafc", fontWeight: 800 }}>
            {koTitle}
          </div>
          <h3 style={{ margin: "0.15rem 0 0", fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>
            {pack.name}
          </h3>
        </div>
      ) : (
        <h3 style={{ margin: "0.5rem 0 0", fontSize: "1.25rem", color: "#f8fafc", fontWeight: 700 }}>
          {pack.name}
        </h3>
      )}

      <p style={{ margin: 0, fontSize: "0.875rem", color: "#94a3b8", lineHeight: 1.6, flex: 1 }}>
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
      <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#94a3b8" }}>
        현재 사용 가능한 도메인 팩이 없습니다.
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
