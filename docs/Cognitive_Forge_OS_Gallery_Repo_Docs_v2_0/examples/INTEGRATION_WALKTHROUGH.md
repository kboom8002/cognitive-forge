# 외부 실행 예시

1. GET /api/v1/capabilities로 지원 계약을 확인한다.
2. POST /api/v1/runs에 Idempotency-Key: demo-pr-001과 app_id, release_id, input, review_authority=native를 보낸다. 인증 키는 환경변수에서 읽는다.
3. 응답 run_id로 조회한다. waiting_input이면 최신 revision과 input을 /inputs로 제출한다.
4. waiting_review이면 Forge 검수 화면에서 결정한다. delegated 모드일 때만 위임된 인증 주체가 /decisions에 정확한 산출물 버전과 hash를 제출한다.
5. completed 상태와 평가·검수 상태를 각각 확인하고 artifact_id와 version으로 결과를 가져온다.
6. 외부 주문 완료 처리는 외부 시스템의 납품 규칙을 적용한다. run.completed 이벤트만으로 결제나 고객 인수를 확정하지 않는다.

실제 인증·서버가 필요한 통합 시나리오이며 현재 실행 결과는 NOT_RUN이다.
