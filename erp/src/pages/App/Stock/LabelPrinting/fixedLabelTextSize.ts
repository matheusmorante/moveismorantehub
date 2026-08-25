const isUsableSize = (value: unknown): value is number =>
    Number.isFinite(Number(value)) && Number(value) > 0;

export const getFixedLabelTextSize = (
    snapshot: Record<string, any>,
    field: string,
    fallback: number
) => {
    const candidates = [
        snapshot[`${field}FontSize`],
        snapshot[`${field}FontSizeHundreds`],
        snapshot[`${field}FontSizeTens`],
        snapshot[`${field}FontSizeThousands`],
    ];

    const size = candidates.find(isUsableSize);
    return size === undefined ? fallback : Number(size);
};
