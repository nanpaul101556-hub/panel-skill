// Step builder: every drawing call becomes a VectorCraft command_batch step.
// Steps are grouped in "units" so a draw_path and its follow-up stroke.set ($last.id)
// never land in different batches.
const r2 = (v) => Math.round(v * 100) / 100;
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null));

export function textWidth(s, size) {
  let w = 0;
  for (const ch of String(s)) {
    if (/[ㄱ-힣]/.test(ch)) w += 0.92;
    else if (ch === ' ') w += 0.28;
    else if (/[A-Z]/.test(ch)) w += 0.66;
    else if (/[a-z0-9]/.test(ch)) w += 0.55;
    else w += 0.34;
  }
  return w * size;
}

export function wrap(s, size, width) {
  const out = [];
  for (const para of String(s).split('\n')) {
    let cur = '';
    for (const wd of para.split(' ')) {
      const next = cur ? `${cur} ${wd}` : wd;
      if (cur && textWidth(next, size) > width) { out.push(cur); cur = wd; } else cur = next;
    }
    out.push(cur);
  }
  return out;
}

export function createCanvas(theme) {
  const units = [];
  const push = (...steps) => units.push(steps);
  const canvas = {
    units,
    theme,
    rect(x, y, w, h, o = {}) {
      if (w <= 0 || h <= 0) return;
      push({ id: 'draw_shape', params: clean({ shape: 'rectangle', x: r2(x), y: r2(y), width: r2(w), height: r2(h), radius: o.radius, fill: o.fill ?? 'none', stroke: o.stroke ?? 'none', strokeWidth: o.sw, dash: o.dash, name: o.name }) });
    },
    ellipse(cx, cy, rx, ry = rx, o = {}) {
      push({ id: 'draw_shape', params: clean({ shape: 'ellipse', x: r2(cx - rx), y: r2(cy - ry), width: r2(2 * rx), height: r2(2 * ry), fill: o.fill ?? 'none', stroke: o.stroke ?? 'none', strokeWidth: o.sw, dash: o.dash }) });
    },
    poly(pts, o = {}) {
      if (!pts || pts.length < 2) return;
      const step = { id: 'draw_path', params: clean({ points: pts.map(([x, y]) => [r2(x), r2(y)]), closed: o.closed ? true : undefined, fill: o.fill ?? 'none', stroke: o.stroke ?? theme.ink, strokeWidth: o.sw ?? 0.6, dash: o.dash, join: o.join ?? 'miter', cap: o.cap, name: o.name }) };
      if (o.arrow) push(step, { id: 'stroke.set', params: { id: '$last.id', endArrow: 'Triangle', arrowAlign: 'tip' } });
      else push(step);
    },
    // many straight segments as one compound path (keeps object count low)
    segs(list, o = {}) {
      const CHUNK = 2000;
      for (let i = 0; i < list.length; i += CHUNK) {
        const d = list.slice(i, i + CHUNK).map(([a, b]) => `M${r2(a[0])} ${r2(a[1])}L${r2(b[0])} ${r2(b[1])}`).join('');
        if (d) push({ id: 'draw_path', params: clean({ d, fill: 'none', stroke: o.stroke ?? theme.ink, strokeWidth: o.sw ?? 0.3, dash: o.dash }) });
      }
    },
    // raw SVG-style path data (M/L/Q); several subpaths share one fill
    pathD(d, o = {}) {
      if (d) push({ id: 'draw_path', params: clean({ d, fill: o.fill ?? 'none', stroke: o.stroke ?? 'none', strokeWidth: o.sw, dash: o.dash }) });
    },
    text(x, y, t, o = {}) {
      if (t === undefined || t === null || t === '') return;
      const k = o.raw ? 1 : (theme.ts ?? 1);
      push({ id: 'text.create', params: clean({ x: r2(x), y: r2(y), text: String(t), size: r2((o.size ?? 7) * k), font: o.font ?? theme.font, style: o.style ?? 'Regular', color: o.color ?? theme.ink, justify: o.align ?? 'left' }) });
    },
    // wrapped paragraph (size/lead scaled by theme.ts unless raw); returns the y below the last line
    para(x, y, s, o) {
      const k = o.raw ? 1 : (theme.ts ?? 1);
      const lines = wrap(s, o.size * k, o.width);
      lines.forEach((ln, i) => canvas.text(x, y + i * o.lead * k, ln, o));
      return y + lines.length * o.lead * k;
    },
  };
  return canvas;
}

export function toBatches(units, max = 200) {
  const out = [];
  let cur = [];
  for (const u of units) {
    if (cur.length + u.length > max) { out.push(cur); cur = []; }
    cur.push(...u);
  }
  if (cur.length) out.push(cur);
  return out;
}
