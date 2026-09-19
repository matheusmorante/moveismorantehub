const isUsableSize = (value: unknown): value is number =>
    Number.isFinite(Number(value)) && Number(value) > 0;

/**
 * Obtém o tamanho fixo de fonte de um determinado campo de texto a partir de um snapshot de template de etiqueta,
 * pesquisando pelas variantes de magnitude (Hundreds, Tens, Thousands) e retornando o fallback caso não exista.
 */
export const getFixedLabelTextSize = (
    snapshot: Readonly<Record<string, unknown>>,
    field: string,
    fallback: number
): number => {
    if (!snapshot || typeof snapshot !== 'object') return fallback;

    const candidates = [
        snapshot[`${field}FontSize`],
        snapshot[`${field}FontSizeHundreds`],
        snapshot[`${field}FontSizeTens`],
        snapshot[`${field}FontSizeThousands`],
    ];

    const size = candidates.find(isUsableSize);
    return size === undefined ? fallback : Number(size);
};

