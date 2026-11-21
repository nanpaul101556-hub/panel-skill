// Text-like cells (title, text, image placeholder), captions, and the diagram registry.
import { textWidth, wrap } from './canvas.mjs';
import { isoDiagram, explodedDiagram } from './iso.mjs';
import { planDiagram, sectionDiagram } from './plan.mjs';
import { flowDiagram, timelineDiagram, barsDiagram, legendDiagram } from './charts.mjs';

// data: { title, subtitle, meta, align, rule }
function titleBlock(c, box, data, th) {
  const align = data.align || 'left';
  const ax = align === 'center' ? box.x + box.w / 2 : align === 'right' ? box.x + box.w : box.x;
  const unit = textWidth(data.title || '', 1) || 1;
  const size = Math.min(data.size ?? box.h * 0.42, (box.w * 0.92) / unit);
  let y = box.y + size * 0.95;
  c.text(ax, y, data.title, { size, font: th.titleFont, style: data.titleStyle ?? 'Bold', align, raw: true });
  if (data.subtitle) { y += size * 0.5 + 4; c.text(ax, y, data.subtitle, { size: Math.max(7, size * 0.3), align, color: th.muted, raw: true }); }
  if (data.meta) c.text(align === 'right' ? box.x : box.x + box.w, box.y + 10, data.meta, { size: 6.5, align: align === 'right' ? 'left' : 'right', color: th.muted });
  if (data.rule !== false) c.poly([[box.x, box.y + box.h - 2], [box.x + box.w, box.y + box.h - 2]], { stroke: th.ink, sw: 1 });
}

// data: { heading, body: string | string[], size }
function textBlock(c, box, data, th) {
  const size = data.size ?? 7.5;
  const S = size * (th.ts ?? 1);
  let y = box.y + 2;
  if (data.heading) { y += S * 1.6; c.text(box.x, y, data.heading, { size: size * 1.5, style: 'Bold' }); y += S * 1.2; }
  const paras = Array.isArray(data.body) ? data.body : [data.body || ''];
  paras.forEach((p) => {
    if (y > box.y + box.h - S) return;
    y = c.para(box.x, y + S, p, { size, width: box.w, lead: size * 1.45 }) + S * 0.4;
  });
}

// data: { label } — a reserved frame for renders/photos placed later
function imageBlock(c, box, data, th) {
  c.rect(box.x, box.y, box.w, box.h, { fill: data.fill || th.fill, stroke: th.ghost, sw: 0.5 });
  c.segs([[[box.x, box.y], [box.x + box.w, box.y + box.h]], [[box.x + box.w, box.y], [box.x, box.y + box.h]]], { stroke: th.ghost, sw: 0.4 });
  const size = data.size ?? 8;
  const lines = wrap(data.label || 'IMAGE', size * (th.ts ?? 1), box.w * 0.85);
  const lead = size * (th.ts ?? 1) * 1.25;
  lines.forEach((ln, i) => c.text(box.x + box.w / 2, box.y + box.h / 2 + 3 + (i - (lines.length - 1) / 2) * lead, ln, { size, align: 'center', color: th.muted, style: 'Bold' }));
}

// data: { image: "PHOTO label" | false, imageRatio, year, title, text } — timeline / reference card
function cardBlock(c, box, data, th) {
  const k = th.ts ?? 1;
  const imgH = data.image === false ? 0 : Math.min(box.w * (data.imageRatio ?? 0.62), box.h * 0.6);
  if (imgH) imageBlock(c, { x: box.x, y: box.y, w: box.w, h: imgH }, { label: data.image, size: 5 }, th);
  let y = box.y + imgH + 3 * k;
  if (data.year) { y += 10 * k; c.text(box.x, y, data.year, { size: 10, style: 'Bold' }); }
  if (data.title) { y += 9 * k; c.text(box.x, y, data.title, { size: 7.5, style: 'Bold' }); }
  if (data.text) c.para(box.x, y + 8 * k, data.text, { size: 5.4, width: box.w, lead: 6.8 });
}

// data: { char: "+" | "=" | ">", size, color }
function glyphBlock(c, box, data, th) {
  const size = data.size ?? 22;
  c.text(box.x + box.w / 2, box.y + box.h / 2 + size * (th.ts ?? 1) * 0.36, data.char || '+', { size, align: 'center', style: 'Bold', color: data.color || th.accent });
}

export const DIAGRAMS = {
  title: titleBlock, text: textBlock, image: imageBlock, card: cardBlock, glyph: glyphBlock,
  iso: isoDiagram, exploded: explodedDiagram, plan: planDiagram, section: sectionDiagram,
  flow: flowDiagram, timeline: timelineDiagram, bars: barsDiagram, legend: legendDiagram,
};

// caption = { title, text, bold, size } placed under the content box
export function measureCaption(cap, width, th) {
  if (!cap) return 0;
  const size = (cap.size ?? 6) * (th.ts ?? 1);
  let h = 0;
  if (cap.title) h += size * 1.9;
  if (cap.text) h += wrap(cap.text, size * 0.82, width).length * size * 1.15 + 2;
  if (cap.bold) h += wrap(cap.bold, size * 0.9, width).length * size * 1.25 + 2;
  return h + 4;
}

export function drawCaption(c, cap, x, y, width, th, align = 'left') {
  const size = cap.size ?? 6;
  const S = size * (th.ts ?? 1);
  const ax = align === 'center' ? x + width / 2 : x;
  let yy = y + S;
  if (cap.title) { c.text(ax, yy + 2, cap.title, { size: size * 1.25, style: 'Bold', align }); yy += S * 1.9; }
  if (cap.text) yy = c.para(ax, yy, cap.text, { size: size * 0.82, width, lead: size * 1.15, color: th.muted, align }) + 2;
  if (cap.bold) c.para(ax, yy + 2, cap.bold, { size: size * 0.9, width, lead: size * 1.25, style: 'Bold', align });
}

export function renderContent(c, type, box, data, th) {
  if (type === 'series') return renderSeries(c, box, data, th);
  const fn = DIAGRAMS[type];
  if (!fn) throw new Error(`unknown cell type "${type}" (have: series, ${Object.keys(DIAGRAMS).join(', ')})`);
  fn(c, box, data || {}, th);
}

// small multiples: data = { cols, gap, items:[{ type, data, caption }] }
function renderSeries(c, box, data, th) {
  const items = data.items || [];
  const cols = data.cols ?? Math.ceil(Math.sqrt(items.length));
  const rows = Math.ceil(items.length / cols);
  const gap = data.gap ?? 10;
  const w = (box.w - gap * (cols - 1)) / cols, h = (box.h - gap * (rows - 1)) / rows;
  items.forEach((it, i) => {
    const x = box.x + (i % cols) * (w + gap), y = box.y + Math.floor(i / cols) * (h + gap);
    const capH = Math.min(measureCaption(it.caption, w, th), h * 0.45);
    renderContent(c, it.type, { x, y, w, h: h - capH }, it.data, th);
    if (it.caption) drawCaption(c, it.caption, x, y + h - capH, w, th, data.captionAlign || 'center');
  });
}
