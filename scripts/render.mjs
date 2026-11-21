#!/usr/bin/env node
// Renders a panel spec (panel.json) into VectorCraft: grid → cells → diagrams → flow arrows → export.
// usage: node render.mjs <panel.json> <outDir> [--live] [--port 7979] [--no-export] [--dry]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createCanvas, toBatches } from './lib/canvas.mjs';
import { DEFAULT_THEME } from './lib/style.mjs';
import { pageSize, makeGrid } from './lib/layouts.mjs';
import { renderContent, measureCaption, drawCaption } from './lib/blocks.mjs';
import { connect } from './lib/vc-client.mjs';

const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const positional = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--port');
const [specPath, outDirArg] = positional;
if (!specPath || !outDirArg) {
  console.error('usage: node render.mjs <panel.json> <outDir> [--live] [--port 7979] [--no-export] [--dry]');
  process.exit(2);
}
const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const outDir = resolve(outDirArg);
mkdirSync(outDir, { recursive: true });

const theme = { ...DEFAULT_THEME, ...(spec.theme || {}) };
const sheets = spec.sheets || [spec];
const [W, H] = pageSize(sheets[0].page || spec.page);
// text scale: 1.0 on A3 portrait, 2.0 on A1 landscape (override with theme.textScale)
theme.ts = spec.theme?.textScale ?? Math.max(0.8, Math.min(3, Math.min(W, H) / 842));
const SHEET_GAP = 60;
const c = createCanvas(theme);

function cropMarks(ox) {
  const L = 28, m = 14;
  [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, sx, sy]) =>
    c.poly([[ox + x, y + sy * L], [ox + x, y], [ox + x + sx * L, y]], { stroke: theme.ink, sw: 2 }));
}

// orthogonal connector between two cell rects, routed through the gutter
function connector(a, b, label) {
  const ov = (a0, a1, b0, b1) => [Math.max(a0, b0), Math.min(a1, b1)];
  let pts;
  if (b.x >= a.x + a.w - 1 || b.x + b.w <= a.x + 1) {
    const right = b.x >= a.x + a.w - 1;
    const x0 = right ? a.x + a.w + 3 : a.x - 3, x1 = right ? b.x - 3 : b.x + b.w + 3;
    const [o0, o1] = ov(a.y, a.y + a.h, b.y, b.y + b.h);
    if (o1 - o0 > 20) { const y = (o0 + o1) / 2; pts = [[x0, y], [x1, y]]; } else {
      const ya = a.y + a.h / 2, yb = b.y + b.h / 2, mx = (x0 + x1) / 2;
      pts = [[x0, ya], [mx, ya], [mx, yb], [x1, yb]];
    }
  } else {
    const down = b.y >= a.y + a.h - 1;
    const y0 = down ? a.y + a.h + 3 : a.y - 3, y1 = down ? b.y - 3 : b.y + b.h + 3;
    const [o0, o1] = ov(a.x, a.x + a.w, b.x, b.x + b.w);
    if (o1 - o0 > 20) { const x = (o0 + o1) / 2; pts = [[x, y0], [x, y1]]; } else {
      const xa = a.x + a.w / 2, xb = b.x + b.w / 2, my = (y0 + y1) / 2;
      pts = [[xa, y0], [xa, my], [xb, my], [xb, y1]];
    }
  }
  c.poly(pts, { stroke: theme.accent, sw: 1.3, arrow: true, join: 'round' });
  if (label) {
    const [p, q] = [pts[Math.floor((pts.length - 1) / 2)], pts[Math.floor((pts.length - 1) / 2) + 1]];
    c.text((p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - 4, label, { size: 6, align: 'center', color: theme.accent, style: 'Bold' });
  }
}

// thin grid lines on every cell boundary + "+" marks at the intersections
function crossGrid(grid, ox, cg) {
  const k = theme.ts;
  const ext = cg.extend ?? 0;
  const st = { stroke: cg.stroke ?? theme.muted, sw: cg.sw ?? 0.35 };
  const xs = grid.xs.map((x) => x + ox), ys = grid.ys;
  if (cg.lines !== false) {
    const E = [];
    xs.forEach((x) => E.push([[x, ys[0] - ext], [x, ys[ys.length - 1] + ext]]));
    ys.forEach((y) => E.push([[xs[0] - ext, y], [xs[xs.length - 1] + ext, y]]));
    c.segs(E, st);
  }
  const s = (cg.cross ?? 5) * k;
  const X = [];
  xs.forEach((x) => ys.forEach((y) => X.push([[x - s, y], [x + s, y]], [[x, y - s], [x, y + s]])));
  c.segs(X, { stroke: cg.crossStroke ?? theme.ink, sw: cg.crossSw ?? 0.9 });
}

function footer(ox, f, grid) {
  const y = H - grid.margin * 0.45;
  if (f.left) c.text(ox + grid.margin, y, f.left, { size: f.size ?? 7 });
  if (f.right) c.text(ox + W - grid.margin, y, f.right, { size: f.size ?? 7, align: 'right' });
}

function drawCell(cell, r0) {
  const ins = cell.inset ?? 0;
  const r = { x: r0.x + ins, y: r0.y + ins, w: r0.w - 2 * ins, h: r0.h - 2 * ins };
  if (cell.backing) c.rect(r.x, r.y, r.w, r.h, { fill: cell.backing === true ? theme.paper : cell.backing });
  if (cell.frameStyle) { const fs = cell.frameStyle; c.rect(r.x, r.y, r.w, r.h, { stroke: fs.stroke ?? theme.accent, sw: fs.sw ?? 0.7, dash: fs.dash ?? [3, 2] }); }
  if (cell.lead) {
    const k = theme.ts, cy = r0.y + r0.h / 2, x = r0.x;
    c.poly([[x - 3 * k, cy - 4 * k], [x + 1.5 * k, cy], [x - 3 * k, cy + 4 * k]], { stroke: theme.accent, sw: 1.1, join: 'miter' });
  }
  const pad = cell.pad ?? 6;
  if (cell.frame) c.rect(r.x, r.y, r.w, r.h, { stroke: theme.ghost, sw: 0.5 });
  if (cell.fill) c.rect(r.x, r.y, r.w, r.h, { fill: cell.fill });
  let top = r.y + (cell.frame || cell.fill ? pad : 0);
  const inner = { x: r.x + (cell.frame || cell.fill ? pad : 0), w: r.w - (cell.frame || cell.fill ? 2 * pad : 0) };
  if (cell.heading || cell.step) {
    const k = theme.ts;
    const num = cell.step ? String(cell.step).padStart(2, '0') : '';
    c.text(inner.x, top + 10 * k, num, { size: 10, style: 'Bold', color: theme.accent });
    c.text(inner.x + (num ? 18 * k : 0), top + 10 * k, cell.heading || '', { size: 8, style: 'Bold' });
    c.poly([[inner.x, top + 15 * k], [inner.x + inner.w, top + 15 * k]], { stroke: theme.ink, sw: 0.4 });
    top += 24 * k;
  }
  const bottom = r.y + r.h - (cell.frame || cell.fill ? pad : 0);
  const side = cell.captionPosition === 'right';
  const capW = side ? inner.w * 0.34 : inner.w;
  const capH = cell.caption && !side ? Math.min(measureCaption(cell.caption, capW, theme), (bottom - top) * 0.5) : 0;
  const box = { x: inner.x, y: top, w: side && cell.caption ? inner.w - capW - 8 : inner.w, h: bottom - top - capH };
  renderContent(c, cell.type, box, cell.data, theme);
  if (cell.caption) {
    if (side) drawCaption(c, cell.caption, inner.x + inner.w - capW, top, capW, theme);
    else drawCaption(c, cell.caption, inner.x, bottom - capH, capW, theme, cell.captionAlign || 'left');
  }
}

sheets.forEach((sheet, si) => {
  const ox = si * (W + SHEET_GAP);
  const grid = makeGrid(sheet, W, H);
  c.rect(ox, 0, W, H, { fill: sheet.page?.background || theme.paper });
  if (sheet.background) {
    const bg = sheet.background;
    const bx = bg.box === 'content' ? { ...grid.content, x: grid.content.x + ox } : { x: ox, y: 0, w: W, h: H };
    renderContent(c, bg.type || 'plan', bx, { pad: 0, outline: false, ...bg.data }, theme);
  }
  const cg = sheet.crossGrid === true ? {} : sheet.crossGrid;
  if (cg && !cg.onTop) crossGrid(grid, ox, cg);
  if (sheet.footer) footer(ox, sheet.footer, grid);
  if ((sheet.page || spec.page)?.cropMarks) cropMarks(ox);
  const rects = new Map();
  (sheet.cells || []).forEach((cell, ci) => {
    let pos = cell;
    if (cell.slot !== undefined) {
      pos = grid.slots[cell.slot];
      if (!pos) throw new Error(`sheet ${si + 1} cell ${cell.id || ci}: slot ${cell.slot} not in preset (0..${grid.slots.length - 1})`);
    }
    const r0 = grid.cellRect(pos);
    const r = { ...r0, x: r0.x + ox };
    rects.set(cell.id ?? `c${ci}`, r);
    drawCell(cell, r);
  });
  if (cg?.onTop) crossGrid(grid, ox, cg); // grid drawn over the cells (inset cells keep intersections clear)
  (sheet.flow || []).forEach((f) => {
    const [from, to, label] = Array.isArray(f) ? f : [f.from, f.to, f.label];
    const a = rects.get(from), b = rects.get(to);
    if (!a || !b) throw new Error(`flow ${from}→${to}: unknown cell id`);
    connector(a, b, label);
  });
});

const batches = toBatches(c.units);
const stepCount = batches.reduce((n, b) => n + b.length, 0);
console.log(`sheets ${sheets.length}, steps ${stepCount}, batches ${batches.length}`);
if (flag('--dry')) process.exit(0);

const vc = await connect({ live: flag('--live'), port: Number(opt('--port', 7979)) });
try {
  const name = spec.name || 'panel';
  await vc.call('command_run', { id: 'file.new', params: { name, width: W, height: H, artboards: sheets.length, artboardLayout: { layout: 'row', spacing: SHEET_GAP }, colorMode: 'rgb', backgroundContents: 'white' } });
  const fonts = (await vc.call('command_run', { id: 'text.fontList', params: {} })).text;
  [theme.font, theme.titleFont].forEach((f) => { if (!fonts.includes(f)) console.warn(`warning: font "${f}" not installed in VectorCraft`); });
  let failed = 0;
  for (const [i, steps] of batches.entries()) {
    const r = JSON.parse((await vc.call('command_batch', { steps, atomic: true, label: `${name} ${i + 1}` })).text);
    if (r.failed) { failed++; console.error(`batch ${i + 1} failed:`, JSON.stringify((r.results || []).find((x) => !x.ok)).slice(0, 400)); }
  }
  for (let ab = 0; ab < sheets.length; ab++) {
    const prev = await vc.call('render_preview', { max_side: 2400, artboard: ab });
    const img = prev.content.find((x) => x.type === 'image');
    if (img) writeFileSync(join(outDir, `preview_${ab + 1}.png`), Buffer.from(img.data, 'base64'));
  }
  if (failed) throw new Error(`${failed} batch(es) failed — fix the spec before exporting`);
  if (!flag('--no-export')) {
    for (const fmt of ['vectorcraft', 'ai', 'pdf']) await vc.call('export', { format: fmt, path: join(outDir, `${name}.${fmt}`) });
    for (let ab = 0; ab < sheets.length; ab++) {
      await vc.call('export', { format: 'png', artboard: ab, path: join(outDir, `${name}_${ab + 1}.png`), scale: 2 });
      await vc.call('export', { format: 'svg', artboard: ab, path: join(outDir, `${name}_${ab + 1}.svg`) });
    }
    console.log(`exported to ${outDir}`);
  }
  console.log(`previews: ${outDir}`);
} finally {
  vc.close();
}
