# 갤러리 API 권한·상태

공개 GET은 public 목록·프로필만 반환한다. 목록은 cursor 기반이며 서버의 현재 필터·정렬 조건과 cursor를 결합한다. gallery 조회는 category·language·availability·offering_mode 필터를 구현 시 계약에 추가하고 지원 전 무시하지 말고 400으로 거절한다.

모든 POST는 인증 작업공간을 서버에서 주입한다. workspace_id를 요청 본문으로 받아 소유권을 설정하지 않는다. 동일 작업공간·경로·멱등 키와 같은 본문은 기존 응답을 반환하며 다른 본문은 409다. fork는 원본 릴리스의 권리 조건을 검사한다. 복제 완료는 child pack의 draft 저장과 lineage 저장이 같은 트랜잭션으로 끝났을 때다.

비교 생성은 대상 팩의 실행 capability와 입력 공개 범위를 검사한다. release_ids를 고정하며 비교의 run_ids가 비어 있으면 실행 완료로 표시하지 않는다. projects matches는 본인의 brief만 조회할 수 있다. 추천은 데이터 접근 권한을 제작자에게 부여하지 않는다. 의뢰 수락과 자료 제공은 별도 허용 단계다.

목록 public 상태만으로 실행을 허용하지 않는다. published_runnable, 유효 release, 평가 gate, 도구 사용 권한을 모두 확인한다. 이 계약은 정의이며 실서버 검증은 NOT_RUN이다.
