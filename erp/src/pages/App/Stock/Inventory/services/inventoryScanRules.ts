import { extractLabelIdentity } from '@/pages/utils/barcodeScannerUtils';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const normalizeLabelId = (labelId: string): string => {
    const trimmed = labelId.trim();
    return UUID_REGEX.test(trimmed) ? trimmed.toLowerCase() : trimmed;
};

/**
 * Obtém a identidade única da etiqueta/unidade física escaneada.
 * Utiliza o ID canônico da etiqueta (UUID ou identificador) ou o próprio conteúdo do QR code caso não haja ID separado.
 * Ignora códigos de pré-visualização de impressão (ex: 000XXX).
 */
export const getPhysicalInventoryScanId = (rawCode: string): string | undefined => {
    const raw = rawCode?.trim();
    if (!raw || raw.toUpperCase().includes('000XXX')) return undefined;
    return extractLabelIdentity(raw).labelId || `qr:${raw}`;
};
