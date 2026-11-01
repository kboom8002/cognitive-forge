# D05 TARGET_ARCHITECTURE_AND_MODULE_BOUNDARIES

버전 2.0 · 2026-11-01 · 구현 지시 명세

## 목적과 범위
Forge가 자체 보유할 제작·등록·실행·검수·보관 기능과 외부 어댑터를 분리한다. 기존 packages/core, casepack, bridge, runtime, ui-forge, validation, domain-packs 및 apps/web에 책임을 배치한다.

새 패키지 추가는 기존 경계로 해결되지 않을 때 결정한다. 작성 화면·공개 앱·외부 API가 동일한 실행 서비스를 사용하도록 한다. 실행 엔진 선정은 요구사항 비교와 ADR로 확정하며, 프레임워크 도입 자체를 목표로 삼지 않는다.

## 구현 결정
core는 공통 계약과 상태 전이를, casepack은 정의·버전·발행을, runtime은 실행과 체크포인트를, validation은 검사기를, ui-forge는 작성·결과 컴포넌트를 담당한다. apps/web은 인증·HTTP·저장 어댑터를 조립한다. 모든 진입점은 동일한 RunService를 호출한다. 외부 시스템별 어댑터는 core에서 import하지 않는다. 초기 실행 엔진은 DB 기반 작업 큐와 노드 체크포인트를 기준으로 명세한다. LangGraph 등 도입은 이 계약을 만족하는 대체 구현으로 별도 ADR에서 검증한다.

## 계약 및 검증 연결
공통 객체는 06_CANONICAL_OBJECTS_AND_STATE_CONTRACTS.md, 인터페이스는 13_PUBLIC_API_EVENTS_AND_INTEROPERABILITY.md를 따른다. schemas/, examples/, tickets/, tests/의 동일 식별자를 사용한다. 상태 변경 시 revision을 검사하고 결과 버전을 보존한다.

## 완료 증거
담당자는 변경 파일 목록, 검사 결과 원문, 실패·미실행 항목과 복구 방법을 남긴다. 명세 작성 완료는 소프트웨어 구현 완료를 뜻하지 않는다.

## 갤러리 v2 개정 계약
GalleryService는 공개 조회, ForkService는 파생 권리, ComparisonService는 공통 과제, MatchingService는 필수 조건을 책임진다. 모두 기존 RunService를 사용하며 갤러리 모듈에 모델 실행을 중복 구현하지 않는다.
