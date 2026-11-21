# Pinterest 조사 절차 (Claude in Chrome)

## 도구 불러오기 (한 번에)
```
ToolSearch "select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__browser_batch"
```
여러 동작은 `browser_batch`로 묶는다 (이동 → 대기 → 스크린샷 → 스크롤 → 스크린샷).

## 검색어
레이아웃 (최소 3개):
- `architectural layout`
- `architecture presentation board`
- `architecture competition panel`
- 보조: `architecture portfolio layout`, `architecture board layout A1`

다이어그램 (칸 종류별):
| 칸 종류 | 검색어 |
|---|---|
| exploded | `exploded axonometric diagram architecture` |
| iso | `isometric architecture diagram`, `massing diagram` |
| plan | `circulation diagram plan`, `program diagram plan` |
| section | `section diagram architecture` |
| flow | `process diagram architecture`, `concept diagram steps` |
| timeline | `phasing diagram architecture` |
| series | `architecture diagram sequence`, `spatial strategy diagram` |

URL: `https://www.pinterest.com/search/pins/?q=<URL 인코딩된 검색어>`

## 로그인
검색 결과 위에 "Pinterest에 오신 것을 환영합니다" 같은 로그인 창이 뜨면 **멈추고** 사용자에게 크롬 탭에서 직접 로그인해 달라고 한다. 이메일·비밀번호를 대신 입력하지 않는다.

## 핀 목록 추출 (javascript_tool)
스크롤할 때마다 다시 실행해 합친다. 순위는 화면 배치 순서(위→아래, 왼→오른)에 가깝다.
```js
(() => {
  const seen = new Set(); const out = [];
  const cards = [...document.querySelectorAll('a[href*="/pin/"]')]
    .map((a) => ({ a, r: a.getBoundingClientRect() }))
    .filter(({ a }) => a.querySelector('img'))
    .sort((p, q) => (p.r.top + scrollY) - (q.r.top + scrollY) || p.r.left - q.r.left);
  for (const { a } of cards) {
    const href = a.href.split('?')[0];
    if (seen.has(href)) continue; seen.add(href);
    const img = a.querySelector('img');
    out.push({ rank: out.length + 1, href, alt: (img.alt || '').slice(0, 140) });
  }
  return out.slice(0, 40);
})()
```
`alt`는 핀 설명이라 분류에 도움이 되지만, 분류는 **반드시 스크린샷을 보고** 한다.

## 트렌드 판정
1. 검색어마다 상위 ~12개(스크린샷 2~3장 분량)를 `references/layout-archetypes.md`의 유형으로 분류한다. 판정이 어려우면 `other`.
2. 점수 = Σ 1 / (1 + 순위/10). 여러 검색어 결과를 합산한다. 같은 핀이 여러 검색어에 나오면 한 번 더 가산한다 (반복 노출 = 인기 신호).
3. 1위 유형의 상위 핀 2~3개를 열어 확인한다: 저장 수·댓글(보이면), 게시 시기, 판 비율(가로/세로), 제목 띠 높이, 히어로 칸 비율, 글:그림 비율, 강조색 수, 배경(흰색/연회색/어두움).
4. 1·2위 점수 차가 10% 이내면 두 유형을 사용자에게 보여 주고 고르게 한다.

## 기록: `<저장폴더>/research.json`
```json
{
  "date": "2026-11-21",
  "queries": ["architectural layout", "architecture presentation board", "architecture competition panel"],
  "pins": [ { "query": "architectural layout", "rank": 1, "href": "https://www.pinterest.com/pin/…", "archetype": "hero-strip", "notes": "흰 배경, 큰 분해 액소, 하단 4칸 과정" } ],
  "scores": { "hero-strip": 4.1, "bento": 3.2, "storyboard-3x3": 2.0 },
  "chosen": { "archetype": "hero-strip", "why": "상위 36개 중 11개, 3개 검색어 모두 상위 5위 안", "details": { "orientation": "landscape", "background": "white", "accents": 2 } },
  "diagramRefs": [ { "cell": "hero", "query": "exploded axonometric diagram architecture", "hrefs": ["…"], "takeaways": "층 사이 점선 연결, 오른쪽 지시선 라벨, 강조 1색" } ]
}
```

## 스크린샷 저장
`computer` 의 `screenshot` 에 `save_to_disk: true` → 돌려받은 경로의 파일을 `<저장폴더>/references/<검색어>_<n>.png` 로 복사한다. 핀 원본 이미지 다운로드는 사용자 허락 후에만.

## 마무리
조사가 끝나면 직접 만든 탭은 `tabs_close_mcp`로 닫는다 (사용자가 남겨 달라고 하면 둔다).
