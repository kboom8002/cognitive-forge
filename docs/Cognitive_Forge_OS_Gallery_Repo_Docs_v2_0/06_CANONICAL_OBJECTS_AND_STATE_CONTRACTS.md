# D06 CANONICAL_OBJECTS_AND_STATE_CONTRACTS

버전 2.0 · 2026-11-01 · 구현 지시 명세

## 목적과 범위
재사용할 정의와 고객별 설정, 개별 실행을 구분한다. 최소 객체군은 CasePackDefinition, AgentApplication, WorkRequest, Run, ArtifactVersion, ReviewDecision, EvaluationReport와 ReleaseManifest다. 자료·근거 객체와 이들 사이의 참조도 정의한다.

생성·검증·검수·배포 상태를 하나의 success로 합치지 않는다. 각 객체의 소유자, 상태 전이, 수정 가능 범위, 식별자, 버전 규칙을 명시한다. 영속 저장 형식과 공개 응답 형식은 필요한 범위에서 분리한다.

## 구현 결정
CasePackDefinition은 업무 정의, AgentApplication은 고객 설정과 발행 릴리스, WorkRequest는 의뢰, Run은 실행, ArtifactVersion은 불변 결과, ReviewDecision은 특정 버전 결정이다. 실행 상태는 queued→running→waiting_input 또는 waiting_review→running→completed이며 failed·cancelled로 종료할 수 있다. completed는 실행 종료이며 승인이나 외부 주문 완료를 뜻하지 않는다. 평가 상태는 not_run/pass/fail/error, 검수 상태는 not_required/pending/approved/changes_requested로 분리한다. 상태 갱신은 revision 비교 후 수행한다.

## 계약 및 검증 연결
공통 객체는 06_CANONICAL_OBJECTS_AND_STATE_CONTRACTS.md, 인터페이스는 13_PUBLIC_API_EVENTS_AND_INTEROPERABILITY.md를 따른다. schemas/, examples/, tickets/, tests/의 동일 식별자를 사용한다. 상태 변경 시 revision을 검사하고 결과 버전을 보존한다.

## 완료 증거
담당자는 변경 파일 목록, 검사 결과 원문, 실패·미실행 항목과 복구 방법을 남긴다. 명세 작성 완료는 소프트웨어 구현 완료를 뜻하지 않는다.

## 갤러리 v2 개정 계약
CreatorProfile·GalleryListing·PersonaProfile·ForkLineage·BenchmarkTask·ComparisonSession·ServiceOffering·ProjectBrief·MatchCandidate를 추가한다. 공개 목록과 실행 readiness 상태를 구분한다.
