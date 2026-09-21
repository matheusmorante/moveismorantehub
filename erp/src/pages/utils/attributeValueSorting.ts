export interface AttributeValueLike {
    readonly value: string;
}

export const compareAttributeValuesNaturally = (
    left: AttributeValueLike,
    right: AttributeValueLike
): number => left.value.localeCompare(right.value, 'pt-BR', {
    numeric: true,
    sensitivity: 'base'
});

export const sortAttributeValuesNaturally = <T extends AttributeValueLike>(
    values: readonly T[]
): T[] => [...values].sort(compareAttributeValuesNaturally);
