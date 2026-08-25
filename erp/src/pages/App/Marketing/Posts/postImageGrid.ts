export type ImageGridCell = { x: number; y: number; w: number; h: number; label: string };
export type ImageBounds = { x: number; y: number; w: number; h: number };
export type ImageGridSettings = { gapX: number; gapY: number; leftColumnPercent: number; mainColumnWidth: number; sideColumnWidth: number; gridWidth: number; gridHeight: number; scale: number; offsetX: number; offsetY: number; showGuides: boolean; moreColorsText: string; moreColorsColor: string; moreColorsOpacity: number };

export const DEFAULT_IMAGE_GRID_SETTINGS: ImageGridSettings = { gapX: 20, gapY: 20, leftColumnPercent: 33, mainColumnWidth: 560, sideColumnWidth: 280, gridWidth: 860, gridHeight: 560, scale: 100, offsetX: 0, offsetY: 0, showGuides: true, moreColorsText: 'CONSULTE MAIS CORES', moreColorsColor: '#0f172a', moreColorsOpacity: 0.68 };

export function getSideGridCellSize(settings: ImageGridSettings, additionalImageCount = 0) {
  const rightRowCount = Math.max(2, additionalImageCount + 1);
  const gridHeight = Math.max(100, settings.gridHeight || 560);
  const requestedGapY = Math.max(0, settings.gapY);
  const maxGapY = rightRowCount > 1 ? Math.max(0, (gridHeight - rightRowCount * 40) / (rightRowCount - 1)) : 0;
  const gapY = Math.min(requestedGapY, maxGapY);
  return { rightRowCount, gapY, size: (gridHeight - gapY * (rightRowCount - 1)) / rightRowCount };
}

export function getPostImageGrid(settings: ImageGridSettings, additionalImageCount = 0) {
  const scale = Math.max(0.5, settings.scale / 100);
  const sideGrid = getSideGridCellSize(settings, additionalImageCount);
  const rightRowCount = sideGrid.rightRowCount;
  const sideW = sideGrid.size * scale;
  const gapX = Math.max(0, settings.gapX) * scale;
  const configuredGridWidth = settings.gridWidth || settings.mainColumnWidth + settings.gapX + settings.sideColumnWidth;
  const outerW = Math.max(300, configuredGridWidth) * scale;
  const mainW = Math.max(80 * scale, outerW - gapX - sideW);
  const outerH = Math.max(100, settings.gridHeight || 560) * scale;
  const gapY = sideGrid.gapY * scale;
  const sideCellH = sideW;
  const outerX = 540 - outerW / 2 + settings.offsetX;
  const outerY = 665 - outerH / 2 + settings.offsetY;
  const rightX = outerX + mainW + gapX;
  const rightCells = Array.from({ length: rightRowCount }, (_, index) => ({
    x: rightX,
    y: outerY + index * (sideCellH + gapY),
    w: sideW,
    h: sideCellH,
    label: `Imagem ${index + 2}`,
  }));
  return {
    main: { x: outerX, y: outerY, w: mainW, h: outerH, label: 'Imagem 1 · coluna 1' },
    secondary: rightCells[0],
    variationCells: rightCells.slice(1),
    outer: { x: outerX, y: outerY, w: outerW, h: outerH, label: 'Grid de fotos' },
  };
}

export function placeImageInCell(bounds: ImageBounds, cell: ImageGridCell, scalePercent: number, offsetX: number, offsetY: number) {
  const containScale = Math.min(cell.w / bounds.w, cell.h / bounds.h);
  const scale = containScale * Math.max(0.4, scalePercent / 100);
  const w = bounds.w * scale;
  const h = bounds.h * scale;
  const centeredX = cell.x + (cell.w - w) / 2;
  const centeredY = cell.y + (cell.h - h) / 2;
  const minX = Math.min(cell.x, cell.x + cell.w - w);
  const maxX = Math.max(cell.x, cell.x + cell.w - w);
  const minY = Math.min(cell.y, cell.y + cell.h - h);
  const maxY = Math.max(cell.y, cell.y + cell.h - h);
  const x = Math.max(minX, Math.min(maxX, centeredX + offsetX));
  const y = Math.max(minY, Math.min(maxY, centeredY + offsetY));
  return { x, y, w, h };
}

export function drawImageGrid(ctx: CanvasRenderingContext2D, scale: number, grid: ReturnType<typeof getPostImageGrid>) {
  ctx.save();
  ctx.setLineDash([10 * scale, 8 * scale]);
  ctx.strokeStyle = 'rgba(37, 99, 235, 0.75)';
  ctx.fillStyle = 'rgba(37, 99, 235, 0.08)';
  ctx.lineWidth = 2 * scale;
  [grid.main, grid.secondary, ...grid.variationCells].forEach(cell => {
    ctx.fillRect(cell.x * scale, cell.y * scale, cell.w * scale, cell.h * scale);
    ctx.strokeRect(cell.x * scale, cell.y * scale, cell.w * scale, cell.h * scale);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(37, 99, 235, 0.9)';
    ctx.font = `bold ${14 * scale}px Arial`;
    ctx.fillText(cell.label, (cell.x + 12) * scale, (cell.y + 24) * scale);
    ctx.setLineDash([10 * scale, 8 * scale]);
    ctx.fillStyle = 'rgba(37, 99, 235, 0.08)';
  });
  ctx.restore();
}

export function drawMoreColorsLabel(ctx: CanvasRenderingContext2D, scale: number, cell: ImageGridCell, settings: ImageGridSettings) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, settings.moreColorsOpacity));
  ctx.fillStyle = settings.moreColorsColor || '#0f172a';
  ctx.fillRect(cell.x * scale, cell.y * scale, cell.w * scale, cell.h * scale);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.max(16, Math.min(28, cell.w / 10)) * scale}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(settings.moreColorsText || 'CONSULTE MAIS CORES', (cell.x + cell.w / 2) * scale, (cell.y + cell.h / 2) * scale, (cell.w - 24) * scale);
  ctx.restore();
}
