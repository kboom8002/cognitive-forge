"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  badge?: string;
  matchPrefix?: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "홈",
  },
  {
    href: "/gallery",
    label: "에이전트 갤러리",
    badge: "36",
    matchPrefix: ["/gallery", "/creators"],
  },
  {
    href: "/demo",
    label: "도메인 스위트 데모",
    badge: "3종",
    matchPrefix: ["/demo", "/a/"],
  },
  {
    href: "/compare/cmp_1",
    label: "A/B 벤치마크 비교",
    matchPrefix: ["/compare"],
  },
  {
    href: "/projects/new",
    label: "프로젝트 매칭 의뢰",
    matchPrefix: ["/projects"],
  },
  {
    href: "/studio/apps",
    label: "크리에이터 스튜디오",
    matchPrefix: ["/studio/apps", "/studio/forks"],
  },
  {
    href: "/studio/reviews",
    label: "인간 검수 센터",
    matchPrefix: ["/studio/reviews", "/studio/runs"],
  },
];

export function ForgeHeader() {
  const pathname = usePathname() ?? "/";

  const isActive = (item: NavItem): boolean => {
    if (item.href === "/") {
      return pathname === "/";
    }
    if (item.matchPrefix) {
      return item.matchPrefix.some((p) => pathname.startsWith(p));
    }
    return pathname.startsWith(item.href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#07090e]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-3.5">
        {/* 브랜드 로고 */}
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400 shadow-lg shadow-indigo-500/25 transition-transform group-hover:scale-105">
            <span className="text-sm font-black tracking-tighter text-white">CF</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-white">
                코그니티브 포지
              </span>
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                에디션 2.0
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              도메인 지식 기반 검증형 AI 에이전트 운영체제
            </span>
          </div>
        </Link>

        {/* 통합 메뉴 */}
        <nav aria-label="전역 메뉴" className="flex flex-wrap items-center gap-1.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/40 shadow-sm shadow-indigo-500/10"
                    : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      active
                        ? "bg-indigo-500 text-white"
                        : "bg-white/[0.08] text-slate-300"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
