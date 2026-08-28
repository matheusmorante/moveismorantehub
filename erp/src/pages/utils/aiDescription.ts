export const unwrapAiDescription = (value: unknown): string => {
    if (typeof value === 'object' && value !== null && 'description' in value) {
        return unwrapAiDescription((value as { description?: unknown }).description);
    }
    if (typeof value !== 'string') return '';

    const text = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    if (!text.startsWith('{')) return text;

    try {
        const parsed = JSON.parse(text);
        return typeof parsed.description === 'string' ? parsed.description.trim() : text;
    } catch {
        return text;
    }
};
