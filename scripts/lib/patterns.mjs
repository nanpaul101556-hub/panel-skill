// Line-dense pattern generators (contours, waves, figure-ground fabric, streams, trees …).
// Everything is produced in diagram units as { segs:[[a,b]…], fills:[pts…] } and mapped later,
// so the same pattern can be drawn flat (plan/section) or on an isometric plane.
import { resolveStyle } from './style.mjs';

export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const polyline = (pts) => pts.slice(1).map((p, i) => [pts[i], p]);
const closed = (pts) => polyline([...pts, pts[0]]);

function insidePoly([x, y], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Liang–Barsky clip of a segment to [x0,y0,x1,y1]
function clipSeg([[ax, ay], [bx, by]], [x0, y0, x1, y1]) {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dy = by - ay;
  for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]]) {
    if (p === 0) { if (q < 0) return null; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  return [[ax + t0 * dx, ay + t0 * dy], [ax + t1 * dx, ay + t1 * dy]];
}

// subdivide long segments so a polygon mask can trim them cleanly
function subdivide(segs, step) {
  const out = [];
  for (const [a, b] of segs) {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let i = 0; i < n; i++) out.push([[a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n], [a[0] + ((b[0] - a[0]) * (i + 1)) / n, a[1] + ((b[1] - a[1]) * (i + 1)) / n]]);
  }
  return out;
}

function applyMask(segs, it) {
  let out = segs;
  if (it.clip) out = out.map((s) => clipSeg(s, it.clip)).filter(Boolean);
  const m = it.mask;
  if (m && (m.inside || m.outside)) {
    out = subdivide(out, m.step ?? 0.2).filter(([a, b]) => {
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (m.inside && !insidePoly(mid, m.inside)) return false;
      if (m.outside && insidePoly(mid, m.outside)) return false;
      return true;
    });
  }
  return out;
}

const GEN = {
  // irregular concentric loops: { cx, cy, rx, ry, n, wobble, seed, res }
  contours(it) {
    const r = rng(it.seed ?? 7);
    const harmonics = [2, 3, 5, 7].map((k) => ({ k, a: (it.wobble ?? 0.18) * r() / Math.sqrt(k), ph: r() * Math.PI * 2 }));
    const segs = [];
    const n = it.n ?? 12, res = it.res ?? 96;
    for (let i = 1; i <= n; i++) {
      const s = i / n;
      const drift = [(it.drift?.[0] ?? 0) * (1 - s), (it.drift?.[1] ?? 0) * (1 - s)];
      const pts = [];
      for (let j = 0; j < res; j++) {
        const t = (j / res) * Math.PI * 2;
        const f = 1 + harmonics.reduce((acc, h) => acc + h.a * Math.sin(h.k * t + h.ph + s * 1.3), 0);
        pts.push([it.cx + drift[0] + Math.cos(t) * it.rx * s * f, it.cy + drift[1] + Math.sin(t) * it.ry * s * f]);
      }
      segs.push(...closed(pts));
    }
    return { segs };
  },
  // parallel sine lines filling a rect: { rect:[x0,y0,x1,y1], spacing, amp, wavelength, seed }
  waves(it) {
    const [x0, y0, x1, y1] = it.rect;
    const r = rng(it.seed ?? 3);
    const sp = it.spacing ?? 0.5, amp = it.amp ?? sp * 0.25, wl = it.wavelength ?? sp * 6;
    const segs = [];
    for (let y = y0 + sp / 2; y < y1; y += sp) {
      const ph = r() * Math.PI * 2;
      const pts = [];
      for (let x = x0; x <= x1 + 1e-6; x += wl / 12) pts.push([x, y + Math.sin((x / wl) * Math.PI * 2 + ph) * amp]);
      // broken strokes read as water
      const line = polyline(pts);
      segs.push(...line.filter((_, k) => (it.broken === false) || Math.floor((k + ph * 3) / 5) % 3 !== 2));
    }
    return { segs };
  },
  grid(it) {
    const [x0, y0, x1, y1] = it.rect; const st = it.step ?? 1; const segs = [];
    for (let x = x0; x <= x1 + 1e-6; x += st) segs.push([[x, y0], [x, y1]]);
    for (let y = y0; y <= y1 + 1e-6; y += st) segs.push([[x0, y], [x1, y]]);
    return { segs };
  },
  // diagonal hatch in a rect: { rect, spacing, angle(deg) }
  hatch(it) {
    const [x0, y0, x1, y1] = it.rect; const sp = it.spacing ?? 0.3; const a = ((it.angle ?? 45) * Math.PI) / 180;
    const dx = Math.cos(a), dy = Math.sin(a); const L = Math.hypot(x1 - x0, y1 - y0); const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const segs = [];
    for (let k = -L; k <= L; k += sp) segs.push([[cx - dy * k - dx * L, cy + dx * k - dy * L], [cx - dy * k + dx * L, cy + dx * k + dy * L]]);
    return { segs: segs.map((s) => clipSeg(s, it.rect)).filter(Boolean) };
  },
  // figure-ground urban fabric: { rect, block, street, seed, fill:true }
  buildings(it) {
    const [x0, y0, x1, y1] = it.rect; const r = rng(it.seed ?? 11);
    const block = it.block ?? 3, street = it.street ?? 0.5;
    const fills = [];
    for (let bx = x0; bx < x1 - street; bx += block) for (let by = y0; by < y1 - street; by += block) {
      const ex = Math.min(bx + block - street, x1), ey = Math.min(by + block - street, y1);
      const n = 1 + Math.floor(r() * 4);
      for (let k = 0; k < n; k++) {
        const w = (ex - bx) * (0.25 + r() * 0.45), h = (ey - by) * (0.25 + r() * 0.45);
        const px = bx + r() * (ex - bx - w), py = by + r() * (ey - by - h);
        if (it.density !== undefined && r() > it.density) continue;
        fills.push([[px, py], [px + w, py], [px + w, py + h], [px, py + h]]);
      }
    }
    return { fills };
  },
  // double-line road along a polyline: { pts, width }
  road(it) {
    const w = (it.width ?? 0.6) / 2; const segs = [];
    for (const side of [-1, 1]) {
      const off = it.pts.map((p, i) => {
        const a = it.pts[Math.max(0, i - 1)], b = it.pts[Math.min(it.pts.length - 1, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
        return [p[0] - (dy / L) * w * side, p[1] + (dx / L) * w * side];
      });
      segs.push(...polyline(off));
    }
    if (it.centre) segs.push(...polyline(it.pts).filter((_, k) => k % 2 === 0));
    return { segs };
  },
  // fanned flow lines between two points: { from, to, n, spread, bend, seed }
  streams(it) {
    const r = rng(it.seed ?? 5); const n = it.n ?? 14; const segs = [];
    const [ax, ay] = it.from, [bx, by] = it.to; const dx = bx - ax, dy = by - ay; const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L; const spread = it.spread ?? L * 0.25; const bend = it.bend ?? 0.3;
    for (let i = 0; i < n; i++) {
      const o = (i / (n - 1 || 1) - 0.5) * spread; const j = (r() - 0.5) * spread * 0.15;
      const pts = [];
      for (let t = 0; t <= 1.0001; t += 0.04) {
        const env = Math.sin(t * Math.PI); // lines gather at both ends, spread in the middle
        const sw = Math.sin(t * Math.PI * 2) * bend * L * 0.15;
        pts.push([ax + dx * t + nx * ((o + j) * env + sw), ay + dy * t + ny * ((o + j) * env + sw)]);
      }
      segs.push(...polyline(pts));
    }
    return { segs };
  },
  // concentric rings: { cx, cy, radii:[…] }
  rings(it) {
    const segs = [];
    for (const R of it.radii || []) { const pts = []; for (let j = 0; j < 120; j++) { const t = (j / 120) * Math.PI * 2; pts.push([it.cx + Math.cos(t) * R, it.cy + Math.sin(t) * R]); } segs.push(...closed(pts)); }
    return { segs };
  },
  // tree symbols scattered in a rect: { rect, n, r, seed }
  trees(it) {
    const [x0, y0, x1, y1] = it.rect; const rr = rng(it.seed ?? 13); const segs = [];
    for (let k = 0; k < (it.n ?? 20); k++) {
      const cx = x0 + rr() * (x1 - x0), cy = y0 + rr() * (y1 - y0), R = (it.r ?? 0.35) * (0.7 + rr() * 0.6);
      const pts = []; for (let j = 0; j < 14; j++) { const t = (j / 14) * Math.PI * 2; const f = j % 2 ? 0.82 : 1; pts.push([cx + Math.cos(t) * R * f, cy + Math.sin(t) * R * f]); }
      segs.push(...closed(pts), [[cx - R * 0.3, cy], [cx + R * 0.3, cy]], [[cx, cy - R * 0.3], [cx, cy + R * 0.3]]);
    }
    return { segs };
  },
  // parallel rows of ticks (oyster longlines, solar rows, seating): { rect, spacing, tick, dir:'x'|'y' }
  rows(it) {
    const [x0, y0, x1, y1] = it.rect; const sp = it.spacing ?? 0.5; const tk = it.tick ?? sp * 0.6; const segs = [];
    const alongX = (it.dir || 'x') === 'x';
    for (let v = (alongX ? y0 : x0) + sp / 2; v < (alongX ? y1 : x1); v += sp) {
      if (alongX) { segs.push([[x0, v], [x1, v]]); for (let x = x0; x <= x1; x += tk) segs.push([[x, v - sp * 0.18], [x, v + sp * 0.18]]); }
      else { segs.push([[v, y0], [v, y1]]); for (let y = y0; y <= y1; y += tk) segs.push([[v - sp * 0.18, y], [v + sp * 0.18, y]]); }
    }
    return { segs };
  },
  polyline(it) { return { segs: it.closed ? closed(it.pts) : polyline(it.pts) }; },
  area(it) { return { fills: [it.pts] }; },
};

export const PATTERN_KINDS = Object.keys(GEN);

// procedural context buildings as iso boxes: { rect, block, street, seed, h:[min,max], style, avoid:[[x0,y0,x1,y1]] }
export function contextBoxes(ctx) {
  const r = rng((ctx.seed ?? 11) + 101);
  const [hMin, hMax] = ctx.h ?? [0.6, 2.4];
  const hit = (f, a) => !(f[1][0] < a[0] || f[0][0] > a[2] || f[2][1] < a[1] || f[0][1] > a[3]);
  return GEN.buildings({ ...ctx, density: ctx.density }).fills
    .filter((f) => !(ctx.avoid || []).some((a) => hit(f, a)))
    .map((f) => ({ at: [f[0][0], f[0][1], 0], size: [f[1][0] - f[0][0], f[2][1] - f[0][1], hMin + r() * (hMax - hMin)], style: ctx.style || 'white' }));
}

// draw pattern items through a 2D→page mapping M(x, y) → [px, py]
export function drawPatterns(c, items, M, th) {
  (items || []).forEach((it) => {
    const gen = GEN[it.kind];
    if (!gen) throw new Error(`unknown pattern kind "${it.kind}" (have: ${PATTERN_KINDS.join(', ')})`);
    const out = gen(it);
    const st = resolveStyle(it.style || (it.kind === 'buildings' || it.kind === 'area' ? 'fill' : 'muted'), th);
    if (out.fills?.length) {
      const fills = it.clip ? out.fills.filter((f) => f.every(([x, y]) => x >= it.clip[0] && x <= it.clip[2] && y >= it.clip[1] && y <= it.clip[3])) : out.fills;
      const kept = it.mask?.inside ? fills.filter((f) => f.every((p) => insidePoly(p, it.mask.inside))) : fills;
      const kept2 = it.mask?.outside ? kept.filter((f) => !f.some((p) => insidePoly(p, it.mask.outside))) : kept;
      const d = kept2.map((f) => f.map((p, i) => { const [x, y] = M(...p); return `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`; }).join('') + (() => { const [x, y] = M(...f[0]); return `L${x.toFixed(2)} ${y.toFixed(2)}`; })()).join('');
      if (d) c.pathD(d, { fill: st.fill === 'none' ? th.ink : st.fill, stroke: st.stroke, sw: it.sw ?? st.sw * 0.6 });
    }
    if (out.segs?.length) {
      const segs = applyMask(out.segs, it).map(([a, b]) => [M(...a), M(...b)]);
      c.segs(segs, { stroke: st.stroke, sw: it.sw ?? st.sw, dash: st.dash });
    }
  });
}
