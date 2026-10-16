/**
 * Constantes visuais, paleta de cores e métricas do PDF do Termo de Garantia.
 * Identidade visual: Modelo 2 (Azul Marinho #032354 & Amarelo Ouro #feb004).
 */

export const COLOR_NAVY = [3, 35, 84] as const;         // #032354 — Azul Escuro Principal
export const COLOR_GOLD = [254, 176, 4] as const;        // #feb004 — Amarelo Ouro Secundário
export const COLOR_DARK = [15, 23, 42] as const;         // #0f172a — Slate 900
export const COLOR_MUTED = [71, 85, 105] as const;       // #475569 — Slate 600
export const COLOR_BORDER = [226, 232, 240] as const;    // #e2e8f0 — Slate 200
export const COLOR_BG_LIGHT = [248, 250, 252] as const;  // #f8fafc — Slate 50
export const COLOR_AMBER_ALERT = [254, 243, 199] as const; // #fef3c7 — Amber 100 suave
export const COLOR_AMBER_DARK = [120, 53, 15] as const;  // #78350f — Amber 900

// Métricas de página A4
export const PDF_PAGE_WIDTH = 210;
export const PDF_PAGE_HEIGHT = 297;
export const PDF_MARGIN = 14;
export const PDF_CONTENT_WIDTH = PDF_PAGE_WIDTH - PDF_MARGIN * 2; // 182 mm
export const PDF_TOTAL_PAGES = 3;
