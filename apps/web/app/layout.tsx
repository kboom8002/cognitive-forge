import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ForgeHeader } from "@/components/layout/ForgeHeader";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "코그니티브 포지 | 검증형 AI 에이전트 운영체제",
    template: "%s | 코그니티브 포지",
  },
  description:
    "도메인 지식과 업무 문서를 출처 고정 및 전문가 검수가 내장된 계약 기반 AI 에이전트 앱으로 전환합니다.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className={`${inter.variable} min-h-screen flex flex-col`}>
        <ForgeHeader />
        <div className="flex-1">{children}</div>
        <footer className="mt-20 border-t border-white/[0.08] bg-[#05070b]/90 py-8 text-xs text-slate-400">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6">
            <div>
              <span className="font-bold text-slate-200">코그니티브 포지 (Cognitive Forge OS)</span> ·
              도메인 지식 기반 검증형 AI 에이전트 플랫폼
            </div>
            <div className="flex items-center gap-4">
              <span>공인 카탈로그 36종</span>
              <span>·</span>
              <span>즉시 실행 파일럿 12종</span>
              <span>·</span>
              <span>근거 고정 및 인간 검수 기본 내장</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
