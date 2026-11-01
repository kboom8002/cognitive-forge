# D18 TEAM_HANDOFF_RUNBOOK_AND_RELEASE_CHECKLIST

버전 2.0 · 2026-11-01 · 구현 지시 명세

## 목적과 범위
개발팀이 로컬 실행부터 첫 앱 발행과 운영 점검까지 따라갈 절차를 제공한다. 설치·환경변수의 이름과 용도, 샘플 자료, 모델 연결, DB 준비, 실행·검수·오류 확인, 외부 연동 확인을 담는다. 실제 비밀값은 포함하지 않는다.

문서 동결 시점, 변경 승인 주체, 버전 기록, 알려진 제약, 미해결 결정, 지원 담당 역할을 명확히 한다. 문서 세트의 전달 완료와 소프트웨어 출시 완료를 분리한다.

## 구현 결정
팀은 README→D01→D02를 읽고 현재 소스 차이를 먼저 기록한다. 로컬 설정은 기존 package.json의 pnpm 스크립트와 Supabase 구성을 확인한다. 환경변수는 모델 제공자 키, DB 접속, 서명키 등 이름·용도만 .env.example에 정의한다. 실제 비밀값은 문서에 넣지 않는다. pnpm typecheck, pnpm test, pnpm build, pnpm fixtures:validate를 해당 구현 범위에 맞게 실행한다. db:reset은 운영 데이터에 사용하지 않는다. 출시에는 독립 운영 E2E, 권한·보존 검증, 이전 릴리스 복구 확인이 필요하다.

## 계약 및 검증 연결
공통 객체는 06_CANONICAL_OBJECTS_AND_STATE_CONTRACTS.md, 인터페이스는 13_PUBLIC_API_EVENTS_AND_INTEROPERABILITY.md를 따른다. schemas/, examples/, tickets/, tests/의 동일 식별자를 사용한다. 상태 변경 시 revision을 검사하고 결과 버전을 보존한다.

## 완료 증거
담당자는 변경 파일 목록, 검사 결과 원문, 실패·미실행 항목과 복구 방법을 남긴다. 명세 작성 완료는 소프트웨어 구현 완료를 뜻하지 않는다.

## 갤러리 v2 개정 계약
카탈로그 seed는 기본 preview_only, 실행 활성화는 운영자가 개별 증거를 확인한 뒤 수행한다. 공개 실행 장애는 listing pause와 RunService 보호를 함께 적용한다.
