# D07 TASKFLOW_COMPILER_AND_AUTHORING_CONTRACT

버전 2.0 · 2026-11-01 · 구현 지시 명세

## 목적과 범위
자연어와 사례 기반 작성 내용에서 TASKFLOW 명세, 실행 계약, 평가 규칙, UI 초안을 도출하는 절차를 정의한다. AI가 제안한 규칙은 확정 전까지 초안이며, 실행 가능한 규격으로 검사한다.

기존 R_role과 A 기반 구조, TASKFLOW v2·v2.1 계보를 버전별 어댑터로 수용한다. 입력 스키마 버전과 상품 버전을 구분하고, 변환 전후 대응표를 보존한다. QPE 수행 우선순위, 실행 권한, 결과 평가 기준을 각각 관리한다.

## 구현 결정
작성 초안은 원문과 변경 이력을 보관한다. R_role은 A.actor로 매핑하되 역할·독자 구분을 추정한 값은 제작자에게 확인시킨다. K_REF/K_EX/K_IN을 각각 reference/example/customer_input으로 정규화한다. T는 완료 조건, W는 평가 기준, F는 실행 단계로 변환한다. 명세에 없는 도구를 모델이 임의로 추가할 수 없다. 컴파일 결과에 schema_version, source_hash, compiler_version, warnings를 기록한다. 지원 불가한 승인 규칙을 프롬프트로 대체해 실행 가능으로 표시하지 않는다.

## 계약 및 검증 연결
공통 객체는 06_CANONICAL_OBJECTS_AND_STATE_CONTRACTS.md, 인터페이스는 13_PUBLIC_API_EVENTS_AND_INTEROPERABILITY.md를 따른다. schemas/, examples/, tickets/, tests/의 동일 식별자를 사용한다. 상태 변경 시 revision을 검사하고 결과 버전을 보존한다.

## 완료 증거
담당자는 변경 파일 목록, 검사 결과 원문, 실패·미실행 항목과 복구 방법을 남긴다. 명세 작성 완료는 소프트웨어 구현 완료를 뜻하지 않는다.

## 갤러리 v2 개정 계약
페르소나 소개를 시스템 권한으로 사용하지 않는다. PersonaProfile의 행동 규칙을 TF8과 연결하고 과도한 전문가 주장이나 새 도구 권한은 확인 대상으로 돌린다.
