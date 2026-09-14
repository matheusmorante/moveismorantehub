export interface LabelPhysicalSize {
    readonly widthMm: number;
    readonly heightMm: number;
}

export interface LabelGeometryConfig {
    readonly paperSize?: string;
    readonly paperWidth?: number;
    readonly paperHeight?: number;
    readonly marginL?: number;
    readonly marginR?: number;
    readonly marginT?: number;
    readonly marginB?: number;
    readonly gapH?: number;
    readonly gapV?: number;
    readonly columns?: number;
    readonly rows?: number;
}

const PAPER_SIZES_MM: Record<string, LabelPhysicalSize> = {
    A4: { widthMm: 210, heightMm: 297 },
    A3: { widthMm: 297, heightMm: 420 },
    A5: { widthMm: 148, heightMm: 210 },
    Letter: { widthMm: 216, heightMm: 279 }
} as const;

function safeNumber(value: unknown, fallback = 0): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

/**
 * Calcula a geometria física (em milímetros) de uma célula de etiqueta
 * descontando margens, sangrias e espaçamentos (gaps) da folha base.
 * Função pura e defensiva contra NaN ou divisão por zero.
 */
export const calculateLabelPhysicalSize = (config: LabelGeometryConfig): LabelPhysicalSize => {
    const isCustom = config.paperSize === 'Custom';
    const fallbackPaper = PAPER_SIZES_MM[config.paperSize || 'A4'] || PAPER_SIZES_MM.A4;

    const paperWidth = isCustom ? safeNumber(config.paperWidth, 210) : fallbackPaper.widthMm;
    const paperHeight = isCustom ? safeNumber(config.paperHeight, 297) : fallbackPaper.heightMm;

    const columns = Math.max(1, safeNumber(config.columns, 1));
    const rows = Math.max(1, safeNumber(config.rows, 1));

    const marginL = safeNumber(config.marginL, 0);
    const marginR = safeNumber(config.marginR, 0);
    const marginT = safeNumber(config.marginT, 0);
    const marginB = safeNumber(config.marginB, 0);
    const gapH = safeNumber(config.gapH, 0);
    const gapV = safeNumber(config.gapV, 0);

    const availableWidth = paperWidth - marginL - marginR - ((columns - 1) * gapH);
    const availableHeight = paperHeight - marginT - marginB - ((rows - 1) * gapV);

    const widthMm = availableWidth / columns;
    const heightMm = availableHeight / rows;

    return {
        widthMm: Math.max(1, Number.isFinite(widthMm) ? Number(widthMm.toFixed(2)) : 1),
        heightMm: Math.max(1, Number.isFinite(heightMm) ? Number(heightMm.toFixed(2)) : 1)
    };
};

