import { useCallback, useEffect } from 'react';
import type { LabelConfig } from '../utils/LabelConstants';
import { getLabelPaperDimensions } from '../utils/labelGridLayout';
import { buildMobileLabelPrintHtml, hasMobileLabelBridge, requestMobileLabelAction } from '../services/mobileLabelBridge';

const PRINT_PAGE_CLASS = 'label-printing-page';

export const useLabelPrintMode = (config: LabelConfig) => {
  useEffect(() => {
    document.body.classList.add(PRINT_PAGE_CLASS);
    return () => document.body.classList.remove(PRINT_PAGE_CLASS);
  }, []);

  return useCallback(async () => {
    document.body.classList.add(PRINT_PAGE_CLASS);
    await document.fonts?.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => {
      requestAnimationFrame(() => window.setTimeout(resolve, 100));
    }));
    if (hasMobileLabelBridge()) {
      const dimensions = getLabelPaperDimensions(config);
      const html = await buildMobileLabelPrintHtml();
      await requestMobileLabelAction({
        action: 'print',
        html,
        width: Number.parseFloat(dimensions.w) * 72 / 25.4,
        height: Number.parseFloat(dimensions.h) * 72 / 25.4,
      });
    } else {
      window.print();
    }
  }, [config]);
};
