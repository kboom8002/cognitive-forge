# D25 서비스 제공·프로젝트 매칭

ServiceOffering은 self_run, reviewed_delivery, custom_build, managed_operation으로 구분한다. 납품 범위·필요 자료·포함 수정·제외 업무·담당자·검수 책임·기한 산정 규칙을 명시한다. 초기 가격은 제작자가 제안하며 검증되지 않은 시장 평균을 표시하지 않는다.

ProjectBrief는 원하는 산출물, 고객 자료 형식, 전문 분야, 언어, 예산 범위, 기한, 검수 필요, 자료 공개 범위를 포함한다. 매칭 1단계는 capability·권한·언어·산출물·일정 필수 조건이다. 미충족은 추천 점수가 높아도 제외한다. 2단계는 유사 과제·검증 범위·제작자 참여 수준이며 이유와 확인 필요 항목을 반환한다.

추천은 수락·계약이 아니다. brief_draft→submitted→matched→proposal→accepted→in_progress→review→delivered→accepted_by_customer를 구분한다. 분쟁·취소·조건 변경은 별도 상태와 이력을 둔다. run.completed 이벤트가 결제나 고객 인수를 확정하지 않는다.

서비스 작업은 Forge 내부에서도 접수·검수·납품 가능해야 한다. KHERE 등 외부 연결 시 외부 주문 ID는 참조만 저장하고 주문 원본 소유권은 외부에 둔다. 실제 지급·정산은 초기 범위 밖이며 제공 금액·작업 내역 기록과 구분한다.

버전 2.0 · 2026-11-01 · 구현 대상 명세
