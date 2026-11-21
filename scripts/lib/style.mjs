// Theme defaults, named fill/stroke styles, colour mixing and fit-to-box helpers.
export const DEFAULT_THEME = {
  font: 'Pretendard',
  titleFont: 'Pretendard',
  ink: '#1d1d1b',
  muted: '#8a8a85',
  ghost: '#cfcfca',
  fill: '#ebeae6',
  paper: '#ffffff',
  accent: '#d9534f',
  accent2: '#c2a95e',
  accent3: '#3f7f8f',
};

const hex = (h) => { const v = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16)); };
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
export function mix(a, b, t) {
  if (!a || a === 'none') return a;
  const A = hex(a), B = hex(b);
  return toHex(A.map((v, i) => v + (B[i] - v) * t));
}

// style name → { fill, stroke, sw, dash, hatch, cross }
export function resolveStyle(style, th) {
  if (style && typeof style === 'object') return { fill: 'none', stroke: th.ink, sw: 0.6, ...style };
  const acc = /^(accent\d?)(-line)?$/.exec(style || '');
  if (acc) {
    const col = th[acc[1]] || th.accent;
    return acc[2] ? { fill: 'none', stroke: col, sw: 0.8 } : { fill: mix(col, th.paper, 0.72), stroke: col, sw: 0.8 };
  }
  switch (style) {
    case 'ghost': return { fill: 'none', stroke: th.ghost, sw: 0.3 };
    case 'bold': return { fill: 'none', stroke: th.ink, sw: 1.2 };
    case 'fill': return { fill: th.fill, stroke: th.ink, sw: 0.7 };
    case 'dark': return { fill: th.ink, stroke: th.ink, sw: 0.5 };
    case 'white': return { fill: th.paper, stroke: th.ink, sw: 0.6 };
    case 'dashed': return { fill: 'none', stroke: th.ink, sw: 0.6, dash: [3, 2] };
    case 'muted': return { fill: 'none', stroke: th.muted, sw: 0.5 };
    case 'hatch': return { fill: th.paper, stroke: th.ink, sw: 0.7, hatch: true };
    case 'x': return { fill: th.paper, stroke: th.ink, sw: 0.6, cross: true };
    default: return { fill: 'none', stroke: th.ink, sw: 0.6 };
  }
}
export const isFilled = (st) => st.fill && st.fill !== 'none';

export function bboxOf(pts) {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const [x, y] of pts) { b.minX = Math.min(b.minX, x); b.minY = Math.min(b.minY, y); b.maxX = Math.max(b.maxX, x); b.maxY = Math.max(b.maxY, y); }
  return b;
}

// uniform scale of a bbox into a box, centred
export function fitBox(bb, box, pad = 6) {
  const w = Math.max(bb.maxX - bb.minX, 1e-6), h = Math.max(bb.maxY - bb.minY, 1e-6);
  const s = Math.min((box.w - 2 * pad) / w, (box.h - 2 * pad) / h);
  const tx = box.x + (box.w - w * s) / 2 - bb.minX * s;
  const ty = box.y + (box.h - h * s) / 2 - bb.minY * s;
  return { s, map: (u, v) => [tx + u * s, ty + v * s] };
}

// 45° hatch lines clipped to an axis-aligned rect (pt coordinates)
export function hatchRect(x, y, w, h, spacing = 3) {
  const out = [];
  for (let c = -h; c < w; c += spacing) {
    const t0 = Math.max(0, -c), t1 = Math.min(h, w - c);
    if (t1 > t0) out.push([[x + c + t0, y + h - t0], [x + c + t1, y + h - t1]]);
  }
  return out;
}

// draw an axis-aligned rect with a resolved style (hatch / cross handled here)
export function styledRect(c, x, y, w, h, st, o = {}) {
  c.rect(x, y, w, h, { fill: st.fill, stroke: st.stroke, sw: st.sw, dash: st.dash, radius: o.radius });
  if (st.hatch) c.segs(hatchRect(x, y, w, h, o.hatchSpacing ?? 3), { stroke: st.stroke, sw: 0.3 });
  if (st.cross) c.segs([[[x, y], [x + w, y + h]], [[x + w, y], [x, y + h]]], { stroke: st.stroke, sw: 0.35 });
}
