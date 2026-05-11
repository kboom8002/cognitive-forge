export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-lg text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-white">
          Cognitive Forge
        </h1>
        <p className="mb-8 text-lg leading-relaxed text-[var(--color-forge-muted)]">
          Knowledge-to-AI-App platform. Apps run at{" "}
          <code className="rounded bg-[var(--color-forge-700)] px-1.5 py-0.5 text-sm font-mono text-[var(--color-forge-text)]">
            /a/[slug]
          </code>
          .
        </p>
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-forge-border)] px-4 py-1.5 text-sm text-[var(--color-forge-muted)]">
          <span className="h-2 w-2 rounded-full bg-[var(--color-forge-accent)]" />
          Sprint 00 — Repo Bootstrap
        </div>
      </div>
    </main>
  );
}
