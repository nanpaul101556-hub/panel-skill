# panel — 건축 패널을 만드는 Claude Code 스킬

Claude Code가 Pinterest에서 요즘 많이 쓰는 건축 보드 레이아웃을 찾아보고, 그 구성대로 [VectorCraft](https://github.com/storytold/vectorcraft)에 그리드를 나눈 다음 칸마다 다이어그램을 그려 넣는 스킬입니다. 결과는 공모전·크리틱 패널로 쓸 수 있는 `.ai / .pdf / .svg / .png` 파일입니다.

*A Claude Code skill that researches trending architecture board layouts on Pinterest (via Claude in Chrome), then lays out a grid in VectorCraft and fills it with line-dense diagrams (isometric, exploded axonometric, plan, section, flow, timeline, charts, site maps).*

## 하는 일

1. **레이아웃 조사**: Claude in Chrome으로 Pinterest를 검색합니다. 상위 핀을 레이아웃 유형으로 분류한 뒤, 검색 순위에 가중치를 두어 가장 많이 쓰이는 유형을 고릅니다.
2. **다이어그램 조사**: 칸에 넣을 다이어그램 종류별로 다시 검색합니다. 그림을 베끼지 않고 표현 방식만 참고합니다(선 굵기, 강조색, 지시선 등).
3. **패널 설계서 작성**: 조사 결과를 `panel.json`에 정리합니다. 칸 배치, 다이어그램 데이터, 이야기 흐름이 이 파일에 들어갑니다.
4. **그리기**: `scripts/render.mjs`가 VectorCraft MCP 서버를 통해 패널을 그리고, 미리보기를 만든 뒤 파일로 내보냅니다.

## 그릴 수 있는 것

| 종류 | 내용 |
|---|---|
| `iso` / `exploded` | 아이소메트릭 매스, 분해 액소. 구조 격자, 주변 건물 자동 생성, 층마다 패턴을 넣을 수 있음 |
| `plan` / `section` | 평면, 단면. 블록, 흐름선, 라벨, 방위표, 축척 |
| `flow` / `timeline` / `bars` / `legend` | 과정, 단계 시간표, 면적 막대, 범례 |
| `series` | 작은 그림 반복 (단계별 변화 보여 주기) |
| `title` / `text` / `image` / `card` / `glyph` | 제목, 글, 렌더 자리, 연표 카드, 개념식 기호(+ = >) |

**선이 촘촘한 패턴** 12종을 함께 쓸 수 있습니다: 등고선, 파도, 건물 바닥 모양, 도로, 흐름선, 반경 원, 나무, 양식줄·태양광 같은 줄+눈금, 빗금, 격자, 선, 면.

판 단위 기능:
- 프리셋 레이아웃 7종
- 판 전체에 까는 바탕 지도
- 십자 표시 격자
- 칸 사이 흐름 화살표
- 판 크기에 맞춘 글자 크기 자동 조정

자세한 형식은 [references/spec.md](references/spec.md), 레이아웃 유형은 [references/layout-archetypes.md](references/layout-archetypes.md)에 있습니다.

## 필요한 것

- [Claude Code](https://claude.com/claude-code)
- [Claude in Chrome](https://claude.com/chrome) 확장 (Pinterest 조사용, Pinterest 로그인 필요)
- [VectorCraft](https://github.com/storytold/vectorcraft) 0.24 이상
- Node.js 18 이상

## 설치

```bash
git clone https://github.com/nanpaul101556-hub/panel-skill ~/.claude/skills/panel
```

VectorCraft CLI 위치를 알려 줍니다.

```bash
# Windows PowerShell
setx VECTORCRAFT_CLI "D:\VectorCraft\app\vectorcraft-cli.exe"
```

그린 과정을 앱에서 바로 보려면 VectorCraft를 `vectorcraft.exe --control 7979`로 켜 둡니다. 앱이 꺼져 있으면 화면 없이 파일만 만듭니다.

## 사용

Claude Code에서 이렇게 요청합니다.

```
/panel 사이트 개요, 분석, 컨셉, 프로세스, 마스터 플랜, 프로그램 순으로 A1 세로 판넬 만들어줘. 위아래 투시도 칸은 비워줘
```

설계서를 직접 써서 그릴 수도 있습니다.

```bash
node scripts/render.mjs examples/sample-panel.json out --dry         # 형식 검사
node scripts/render.mjs examples/sample-panel.json out --no-export   # 미리보기만 (out/preview_N.png)
node scripts/render.mjs examples/sample-panel.json out --live        # 열려 있는 앱에 그리고 내보내기
```

## 주의

- Pinterest 핀은 남의 작업입니다. 이 스킬은 레이아웃 구조와 표현 방식만 참고하며, 핀 이미지를 패널에 붙이거나 따라 그리지 않습니다.
- 자동으로 생성한 지형, 마을, 등고선은 실제 지형이 아닙니다. 실제 지도가 필요하면 따로 넣어야 합니다.
- `.ai`로 내보내면 화살촉과 점선이 다른 프로그램에서 윤곽선으로 열립니다.
