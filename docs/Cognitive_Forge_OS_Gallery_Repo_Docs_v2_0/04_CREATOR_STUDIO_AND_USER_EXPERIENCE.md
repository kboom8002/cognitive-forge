# D04 CREATOR_STUDIO_AND_USER_EXPERIENCE

버전 2.0 · 2026-11-01 · 구현 지시 명세

## 목적과 범위
템플릿에서 시작하기, 자연어로 설명하기, 실제 작업 사례에서 시작하기의 세 제작 경로를 설계한다. 기본 화면은 업무 설명, 필요한 자료, 원하는 결과, 참고 사례, 검사 기준의 언어를 사용한다. TASKFLOW 블록·JSON·실행 그래프는 상세 설정으로 둔다.

각 화면에 최초 진입, 빈 상태, 저장 중, 자료 부족, 실패, 질문 대기, 검수 대기, 재개, 발행 후 수정 상태를 포함한다. 입력 양식과 결과 화면을 함께 미리 보며 수정할 수 있게 한다.

## 구현 결정
제안 경로는 /studio/apps, /studio/apps/new, /studio/apps/:id/edit, /studio/apps/:id/test, /studio/reviews, /studio/runs/:id이다. 기존 /a/[slug]는 고객 이용 화면으로 유지한다. 작성 단계는 업무 설명→입력 자료→결과 형태→사례·기준→시험→발행이다. 자동 저장은 저장 중·저장 완료·실패를 표시하고 충돌 시 최신 내용을 조용히 덮어쓰지 않는다. 시험 화면에는 결과, 근거, 검사 결과, 미확인 항목을 분리한다. 키보드로 전 과정을 수행할 수 있고 오류는 필드와 요약 영역에 함께 안내한다.

## 계약 및 검증 연결
공통 객체는 06_CANONICAL_OBJECTS_AND_STATE_CONTRACTS.md, 인터페이스는 13_PUBLIC_API_EVENTS_AND_INTEROPERABILITY.md를 따른다. schemas/, examples/, tickets/, tests/의 동일 식별자를 사용한다. 상태 변경 시 revision을 검사하고 결과 버전을 보존한다.

## 완료 증거
담당자는 변경 파일 목록, 검사 결과 원문, 실패·미실행 항목과 복구 방법을 남긴다. 명세 작성 완료는 소프트웨어 구현 완료를 뜻하지 않는다.

## 갤러리 v2 개정 계약
/gallery, /gallery/:slug, /creators/:id, /studio/forks, /compare/:id, /projects/new를 추가한다. 예시 보기와 실제 실행을 구분하고 화면별 empty/loading/error/forbidden 상태를 제공한다.
