import type { GridModel } from '../types/LabelGridModelTypes';

export const calculateLabelDimensions = (
  m: Pick<
    GridModel,
    | 'paperSize'
    | 'paperWidth'
    | 'paperHeight'
    | 'marginL'
    | 'marginR'
    | 'columns'
    | 'gapH'
    | 'marginT'
    | 'marginB'
    | 'rows'
    | 'gapV'
  >
) => {
  const paperW =
    m.paperSize === 'A4'
      ? 210
      : m.paperSize === 'A3'
        ? 297
        : m.paperSize === 'A5'
          ? 148
          : m.paperWidth || 210;
  const paperH =
    m.paperSize === 'A4'
      ? 297
      : m.paperSize === 'A3'
        ? 420
        : m.paperSize === 'A5'
          ? 210
          : m.paperHeight || 297;

  const usableW = paperW - (m.marginL || 0) - (m.marginR || 0) - (m.columns - 1) * (m.gapH || 0);
  const usableH = paperH - (m.marginT || 0) - (m.marginB || 0) - (m.rows - 1) * (m.gapV || 0);

  return {
    width: (usableW / m.columns).toFixed(1),
    height: (usableH / m.rows).toFixed(1),
  };
};
