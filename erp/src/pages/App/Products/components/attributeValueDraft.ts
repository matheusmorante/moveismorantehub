export function normalizeAttributeDraftValue(value: string): string {
    return value.trim().replace(/,/g, '');
}

export function appendAttributeDraftValue(values: string[], input: string): string[] {
    const value = normalizeAttributeDraftValue(input);
    if (!value || values.includes(value)) return values;

    return [...values, value];
}

export function finalizeAttributeDraftValues(values: string[], pendingInput: string): string[] {
    return appendAttributeDraftValue(values, pendingInput);
}
