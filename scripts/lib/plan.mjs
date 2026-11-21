// Plan and section diagrams (2D, units in metres or any consistent unit).
import { resolveStyle, styledRect, bboxOf, fitBox, hatchRect } from './style.mjs';
import { drawPatterns } from './patterns.mjs';

function drawItems(c, P, s, data, th) {
  (data.blocks || []).forEach((b) => {
    const st = resolveStyle(b.style || 'fill', th);
    const [x, y] = P(b.x, b.y);
    styledRect(c, x, y, b.w * s, b.h * s, st);
    if (b.label) c.text(x + (b.w * s) / 2, y + (b.h * s) / 2 + 2.2, b.label, { size: b.labelSize ?? 6, align: 'center', color: st.fill === th.ink ? th.paper : th.ink });
  });
  (data.polys || []).forEach((p) => {
    const st = resolveStyle(p.style || 'fill', th);
    c.poly(p.pts.map(([x, y]) => P(x, y)), { closed: p.closed !== false, fill: st.fill, stroke: st.stroke, sw: st.sw, dash: st.dash });
  });
  (data.circles || []).forEach((k) => {
    const st = resolveStyle(k.style || 'line', th);
    const [x, y] = P(k.x, k.y);
    c.ellipse(x, y, k.r * s, k.r * s, { fill: st.fill, stroke: st.stroke, sw: st.sw, dash: st.dash });
    if (k.dot) c.ellipse(x, y, 1, 1, { fill: th.ink });
  });
  (data.paths || []).forEach((p) => {
    const st = resolveStyle(p.style || 'accent-line', th);
    c.poly(p.pts.map(([x, y]) => P(x, y)), { stroke: st.stroke, sw: p.width ?? st.sw * 1.5, dash: st.dash, arrow: p.arrow });
  });
  (data.labels || []).forEach((l) => {
    const [x, y] = P(l.x, l.y);
    c.text(x, y, l.text, { size: l.size ?? 6, align: l.align ?? 'center', style: l.bold ? 'Bold' : 'Regular', color: l.color });
  });
}

function north(c, box, th) {
  const k = th.ts ?? 1;
  const x = box.x + box.w - 10 * k, y = box.y + 20 * k;
  c.poly([[x, y - 9 * k], [x + 4 * k, y + 3 * k], [x, y], [x - 4 * k, y + 3 * k]], { closed: true, fill: th.ink, stroke: th.ink, sw: 0.3 });
  c.text(x, y - 11 * k, 'N', { size: 5.5, align: 'center', style: 'Bold' });
}

function scaleBar(c, P, s, sb, th, H) {
  // drawn just below the plan's bottom edge (sb.x = start along x)
  const k = th.ts ?? 1;
  const [x, yb] = P(sb.x ?? 0, H);
  const y = yb + 5 * k;
  const n = 4, seg = (sb.length * s) / n;
  for (let i = 0; i < n; i++) c.rect(x + i * seg, y, seg, 2.2 * k, { fill: i % 2 ? th.paper : th.ink, stroke: th.ink, sw: 0.3 });
  c.text(x, y + 9 * k, '0', { size: 5 });
  c.text(x + sb.length * s, y + 9 * k,sb.label ?? `${sb.length}m`, { size: 5, align: 'right' });
}

// data: { size:[W,H], grid:{step,style}, outline, blocks, polys, circles, paths, labels, north, scaleBar }
export function planDiagram(c, box, data, th) {
  const [W, H] = data.size || [10, 10];
  const pts = [[0, 0], [W, H]];
  (data.blocks || []).forEach((b) => pts.push([b.x, b.y], [b.x + b.w, b.y + b.h]));
  (data.polys || []).forEach((p) => pts.push(...p.pts));
  (data.paths || []).forEach((p) => pts.push(...p.pts));
  const k = th.ts ?? 1;
  const fbox = { ...box, w: box.w - (data.north ? 24 * k : 0), h: box.h - (data.scaleBar ? 16 * k : 0) };
  const fit = fitBox(bboxOf(pts), fbox, data.pad ?? 10);
  const P = (x, y) => fit.map(x, y);
  const s = fit.s;

  if (data.grid) {
    const st = resolveStyle(data.grid.style || 'ghost', th);
    const step = data.grid.step ?? 1;
    const E = [];
    for (let x = 0; x <= W + 1e-6; x += step) E.push([P(x, 0), P(x, H)]);
    for (let y = 0; y <= H + 1e-6; y += step) E.push([P(0, y), P(W, y)]);
    c.segs(E, { stroke: st.stroke, sw: st.sw, dash: st.dash });
  }
  drawPatterns(c, data.patterns, P, th);
  if (data.outline !== false) { const [x, y] = P(0, 0); c.rect(x, y, W * s, H * s, { stroke: th.ink, sw: 0.8 }); }
  drawItems(c, P, s, data, th);
  drawPatterns(c, data.overlay, P, th);
  if (data.north) north(c, box, th);
  if (data.scaleBar) scaleBar(c, P, s, data.scaleBar, th, H);
}

// data: { width, levels:[elevations], ground:true, blocks:[{x,z,w,h,style,label}], paths:[{pts:[[x,z]]}], labels:[{x,z,text}] }
export function sectionDiagram(c, box, data, th) {
  const W = data.width ?? 30;
  const levels = data.levels || [];
  const top = Math.max(...levels, ...(data.blocks || []).map((b) => b.z + b.h), 1) * 1.08;
  const below = data.below ?? top * 0.12;
  const flip = (z) => top - z;
  const plan = {
    size: [W, top + below],
    pad: data.pad ?? 12,
    outline: false,
    blocks: (data.blocks || []).map((b) => ({ ...b, y: flip(b.z + b.h) })),
    paths: (data.paths || []).map((p) => ({ ...p, pts: p.pts.map(([x, z]) => [x, flip(z)]) })),
    labels: (data.labels || []).map((l) => ({ ...l, y: flip(l.z) })),
  };
  const fit = fitBox(bboxOf([[0, 0], [W, top + below]]), box, plan.pad);
  const P = (x, y) => fit.map(x, y);
  levels.forEach((z) => {
    c.segs([[P(0, flip(z)), P(W, flip(z))]], { stroke: th.muted, sw: 0.35, dash: [3, 2] });
    const [lx, ly] = P(0, flip(z));
    c.text(lx - 3, ly + 2, `+${z}`, { size: 5, align: 'right', color: th.muted });
  });
  // section patterns use (x, z) coordinates
  const PZ = (x, z) => P(x, flip(z));
  drawPatterns(c, data.patterns, PZ, th);
  drawItems(c, P, fit.s, plan, th);
  drawPatterns(c, data.overlay, PZ, th);
  if (data.ground !== false) {
    const [gx, gy] = P(0, flip(0));
    const gw = W * fit.s;
    c.poly([[gx - 6, gy], [gx + gw + 6, gy]], { stroke: th.ink, sw: 1.4 });
    c.segs(hatchRect(gx - 6, gy, gw + 12, Math.min(below * fit.s, 10), 4), { stroke: th.muted, sw: 0.3 });
  }
}
