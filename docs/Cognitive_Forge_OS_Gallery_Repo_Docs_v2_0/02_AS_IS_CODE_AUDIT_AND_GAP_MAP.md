# D02 AS_IS_CODE_AUDIT_AND_GAP_MAP

버전 2.0 · 2026-11-01 · 구현 지시 명세

## 목적과 범위
현재 파일과 실행 경로를 확인해 재사용·보완·신규·전환 대상을 구분한다. Mock 경로, 실제 모델 어댑터, 입력 직렬화, 형식 검증, JSON 파싱 실패, 그래프 실행, 테넌트 문맥, 보존 정책을 우선 조사한다.

관찰마다 파일 경로와 근거, 확인 일자, 실행 검증 여부를 붙인다. 구현 의도와 확인된 동작을 섞지 않는다.

## 구현 결정
2026-11-01 소스 검토 기준 CasePack-MAO는 계약 묶음을 제공하고 Graph·Bridge는 연결 구조를 제공한다. 공개 runtime-factory는 MockAIProvider를 사용한다. policy_pack과 evals는 유연한 JSON이다. 단일 runner의 JSON.parse 실패는 형식 복구 경로 전에 종료된다. zeroRetention은 trace·usage 억제와 실행 입출력 저장을 구분해야 한다. 이 관찰은 운영 환경 실측이 아니다. 작업 시작 전 해당 파일의 변경 여부를 확인하고 최신 차이를 감사 기록에 추가한다.

## 계약 및 검증 연결
공통 객체는 06_CANONICAL_OBJECTS_AND_STATE_CONTRACTS.md, 인터페이스는 13_PUBLIC_API_EVENTS_AND_INTEROPERABILITY.md를 따른다. schemas/, examples/, tickets/, tests/의 동일 식별자를 사용한다. 상태 변경 시 revision을 검사하고 결과 버전을 보존한다.

## 완료 증거
담당자는 변경 파일 목록, 검사 결과 원문, 실패·미실행 항목과 복구 방법을 남긴다. 명세 작성 완료는 소프트웨어 구현 완료를 뜻하지 않는다.

## 갤러리 v2 개정 계약
기존 스키마 AgentApplication은 공개 제작자·갤러리·파생·비교·서비스 계약을 포함하지 않는다. 이 패키지의 갤러리 객체는 신규 구현 대상이다. 현재 코드의 구현 완료로 해석하지 않는다.
