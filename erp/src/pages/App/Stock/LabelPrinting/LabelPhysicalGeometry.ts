export interface LabelPhysicalSize {
    widthMm: number;
    heightMm: number;
}

const PAPER_SIZES_MM: Record<string, LabelPhysicalSize> = {
    A4: { widthMm: 210, heightMm: 297 },
    A3: { widthMm: 297, heightMm: 420 },
    A5: { widthMm: 148, heightMm: 210 },
    Letter: { widthMm: 216, heightMm: 279 }
};

export const calculateLabelPhysicalSize = (config: {
    paperSize?: string;
    paperWidth?: number;
    paperHeight?: number;
    marginL?: number;
    marginR?: number;
    marginT?: number;
    marginB?: number;
    gapH?: number;
    gapV?: number;
    columns?: number;
    rows?: number;
}): LabelPhysicalSize => {
    const paper = config.paperSize === 'Custom'
        ? {
            widthMm: config.paperWidth || 210,
            heightMm: config.paperHeight || 297
        }
        : PAPER_SIZES_MM[config.paperSize || 'A4'] || PAPER_SIZES_MM.A4;
    const columns = Math.max(1, config.columns || 1);
    const rows = Math.max(1, config.rows || 1);
    const widthMm = (paper.widthMm - (config.marginL || 0) - (config.marginR || 0) - ((columns - 1) * (config.gapH || 0))) / columns;
    const heightMm = (paper.heightMm - (config.marginT || 0) - (config.marginB || 0) - ((rows - 1) * (config.gapV || 0))) / rows;

    return {
        widthMm: Math.max(1, widthMm),
        heightMm: Math.max(1, heightMm)
    };
};
