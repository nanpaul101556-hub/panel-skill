// Page sizes, grid frames and layout presets (archetypes found on Pinterest boards).
export const PAGES = {
  A0: [2383.94, 3370.39], A1: [1683.78, 2383.94], A2: [1190.55, 1683.78], A3: [841.89, 1190.55], A4: [595.28, 841.89],
};

export function pageSize(page = {}) {
  if (page.width && page.height) return [page.width, page.height];
  const [w, h] = PAGES[page.size || 'A1'] || PAGES.A1;
  return page.orientation === 'portrait' ? [w, h] : [h, w];
}

// slot = [col, row, colSpan, rowSpan, role]
export const PRESETS = {
  // equal storyboard: title band + 3×3 small multiples
  'storyboard-3x3': { columns: 3, rowHeights: [0.32, 1, 1, 1], slots: [[0, 0, 3, 1, 'title'], [0, 1, 1, 1], [1, 1, 1, 1], [2, 1, 1, 1], [0, 2, 1, 1], [1, 2, 1, 1], [2, 2, 1, 1], [0, 3, 1, 1], [1, 3, 1, 1], [2, 3, 1, 1]] },
  // one dominant hero image/drawing, side stack, strip of process diagrams below
  'hero-strip': { columns: 12, rowHeights: [0.45, 1, 1, 1, 1, 1.15], slots: [[0, 0, 12, 1, 'title'], [0, 1, 8, 4, 'hero'], [8, 1, 4, 2], [8, 3, 4, 2], [0, 5, 3, 1], [3, 5, 3, 1], [6, 5, 3, 1], [9, 5, 3, 1]] },
  // bento: mixed tile sizes, strong hierarchy
  bento: { columns: 12, rowHeights: [0.45, 1, 1, 1, 1], slots: [[0, 0, 12, 1, 'title'], [0, 1, 5, 2, 'hero'], [5, 1, 4, 1], [9, 1, 3, 2], [5, 2, 4, 1], [0, 3, 3, 2], [3, 3, 6, 2], [9, 3, 3, 2]] },
  // horizontal timeline band drives the narrative, three chapters below
  'timeline-band': { columns: 12, rowHeights: [0.45, 0.75, 1, 1, 0.95], slots: [[0, 0, 12, 1, 'title'], [0, 1, 12, 1, 'timeline'], [0, 2, 4, 2], [4, 2, 4, 2], [8, 2, 4, 2], [0, 4, 3, 1], [3, 4, 3, 1], [6, 4, 3, 1], [9, 4, 3, 1]] },
  // editorial: narrow text column, big centre drawing, side and bottom details
  editorial: { columns: 12, rowHeights: [0.6, 1, 1, 1], slots: [[0, 0, 3, 1, 'title'], [0, 1, 3, 3, 'text'], [3, 0, 6, 3, 'hero'], [9, 0, 3, 1], [9, 1, 3, 1], [9, 2, 3, 1], [3, 3, 3, 1], [6, 3, 3, 1], [9, 3, 3, 1]] },
  // render-led portrait board: title + legend, full-width hero render band, diagram grid, render strip at the bottom
  'render-band': { columns: 12, rowHeights: [0.34, 2.1, 1, 1, 1, 0.95], slots: [[0, 0, 8, 1, 'title'], [8, 0, 4, 1, 'legend'], [0, 1, 12, 1, 'hero-render'], [0, 2, 4, 1], [4, 2, 4, 1], [8, 2, 4, 1], [0, 3, 7, 2, 'hero-diagram'], [7, 3, 5, 1], [7, 4, 5, 1], [0, 5, 4, 1, 'render'], [4, 5, 4, 1, 'render'], [8, 5, 4, 1]] },
  // exploded axonometric in the middle, analysis diagrams flanking
  'exploded-center': { columns: 12, rowHeights: [0.45, 1, 1, 1], slots: [[0, 0, 12, 1, 'title'], [0, 1, 3, 1], [0, 2, 3, 1], [0, 3, 3, 1], [3, 1, 6, 3, 'hero'], [9, 1, 3, 1], [9, 2, 3, 1], [9, 3, 3, 1]] },
};

// resolves a sheet's grid (preset or explicit) and returns { cellRect, content, grid }
export function makeGrid(sheet, W, H) {
  const page = sheet.page || {};
  const m = page.margin ?? Math.round(Math.min(W, H) * 0.035);
  const preset = sheet.layout?.preset ? PRESETS[sheet.layout.preset] : null;
  if (sheet.layout?.preset && !preset) throw new Error(`unknown layout preset "${sheet.layout.preset}" (have: ${Object.keys(PRESETS).join(', ')})`);
  const g = { ...(preset || {}), ...(sheet.grid || {}) };
  const columns = g.columns ?? 12;
  const rowHeights = g.rowHeights ?? Array.from({ length: g.rows ?? 6 }, () => 1);
  const gutter = g.gutter ?? Math.round(Math.min(W, H) * 0.014);
  const content = { x: m, y: m, w: W - 2 * m, h: H - 2 * m };
  const colW = (content.w - gutter * (columns - 1)) / columns;
  const totalR = rowHeights.reduce((a, b) => a + b, 0);
  const avail = content.h - gutter * (rowHeights.length - 1);
  const rowY = [];
  let y = content.y;
  rowHeights.forEach((r) => { rowY.push(y); y += (avail * r) / totalR + gutter; });
  const rowH = rowHeights.map((r) => (avail * r) / totalR);

  const cellRect = ({ col, row, colSpan = 1, rowSpan = 1 }) => {
    if (col < 0 || row < 0 || col + colSpan > columns || row + rowSpan > rowHeights.length) {
      throw new Error(`cell out of grid: col ${col} row ${row} span ${colSpan}×${rowSpan} on ${columns}×${rowHeights.length}`);
    }
    const x = content.x + col * (colW + gutter);
    const w = colSpan * colW + (colSpan - 1) * gutter;
    const h = rowH.slice(row, row + rowSpan).reduce((a, b) => a + b, 0) + (rowSpan - 1) * gutter;
    return { x, y: rowY[row], w, h };
  };
  const slots = (preset?.slots || []).map(([col, row, colSpan, rowSpan, role]) => ({ col, row, colSpan, rowSpan, role }));
  // grid lines (cell boundaries) for the cross-mark overlay
  const xs = Array.from({ length: columns + 1 }, (_, i) => content.x + i * (colW + gutter) - (i > 0 && i < columns ? gutter / 2 : i === columns ? gutter : 0));
  const ys = [...rowY.map((v, i) => v - (i > 0 ? gutter / 2 : 0)), content.y + content.h];
  return { cellRect, content, slots, columns, rows: rowHeights.length, gutter, margin: m, xs, ys };
}
