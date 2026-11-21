---
name: panel
description: 건축 설계 패널(공모전·크리틱 보드)을 만드는 스킬. Claude in Chrome으로 Pinterest에서 "architectural layout" 등을 검색해 지금 가장 많이 보이는 패널 레이아웃을 고르고, 그 구성대로 VectorCraft에 그리드를 나눈 뒤, 칸마다 Pinterest 다이어그램 레퍼런스를 참고한 다이어그램(아이소·분해 액소·평면·단면·흐름·타임라인·차트)을 그려 이야기 흐름 순서로 배치하고 .ai/.pdf/.svg/.png로 내보낸다. "패널 만들어줘", "보드 레이아웃", "핀터레스트 참고해서 판넬", "presentation board", "architecture panel" 요청에 사용.
---

# panel — Pinterest 조사 → VectorCraft 패널

## 전제
- **Claude in Chrome 연결**: `mcp__claude-in-chrome__*` 도구가 있어야 한다. 없으면 사용자에게 크롬 확장 로그인 → `/chrome` 켜기 → 새 대화를 안내하고 멈춘다.
- **VectorCraft**: `vectorcraft-cli.exe` 경로를 환경변수 `VECTORCRAFT_CLI`로 지정한다 (지정하지 않으면 `E:/VectorCraft/app/vectorcraft-cli.exe`). 사용자가 앱에서 실시간으로 보려면 앱을 `vectorcraft.exe --control 7979`로 켠다. 꺼져 있으면 헤드리스로 그려 파일만 낸다.
- **Node 18+**. 스크립트 위치: 이 스킬 폴더의 `scripts/`.

## 작업 순서

### 0. 입력 정리 (묻기 전에 먼저 찾아보기)
- 패널에 담을 **내용**: 프로젝트 폴더의 메모·조사 파일이나 대화에서 모은다. 없으면 주제·핵심 메시지·도면 종류를 사용자에게 묻는다.
- **판 크기**(기본 A1 가로), **장 수**(기본 1장), **저장 폴더**(프로젝트 폴더에 제출물 폴더가 있으면 그 아래 `panel_<날짜>`, 없으면 VectorCraft 작업 폴더 아래 `<이름>`).

### 1. 레이아웃 조사 (Pinterest) — `references/pinterest-research.md`
1. `tabs_context_mcp` → 새 탭 → `https://www.pinterest.com/search/pins/?q=architectural%20layout` 등 검색어 3개.
2. **로그인 창이 뜨면 멈추고 사용자에게 직접 로그인을 부탁한다.** 비밀번호는 절대 대신 입력하지 않는다.
3. 검색어마다 스크린샷 → 스크롤 2회 → 추출 스크립트로 상위 핀 목록(순위·제목·링크)을 얻는다.
4. 상위 30개 남짓을 화면으로 보고 **레이아웃 유형**(`references/layout-archetypes.md`)으로 분류 → 순위 가중 점수로 **가장 많이 쓰이는 유형**을 고른다. 1위 유형의 상위 핀 2~3개는 열어서 세부 구성(제목 위치, 히어로 크기, 여백, 글 비율, 색 수)을 확인한다.
5. 결과를 `<저장폴더>/research.json`에 기록하고 스크린샷은 `<저장폴더>/references/`에 저장한다.

### 2. 다이어그램 조사 (Pinterest)
칸마다 필요한 다이어그램 종류로 다시 검색한다 (예: "exploded axonometric diagram", "circulation diagram architecture", "phasing diagram", "section diagram architecture", "program diagram isometric").
상위 결과에서 **그리는 방식만** 뽑는다: 선 굵기 위계, 강조색 개수, 배경 맥락을 연회색으로 깔기, 지시선 라벨, 번호 매기기, 해치 사용 등. 특정 작품의 그림을 따라 그리지 않는다. 출처 링크는 research.json의 `diagramRefs`에 남긴다.

### 2-1. 선이 촘촘한 다이어그램이 필요할 때
`patterns`(등고선·파도·건물 바닥 모양·흐름선·나무·양식줄 등)와 `context`(주변 건물 자동 생성)를 쓴다 (`references/spec.md`).
- 대지 평면: 파도(바다 다각형 안쪽) + 등고선(육지 안쪽) + 검은 건물 바닥 모양 + 도로 + 반경 원
- 분해 지형: 층마다 지형 → 마을 조직 → 건물 → 흐름 → 지붕. 위층 판은 `plate: "outline"`
- 같은 대지·같은 시점의 작은 그림을 6장 안팎 반복해 단계를 보여 준다

### 3. 이야기 흐름 짜기
- 읽는 순서는 **왼쪽 위 → 오른쪽 아래(Z자)**. 단계 번호(`step`)는 이 순서를 따른다.
- 기본 서사: **맥락/문제 → 분석 → 개념 → 전략·과정 → 설계(평면·단면·액소) → 운영·성능 → 결과**. 프로젝트에 맞게 줄이거나 합친다.
- **히어로 칸**(가장 큰 칸)에는 개념을 한 장으로 보여 주는 그림(분해 액소, 대표 아이소, 렌더 자리)을 둔다.
- 원인→결과가 칸을 넘어갈 때만 `flow` 화살표를 넣는다 (한 장에 4개 이하).
- 강조색은 의미별로 고정한다 (예: accent=새 용도/방문객, accent2=상업/임시, accent3=생태/물). 범례 칸으로 설명한다.

### 4. 패널 설계서 작성 — `references/spec.md`
`<저장폴더>/panel.json`을 쓴다. 조사에서 고른 유형을 `layout.preset`으로 쓰거나, 프리셋에 없으면 `grid`(columns, rowHeights)와 칸별 `col/row/colSpan/rowSpan`으로 직접 나눈다. 예시: `examples/sample-panel.json`.

### 5. 그리기와 검토
```bash
node <skill>/scripts/render.mjs <panel.json> <저장폴더> --dry          # 형식 검사·단계 수
node <skill>/scripts/render.mjs <panel.json> <저장폴더> --no-export    # 헤드리스 초안 → preview_N.png
```
`preview_N.png`를 **반드시 직접 보고** 확인한다: 글자 겹침, 칸 밖으로 나간 그림, 빈 칸, 너무 작은 글씨, 화살표가 그림을 가로지름, 강조색 남용. 고친 뒤 다시 그린다.

### 6. 실시간 그리기·내보내기
앱이 7979로 켜져 있으면:
```bash
node <skill>/scripts/render.mjs <panel.json> <저장폴더> --live
```
아니면 `--live` 없이 실행. 결과: `<name>.vectorcraft / .ai / .pdf`(모든 장), `<name>_N.png / .svg`(장별), `preview_N.png`.

### 7. 보고
고른 레이아웃 유형과 근거(몇 개 핀 중 몇 위), 칸별 다이어그램과 흐름, 저장 위치, 남은 일(렌더 이미지 자리 `image` 칸 등)을 한국어로 짧게 알린다. 열어 둔 크롬 탭은 닫는다.

## 주의
- Pinterest 핀은 남의 작업이다. 레이아웃 구조와 표현 방식만 참고하고, 이미지를 패널에 붙이거나 그대로 따라 그리지 않는다. 원본 이미지 내려받기는 사용자 허락을 받은 뒤에만 한다 (스크린샷 저장은 조사 기록용).
- "가장 트렌디함"은 Pinterest 검색 순위(참여도·최신성 반영)와 상위 결과 안에서의 반복 빈도로 판단한다. Pinterest가 공개 저장 수를 보여 주지 않으면 그렇다고 보고서에 적는다.
- `.ai` 내보내기에서 화살촉·점선은 다른 앱에서 윤곽선으로 보인다.
- 글자 크기는 판 크기에 맞춰 자동 확대된다(A3 세로=1배, A1 가로=2배). `theme.textScale`로 바꿀 수 있다.
