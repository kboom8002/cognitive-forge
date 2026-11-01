# v1→Gallery v2 전환

1. 기존 /a/[slug], CasePack·run·artifact ID를 유지한다.
2. creator_profiles, gallery_listings, persona_profiles, fork_lineage, benchmark_tasks, comparison_sessions, service_offerings, project_briefs, match_candidates를 추가하는 DB 마이그레이션을 작성한다. 현재 패키지에는 실행 SQL이 없으며 실제 DB 스키마 감사 후 티켓에서 작성한다.
3. 작업공간 소유 객체에는 workspace_id를 필수로 두고 공개 projection을 별도 제공한다. comparison→run, listing→release, offering→listing의 참조 무결성을 검사한다.
4. 기존 앱은 비공개 유지하고 소유자의 명시적 게시로 목록을 만든다. seed는 preview_only이며 runtime_release_id는 null이다.
5. 초기 12종 전달 팩을 기존 MAO로 변환하고 입출력·의미 동등성을 확인한다. 현재 JSON을 직접 런타임에 넣지 않는다.
6. 개별 릴리스 평가와 권한 E2E 후 실행 활성화한다. 전체 일괄 승격하지 않는다.
7. 복구는 신규 갤러리·복제 진입을 끄고 기존 앱을 유지한다. 새 객체의 이력을 파괴적으로 삭제하지 않는다.
