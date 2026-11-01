# D00 README_AND_READING_ORDER

버전 2.0 · 2026-11-01 · 구현 지시 명세

## 목적과 범위
팀이 첫 번째로 읽는 안내서다. 목표 제품, 이번 범위, 문서 상태, 역할별 읽기 순서, 현재 결정과 미결정 항목, 배치 진행 상황을 담는다. 기획·프론트엔드·백엔드·QA 담당자가 자신이 읽어야 할 문서를 찾을 수 있어야 한다.

완료 기준은 모든 문서·계약·예시·티켓의 경로와 상태가 일치하는 것이다. 링크만 있고 실체가 없는 파일은 계획 상태로 명시한다.

## 구현 결정
개발 순서는 T01→T02→T03→T04→T05→T06→T07→T08이다. 제품 담당자는 D01·D03·D04, 백엔드는 D05~D13, 프론트엔드는 D04·D06·D11, QA는 D10·D16부터 읽는다. 계약 파일은 schemas와 contracts에 있으며 examples는 합성 자료다. 검증 결과는 validation_report.json을 확인한다. 이 패키지는 구현 명세이며 실제 서비스 출시를 의미하지 않는다.

## 계약 및 검증 연결
공통 객체는 06_CANONICAL_OBJECTS_AND_STATE_CONTRACTS.md, 인터페이스는 13_PUBLIC_API_EVENTS_AND_INTEROPERABILITY.md를 따른다. schemas/, examples/, tickets/, tests/의 동일 식별자를 사용한다. 상태 변경 시 revision을 검사하고 결과 버전을 보존한다.

## 완료 증거
담당자는 변경 파일 목록, 검사 결과 원문, 실패·미실행 항목과 복구 방법을 남긴다. 명세 작성 완료는 소프트웨어 구현 완료를 뜻하지 않는다.

## 갤러리 v2 개정 계약
읽기 순서는 기존 코어 다음 D20~D27이다. gallery/catalog와 pilot_packs, benchmarks, contracts/gallery-openapi.json을 함께 읽는다. SOURCE_PLAN은 역사적 v1 계획이며 현재 범위는 본문과 CHANGELOG를 따른다.
