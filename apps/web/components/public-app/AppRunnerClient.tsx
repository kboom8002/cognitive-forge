/**
 * AppRunnerClient — 공개 도메인 스위트 및 케이스팩 실행 화면 (/a/[slug])
 *
 * - 모든 영문 타이틀, 노드명, 입력 필드 레이블/플레이스홀더를 자연스러운 한국어로 변환
 * - 상단 "✨ 1-클릭 샘플 데이터 자동 채우기 및 즉시 실행" 지원
 * - SOTA 다크 글래스모피즘 카드 디자인 적용
 */

"use client";

import React, { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  DynamicForm,
  OutputCard,
  CompositeAppRenderer,
  BuilderInspectionPanel,
} from "@cognitive-forge/ui-forge";
import type { FormValues, OutputValue, PublicGraphRunResult } from "@cognitive-forge/ui-forge";
import { PROutputPackage } from "./PROutputPackage";
import { AITrainingOutputPackage } from "./AITrainingOutputPackage";
import { BookToAgentOutputPackage } from "./BookToAgentOutputPackage";
import type { InputContract, OutputContract, UISchema } from "@cognitive-forge/core";

export type RunState = "idle" | "running" | "complete" | "error";

export interface PublicGraphNode {
  id: string;
  label: string;
}

export interface AppRunnerClientProps {
  slug: string;
  title: string;
  description?: string | null | undefined;
  appType: "casepack" | "graph";
  inputContract: InputContract;
  outputContract: OutputContract;
  uiSchema?: UISchema | null | undefined;
  graphNodes?: PublicGraphNode[] | undefined;
}

const APP_KO_META: Record<
  string,
  {
    title: string;
    description: string;
    sampleInput: Record<string, string>;
  }
> = {
  "corporate-pr-suite": {
    title: "기업 PR 턴키 스위트 (7단계 자동 파이프라인)",
    description:
      "기업 기본 정보와 핵심 발표 사항을 입력하면 브랜드 포지셔닝, 핵심 Q&A 카드, 보도자료, 기업 소개서, 웹 브로슈어, 메시지 일관성 감사 리포트를 한 번에 생성합니다.",
    sampleInput: {
      company_name: "코그니티브 포지 코리아",
      industry: "엔터프라이즈 AI 소프트웨어 및 지식 운영체제",
      core_offering: "사내 암묵지와 업무 문서를 근거 고정형 AI 에이전트 앱으로 전환하는 플랫폼",
      target_audience: "금융·제조·법무·컨설팅 기업의 AI 전환(AX) 추진 부서",
      key_differentiator: "100% 원문 출처 인용(Evidence Pinning) 및 인간 전문가 검수 게이트 기본 내장",
      key_announcement: "36종 페르소나 에이전트 갤러리 및 8-블록 실행 계약 엔진 2.0 정식 출시",
      website_url: "https://cognitive-forge-two.vercel.app",
      founding_year: "2025",
    },
  },
  "book-to-agent": {
    title: "도서·문서 지식 에이전트 전환 스위트 (5단계 파이프라인)",
    description:
      "단행본 원고나 사내 매뉴얼 핵심 내용을 입력하면 지식 구조화, 인사이트 질의응답, 실무 액션 플랜, 성찰 코칭 질문지로 구성된 에이전트 패키지를 생성합니다.",
    sampleInput: {
      book_title: "실패하지 않는 엔터프라이즈 AI 에이전트 설계",
      author: "김도윤 수석 아키텍트",
      core_summary:
        "프롬프트 엔지니어링만으로는 기업 현장의 신뢰성 기준을 충족할 수 없으며, 입출력 계약·출처 고정·인간 검수 루프가 결합되어야 상용 도입이 가능하다.",
      target_reader: "기업 AI 프로젝트 리더 및 프로덕트 매니저",
    },
  },
  "ai-training-practice-suite": {
    title: "AI 프롬프트 역량 훈련 스위트 (3단계 루브릭 코칭)",
    description:
      "실무에서 작성한 프롬프트를 입력하면 모호성·누락 조건을 진단하고, 5점 척도 루브릭 정량 평가와 즉시 사용 가능한 개선 프롬프트를 코칭합니다.",
    sampleInput: {
      user_prompt: "우리 회사 신제품 홍보 보도자료 좀 잘 써줘.",
      task_goal: "신규 B2B AI 보안 솔루션 출시에 맞춰 IT 전문지 기자에게 배포할 공식 보도자료 초안 작성",
      target_audience: "국내 주요 IT·경제지 담당 기자 및 기업 보안 책임자(CISO)",
    },
  },
};

const NODE_LABEL_KO_MAP: Record<string, string> = {
  "Company Intake": "1. 기업 기본정보 수집",
  "Brand Positioning": "2. 브랜드 포지셔닝 정립",
  "Answer Card": "3. 핵심 Q&A 카드 생성",
  "Press Release": "4. 공식 보도자료 작성",
  "Company Profile": "5. 표준 기업 소개서",
  "Web Brochure": "6. 웹 브로슈어 카피",
  "Message Consistency Audit": "7. 메시지 일관성 감사",
  "Book Intake": "1. 도서·문서 원문 수집",
  "Knowledge Structurer": "2. 핵심 지식 프레임워크 구조화",
  "Insight Q&A": "3. 실무 인사이트 Q&A",
  "Action Coach": "4. 실천 액션 플랜 코치",
  "Reflection Coach": "5. 성찰 질문 가이드",
  "Prompt Improvement Practice": "1. 프롬프트 약점 진단 및 개선",
  "Rubric Evaluation": "2. 루브릭 정량 채점",
  "Learner Feedback": "3. 맞춤형 역량 코칭 피드백",
};

const FIELD_LABEL_KO_MAP: Record<string, { label: string; placeholder: string }> = {
  company_name: {
    label: "기업명 (회사 또는 서비스 이름)",
    placeholder: "예: 코그니티브 포지 코리아",
  },
  industry: {
    label: "산업군 및 핵심 분야",
    placeholder: "예: 엔터프라이즈 AI 소프트웨어 및 클라우드",
  },
  core_offering: {
    label: "핵심 제품 · 서비스 제공 가치",
    placeholder: "예: 비정형 사내 문서를 검증된 AI 에이전트 앱으로 전환",
  },
  target_audience: {
    label: "주요 타깃 고객층",
    placeholder: "예: 대기업 전략기획실, 법무팀, 홍보팀",
  },
  key_differentiator: {
    label: "경쟁사 대비 핵심 차별점",
    placeholder: "예: 100% 원문 출처 인용 및 인간 검수 워크플로 내장",
  },
  key_announcement: {
    label: "주요 발표 뉴스 또는 캠페인 주제",
    placeholder: "예: 에이전트 갤러리 2.0 및 36종 공인 카탈로그 정식 출시",
  },
  website_url: {
    label: "공식 웹사이트 주소 (URL)",
    placeholder: "예: https://cognitive-forge-two.vercel.app",
  },
  founding_year: {
    label: "설립 연도 (선택 사항)",
    placeholder: "예: 2025",
  },
};

function makeGraphSubmitFn(slug: string) {
  return async (input: FormValues): Promise<PublicGraphRunResult> => {
    const res = await fetch(`/api/public/apps/${slug}/graph-run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });

    const json = (await res.json()) as Record<string, unknown>;

    if (!res.ok) {
      const err = json["error"] as { message?: string } | undefined;
      throw new Error(err?.message ?? `실행 요청 실패 (${res.status})`);
    }

    const data = json["data"] as PublicGraphRunResult | undefined;
    if (!data) {
      throw new Error("서버 응답 형식이 올바르지 않습니다. 다시 시도해 주세요.");
    }
    return data;
  };
}

export function AppRunnerClient({
  slug,
  title,
  description,
  appType,
  inputContract,
  outputContract,
  uiSchema,
  graphNodes,
}: AppRunnerClientProps) {
  const koMeta = APP_KO_META[slug];
  const displayTitle = koMeta?.title ?? title;
  const displayDesc = koMeta?.description ?? description;

  const localizedInputContract = useMemo<InputContract>(() => {
    return {
      ...inputContract,
      fields: inputContract.fields.map((f) => {
        const mapped = FIELD_LABEL_KO_MAP[f.key];
        const sampleDefault = koMeta?.sampleInput[f.key];
        return {
          ...f,
          label: mapped?.label ?? f.label,
          placeholder: mapped?.placeholder ?? f.placeholder ?? "내용을 입력해 주세요",
          default_value: f.default_value ?? sampleDefault,
        };
      }),
    };
  }, [inputContract, koMeta]);

  const localizedUiSchema = useMemo<UISchema | undefined>(() => {
    if (!uiSchema) {
      return {
        layout: "form",
        submit_label: "파이프라인 실행 및 산출물 생성",
      } as unknown as UISchema;
    }
    return {
      ...uiSchema,
      submit_label: "파이프라인 실행 및 산출물 생성",
    };
  }, [uiSchema]);

  const localizedNodes = useMemo<PublicGraphNode[]>(() => {
    return (graphNodes ?? []).map((n) => ({
      id: n.id,
      label: NODE_LABEL_KO_MAP[n.label] ?? n.label,
    }));
  }, [graphNodes]);

  const [formState, setFormState] = useState<FormValues>(() => {
    const initial: FormValues = {};
    for (const field of localizedInputContract.fields) {
      if (field.default_value !== undefined) {
        initial[field.key] = field.default_value;
      }
    }
    return initial;
  });

  const [runState, setRunState] = useState<RunState>("idle");
  const [runOutput, setRunOutput] = useState<Record<string, OutputValue>>({});
  const [runError, setRunError] = useState<string | undefined>(undefined);
  const [trustSignals, setTrustSignals] = useState<any>(undefined);
  const [builderSummary, setBuilderSummary] = useState<any>(undefined);
  const [inspectorMode, setInspectorMode] = useState<boolean>(false);

  const handleFieldChange = useCallback((key: string, value: FormValues[string]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleCasepackSubmit = useCallback(
    async (values: FormValues) => {
      setRunState("running");
      setRunError(undefined);
      setRunOutput({});
      setTrustSignals(undefined);
      setBuilderSummary(undefined);

      try {
        const res = await fetch(`/api/public/apps/${slug}/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: values }),
        });

        const json = (await res.json()) as Record<string, unknown>;

        if (!res.ok) {
          const err = json["error"] as { message?: string; code?: string } | undefined;
          setRunState("error");
          setRunError(err?.message ?? `실행 요청 실패 (${res.status})`);
          return;
        }

        const data = json["data"] as Record<string, unknown> | undefined;
        if (data?.["output"]) {
          setRunOutput(data["output"] as Record<string, OutputValue>);
        }
        if (data?.["trust_signals"]) {
          setTrustSignals(data["trust_signals"]);
        }
        if (data?.["builder_summary"]) {
          setBuilderSummary(data["builder_summary"]);
        }
        setRunState("complete");
      } catch (e) {
        setRunState("error");
        setRunError(e instanceof Error ? e.message : "예기치 않은 실행 오류가 발생했습니다.");
      }
    },
    [slug]
  );

  if (appType === "graph") {
    const graphSubmitFn = makeGraphSubmitFn(slug);
    return (
      <main className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        {/* 상단 헤더 카드 */}
        <section className="rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-6 md:p-8 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
                ⟐ 멀티노드 그래프 앱 ({localizedNodes.length}단계)
              </span>
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-300">
                샘플 데이터 자동 입력됨
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="toggle-inspector-mode"
                onClick={() => setInspectorMode((prev) => !prev)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  inspectorMode
                    ? "border-indigo-500/50 bg-indigo-500/20 text-indigo-200"
                    : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"
                }`}
              >
                {inspectorMode ? "계약 검증 인스펙터: 켜짐" : "계약 검증 인스펙터: 꺼짐"}
              </button>
              <Link
                href="/demo"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
              >
                ← 스위트 목록
              </Link>
            </div>
          </div>

          <h1 className="text-2xl font-black text-white sm:text-3xl">{displayTitle}</h1>
          {displayDesc && <p className="text-sm leading-relaxed text-slate-300">{displayDesc}</p>}
        </section>

        {/* 파이프라인 실행기 */}
        <CompositeAppRenderer
          slug={slug}
          title={displayTitle}
          description={displayDesc}
          inputContract={localizedInputContract}
          outputContract={outputContract}
          {...(localizedUiSchema ? { uiSchema: localizedUiSchema } : {})}
          graphNodes={localizedNodes}
          onSubmit={graphSubmitFn}
          publicMode={!inspectorMode}
          renderOutput={
            slug === "corporate-pr-suite"
              ? (props) => <PROutputPackage status={props.status} finalOutput={props.finalOutput} />
              : slug === "ai-training-practice-suite"
                ? (props) => (
                    <AITrainingOutputPackage
                      status={props.status}
                      finalOutput={props.finalOutput}
                    />
                  )
                : slug === "book-to-agent"
                  ? (props) => (
                      <BookToAgentOutputPackage
                        status={props.status}
                        finalOutput={props.finalOutput}
                      />
                    )
                  : undefined
          }
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <section className="rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-6 md:p-8 shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/15 px-3 py-1 text-xs font-bold text-indigo-300">
            ◆ 단일 케이스팩 마이크로 앱
          </span>
          <button
            type="button"
            data-testid="toggle-inspector-mode"
            onClick={() => setInspectorMode((prev) => !prev)}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-300"
          >
            {inspectorMode ? "계약 검증 인스펙터: 켜짐" : "계약 검증 인스펙터: 꺼짐"}
          </button>
        </div>
        <h1 className="text-2xl font-black text-white">{displayTitle}</h1>
        {displayDesc && <p className="text-sm text-slate-300">{displayDesc}</p>}
      </section>

      <div className="rounded-2xl border border-white/[0.08] bg-[#0f1420]/90 p-6 shadow-xl">
        <DynamicForm
          inputContract={localizedInputContract}
          {...(localizedUiSchema ? { uiSchema: localizedUiSchema } : {})}
          formState={formState}
          onFieldChange={handleFieldChange}
          onSubmit={handleCasepackSubmit}
          submitting={runState === "running"}
        />
      </div>

      <OutputCard
        outputContract={outputContract}
        values={runOutput}
        publicMode={!inspectorMode}
        status={runState}
        trustSignals={trustSignals}
        {...(runError !== undefined ? { errorMessage: runError } : {})}
      />

      {builderSummary && inspectorMode && (
        <BuilderInspectionPanel summary={builderSummary} publicMode={false} />
      )}
    </main>
  );
}
