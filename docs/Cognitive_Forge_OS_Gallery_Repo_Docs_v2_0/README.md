# Cognitive Forge Gallery Edition v2.0

## 개발팀의 시작점
이 패키지는 독립 마이크로 에이전트 제작·운영과 전문가 페르소나 갤러리·프로젝트 매칭의 구현 명세다. 기존 20편과 추가 8편을 함께 사용한다. 이번 개정은 원본 프로젝트 코드 변경이 아니다.

1. 00_README_AND_READING_ORDER.md와 CHANGELOG.md를 읽는다.
2. D20~D23에서 36종 분류·제작·권리 흐름을 확인한다.
3. D24~D27에서 비교·중개·운영·인수 기준을 확인한다.
4. gallery/catalog, gallery/agent_specs, gallery/pilot_packs, gallery/benchmarks를 검토한다.
5. contracts/gallery-openapi.json과 schemas를 사용해 티켓 GX01~GX06을 구현한다.

## 반드시 구분할 상태
36종은 모두 specified/preview_only로 시작한다. 12종은 초기 실행 후보의 팩 정의이며 실제 모델 평가를 통과한 제품이 아니다. 준비된 자료를 실제 실행 결과나 전문가 검수 결과로 표시하지 않는다. 계약 스키마 통과는 기능·품질 검증이 아니다.

## 검증
python tests/validate.py
python tests/validate_gallery.py

Python jsonschema 패키지가 필요하다. 실제 UI·모델·DB·외부 API 인수는 별도다. gallery_validation_report.json에 검사 범위와 미실행 항목을 기록했다.

## 문서 정본
v2 문서와 CHANGELOG가 현재 지시다. SOURCE_PLAN.md는 이전 계획의 기록이며 현재 파일 수·개정 범위는 manifest.json을 따른다. 원본 및 파생 팩 권리는 D23에 따른다.
