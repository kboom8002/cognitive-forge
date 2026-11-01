/**
 * Captures high-resolution screenshots of all Cognitive Forge OS screens
 * (v1 Demo Suites + Gallery v2.0 + Studio v2.0) into `docs/guide/screenshots/`
 * using local Headless Chrome (`chrome.exe --headless=new`).
 */

import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";

const BASE_URL = process.env["LIVE_BASE_URL"] ?? "https://cognitive-forge-two.vercel.app";
const OUT_DIR = path.resolve(process.cwd(), "docs/guide/screenshots");
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

interface CaptureTarget {
  filename: string;
  path: string;
  title: string;
  height?: number;
}

const TARGETS: CaptureTarget[] = [
  {
    filename: "01-home-landing.png",
    path: "/",
    title: "Home Landing Page",
    height: 1100,
  },
  {
    filename: "02-demo-hub.png",
    path: "/demo",
    title: "v1 Public Demo Hub (/demo)",
    height: 1200,
  },
  {
    filename: "03-suite-corporate-pr.png",
    path: "/a/corporate-pr-suite",
    title: "Corporate PR Suite Runner (/a/corporate-pr-suite)",
    height: 1200,
  },
  {
    filename: "04-gallery-explorer.png",
    path: "/gallery",
    title: "Gallery v2.0 Explorer — 36 Agents (/gallery)",
    height: 1200,
  },
  {
    filename: "05-gallery-runnable-ag06.png",
    path: "/gallery/lst_ag06",
    title: "Gallery v2.0 Runnable Pilot Pack Detail (/gallery/lst_ag06)",
    height: 1300,
  },
  {
    filename: "06-gallery-preview-ag01.png",
    path: "/gallery/lst_ag01",
    title: "Gallery v2.0 Preview-Only Listing Detail (/gallery/lst_ag01)",
    height: 1100,
  },
  {
    filename: "07-creator-profile.png",
    path: "/creators/cr_information",
    title: "Creator Profile & Attribution (/creators/cr_information)",
    height: 1100,
  },
  {
    filename: "08-benchmark-compare.png",
    path: "/compare/cmp_1",
    title: "Side-by-Side Benchmark A/B Comparison Lab (/compare/cmp_1)",
    height: 1000,
  },
  {
    filename: "09-project-brief-matching.png",
    path: "/projects/new",
    title: "Project Brief & 2-Stage Matching (/projects/new)",
    height: 1200,
  },
  {
    filename: "10-studio-apps-list.png",
    path: "/studio/apps",
    title: "Studio Apps Console (/studio/apps)",
    height: 1100,
  },
  {
    filename: "11-studio-app-new.png",
    path: "/studio/apps/new",
    title: "Studio New Agent App Creation (/studio/apps/new)",
    height: 1000,
  },
  {
    filename: "12-studio-app-edit.png",
    path: "/studio/apps/AG06/edit",
    title: "Studio TASKFLOW-CX 2.0 Editor (/studio/apps/AG06/edit)",
    height: 1200,
  },
  {
    filename: "13-studio-app-test.png",
    path: "/studio/apps/AG06/test",
    title: "Studio Evaluation & Release Qualification Gate (/studio/apps/AG06/test)",
    height: 1100,
  },
  {
    filename: "14-studio-review-queue.png",
    path: "/studio/reviews",
    title: "Studio Human Review Queue (/studio/reviews)",
    height: 1000,
  },
  {
    filename: "15-studio-run-detail.png",
    path: "/studio/runs/run_1",
    title: "Studio Run Receipt & Artifact Version History (/studio/runs/run_1)",
    height: 1100,
  },
  {
    filename: "16-studio-forks-lineage.png",
    path: "/studio/forks",
    title: "Studio Fork Lineage & Governance (/studio/forks)",
    height: 1000,
  },
];

function main(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const target of TARGETS) {
    const url = `${BASE_URL}${target.path}`;
    const outPath = path.join(OUT_DIR, target.filename);
    const height = target.height ?? 1080;

    execFileSync(
      CHROME_PATH,
      [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        `--window-size=1440,${height}`,
        "--virtual-time-budget=3000",
        `--screenshot=${outPath}`,
        url,
      ],
      { stdio: "ignore" }
    );

    const stat = fs.statSync(outPath);
    console.log(`Captured: ${target.filename} (${Math.round(stat.size / 1024)} KB) <- ${url}`);
  }

  console.log(`All ${TARGETS.length} screenshots saved to ${OUT_DIR}`);
}

main();
