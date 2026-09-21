import { normalizeSearchTerm } from '../../utils/textUtils';

export function parseAttributeValueBatch(
    input: string,
    existingValues: readonly string[] = []
): string[] {
    const knownValues = new Set(existingValues.map(normalizeSearchTerm));

    return input
        .split(/[,;\n]+/)
        .map((value) => value.trim())
        .filter(Boolean)
        .filter((value) => {
            const normalized = normalizeSearchTerm(value);
            if (knownValues.has(normalized)) return false;
            knownValues.add(normalized);
            return true;
        });
}
