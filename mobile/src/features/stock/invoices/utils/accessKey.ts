export const extractNfeAccessKey = (value: string): string | null => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 44) return digits;
    return value.match(/(?:^|\D)(\d{44})(?:\D|$)/)?.[1] ?? null;
};
