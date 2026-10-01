import type { LabelConfig } from './LabelConstants';
import type {
  LabelGridItemInstance,
  LabelItemConfig,
  LogoItemConfig,
} from '../types/LabelGridItem.types';

export type LabelGridItemKind = LabelGridItemInstance['type'];

export const expandLabelItems = (
  items: readonly (LabelItemConfig | LogoItemConfig)[],
  type: LabelGridItemKind
): LabelGridItemInstance[] => {
  const expanded: LabelGridItemInstance[] = [];

  items.forEach((item, originalIdx) => {
    const quantity = Number(item.quantity || 0);

    for (let index = 0; index < quantity; index += 1) {
      expanded.push({
        ...item,
        type,
        originalIdx,
        uuid: item.instances?.[index] || '000XXX',
      });
    }
  });

  return expanded;
};

export const getLabelGridPageItems = <T,>(
  items: readonly T[],
  pageSize: number,
  pageIndex: number
): T[] => {
  const startIndex = pageIndex * pageSize;
  return items.slice(startIndex, startIndex + pageSize);
};

export const getLabelPaperDimensions = (
  config: Pick<LabelConfig, 'paperSize' | 'paperWidth' | 'paperHeight'>
): { w: string; h: string } => {
  if (config.paperSize === 'A3') return { w: '297mm', h: '420mm' };
  if (config.paperSize === 'A5') return { w: '148mm', h: '210mm' };
  if (config.paperSize === 'Letter') return { w: '216mm', h: '279mm' };
  if (config.paperSize === 'Custom' && config.paperWidth && config.paperHeight) {
    return { w: `${config.paperWidth}mm`, h: `${config.paperHeight}mm` };
  }
  return { w: '210mm', h: '297mm' };
};
