export interface Family {
    readonly id: string;
    readonly name?: string;
    readonly description?: string;
    readonly code?: string;
}

export interface Attribute {
    name: string;
    value: string;
    showName?: boolean;
}

interface RawAttributeItem {
    readonly name?: string;
    readonly value?: string;
    readonly showName?: boolean;
}

export const normalize = (value: unknown): string =>
    String(value || '').trim().toLocaleLowerCase('pt-BR');

export const toAttributes = (value: unknown): Attribute[] => {
    if (Array.isArray(value)) {
        return (value as readonly unknown[])
            .filter(Boolean)
            .map((attribute) => {
                const item = attribute as RawAttributeItem;
                return {
                    name: String(item.name || ''),
                    value: String(item.value || ''),
                    showName: item.showName
                };
            });
    }
    if (value && typeof value === 'object') {
        return Object.entries(value as Record<string, unknown>).map(([name, attributeValue]) => ({
            name,
            value: String(attributeValue || '')
        }));
    }
    return [];
};

export const hasSameAttributes = (first: readonly Attribute[], second: readonly Attribute[]): boolean => {
    if (first.length !== second.length) return false;
    const secondMap = new Map(second.map((attribute) => [normalize(attribute.name), normalize(attribute.value)]));
    return first.every((attribute) => secondMap.get(normalize(attribute.name)) === normalize(attribute.value));
};

export const familyName = (family?: Family | null): string =>
    family?.name || family?.description || 'Produto pai selecionado';

export const familySku = (family?: Family | null): string => family?.code || '';
