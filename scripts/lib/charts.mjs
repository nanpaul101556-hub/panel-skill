// Process flow, timeline, bar chart and legend diagrams.
import { resolveStyle, styledRect } from './style.mjs';
import { wrap } from './canvas.mjs';

// data: { nodes:[{label, sub, style}], direction:'row'|'column', numbered:true, links:[[from,to,label]] }
export function flowDiagram(c, box, data, th) {
  const nodes = data.nodes || [];
  const n = nodes.length;
  if (!n) return;
  const row = (data.direction || 'row') === 'row';
  const gap = row ? Math.max(14, box.w * 0.05) : Math.max(10, box.h * 0.05);
  const k = th.ts ?? 1;
  const nw = row ? (box.w - gap * (n - 1)) / n : Math.min(box.w, 180 * k);
  const nh = row ? Math.min(box.h * 0.8, nw * 0.75) : Math.min((box.h - gap * (n - 1)) / n, nw * 0.42);
  const x0 = row ? box.x : box.x + (box.w - nw) / 2;
  const y0 = row ? box.y + (box.h - nh) / 2 : box.y + (box.h - n * nh - (n - 1) * gap) / 2;
  const rects = nodes.map((_, i) => ({ x: row ? x0 + i * (nw + gap) : x0, y: row ? y0 : y0 + i * (nh + gap), w: nw, h: nh }));
  const size = data.size ?? Math.max(6 * k, Math.min(11 * k, nh * 0.2));

  nodes.forEach((nd, i) => {
    const r = rects[i];
    const st = resolveStyle(nd.style || 'white', th);
    styledRect(c, r.x, r.y, r.w, r.h, st, { radius: 3 });
    if (data.numbered !== false) {
      c.ellipse(r.x + 9 * k, r.y + 9 * k, 6 * k, 6 * k, { fill: th.ink });
      c.text(r.x + 9 * k, r.y + 11.3 * k, String(i + 1), { size: 6.5, align: 'center', color: th.paper, style: 'Bold' });
    }
    const lines = wrap(nd.label, size, r.w - 12);
    const subLines = nd.sub ? wrap(nd.sub, size * 0.72, r.w - 12) : [];
    const blockH = lines.length * size * 1.2 + subLines.length * size * 0.9;
    let ty = r.y + (r.h - blockH) / 2 + size;
    lines.forEach((ln) => { c.text(r.x + r.w / 2, ty, ln, { size, align: 'center', style: 'Bold', raw: true }); ty += size * 1.2; });
    subLines.forEach((ln) => { c.text(r.x + r.w / 2, ty, ln, { size: size * 0.72, align: 'center', color: th.muted, raw: true }); ty += size * 0.9; });
  });
  const links = data.links || nodes.slice(1).map((_, i) => [i, i + 1]);
  links.forEach(([a, b, label]) => {
    const A = rects[a], B = rects[b];
    if (!A || !B) return;
    const pts = row ? [[A.x + A.w + 2, A.y + A.h / 2], [B.x - 2, B.y + B.h / 2]] : [[A.x + A.w / 2, A.y + A.h + 2], [B.x + B.w / 2, B.y - 2]];
    c.poly(pts, { stroke: th.accent, sw: 1.1, arrow: true });
    if (label) c.text((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2 - 4, label, { size: 5, align: 'center', color: th.accent });
  });
}

// data: { start, end, step, phases:[{label, from, to, style}], marks:[{at, label}] }
export function timelineDiagram(c, box, data, th) {
  const { start, end } = data;
  const span = end - start || 1;
  const X = (t) => box.x + 8 + ((t - start) / span) * (box.w - 16);
  const phases = data.phases || [];
  const lanes = [];
  const laneOf = phases.map((p) => {
    let l = lanes.findIndex((endT) => endT <= p.from);
    if (l < 0) { l = lanes.length; lanes.push(p.to); } else lanes[l] = p.to;
    return l;
  });
  const k = th.ts ?? 1;
  const axisY = box.y + box.h - 16 * k;
  const laneH = Math.min(18 * k, (axisY - box.y - 12 * k) / Math.max(lanes.length, 1));
  phases.forEach((p, i) => {
    const st = resolveStyle(p.style || (i % 2 ? 'accent2' : 'accent'), th);
    const y = axisY - 6 - (laneOf[i] + 1) * laneH;
    const w = X(p.to) - X(p.from);
    styledRect(c, X(p.from), y, w, laneH - 3, st, { radius: 1.5 });
    const size = Math.min(7 * k, (laneH - 3) * 0.55);
    c.text(X(p.from) + 3, y + (laneH - 3) / 2 + size * 0.36, p.label, { size, style: 'Bold', raw: true });
  });
  c.poly([[box.x, axisY], [box.x + box.w, axisY]], { stroke: th.ink, sw: 0.9, arrow: true });
  const step = data.step ?? Math.max(1, Math.round(span / 8));
  const E = [];
  for (let t = start; t <= end + 1e-6; t += step) {
    E.push([[X(t), axisY - 3], [X(t), axisY + 3]]);
    c.text(X(t), axisY + 11 * k, String(t), { size: 5.5, align: 'center', color: th.muted });
  }
  c.segs(E, { stroke: th.ink, sw: 0.5 });
  (data.marks || []).forEach((m) => {
    c.ellipse(X(m.at), axisY, 2.4, 2.4, { fill: th.accent, stroke: th.paper, sw: 0.6 });
    c.text(X(m.at), box.y + 6 * k, m.label, { size: 5.5, align: 'center', color: th.accent, style: 'Bold' });
    c.segs([[[X(m.at), box.y + 9 * k], [X(m.at), axisY - 3]]], { stroke: th.accent, sw: 0.35, dash: [2, 2] });
  });
}

// data: { items:[{label, value, style}], unit, max }
export function barsDiagram(c, box, data, th) {
  const items = data.items || [];
  if (!items.length) return;
  const max = data.max ?? Math.max(...items.map((i) => i.value));
  const k = th.ts ?? 1;
  const labelW = box.w * 0.3, valueW = 34 * k;
  const rowH = Math.min(18 * k, box.h / items.length);
  const size = Math.min(7 * k, rowH * 0.5);
  items.forEach((it, i) => {
    const y = box.y + (box.h - rowH * items.length) / 2 + i * rowH;
    const w = ((box.w - labelW - valueW) * it.value) / (max || 1);
    c.text(box.x + labelW - 5, y + rowH / 2 + size * 0.36, it.label, { size, align: 'right', raw: true });
    styledRect(c, box.x + labelW, y + rowH * 0.18, Math.max(w, 0.5), rowH * 0.64, resolveStyle(it.style || (i === 0 ? 'accent' : 'fill'), th));
    c.text(box.x + labelW + w + 4, y + rowH / 2 + size * 0.36, `${it.value}${data.unit ?? ''}`, { size, style: 'Bold', raw: true });
  });
}

// data: { items:[{label, style, kind:'box'|'line'|'dot'}], cols }
export function legendDiagram(c, box, data, th) {
  const items = data.items || [];
  const cols = data.cols ?? 1;
  const rows = Math.ceil(items.length / cols);
  const k = th.ts ?? 1;
  const cw = box.w / cols, rh = Math.min(14 * k, box.h / Math.max(rows, 1));
  const size = Math.min(7 * k, rh * 0.55);
  const swW = 14 * k, swH = 8 * k;
  items.forEach((it, i) => {
    const x = box.x + (i % cols) * cw, y = box.y + Math.floor(i / cols) * rh;
    const st = resolveStyle(it.style || 'fill', th);
    const cy = y + rh / 2;
    if (it.kind === 'line') c.poly([[x, cy], [x + swW, cy]], { stroke: st.stroke, sw: Math.max(st.sw, 1), dash: st.dash });
    else if (it.kind === 'dot') c.ellipse(x + 5 * k, cy, 3 * k, 3 * k, { fill: st.fill === 'none' ? st.stroke : st.fill, stroke: st.stroke, sw: st.sw });
    else styledRect(c, x, cy - swH / 2, swW, swH, st, { hatchSpacing: 2 });
    c.text(x + swW + 5 * k, cy + size * 0.36, it.label, { size, raw: true });
  });
}
