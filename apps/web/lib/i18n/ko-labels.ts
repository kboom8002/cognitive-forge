/**
 * Cognitive Forge OS — 전사 표준 한국어 UI 용어 및 배지 매핑 사전
 *
 * API/스키마 내부 식별자(snake_case)나 영문 코드가 화면에 직접 노출되지 않도록
 * 자연스럽고 일관된 한국어 레이블, 설명, 시맨틱 컬러 클래스를 제공합니다.
 */

export const CATEGORY_KO_MAP: Record<
  string,
  { label: string; shortLabel: string; description: string; badgeClass: string }
> = {
  information: {
    label: "정보 구조화",
    shortLabel: "정보 구조화",
    description: "회의록·인터뷰·문서에서 출처가 고정된 핵심 사실과 기준을 구조화합니다.",
    badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  },
  diagnosis: {
    label: "진단 및 리스크 분석",
    shortLabel: "진단",
    description: "제안서·계약서·데이터의 누락 항목과 잠재 리스크를 정밀 진단합니다.",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  design: {
    label: "기획 및 전략 설계",
    shortLabel: "설계",
    description: "서비스 정책, 프로세스, 크리에이티브 브리프와 실행 설계안을 도출합니다.",
    badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  },
  production: {
    label: "콘텐츠 제작 및 패키징",
    shortLabel: "제작",
    description: "기업 소개서, 보도자료, FAQ, 실습 교안 등 즉시 활용 가능한 산출물을 제작합니다.",
    badgeClass: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  },
  verification: {
    label: "근거 및 품질 검수",
    shortLabel: "검수",
    description: "원문 대비 수치·날짜·조건 불일치와 근거 없는 주장을 엄격히 검수합니다.",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  continuous_work: {
    label: "지속 수행 및 코칭",
    shortLabel: "지속 수행",
    description: "반복 업무 모니터링, 역량 코칭, 맞춤형 피드백 루프를 지속적으로 수행합니다.",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  },
};

export function getCategoryKo(category: string): {
  label: string;
  shortLabel: string;
  description: string;
  badgeClass: string;
} {
  return (
    CATEGORY_KO_MAP[category] ?? {
      label: "전문 도메인",
      shortLabel: "전문 도메인",
      description: "검증된 도메인 계약 기반 에이전트",
      badgeClass: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    }
  );
}

export const AVAILABILITY_KO_MAP: Record<
  string,
  { label: string; subLabel: string; badgeClass: string; dotClass: string }
> = {
  published_runnable: {
    label: "즉시 실행 가능",
    subLabel: "공인 벤치마크 인증 완료",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    dotClass: "bg-emerald-400",
  },
  preview_only: {
    label: "사양 미리보기",
    subLabel: "계약 사양 공개 · 실행 준비 중",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    dotClass: "bg-amber-400",
  },
};

export const SAMPLE_ORIGIN_KO_MAP: Record<string, { label: string; description: string }> = {
  synthetic_fixture: {
    label: "공인 합성 벤치마크 샘플",
    description: "실제 고객 데이터를 포함하지 않는 안전한 검증용 표준 픽스처입니다.",
  },
  synthetic_public: {
    label: "공개 합성 벤치마크 데이터",
    description: "민감 정보가 배제된 공개 표준 비교 데이터셋입니다.",
  },
  permissioned_real: {
    label: "고객 공개 허가 산출물",
    description: "원소유자의 명시적 공개 동의를 거친 실제 수행 산출물입니다.",
  },
  owner_private: {
    label: "고객사 비공개 전용 데이터",
    description: "외부 전송 전 수신자 명시적 동의가 필수인 기밀 데이터입니다.",
  },
};

export const CREDENTIAL_STATUS_KO_MAP: Record<string, { label: string; badgeClass: string }> = {
  checked: {
    label: "전문가 이력 검증 완료",
    badgeClass: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  },
  verified: {
    label: "공인 파트너 인증 완료",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  self_declared: {
    label: "크리에이터 자체 등록 이력",
    badgeClass: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  },
};

export const OFFERING_MODE_KO_MAP: Record<
  string,
  { label: string; description: string; badgeClass: string }
> = {
  self_run: {
    label: "셀프 즉시 실행",
    description: "웹 또는 API에서 입력 자료를 넣어 즉시 산출물을 생성합니다.",
    badgeClass: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  },
  self_serve_run: {
    label: "셀프 즉시 실행",
    description: "웹 또는 API에서 입력 자료를 넣어 즉시 산출물을 생성합니다.",
    badgeClass: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  },
  fork_customize: {
    label: "맞춤 포크 제작",
    description: "원본 에이전트 계약을 내 워크스페이스로 복제하여 사내 규칙에 맞게 수정합니다.",
    badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  },
  managed_delivery: {
    label: "전문가 검수 납품",
    description: "AI 초안 생성 후 도메인 전문가가 최종 검수·보완하여 산출물을 납품합니다.",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  enterprise_private: {
    label: "기업 전용 구축",
    description: "고객사 전용 보안 워크스페이스와 사내 지식베이스에 맞춘 프라이빗 구축을 제공합니다.",
    badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  },
};

export const PRICE_STATUS_KO_MAP: Record<string, string> = {
  fixed: "표준 정액제",
  quote_required: "맞춤 견적 협의",
  free_trial: "무료 체험 가능",
};

export const RUN_STATUS_KO_MAP: Record<
  string,
  { label: string; badgeClass: string }
> = {
  queued: {
    label: "실행 대기 중",
    badgeClass: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  },
  running: {
    label: "실행 진행 중",
    badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  },
  waiting_input: {
    label: "추가 입력 대기",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  waiting_review: {
    label: "전문가 검수 대기",
    badgeClass: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  },
  completed: {
    label: "최종 승인 완료",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  failed: {
    label: "실행 실패 / 반려",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  },
  cancelled: {
    label: "실행 취소됨",
    badgeClass: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  },
};

export const REVIEW_STATUS_KO_MAP: Record<string, { label: string; badgeClass: string }> = {
  not_required: {
    label: "자동 승인 모드",
    badgeClass: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  },
  pending: {
    label: "인간 검수 대기 중",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  approved: {
    label: "검수 승인 완료",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  changes_requested: {
    label: "수정 및 보완 요청됨",
    badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  },
  rejected: {
    label: "검수 반려됨",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  },
};

export const EVAL_STATUS_KO_MAP: Record<string, { label: string; badgeClass: string }> = {
  pass: {
    label: "공인 벤치마크 통과",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  fail: {
    label: "벤치마크 미통과",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  },
  not_run: {
    label: "벤치마크 미실행",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
};

export const TASKFLOW_BLOCK_KO_MAP: Record<
  string,
  { step: string; title: string; subtitle: string }
> = {
  A: {
    step: "제1블록",
    title: "전문 역할 및 정체성",
    subtitle: "에이전트가 수행하는 도메인 전문가 역할 정의",
  },
  S: {
    step: "제2블록",
    title: "수행 범위 및 경계",
    subtitle: "허용된 입력 자료와 과업 수행 한계 명시",
  },
  T: {
    step: "제3블록",
    title: "핵심 납품 산출물",
    subtitle: "고객에게 최종 전달되는 정형 산출물 명세",
  },
  K: {
    step: "제4블록",
    title: "지식 및 원문 근거 규칙",
    subtitle: "참조 규칙·사례·고객 입력 구분 및 출처 고정 원칙",
  },
  W: {
    step: "제5블록",
    title: "실패 방지 및 주의사항",
    subtitle: "임의 추론 금지 및 필수 기준 누락 시 질문 규칙",
  },
  F: {
    step: "제6블록",
    title: "실행 흐름 및 중단 조건",
    subtitle: "단계별 처리 파이프라인 및 권한·도구 부족 시 안전 중단",
  },
  L: {
    step: "제7블록",
    title: "출력 언어 및 커뮤니케이션 톤",
    subtitle: "고객 눈높이에 맞춘 명확한 한국어 문체 기준",
  },
  O: {
    step: "제8블록",
    title: "정형 출력 스키마 계약",
    subtitle: "산출물 본문·근거·누락입력·검증결과의 데이터 구조",
  },
};

export const CREATOR_DISPLAY_KO_MAP: Record<string, string> = {
  "Forge Knowledge Studio": "포지 지식구조화 스튜디오",
  "Forge Risk & Legal Lab": "포지 리스크·법무 진단 랩",
  "Forge Architecture Guild": "포지 전략·아키텍처 길드",
  "Forge Content Factory": "포지 엔터프라이즈 콘텐츠 팩토리",
  "Forge Verification Bureau": "포지 품질·근거 검수원",
  "Forge Coaching Academy": "포지 실무역량 코칭 아카데미",
  "Private Internal Creator": "비공개 사내 전담 크리에이터",
};

export function getCreatorDisplayNameKo(name: string): string {
  return CREATOR_DISPLAY_KO_MAP[name] ?? name;
}
