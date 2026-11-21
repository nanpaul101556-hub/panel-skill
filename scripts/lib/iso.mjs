// Isometric massing and exploded axonometric diagrams.
// Units: x to the right-down, y to the left-down, z up. Boxes: { at:[x,y,z], size:[w,d,h], style, floors }
import { resolveStyle, isFilled, mix, bboxOf, fitBox } from './style.mjs';
import { drawPatterns, contextBoxes } from './patterns.mjs';

const C30 = Math.cos(Math.PI / 6);
export const isoRaw = (x, y, z) => [(x - y) * C30, (x + y) * 0.5 - z];

const corners = ({ at: [x, y, z], size: [w, d, h] }) => [
  [x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z], [x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h],
];

function boxEdges(P, b, floorH) {
  const [x, y, z] = b.at, [w, d, h] = b.size;
  const E = [];
  const ring = (zz) => E.push([P(x, y, zz), P(x + w, y, zz)], [P(x + w, y, zz), P(x + w, y + d, zz)], [P(x + w, y + d, zz), P(x, y + d, zz)], [P(x, y + d, zz), P(x, y, zz)]);
  ring(z); ring(z + h);
  [[x, y], [x + w, y], [x + w, y + d], [x, y + d]].forEach(([a, bb]) => E.push([P(a, bb, z), P(a, bb, z + h)]));
  if (b.floors) for (let f = z + floorH; f < z + h - 1e-6; f += floorH) ring(f);
  return E;
}

function solidBox(c, P, b, st, th, floorH) {
  const [x, y, z] = b.at, [w, d, h] = b.size;
  const X1 = x + w, Y1 = y + d, Z1 = z + h;
  const side = (t) => mix(st.fill, th.ink, t);
  const faces = [
    [[[X1, y, z], [X1, Y1, z], [X1, Y1, Z1], [X1, y, Z1]], side(0.07)],
    [[[x, Y1, z], [X1, Y1, z], [X1, Y1, Z1], [x, Y1, Z1]], side(0.15)],
    [[[x, y, Z1], [X1, y, Z1], [X1, Y1, Z1], [x, Y1, Z1]], st.fill],
  ];
  faces.forEach(([f, fill]) => c.poly(f.map((p) => P(...p)), { closed: true, fill, stroke: st.stroke, sw: st.sw }));
  if (b.floors) {
    const E = [];
    for (let f = z + floorH; f < Z1 - 1e-6; f += floorH) E.push([P(X1, y, f), P(X1, Y1, f)], [P(x, Y1, f), P(X1, Y1, f)]);
    c.segs(E, { stroke: st.stroke, sw: Math.min(st.sw, 0.4) });
  }
}

// draws boxes: ghost/line wireframes behind, solids painter-sorted, accent wireframes on top
export function drawBoxes(c, P, boxes, th, floorH = 1) {
  const items = boxes.map((b) => ({ b, st: resolveStyle(b.style || 'white', th) }));
  const depth = ({ b }) => b.at[0] + b.size[0] / 2 + b.at[1] + b.size[1] / 2 + b.at[2] + b.size[2] / 2;
  const wires = items.filter((i) => !isFilled(i.st));
  const back = wires.filter((i) => i.st.stroke === th.ghost || i.st.stroke === th.muted);
  const front = wires.filter((i) => !back.includes(i));
  const draw = (list) => list.forEach(({ b, st }) => c.segs(boxEdges(P, b, floorH), { stroke: st.stroke, sw: st.sw, dash: st.dash }));
  draw(back);
  items.filter((i) => isFilled(i.st)).sort((a, b) => depth(a) - depth(b)).forEach(({ b, st }) => solidBox(c, P, b, st, th, floorH));
  draw(front);
}

// merged lattice edges for a ghost structural frame: { nx, ny, heights: n | n[ny][nx], cell, floor }
function frameEdges(f) {
  const lv = (i, j) => (Array.isArray(f.heights) ? (f.heights[j]?.[i] ?? 0) : (f.heights ?? 1));
  const seen = new Set();
  const runs = new Map();
  const add = (axis, a, b, start) => {
    const k = `${axis}|${a}|${b}|${start}`;
    if (seen.has(k)) return;
    seen.add(k);
    const g = `${axis}|${a}|${b}`;
    if (!runs.has(g)) runs.set(g, []);
    runs.get(g).push(start);
  };
  for (let i = 0; i < f.nx; i++) for (let j = 0; j < f.ny; j++) for (let k = 0; k < lv(i, j); k++) {
    for (const dz of [0, 1]) for (const dj of [0, 1]) add('x', j + dj, k + dz, i);
    for (const dz of [0, 1]) for (const di of [0, 1]) add('y', i + di, k + dz, j);
    for (const di of [0, 1]) for (const dj of [0, 1]) add('z', i + di, j + dj, k);
  }
  const out = [];
  for (const [g, starts] of runs) {
    const [axis, a, b] = g.split('|');
    starts.sort((p, q) => p - q);
    let s0 = starts[0], prev = starts[0];
    const flush = (e) => out.push({ axis, a: +a, b: +b, c0: s0, c1: e + 1 });
    for (let t = 1; t < starts.length; t++) { if (starts[t] !== prev + 1) { flush(prev); s0 = starts[t]; } prev = starts[t]; }
    flush(prev);
  }
  return out;
}

function frameSegs(P, f) {
  const cs = f.cell ?? 1, fh = f.floor ?? 1;
  return frameEdges(f).map((e) => {
    if (e.axis === 'x') return [P(e.c0 * cs, e.a * cs, e.b * fh), P(e.c1 * cs, e.a * cs, e.b * fh)];
    if (e.axis === 'y') return [P(e.a * cs, e.c0 * cs, e.b * fh), P(e.a * cs, e.c1 * cs, e.b * fh)];
    return [P(e.a * cs, e.b * cs, e.c0 * fh), P(e.a * cs, e.b * cs, e.c1 * fh)];
  });
}

function frameExtent(f) {
  const cs = f.cell ?? 1, fh = f.floor ?? 1;
  const maxH = Array.isArray(f.heights) ? Math.max(...f.heights.flat()) : (f.heights ?? 1);
  return [[0, 0, 0], [f.nx * cs, 0, 0], [0, f.ny * cs, 0], [f.nx * cs, f.ny * cs, maxH * fh], [f.nx * cs, 0, maxH * fh], [0, f.ny * cs, maxH * fh]];
}

function drawLabels(c, P, labels, th) {
  (labels || []).forEach((l) => {
    const [ax, ay] = P(...l.at);
    const dx = l.dx ?? 28, dy = l.dy ?? -18;
    c.poly([[ax, ay], [ax + dx, ay + dy], [ax + dx + Math.sign(dx || 1) * 10, ay + dy]], { stroke: th.ink, sw: 0.35 });
    c.ellipse(ax, ay, 0.9, 0.9, { fill: th.ink });
    c.text(ax + dx + Math.sign(dx || 1) * 12, ay + dy + 2.2, l.text, { size: l.size ?? 6, align: dx < 0 ? 'right' : 'left' });
  });
}

// patterns on a horizontal plane z (each item may carry its own z)
function isoPatterns(c, P, items, th, z0 = 0) {
  const groups = new Map();
  (items || []).forEach((it) => { const z = (it.z ?? 0) + z0; if (!groups.has(z)) groups.set(z, []); groups.get(z).push(it); });
  for (const [z, list] of groups) drawPatterns(c, list, (x, y) => P(x, y, z), th);
}

export function isoDiagram(c, box, data, th) {
  const boxes = [...(data.context ? contextBoxes(data.context) : []), ...(data.boxes || [])];
  const pts3 = [];
  if (data.site) pts3.push([0, 0, 0], [data.site[0], 0, 0], [data.site[0], data.site[1], 0], [0, data.site[1], 0]);
  if (data.frame) pts3.push(...frameExtent(data.frame));
  boxes.forEach((b) => pts3.push(...corners(b)));
  (data.lines || []).forEach((l) => pts3.push(...l.pts));
  if (!pts3.length) return;
  const fit = fitBox(bboxOf(pts3.map((p) => isoRaw(...p))), box, data.pad ?? 8);
  const P = (x, y, z) => fit.map(...isoRaw(x, y, z));

  if (data.site) {
    const [W, D] = data.site;
    c.poly([P(0, 0, 0), P(W, 0, 0), P(W, D, 0), P(0, D, 0)], { closed: true, fill: data.siteFill ?? 'none', stroke: th.ink, sw: 0.8 });
  }
  isoPatterns(c, P, data.patterns, th);
  if (data.frame) {
    const st = resolveStyle(data.frame.style || 'ghost', th);
    c.segs(frameSegs(P, data.frame), { stroke: st.stroke, sw: st.sw });
  }
  drawBoxes(c, P, boxes, th, data.floorHeight ?? 1);
  isoPatterns(c, P, data.overlay, th);
  (data.lines || []).forEach((l) => { const st = resolveStyle(l.style || 'accent-line', th); c.poly(l.pts.map((p) => P(...p)), { stroke: st.stroke, sw: st.sw * 1.4, dash: st.dash, arrow: l.arrow }); });
  drawLabels(c, P, data.labels, th);
}

// exploded axonometric: layers stacked with a vertical gap, labels on the right
export function explodedDiagram(c, box, data, th) {
  const [W, D] = data.size || [10, 10];
  const gap = data.gap ?? Math.max(W, D) * 0.55;
  const layers = data.layers || [];
  const zOf = (i) => i * gap;
  const pts3 = [];
  layers.forEach((L, i) => {
    pts3.push([0, 0, zOf(i)], [W, 0, zOf(i)], [W, D, zOf(i)], [0, D, zOf(i)]);
    [...(L.context ? contextBoxes(L.context) : []), ...(L.boxes || [])].forEach((b) => pts3.push(...corners({ ...b, at: [b.at[0], b.at[1], b.at[2] + zOf(i)] })));
  });
  if (!pts3.length) return;
  const hasLabels = layers.some((L) => L.label);
  const drawBox = hasLabels ? { ...box, w: box.w * 0.7 } : box;
  const fit = fitBox(bboxOf(pts3.map((p) => isoRaw(...p))), drawBox, data.pad ?? 8);
  const P = (x, y, z) => fit.map(...isoRaw(x, y, z));
  const labelX = box.x + box.w * 0.74;
  const cornersXY = [[0, 0], [W, 0], [W, D], [0, D]];

  layers.forEach((L, i) => {
    const z = zOf(i);
    if (i > 0) c.segs(cornersXY.map(([x, y]) => [P(x, y, zOf(i - 1)), P(x, y, z)]), { stroke: th.muted, sw: 0.4, dash: [2, 2] });
    if (L.plate !== false) {
      const st = resolveStyle(L.style || 'white', th);
      // plate: true = opaque sheet (hides layers below), "outline" = see-through frame
      const fill = L.plate === 'outline' ? 'none' : isFilled(st) ? st.fill : th.paper;
      c.poly(cornersXY.map(([x, y]) => P(x, y, z)), { closed: true, fill, stroke: st.stroke, sw: st.sw });
    }
    isoPatterns(c, P, L.patterns, th, z);
    const layerBoxes = [...(L.context ? contextBoxes(L.context) : []), ...(L.boxes || [])];
    drawBoxes(c, P, layerBoxes.map((b) => ({ ...b, at: [b.at[0], b.at[1], b.at[2] + z] })), th, data.floorHeight ?? 1);
    isoPatterns(c, P, L.overlay, th, z);
    if (L.label) {
      const [ax, ay] = P(W, 0, z);
      c.poly([[ax, ay], [labelX, ay]], { stroke: th.ink, sw: 0.35 });
      c.ellipse(ax, ay, 0.9, 0.9, { fill: th.ink });
      c.text(labelX + 4, ay + 2.4, L.label, { size: data.labelSize ?? 7, style: 'Bold' });
      if (L.note) c.para(labelX + 4, ay + 11 * (th.ts ?? 1), L.note, { size: (data.labelSize ?? 7) * 0.8, width: box.x + box.w - labelX - 6, lead: (data.labelSize ?? 7) * 1.15, color: th.muted });
    }
  });
}
