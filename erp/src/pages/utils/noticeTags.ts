const normalizeTag = (value: string) => value.trim();

/**
 * Registros antigos usam ponto e vírgula. Os novos usam quebra de linha para
 * permitir ponto e vírgula livremente no texto de uma observação.
 */
export const splitNoticeTags = (value?: string): string[] => {
    if (!value) return [];

    const separator = value.includes("\n") ? /\r?\n/ : ";";
    return value.split(separator).map(normalizeTag).filter(Boolean);
};

export const joinNoticeTags = (tags: string[]): string =>
    tags.map(normalizeTag).filter(Boolean).join("\n");
