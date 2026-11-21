# panel.json 형식

```jsonc
{
  "name": "oyster-panel",                 // 내보내기 파일 이름
  "theme": { "font": "Pretendard", "titleFont": "Pretendard",
             "accent": "#d9534f", "accent2": "#c2a95e", "accent3": "#3f7f8f",
             "ink": "#1d1d1b", "muted": "#8a8a85", "ghost": "#cfcfca", "fill": "#ebeae6", "paper": "#ffffff",
             "textScale": 2 },             // 생략하면 판 크기로 자동
  "sheets": [                               // 한 장이면 sheets 없이 아래 키를 최상위에 둬도 됨
    {
      "page": { "size": "A1", "orientation": "landscape", "margin": 60, "cropMarks": true, "background": "#ffffff" },
      "layout": { "preset": "hero-strip" }, // 또는 "grid": { "columns", "rowHeights", "gutter" }
      "cells": [ /* 칸 */ ],
      "flow": [ ["hero", "plan"], { "from": "a", "to": "b", "label": "시간" } ]
    }
  ]
}
```
모든 장은 첫 장의 판 크기를 따른다. 글꼴은 VectorCraft에 깔린 것만 쓸 수 있다 (Pretendard, Noto Sans KR, Malgun Gothic, Century Gothic, Bahnschrift …). 한글은 Pretendard 또는 Noto Sans KR로 쓴다.

## 칸 (cell)
| 키 | 뜻 |
|---|---|
| `id` | flow 화살표에서 가리킬 이름 |
| `slot` 또는 `col,row,colSpan,rowSpan` | 위치 (프리셋 슬롯 번호 또는 그리드 좌표) |
| `type` | 아래 표의 다이어그램 종류 |
| `data` | 종류별 데이터 |
| `heading`, `step` | 칸 위 소제목과 번호(01, 02…) |
| `caption` | `{ title, text, bold, size }` 칸 아래 설명 |
| `captionPosition` | `"right"`면 설명을 오른쪽 34% 폭에 |
| `captionAlign` | `"left"`(기본) / `"center"` |
| `frame`, `fill`, `pad` | 칸 테두리, 칸 배경색, 안쪽 여백 |

## 스타일 이름 (`style`)
`white` 흰 면 · `fill` 연회색 면 · `dark` 검은 면 · `line` 검은 선 · `bold` 굵은 선 · `dashed` 점선 · `ghost` 연회색 가는 선 · `muted` 회색 선 · `hatch` 빗금 · `x` 엑스 표시 · `accent`/`accent2`/`accent3` 강조색 면 · `accent-line`/`accent2-line`/`accent3-line` 강조색 선.
직접 지정: `{ "fill": "#…", "stroke": "#…", "sw": 0.8, "dash": [3,2] }`.

## 다이어그램 종류
### `title`
`{ title, subtitle, meta, align: "left"|"center"|"right", rule: true, size }` — 크기는 칸에 맞춰 자동.

### `text`
`{ heading, body: "문단" | ["문단", …], size }`

### `image`
`{ label }` — 렌더·사진을 나중에 넣을 자리.

### `iso` (아이소메트릭 매스)
```jsonc
{ "site": [12, 12],                                   // 대지 (x, y)
  "frame": { "nx": 12, "ny": 12, "heights": 3 | [[…]], "cell": 1, "floor": 1, "style": "ghost" }, // 구조 격자 유령선
  "boxes": [ { "at": [x, y, z], "size": [w, d, h], "style": "accent", "floors": true } ],
  "floorHeight": 1,
  "lines": [ { "pts": [[x,y,z], …], "style": "accent-line", "arrow": true } ],
  "labels": [ { "at": [x,y,z], "text": "아트리움", "dx": 30, "dy": -18 } ] }
```
면 있는 상자(white/fill/dark/accent)는 앞뒤 순서대로 가려지고, 선 상자(line/accent-line)는 투명한 와이어로 위에 그려진다. x는 화면 오른쪽 아래, y는 왼쪽 아래, z는 위.

### `exploded` (분해 액소)
```jsonc
{ "size": [12, 12], "gap": 6, "labelSize": 7,
  "layers": [ { "label": "GROUND", "note": "짧은 설명", "style": "white", "plate": true,
                "boxes": [ { "at": [x, y, 0], "size": [w, d, h], "style": "accent2" } ] } ] }   // 0번이 맨 아래
```

### `plan`
```jsonc
{ "size": [W, H], "grid": { "step": 2, "style": "ghost" }, "outline": true, "north": true,
  "scaleBar": { "x": 0, "length": 10, "label": "10m" },
  "blocks": [ { "x", "y", "w", "h", "style": "fill", "label": "작업장" } ],
  "polys": [ { "pts": [[x,y], …], "style": "fill" } ],
  "circles": [ { "x", "y", "r", "style": "line", "dot": true } ],
  "paths": [ { "pts": [[x,y], …], "style": "accent-line", "arrow": true, "width": 1.5 } ],
  "labels": [ { "x", "y", "text", "size", "bold": true, "align": "center" } ] }
```
y는 아래로 증가.

### `section`
```jsonc
{ "width": 30, "levels": [0, 4, 8], "ground": true,
  "blocks": [ { "x": 2, "z": 0, "w": 10, "h": 8, "style": "white", "label": "작업장" } ],
  "paths": [ { "pts": [[x, z], …], "arrow": true } ],
  "labels": [ { "x", "z", "text" } ] }
```

### `flow` (과정)
`{ "nodes": [ { "label", "sub", "style" } ], "direction": "row"|"column", "numbered": true, "links": [[0, 2, "라벨"]] }`

### `timeline`
`{ "start": 2026, "end": 2036, "step": 2, "phases": [ { "label", "from", "to", "style" } ], "marks": [ { "at", "label" } ] }`

### `bars`
`{ "items": [ { "label", "value", "style" } ], "unit": "㎡", "max": 1000 }`

### `legend`
`{ "cols": 2, "items": [ { "label", "style", "kind": "box"|"line"|"dot" } ] }`

### `series` (작은 그림 반복)
`{ "cols": 3, "gap": 10, "captionAlign": "center", "items": [ { "type": "iso", "data": {…}, "caption": { "title": "1. STRUCTURE" } } ] }`
같은 대지·같은 시점으로 단계마다 한 요소씩 더하면 "점유 과정" 같은 단계 다이어그램이 된다.

## 펼침면·포트폴리오 결 (바탕 지도 + 십자 격자)
장(sheet)에 넣는 키:
- `background`: 판 전체에 까는 바탕 그림 `{ type: "plan", box: "page"|"content", data: {…} }`. 판 전체를 꽉 채우려면 `data.size`를 판 크기(pt)÷10 비율로 맞춘다. A2 세로는 `[119.055, 168.378]`.
- `crossGrid`: 칸 경계마다 가는 선을 긋고 교차점에 "+" 표시를 그린다 `{ stroke, sw, cross, crossStroke, crossSw, extend, lines, onTop }`. `onTop: true`면 칸들 위에 그린다(지도 칸 위로 격자가 지나가게; 다른 칸은 `inset`으로 교차점을 비운다). 칸이 격자선에 딱 붙도록 `grid.gutter: 0`과 함께 쓴다.
- `footer`: `{ left: "SITE ANALYSIS", right: "48" }` 판 아래 여백에 들어간다.

칸에 넣는 키:
- `inset`: 칸을 안쪽으로 줄인다(pt). 격자선 사이에 숨 쉴 틈을 준다.
- `backing`: `true`면 흰 바탕, 색을 주면 그 색으로 칸 밑을 채운다. 지도 위에 글을 얹을 때 쓴다.
- `frameStyle`: `{ stroke, sw, dash }` 빨간 점선 틀 같은 칸 테두리
- `lead`: `true`면 칸 왼쪽 격자선 위에 빨간 ">" 표시

종류 추가:
- `card`: `{ image: "PHOTO — …" | false, imageRatio, year, title, text }` 사진 자리, 연도, 제목, 설명을 담은 연표 카드
- `glyph`: `{ char: "+" | "=" | ">", size, color }` 개념식 기호

개념식 구성 예: [원래 모습 평면] `lead` [점선 틀 아이소] [글] → 다음 줄과 사이에 `glyph "+"` → 마지막에 `glyph "="`와 결과 렌더 칸

## 선이 촘촘한 패턴 (`patterns` / `overlay`)
`plan`·`section`·`iso`와 `exploded`의 각 층에 넣는다. `patterns`는 도형 아래, `overlay`는 위에 그려진다.
좌표는 그 도면의 단위다: 평면은 (x, y), 단면은 (x, z), 아이소는 (x, y)이며 높이는 항목별 `z`로 준다.

| kind | 키 | 쓰임 |
|---|---|---|
| `contours` | cx, cy, rx, ry, n, wobble, seed, drift | 불규칙한 등고선 |
| `waves` | rect, spacing, amp, wavelength, broken | 바다·물 |
| `grid` | rect, step | 구조 격자 |
| `hatch` | rect, spacing, angle | 빗금 (땅·벽) |
| `buildings` | rect, block, street, seed, density | 검은 건물 바닥 모양으로 채운 주변 조직 (면) |
| `road` | pts, width, centre | 두 줄 도로 |
| `streams` | from, to, n, spread, bend, seed | 부채꼴 흐름선 다발 |
| `rings` | cx, cy, radii | 반경 원 |
| `trees` | rect, n, r, seed | 나무 기호 |
| `rows` | rect, spacing, tick, dir | 양식줄·태양광·좌석 같은 줄+눈금 |
| `polyline` | pts, closed | 해안선·지형 단면 |
| `area` | pts | 채운 다각형 |

공통 키:
- `style`: 스타일 이름 또는 `{stroke, sw, fill, dash}`
- `clip`: `[x0,y0,x1,y1]` 사각형 범위로 자르기
- `mask`: `{inside: 다각형}` 또는 `{outside: 다각형}`으로 다각형 안이나 밖만 남기기. 예를 들면 바다 다각형 안에만 파도를 그린다.
- `seed`: 같은 값이면 같은 모양이 다시 나온다.

**주변 건물 자동 생성** `context`: `iso`와 `exploded` 층에서 쓴다. `{ rect, block, street, seed, h:[최소,최대], style, avoid:[[x0,y0,x1,y1]] }`
**분해도 층 판** `plate`: `true`는 불투명 판이라 아래층을 가린다. `"outline"`은 테두리만 그려 아래층 선이 비쳐 보인다. 선이 촘촘한 분해도는 맨 아래 층만 `true`로 두고 나머지는 `"outline"`으로 한다.

## 검사 순서
1. `--dry`: JSON 형식·칸 위치·슬롯 번호 오류를 잡는다.
2. `--no-export`: 헤드리스 미리보기 `preview_N.png`를 보고 고친다.
3. 마지막에 `--live`(앱이 켜져 있으면)로 그리고 내보낸다.
